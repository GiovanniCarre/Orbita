import { expect, test } from "@playwright/test";

test("shows honest integration states from the API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "SportCooks" })).toBeVisible();
  await expect(page.getByText("Non configuré")).toHaveCount(3);
});

test("shows an API failure", async ({ page }) => {
  await page.route("**/api/integrations", (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Impossible de joindre");
});
