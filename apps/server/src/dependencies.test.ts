import Fastify from "fastify";
import { describe, expect, it } from "vitest";

describe("server dependencies", () => {
  it("serves a Fastify route through inject", async () => {
    const app = Fastify();
    app.get("/health", async () => ({ ok: true }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
