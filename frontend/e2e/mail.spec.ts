import { expect, test } from "./fixtures";

test("shows the setup state when Gmail is not configured", async ({ page }) => {
  await page.goto("/mail");
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await expect(
    page.getByText("La connexion Gmail doit d’abord être configurée"),
  ).toBeVisible();
});

test("shows only the project messages returned by the API", async ({
  page,
}) => {
  await page.route("**/api/mail/status", (route) =>
    route.fulfill({
      json: { configured: true, connected: true, accounts: ["user@gmail.com"] },
    }),
  );
  await page.route("**/api/mail/projects/sportcooks/messages?*", (route) =>
    route.fulfill({
      json: {
        destination: "contact@sportcooks.fr",
        messages: [
          {
            id: "1",
            from: "Client",
            subject: "Commande",
            date: "Aujourd’hui",
            unread: true,
          },
        ],
      },
    }),
  );
  await page.goto("/mail");
  await expect(page.getByText("Commande")).toBeVisible();
  await expect(page.getByText("Non lu")).toBeVisible();
});

test("requires confirmation before sending a message", async ({ page }) => {
  await page.route("**/api/mail/status", (route) =>
    route.fulfill({
      json: { configured: true, connected: true, accounts: ["user@gmail.com"] },
    }),
  );
  await page.route("**/api/mail/projects/sportcooks/messages?*", (route) =>
    route.fulfill({
      json: { destination: "contact@sportcooks.fr", messages: [] },
    }),
  );
  let sends = 0;
  await page.route("**/api/mail/projects/sportcooks/send", (route) => {
    sends += 1;
    return route.fulfill({ json: { status: "sent", id: "fake" } });
  });
  await page.goto("/mail");
  await page.getByRole("button", { name: "Nouveau message" }).click();
  await page.getByLabel("Destinataire").fill("client@example.com");
  await page.getByLabel("Objet").fill("Bonjour");
  await page.getByLabel("Message", { exact: true }).fill("Texte de test");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Vérifier et envoyer" }).click();
  expect(sends).toBe(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Vérifier et envoyer" }).click();
  await expect(page.getByText("Message envoyé.")).toBeVisible();
  expect(sends).toBe(1);
});
