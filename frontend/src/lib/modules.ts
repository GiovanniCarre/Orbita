export type FrontendModule = {
  id: string;
  label: string;
  href: string;
};

// Every module the interface knows about; the API says which ones are enabled.
export const modules: FrontendModule[] = [
  { id: "overview", label: "Tableau de bord", href: "/" },
  { id: "mail", label: "Messages", href: "/mail" },
  { id: "social", label: "Réseaux sociaux", href: "/social" },
];

export async function loadEnabledModules(
  fetcher: typeof fetch = fetch,
): Promise<FrontendModule[]> {
  const response = await fetcher("/api/modules");
  if (!response.ok) throw new Error("API indisponible");
  const body = (await response.json()) as { modules: string[] };
  return modules.filter((module) => body.modules.includes(module.id));
}

export function moduleForPath(pathname: string): FrontendModule | undefined {
  return modules.find((module) =>
    module.href === "/"
      ? pathname === "/"
      : pathname === module.href || pathname.startsWith(`${module.href}/`),
  );
}
