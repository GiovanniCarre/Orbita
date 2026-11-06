<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { page } from "$app/state";
  import {
    loadEnabledModules,
    moduleForPath,
    type FrontendModule,
  } from "$lib/modules";

  let { children }: { children: Snippet } = $props();
  let enabled = $state<FrontendModule[]>([]);
  let status = $state<"loading" | "ready" | "error">("loading");

  onMount(async () => {
    try {
      enabled = await loadEnabledModules();
      status = "ready";
    } catch {
      status = "error";
    }
  });

  const current = $derived(moduleForPath(page.url.pathname));
  const disabled = $derived(
    status === "ready" &&
      current !== undefined &&
      !enabled.some((module) => module.id === current.id),
  );
</script>

{#if status === "ready" && enabled.length > 0}
  <nav aria-label="Modules">
    {#each enabled as module (module.id)}
      <a
        href={module.href}
        aria-current={current?.id === module.id ? "page" : undefined}
        >{module.label}</a
      >
    {/each}
  </nav>
{/if}

{#if disabled}
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
