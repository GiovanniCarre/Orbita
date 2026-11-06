export type Session = { email: string };

export const loginUrl = "/api/auth/google/login";

const messages: Record<string, string> = {
  denied: "Ce compte Google n’est pas autorisé à utiliser Orbita.",
  failed: "La connexion Google a échoué. Réessayez.",
  not_configured:
    "La connexion Google n’est pas configurée sur ce serveur (voir docs/running.md).",
};

export async function loadSession(
  fetcher: typeof fetch = fetch,
): Promise<Session | null> {
  const response = await fetcher("/api/auth/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("API indisponible");
  return (await response.json()) as Session;
}

export async function logout(fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Déconnexion impossible");
}

export function authMessage(outcome: string | null): string {
  return outcome ? (messages[outcome] ?? "") : "";
}
