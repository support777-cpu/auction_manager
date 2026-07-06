import fastifyStatic from "@fastify/static";
import { parsePlayerCsvForSetup } from "@auction-manager/imports";
import Fastify, { type FastifyInstance } from "fastify";
import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type AuctionManagerServerOptions = {
  logger?: boolean;
  webDistPath?: string;
};

const currentModuleDirectory = dirname(fileURLToPath(import.meta.url));
const defaultWebDistPath = resolve(currentModuleDirectory, "../../web/dist");
const playerCsvPreviewBodyLimitBytes = 256 * 1024;

export async function createAuctionManagerServer(
  options: AuctionManagerServerOptions = {}
): Promise<FastifyInstance> {
  const webDistPath = resolve(options.webDistPath ?? defaultWebDistPath);
  await assertBuiltWebAppExists(webDistPath);

  const app = Fastify({
    logger: options.logger ?? false
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
        return parsePlayerCsvForSetup(request.body);
      } catch {
        return reply.code(500).send({
          ok: false,
          error: "preview_failed",
          message: "Player CSV preview could not be completed. Try reimporting the file."
        });
      }
    }
  );

  app.setErrorHandler((error, request, reply) => {
    const fastifyError = toFastifyError(error);

    if (isBodyTooLargeError(fastifyError)) {
      return reply.code(413).send({
        ok: false,
        error: "upload_too_large",
        message: "Player CSV exceeds the 256 KB upload limit."
      });
    }

    request.log.error(error);
    return reply.code(fastifyError.statusCode ?? 500).send({
      ok: false,
      error: "internal_error",
      message: "Player CSV preview could not be completed."
    });
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

    return reply.type("text/html").sendFile("index.html");
  });

  return app;
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
