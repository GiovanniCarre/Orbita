import { expect, test } from "./fixtures";

test("lists the enabled modules in the navigation", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Modules" });
  await expect(nav.getByRole("link")).toHaveText([
    "Tableau de bord",
    "Messages",
    "Réseaux sociaux",
  ]);
});

test("hides a disabled module", async ({ page }) => {
  await page.route("**/api/modules", (route) =>
    route.fulfill({ json: { modules: ["overview"] } }),
  );
  await page.goto("/social");
  await expect(
    page.getByRole("heading", { name: "Module désactivé" }),
  ).toBeVisible();
  await expect(page.getByLabel("Fichier vidéo")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Modules" });
  await expect(nav.getByRole("link")).toHaveText(["Tableau de bord"]);
});
