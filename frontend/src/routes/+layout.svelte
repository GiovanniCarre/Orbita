<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { page } from "$app/state";
  import Login from "$lib/Login.svelte";
  import { authMessage, loadSession, logout, type Session } from "$lib/auth";
  import {
    loadEnabledModules,
    moduleForPath,
    type FrontendModule,
  } from "$lib/modules";

  let { children }: { children: Snippet } = $props();
  let session = $state<Session | null>(null);
  let enabled = $state<FrontendModule[]>([]);
  let status = $state<"loading" | "signed-out" | "ready" | "error">("loading");

  onMount(async () => {
    try {
      session = await loadSession();
      if (!session) {
        status = "signed-out";
        return;
      }
      enabled = await loadEnabledModules();
      status = "ready";
    } catch {
      status = "error";
    }
  });

  async function signOut() {
    await logout().catch(() => undefined);
    window.location.assign("/");
  }

  const current = $derived(moduleForPath(page.url.pathname));
  const disabled = $derived(
    status === "ready" &&
      current !== undefined &&
      !enabled.some((module) => module.id === current.id),
  );
</script>

{#if status === "ready"}
  <nav aria-label="Modules">
    {#each enabled as module (module.id)}
      <a
        href={module.href}
        aria-current={current?.id === module.id ? "page" : undefined}
        >{module.label}</a
      >
    {/each}
    <span class="account">{session?.email}</span>
    <button type="button" onclick={signOut}>Se déconnecter</button>
  </nav>
{/if}

{#if status === "loading"}
  <p class="loading">Chargement…</p>
{:else if status === "signed-out"}
  <Login message={authMessage(page.url.searchParams.get("auth"))} />
{:else if disabled}
  <main class="disabled">
    <h1>Module désactivé</h1>
    <p>
      Ce module n’est pas activé sur cette instance d’Orbita. Ajoutez-le à
      <code>ORBITA_MODULES</code> puis redémarrez l’API.
    </p>
  </main>
{:else}
  {@render children()}
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: #10131d;
    color: #f5f4f0;
    font-family: Arial, sans-serif;
  }
  nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 1120px;
    margin: auto;
    padding: 20px 32px 0;
  }
  nav a {
    color: #acafbd;
    text-decoration: none;
    font-size: 0.85rem;
    padding: 8px 14px;
    border: 1px solid #333744;
    border-radius: 20px;
  }
  nav a[aria-current="page"] {
    color: #f5f4f0;
    border-color: #b7a5ee;
  }
  .account {
    margin-left: auto;
    align-self: center;
    color: #7f8293;
    font-size: 0.8rem;
  }
  nav button {
    background: none;
    border: 1px solid #333744;
    border-radius: 20px;
    color: #acafbd;
    font: inherit;
    font-size: 0.85rem;
    padding: 8px 14px;
    cursor: pointer;
  }
  .loading {
    text-align: center;
    color: #7f8293;
    margin-top: 20vh;
  }
  .disabled {
    max-width: 1120px;
    margin: auto;
    padding: 64px 32px;
    color: #acafbd;
  }
  .disabled h1 {
    color: #f5f4f0;
  }
  @media (max-width: 600px) {
    nav {
      padding: 16px 20px 0;
    }
  }
</style>
