import { expect, test } from "./fixtures";

test("prépare une vidéo et sélectionne les réseaux sans publication", async ({
  page,
}) => {
  await page.goto("/social");
  await page.getByLabel("Fichier vidéo").setInputFiles({
    name: "sportcooks.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("test"),
  });
  await page.getByLabel("Titre").fill("Une recette");
  await page.getByLabel("YouTube").check();
  await page.getByLabel("TikTok").check();
  await page.getByLabel("Pinterest").check();
  await expect(
    page.getByText("sportcooks.mp4", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Sélection : YouTube, TikTok, Pinterest.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("publication depuis Orbita n’est pas encore disponible", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Titre")).toHaveValue("");
});

test("refuse un fichier qui n'est pas une vidéo", async ({ page }) => {
  await page.goto("/social");
  await page.getByLabel("Fichier vidéo").setInputFiles({
    name: "image.png",
    mimeType: "image/png",
    buffer: Buffer.from("test"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "fichier vidéo non vide" }),
  ).toBeVisible();
});
