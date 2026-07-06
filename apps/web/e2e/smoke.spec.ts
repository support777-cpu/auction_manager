import { expect, test } from "@playwright/test";

test("opens the setup-ready app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Auction Manager" })).toBeVisible();
  await expect(page.getByTestId("phase-indicator")).toContainText("Setup");
  await expect(page.getByTestId("setup-empty-state")).toContainText("No auction is loaded");
  await expect(page.getByRole("button", { name: "Start setup" })).toHaveAttribute(
    "data-testid",
    "setup-start"
  );
  await expect(page.getByText("Runs locally on this event PC")).toBeVisible();
});
