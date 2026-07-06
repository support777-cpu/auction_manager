import Fastify from "fastify";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = Fastify({
  logger: true
});

server.get("/health", async () => ({
  ok: true,
  service: "auction-manager"
}));

await server.listen({ host, port });
