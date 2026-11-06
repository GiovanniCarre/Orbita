import { describe, expect, it, vi } from "vitest";
import { loadIntegrations } from "./integrations";

describe("integrations", () => {
  it("reports an unavailable API", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 503 }));
    await expect(loadIntegrations(fetcher)).rejects.toThrow("API indisponible");
  });
});
