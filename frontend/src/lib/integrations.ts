export type Integration = {
  id: string;
  label: string;
  status: "not_configured";
  description: string;
};

export async function loadIntegrations(
  fetcher: typeof fetch = fetch,
): Promise<Integration[]> {
  const response = await fetcher("/api/integrations");
  if (!response.ok) throw new Error("API indisponible");
  return response.json() as Promise<Integration[]>;
}
