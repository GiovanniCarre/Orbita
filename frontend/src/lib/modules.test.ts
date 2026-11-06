import { describe, expect, it, vi } from "vitest";
import { loadEnabledModules, moduleForPath } from "./modules";

describe("modules", () => {
  it("keeps only the modules enabled by the API", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ modules: ["social", "unknown"] }));
    const enabled = await loadEnabledModules(fetcher);
    expect(enabled.map((module) => module.id)).toEqual(["social"]);
  });

  it("reports an unavailable API", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 503 }));
    await expect(loadEnabledModules(fetcher)).rejects.toThrow(
      "API indisponible",
    );
  });

  it("finds the module that owns a page", () => {
    expect(moduleForPath("/")?.id).toBe("overview");
    expect(moduleForPath("/social")?.id).toBe("social");
    expect(moduleForPath("/social/accounts")?.id).toBe("social");
    expect(moduleForPath("/socialite")).toBeUndefined();
  });
});
