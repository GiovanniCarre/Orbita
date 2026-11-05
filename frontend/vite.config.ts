import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: { "/api": process.env.ORBITA_API_URL || "http://127.0.0.1:8000" },
  },
  test: { include: ["src/**/*.test.ts"] },
});
