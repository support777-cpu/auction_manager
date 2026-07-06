import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import {
  matchPlayerPhotosForSetup,
  parsePlayerCsvForSetupStaging,
  type SupportedPlayerPhotoFormat,
  type UploadedPlayerPhotoDescriptor
} from "@auction-manager/imports";
import Fastify, { type FastifyInstance } from "fastify";
import { access, mkdir, readdir, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSetupStaging } from "./setup-staging.js";

export type AuctionManagerServerOptions = {
  logger?: boolean;
  webDistPath?: string;
  dataDirectory?: string;
};

const currentModuleDirectory = dirname(fileURLToPath(import.meta.url));
const defaultWebDistPath = resolve(currentModuleDirectory, "../../web/dist");
const defaultDataDirectory = resolve(currentModuleDirectory, "../../../data");
const playerCsvPreviewBodyLimitBytes = 256 * 1024;
const playerPhotoFileSizeLimitBytes = 10 * 1024 * 1024;
const playerPhotoFileLimit = 200;
const supportedPhotoExtensions = new Map<string, SupportedPlayerPhotoFormat>([
  [".jpg", "jpeg"],
  [".jpeg", "jpeg"],
  [".png", "png"],
  [".webp", "webp"],
  [".heic", "heic"]
]);
const supportedPhotoContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

export async function createAuctionManagerServer(
  options: AuctionManagerServerOptions = {}
): Promise<FastifyInstance> {
  const webDistPath = resolve(options.webDistPath ?? defaultWebDistPath);
  const dataDirectory = resolve(options.dataDirectory ?? defaultDataDirectory);
  const playerAssetDirectory = join(dataDirectory, "assets/players");
  await assertBuiltWebAppExists(webDistPath);
  await mkdir(playerAssetDirectory, { recursive: true });

  const app = Fastify({
    logger: options.logger ?? false
  });
  const setupStaging = createSetupStaging();

  app.addHook("onRequest", async (request, reply) => {
    const rawUrl = request.raw.url ?? request.url;
    if (rawUrl.startsWith("/assets/") && isUnsafeAssetRequest(rawUrl)) {
      return reply.code(400).send({
        ok: false,
        error: "invalid_asset_path"
      });
    }
  });

  app.addContentTypeParser(
    "text/csv",
    {
      bodyLimit: playerCsvPreviewBodyLimitBytes,
      parseAs: "string"
    },
    (_request, body, done) => {
      done(null, body);
    }
  );

  app.setErrorHandler((error, request, reply) => {
    const fastifyError = toFastifyError(error);

    if (isBodyTooLargeError(fastifyError)) {
      const isPhotoUpload = request.url.startsWith("/api/setup/player-photos");
      return reply.code(413).send({
        ok: false,
        error: "upload_too_large",
        message: isPhotoUpload
          ? "A Player photo exceeds the 10 MB upload limit."
          : "Player CSV exceeds the 256 KB upload limit."
      });
    }

    request.log.error(error);
    return reply.code(fastifyError.statusCode ?? 500).send({
      ok: false,
      error: "internal_error",
      message: request.url.startsWith("/api/setup/player-photos")
        ? "Player photo upload could not be completed."
        : "Player CSV preview could not be completed."
    });
  });

  app.get("/api/health", async () => ({
    ok: true,
    service: "auction-manager",
    mode: "event"
  }));

  app.post(
    "/api/setup/player-csv/preview",
    {
      bodyLimit: playerCsvPreviewBodyLimitBytes
    },
    async (request, reply) => {
      if (!isPlayerCsvContentType(request.headers["content-type"])) {
        return reply.code(415).send({
          ok: false,
          error: "unsupported_content_type",
          message: "Upload the Player CSV as text/csv."
        });
      }

      if (typeof request.body !== "string") {
        return reply.code(415).send({
          ok: false,
          error: "unsupported_content_type",
          message: "Upload the Player CSV as text/csv."
        });
      }

      try {
        const staging = parsePlayerCsvForSetupStaging(request.body);
        if (!staging.review.summary.startAuctionBlocked && staging.review.summary.importedPlayers > 0) {
          setupStaging.setPlayerCsv(staging);
          await clearPlayerAssetDirectory(playerAssetDirectory);
        } else {
          setupStaging.clearPlayerCsv();
          await clearPlayerAssetDirectory(playerAssetDirectory);
        }

        return staging.review;
      } catch {
        return reply.code(500).send({
          ok: false,
          error: "preview_failed",
          message: "Player CSV preview could not be completed. Try reimporting the file."
        });
      }
    }
  );

  await app.register(async (setupRoutes) => {
    await setupRoutes.register(fastifyMultipart, {
      limits: {
        fileSize: playerPhotoFileSizeLimitBytes,
        files: playerPhotoFileLimit,
        fields: 0,
        parts: playerPhotoFileLimit
      },
      preservePath: true
    });

    setupRoutes.post("/api/setup/player-photos", async (request, reply) => {
      const stagedCsv = setupStaging.getPlayerCsv();
      if (!stagedCsv) {
        return reply.code(409).send({
          ok: false,
          error: "player_csv_required",
          message: "Import the Player CSV before uploading Player photos."
        });
      }

      if (!request.isMultipart()) {
        return reply.code(415).send({
          ok: false,
          error: "unsupported_content_type",
          message: "Upload Player photos as multipart/form-data."
        });
      }

      const uploadedFiles: UploadedPlayerPhotoDescriptor[] = [];
      try {
        for await (const part of request.files()) {
          const validation = validatePhotoPart({
            filename: part.filename,
            contentType: part.mimetype
          });

          if (!validation.ok) {
            return reply.code(validation.statusCode).send({
              ok: false,
              error: validation.error,
              message: validation.message
            });
          }

          uploadedFiles.push({
            filename: part.filename,
            detectedFormat: validation.detectedFormat,
            content: await part.toBuffer()
          });
        }
      } catch (error) {
        const fastifyError = toFastifyError(error);
        if (isBodyTooLargeError(fastifyError)) {
          return reply.code(413).send({
            ok: false,
            error: "upload_too_large",
            message: "A Player photo exceeds the 10 MB upload limit."
          });
        }

        return reply.code(400).send({
          ok: false,
          error: "photo_upload_limit_exceeded",
          message: "Player photo upload limits were exceeded."
        });
      }

      if (uploadedFiles.length === 0) {
        return reply.code(400).send({
          ok: false,
          error: "no_photo_files",
          message: "Upload at least one Player photo file."
        });
      }

      await clearPlayerAssetDirectory(playerAssetDirectory);

      const review = await matchPlayerPhotosForSetup({
        players: stagedCsv.players,
        uploadedFiles,
        assetDirectory: playerAssetDirectory
      });
      setupStaging.setPlayerPhotos(review);

      return review;
    });
  });

  await app.register(fastifyStatic, {
    root: playerAssetDirectory,
    prefix: "/assets/players/",
    decorateReply: false
  });

  await app.register(fastifyStatic, {
    root: webDistPath,
    prefix: "/",
    index: "index.html"
  });

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({
        ok: false,
        error: "not_found"
      });
    }

    if (request.url.startsWith("/assets/")) {
      return reply.code(404).send({
        ok: false,
        error: "not_found"
      });
    }

    if (hasFileExtension(request.url)) {
      return reply.code(404).send({
        ok: false,
        error: "not_found"
      });
    }

    return reply.type("text/html").sendFile("index.html");
  });

  return app;
}

function validatePhotoPart({
  filename,
  contentType
}: {
  filename: string;
  contentType: string;
}):
  | { ok: true; detectedFormat: SupportedPlayerPhotoFormat }
  | { ok: false; statusCode: 400 | 415; error: string; message: string } {
  if (hasUnsafeFilename(filename)) {
    return {
      ok: false,
      statusCode: 400,
      error: "invalid_photo_filename",
      message: "Photo filenames must not contain paths or traversal sequences."
    };
  }

  const extension = getLowercaseExtension(filename);
  const detectedFormat = supportedPhotoExtensions.get(extension);
  const normalizedContentType = contentType.toLowerCase().split(";")[0]?.trim() ?? "";

  if (
    !detectedFormat ||
    (!supportedPhotoContentTypes.has(normalizedContentType) &&
      normalizedContentType !== "application/octet-stream")
  ) {
    return {
      ok: false,
      statusCode: 415,
      error: "unsupported_photo_format",
      message: "Upload Player photos as JPEG, PNG, WebP, or HEIC files."
    };
  }

  return { ok: true, detectedFormat };
}

function hasUnsafeFilename(filename: string): boolean {
  return (
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.split(/[\\/]/).some((segment) => segment === "..") ||
    filename.includes("..")
  );
}

function getLowercaseExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex >= 0 ? filename.slice(lastDotIndex).toLowerCase() : "";
}

function isUnsafeAssetRequest(rawUrl: string): boolean {
  let decodedUrl = rawUrl;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch {
    return true;
  }

  return (
    decodedUrl.includes("..") ||
    /%2f|%5c|%2e/i.test(rawUrl)
  );
}

async function clearPlayerAssetDirectory(directory: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }

  await Promise.all(entries.map((entry) => unlink(join(directory, entry))));
}

function hasFileExtension(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  const lastSegment = path.split("/").pop() ?? "";
  return /\.[a-z0-9]+$/i.test(lastSegment);
}

function isPlayerCsvContentType(contentTypeHeader: string | undefined): boolean {
  return contentTypeHeader?.toLowerCase().split(";")[0]?.trim() === "text/csv";
}

function isBodyTooLargeError(error: { code?: string; statusCode?: number }): boolean {
  return (
    error.statusCode === 413 ||
    error.code === "FST_ERR_CTP_BODY_TOO_LARGE" ||
    error.code === "FST_ERR_REQ_BODY_TOO_LARGE"
  );
}

function toFastifyError(error: unknown): { code?: string; statusCode?: number } {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; statusCode?: unknown };
    return {
      ...(typeof candidate.code === "string" ? { code: candidate.code } : {}),
      ...(typeof candidate.statusCode === "number"
        ? { statusCode: candidate.statusCode }
        : {})
    };
  }

  return {};
}

async function assertBuiltWebAppExists(webDistPath: string) {
  try {
    await access(join(webDistPath, "index.html"));
  } catch {
    throw new Error(
      `Built web app not found at ${webDistPath}. Run npm run build before starting event mode.`
    );
  }
}
