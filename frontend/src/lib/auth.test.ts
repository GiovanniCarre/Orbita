import { describe, expect, it, vi } from "vitest";
import { loadSession, login } from "./auth";

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

  it("sends the credentials as JSON", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ email: "me@example.test" }));
    await login("me@example.test", "secret", fetcher);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "me@example.test",
      password: "secret",
    });
  });

  it("explains refused and throttled sign-ins", async () => {
    const refused = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 401 }));
    await expect(login("a", "b", refused)).rejects.toThrow("incorrect");
    const throttled = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 429 }));
    await expect(login("a", "b", throttled)).rejects.toThrow(
      "Trop de tentatives",
    );
  });
});
