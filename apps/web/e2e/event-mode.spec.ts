import { expect, test } from "@playwright/test";

test("serves the app shell and health endpoint from event mode", async ({
  page,
  request
}) => {
  const health = await request.get("/api/health");

  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({
    ok: true,
    service: "auction-manager",
    mode: "event"
  });

  await page.goto("/");

  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId("setup-empty-state")).toContainText("No auction is loaded");
  await expect(page.getByTestId("setup-start")).toBeVisible();
});
