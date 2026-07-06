import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAuctionManagerServer } from "./app.js";

describe("auction manager event server", () => {
  it("responds to the required API health route", async () => {
    const app = await createAuctionManagerServer({
      webDistPath: await createWebDistFixture()
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      service: "auction-manager",
      mode: "event"
    });

    await app.close();
  });

  it("serves the built React app from the Fastify process", async () => {
    const webDistPath = await createWebDistFixture();
    const app = await createAuctionManagerServer({ webDistPath });

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain('<div id="root">Auction Manager</div>');

    await app.close();
  });
});

async function createWebDistFixture() {
  const webDistPath = await mkdtemp(join(tmpdir(), "auction-manager-web-dist-"));
  await writeFile(
    join(webDistPath, "index.html"),
    '<!doctype html><html><body><div id="root">Auction Manager</div></body></html>'
  );

  return webDistPath;
}
