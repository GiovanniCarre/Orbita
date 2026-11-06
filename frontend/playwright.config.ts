import { defineConfig } from "@playwright/test";
import { e2eAuth } from "./e2e/fixtures";

const python = process.env.ORBITA_PYTHON || "python";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:5173", browserName: "chromium" },
  webServer: [
    {
      command: `"${python}" -m uvicorn app.main:app --app-dir ../backend --port 8000`,
      url: "http://127.0.0.1:8000/api/health",
      reuseExistingServer: false,
      env: {
        ORBITA_SESSION_SECRET: e2eAuth.secret,
        ORBITA_LOGIN_EMAIL: e2eAuth.email,
        ORBITA_PASSWORD_HASH: e2eAuth.passwordHash,
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
});
