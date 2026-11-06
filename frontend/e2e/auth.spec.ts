import { expect, test } from "@playwright/test";
import { e2eAuth, sessionToken } from "./fixtures";

test("signs in with email and password, then signs out", async ({ page }) => {
  await page.goto("/social");
  await expect(page.getByLabel("Fichier vidéo")).toHaveCount(0);
  await page.getByLabel("Adresse e-mail").fill(e2eAuth.email);
  await page.getByLabel("Mot de passe").fill(e2eAuth.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByLabel("Fichier vidéo")).toBeVisible();
  await expect(page.getByText(e2eAuth.email)).toBeVisible();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
});

test("refuses a wrong password", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Adresse e-mail").fill(e2eAuth.email);
  await page.getByLabel("Mot de passe").fill("not the password");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
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
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
});
