import fastifyStatic from "@fastify/static";
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

export async function createAuctionManagerServer(
  options: AuctionManagerServerOptions = {}
): Promise<FastifyInstance> {
  const webDistPath = resolve(options.webDistPath ?? defaultWebDistPath);
  await assertBuiltWebAppExists(webDistPath);

  const app = Fastify({
    logger: options.logger ?? false
  });

  app.get("/api/health", async () => ({
    ok: true,
    service: "auction-manager",
    mode: "event"
  }));

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

async function assertBuiltWebAppExists(webDistPath: string) {
  try {
    await access(join(webDistPath, "index.html"));
  } catch {
    throw new Error(
      `Built web app not found at ${webDistPath}. Run npm run build before starting event mode.`
    );
  }
}
