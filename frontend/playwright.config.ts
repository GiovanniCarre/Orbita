import { defineConfig } from "@playwright/test";

const python = process.env.ORBITA_PYTHON || "python";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:5173", browserName: "chromium" },
  webServer: [
    {
      command: `"${python}" -m uvicorn app.main:app --app-dir ../backend --port 8000`,
      url: "http://127.0.0.1:8000/api/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
});
