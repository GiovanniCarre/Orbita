import { describe, expect, it, vi } from "vitest";
import { authMessage, loadSession } from "./auth";

describe("auth", () => {
  it("returns the signed-in account", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ email: "me@example.test" }));
    await expect(loadSession(fetcher)).resolves.toEqual({
      email: "me@example.test",
    });
  });

  it("treats 401 as signed out", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 401 }));
    await expect(loadSession(fetcher)).resolves.toBeNull();
  });

  it("reports an unavailable API", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 502 }));
    await expect(loadSession(fetcher)).rejects.toThrow("API indisponible");
  });

  it("explains sign-in outcomes", () => {
    expect(authMessage("denied")).toContain("pas autorisé");
    expect(authMessage("unknown")).toBe("");
    expect(authMessage(null)).toBe("");
  });
});
