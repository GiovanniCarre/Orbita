import { createHmac } from "node:crypto";
import { test as base } from "@playwright/test";

// Must match the API settings passed to the web server in playwright.config.ts.
export const e2eAuth = {
  secret: "e2e-session-secret-for-tests-only-0123456789",
  email: "e2e@example.test",
};

export function sessionToken(email = e2eAuth.email): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  const signature = createHmac("sha256", e2eAuth.secret)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

/** Tests run signed in as the allowed e2e account. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addCookies([
      {
        name: "orbita_session",
        value: sessionToken(),
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await use(context);
  },
});

export { expect } from "@playwright/test";
