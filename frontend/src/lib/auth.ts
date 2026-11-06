export type Session = { email: string };

const loginErrors: Record<number, string> = {
  401: "Adresse ou mot de passe incorrect.",
  422: "Adresse ou mot de passe incorrect.",
  429: "Trop de tentatives. Réessayez dans quelques minutes.",
  503: "La connexion n’est pas configurée sur ce serveur (voir docs/running.md).",
};

export async function loadSession(
  fetcher: typeof fetch = fetch,
): Promise<Session | null> {
  const response = await fetcher("/api/auth/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("API indisponible");
  return (await response.json()) as Session;
}

export async function login(
  email: string,
  password: string,
  fetcher: typeof fetch = fetch,
): Promise<Session> {
  const response = await fetcher("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(loginErrors[response.status] ?? "Connexion impossible.");
  }
  return (await response.json()) as Session;
}

export async function logout(fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Déconnexion impossible");
}
