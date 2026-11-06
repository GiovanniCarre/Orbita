import { expect, test } from "@playwright/test";
import { sessionToken } from "./fixtures";

test("asks a signed-out visitor to sign in with Google", async ({ page }) => {
  await page.goto("/social");
  await expect(
    page.getByRole("link", { name: "Se connecter avec Google" }),
  ).toHaveAttribute("href", "/api/auth/google/login");
  await expect(page.getByLabel("Fichier vidéo")).toHaveCount(0);
});

test("explains a refused account", async ({ page }) => {
  await page.goto("/?auth=denied");
  await expect(page.getByRole("alert")).toContainText("pas autorisé");
});

test("refuses a session for another account", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "orbita_session",
      value: sessionToken("intruder@example.test"),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Se connecter avec Google" }),
  ).toBeVisible();
});
