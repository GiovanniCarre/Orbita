import { createHash, createHmac, scryptSync } from "node:crypto";
import { test as base } from "@playwright/test";

// Test-only account. The API receives these settings from playwright.config.ts.
const salt = Buffer.from("e2e-fixed-salt!!");
const password = "e2e password for tests only";
const passwordHash = `scrypt:32768:8:1:${salt.toString("base64url")}:${scryptSync(
  password,
  salt,
  64,
  { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
).toString("base64url")}`;

export const e2eAuth = {
  secret: "e2e-session-secret-for-tests-only-0123456789",
  email: "e2e@example.test",
  password,
  passwordHash,
};

/** Same format as backend/app/auth/session.py. */
export function sessionToken(email = e2eAuth.email): string {
  const payload = Buffer.from(
    JSON.stringify({
      email,
      exp: Math.floor(Date.now() / 1000) + 3600,
      pwd: createHash("sha256").update(passwordHash).digest("hex").slice(0, 16),
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", e2eAuth.secret)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

/** Tests run signed in as the e2e account. */
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
