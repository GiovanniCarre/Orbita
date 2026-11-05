export type SocialProvider = "instagram" | "facebook";

export type SocialAccount = {
  id: string;
  platform: SocialProvider;
  provider_account_id: string;
  display_name: string;
};

export type SocialAvailability = Record<SocialProvider, boolean>;

export async function loadSocialConnections(fetcher: typeof fetch = fetch) {
  const [availabilityResponse, accountsResponse] = await Promise.all([
    fetcher("/api/social/meta/availability"),
    fetcher("/api/social/accounts"),
  ]);
  if (!availabilityResponse.ok || !accountsResponse.ok) {
    throw new Error("Impossible de charger les comptes sociaux");
  }
  return {
    availability: (await availabilityResponse.json()) as SocialAvailability,
    accounts: (await accountsResponse.json()) as SocialAccount[],
  };
}

export async function startSocialConnection(
  provider: SocialProvider,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const response = await fetcher(`/api/social/meta/${provider}/connect`);
  if (!response.ok) throw new Error("Connexion Meta non configurée");
  const result = (await response.json()) as { authorization_url: string };
  return result.authorization_url;
}

export async function disconnectSocialAccount(
  accountId: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(`/api/social/accounts/${accountId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Impossible de déconnecter ce compte");
}
