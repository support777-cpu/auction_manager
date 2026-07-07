import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import {
  matchPlayerPhotosForSetup,
  matchTeamLogosForSetup,
  parsePlayerCsvForSetupStaging,
  parseTeamCsvForSetupStaging,
  type SupportedPlayerPhotoFormat,
  type SupportedTeamLogoFormat,
  type UploadedPlayerPhotoDescriptor,
  type UploadedTeamLogoDescriptor
} from "@auction-manager/imports";
import Fastify, { type FastifyInstance } from "fastify";
import { access, mkdir, readdir, rm } from "node:fs/promises";
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
const setupCsvPreviewBodyLimitBytes = 256 * 1024;
const setupMediaFileSizeLimitBytes = 10 * 1024 * 1024;
const setupMediaFileLimit = 200;
const supportedMediaExtensions = new Map<string, SupportedPlayerPhotoFormat | SupportedTeamLogoFormat>([
  [".jpg", "jpeg"],
  [".jpeg", "jpeg"],
  [".png", "png"],
  [".webp", "webp"],
  [".heic", "heic"]
]);
const supportedMediaContentTypes = new Set([
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
  const teamAssetDirectory = join(dataDirectory, "assets/teams");
  await assertBuiltWebAppExists(webDistPath);
  await mkdir(playerAssetDirectory, { recursive: true });
  await mkdir(teamAssetDirectory, { recursive: true });

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
      bodyLimit: setupCsvPreviewBodyLimitBytes,
      parseAs: "string"
    },
    (_request, body, done) => {
      done(null, body);
    }
  );

  app.setErrorHandler((error, request, reply) => {
    const fastifyError = toFastifyError(error);

    if (isBodyTooLargeError(fastifyError)) {
      const uploadKind = getUploadKind(request.url);
      return reply.code(413).send({
        ok: false,
        error: "upload_too_large",
        message: getUploadTooLargeMessage(uploadKind)
      });
    }

    request.log.error(error);
    return reply.code(fastifyError.statusCode ?? 500).send({
      ok: false,
      error: "internal_error",
      message: getGenericFailureMessage(getUploadKind(request.url))
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
      bodyLimit: setupCsvPreviewBodyLimitBytes
    },
    async (request, reply) => {
      if (!isSetupCsvContentType(request.headers["content-type"])) {
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
          await clearManagedAssetDirectory(playerAssetDirectory);
        } else {
          setupStaging.clearPlayerCsv();
          await clearManagedAssetDirectory(playerAssetDirectory);
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

  app.post(
    "/api/setup/team-csv/preview",
    {
      bodyLimit: setupCsvPreviewBodyLimitBytes
    },
    async (request, reply) => {
      if (!isSetupCsvContentType(request.headers["content-type"])) {
        return reply.code(415).send({
          ok: false,
          error: "unsupported_content_type",
          message: "Upload the Team CSV as text/csv."
        });
      }

      if (typeof request.body !== "string") {
        return reply.code(415).send({
          ok: false,
          error: "unsupported_content_type",
          message: "Upload the Team CSV as text/csv."
        });
      }

      try {
        const staging = parseTeamCsvForSetupStaging(request.body);
        if (!staging.review.summary.startAuctionBlocked && staging.review.summary.importedTeams > 0) {
          setupStaging.setTeamCsv(staging);
          await clearManagedAssetDirectory(teamAssetDirectory);
        } else {
          setupStaging.clearTeamCsv();
          await clearManagedAssetDirectory(teamAssetDirectory);
        }

        return staging.review;
      } catch {
        return reply.code(500).send({
          ok: false,
          error: "preview_failed",
          message: "Team CSV preview could not be completed. Try reimporting the file."
        });
      }
    }
  );

  await app.register(async (setupRoutes) => {
    await setupRoutes.register(fastifyMultipart, {
      limits: {
        fileSize: setupMediaFileSizeLimitBytes,
        files: setupMediaFileLimit,
        fields: 0,
        parts: setupMediaFileLimit
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
          const validation = validateMediaPart({
            kind: "photo",
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

      await clearManagedAssetDirectory(playerAssetDirectory);

      const review = await matchPlayerPhotosForSetup({
        players: stagedCsv.players,
        uploadedFiles,
        assetDirectory: playerAssetDirectory
      });
      setupStaging.setPlayerPhotos(review);

      return review;
    });

    setupRoutes.post("/api/setup/team-logos", async (request, reply) => {
      const stagedCsv = setupStaging.getTeamCsv();
      if (!stagedCsv) {
        return reply.code(409).send({
          ok: false,
          error: "team_csv_required",
          message: "Import the Team CSV before uploading Team logos."
        });
      }

      if (!request.isMultipart()) {
        return reply.code(415).send({
          ok: false,
          error: "unsupported_content_type",
          message: "Upload Team logos as multipart/form-data."
        });
      }

      const uploadedFiles: UploadedTeamLogoDescriptor[] = [];
      try {
        for await (const part of request.files()) {
          const validation = validateMediaPart({
            kind: "logo",
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
            message: "A Team logo exceeds the 10 MB upload limit."
          });
        }

        return reply.code(400).send({
          ok: false,
          error: "logo_upload_limit_exceeded",
          message: "Team logo upload limits were exceeded."
        });
      }

      if (uploadedFiles.length === 0) {
        return reply.code(400).send({
          ok: false,
          error: "no_logo_files",
          message: "Upload at least one Team logo file."
        });
      }

      await clearManagedAssetDirectory(teamAssetDirectory);

      const review = await matchTeamLogosForSetup({
        teams: stagedCsv.teams,
        uploadedFiles,
        assetDirectory: teamAssetDirectory
      });
      setupStaging.setTeamLogos(review);

      return review;
    });
  });

  await app.register(fastifyStatic, {
    root: playerAssetDirectory,
    prefix: "/assets/players/",
    decorateReply: false
  });

  await app.register(fastifyStatic, {
    root: teamAssetDirectory,
    prefix: "/assets/teams/",
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

function validateMediaPart({
  kind,
  filename,
  contentType
}: {
  kind: "photo" | "logo";
  filename: string;
  contentType: string;
}):
  | { ok: true; detectedFormat: SupportedPlayerPhotoFormat & SupportedTeamLogoFormat }
  | { ok: false; statusCode: 400 | 415; error: string; message: string } {
  if (hasUnsafeFilename(filename)) {
    return {
      ok: false,
      statusCode: 400,
      error: kind === "photo" ? "invalid_photo_filename" : "invalid_logo_filename",
      message:
        kind === "photo"
          ? "Photo filenames must not contain paths or traversal sequences."
          : "Logo filenames must not contain paths or traversal sequences."
    };
  }

  const extension = getLowercaseExtension(filename);
  const detectedFormat = supportedMediaExtensions.get(extension);
  const normalizedContentType = contentType.toLowerCase().split(";")[0]?.trim() ?? "";

  if (
    !detectedFormat ||
    (!supportedMediaContentTypes.has(normalizedContentType) &&
      normalizedContentType !== "application/octet-stream")
  ) {
    return {
      ok: false,
      statusCode: 415,
      error: kind === "photo" ? "unsupported_photo_format" : "unsupported_logo_format",
      message:
        kind === "photo"
          ? "Upload Player photos as JPEG, PNG, WebP, or HEIC files."
          : "Upload Team logos as JPEG, PNG, WebP, or HEIC files."
    };
  }

  return { ok: true, detectedFormat: detectedFormat as SupportedPlayerPhotoFormat & SupportedTeamLogoFormat };
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
  let urlToInspect = rawUrl;

  for (let decodePass = 0; decodePass < 3; decodePass += 1) {
    if (urlToInspect.includes("..") || /%2f|%5c|%2e/i.test(urlToInspect)) {
      return true;
    }

    try {
      const decodedUrl = decodeURIComponent(urlToInspect);
      if (decodedUrl === urlToInspect) {
        return false;
      }
      urlToInspect = decodedUrl;
    } catch {
      return true;
    }
  }

  return urlToInspect.includes("..") || /%2f|%5c|%2e/i.test(urlToInspect);
}

async function clearManagedAssetDirectory(directory: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }

  await Promise.all(
    entries.map((entry) => rm(join(directory, entry), { recursive: true, force: true }))
  );
}

function hasFileExtension(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  const lastSegment = path.split("/").pop() ?? "";
  return /\.[a-z0-9]+$/i.test(lastSegment);
}

function isSetupCsvContentType(contentTypeHeader: string | undefined): boolean {
  return contentTypeHeader?.toLowerCase().split(";")[0]?.trim() === "text/csv";
}

function getUploadKind(url: string): "player-csv" | "team-csv" | "photo" | "logo" {
  if (url.startsWith("/api/setup/player-photos")) {
    return "photo";
  }

  if (url.startsWith("/api/setup/team-logos")) {
    return "logo";
  }

  if (url.startsWith("/api/setup/team-csv")) {
    return "team-csv";
  }

  return "player-csv";
}

function getUploadTooLargeMessage(kind: ReturnType<typeof getUploadKind>): string {
  if (kind === "photo") {
    return "A Player photo exceeds the 10 MB upload limit.";
  }

  if (kind === "logo") {
    return "A Team logo exceeds the 10 MB upload limit.";
  }

  if (kind === "team-csv") {
    return "Team CSV exceeds the 256 KB upload limit.";
  }

  return "Player CSV exceeds the 256 KB upload limit.";
}

function getGenericFailureMessage(kind: ReturnType<typeof getUploadKind>): string {
  if (kind === "photo") {
    return "Player photo upload could not be completed.";
  }

  if (kind === "logo") {
    return "Team logo upload could not be completed.";
  }

  if (kind === "team-csv") {
    return "Team CSV preview could not be completed.";
  }

  return "Player CSV preview could not be completed.";
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
