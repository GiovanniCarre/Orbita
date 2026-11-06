<script lang="ts">
  import { onMount } from "svelte";
  import { loadIntegrations, type Integration } from "./integrations";

  let integrations: Integration[] = [];
  let state: "loading" | "ready" | "error" = "loading";
  onMount(async () => {
    try {
      integrations = await loadIntegrations();
      state = "ready";
    } catch {
      state = "error";
    }
  });
</script>

<svelte:head><title>Orbita — Tableau de bord</title></svelte:head>
<main>
  <header>
    <span class="brand"><img src="/orbita-logo.png" alt="Orbita" /></span><span
      class="tag">ESPACE PERSONNEL</span
    >
  </header>
  <section>
    <p class="eyebrow">VOTRE ESPACE DE TRAVAIL</p>
    <h1>Vos projets avancent,<br /><em>pas à pas.</em></h1>
    <p class="intro">
      Retrouvez vos projets et automatisez leur suivi, à votre rythme.
    </p>
    <div class="section-title">
      <h2>Vos connexions</h2>
      <span>PREMIÈRE BRIQUE</span>
    </div>
    {#if state === "loading"}<p>Chargement…</p>
    {:else if state === "error"}<p role="alert">
        Impossible de joindre l'API. Vérifiez que le backend est démarré.
      </p>
    {:else}
      <div class="cards">
        {#each integrations as integration (integration.id)}
          <article>
            <div class="icon">✳</div>
            <h3>{integration.label}</h3>
            <p>{integration.description}</p>
            <span class="status">Non configuré</span>
          </article>
        {/each}
      </div>
    {/if}
    <p class="notice">
      Les connexions seront disponibles dans les prochaines étapes. Aucune
      donnée n'est simulée.
    </p>
  </section>
</main>

<style>
  main {
    max-width: 1120px;
    margin: auto;
    padding: 36px 32px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #333744;
    padding-bottom: 28px;
  }
  .brand {
    display: inline-flex;
    padding: 10px 14px;
    border-radius: 12px;
    background: #fff;
  }
  .brand img {
    display: block;
    width: 150px;
    height: auto;
  }
  .tag,
  .eyebrow,
  .section-title span {
    font-size: 0.7rem;
    letter-spacing: 0.16em;
    color: #a7a9b4;
  }
  section {
    padding-top: 82px;
  }
  h1 {
    font-size: clamp(2.8rem, 6vw, 5rem);
    line-height: 1.06;
    letter-spacing: -0.05em;
    margin: 20px 0;
  }
  em {
    font-style: normal;
    color: #b7a5ee;
  }
  .intro,
  article p,
  .notice {
    color: #acafbd;
    line-height: 1.6;
  }
  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 80px;
  }
  .section-title h2 {
    font-size: 1.2rem;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }
  article {
    background: #1b1e2a;
    border: 1px solid #333544;
    border-radius: 15px;
    padding: 24px;
    min-height: 190px;
  }
  .icon {
    color: #b7a5ee;
    font-size: 1.5rem;
  }
  h3 {
    margin: 20px 0 4px;
  }
  article p {
    font-size: 0.9rem;
    margin: 0 0 24px;
  }
  .status {
    font-size: 0.75rem;
    color: #e7c582;
    background: #383227;
    border-radius: 20px;
    padding: 7px 11px;
  }
  .notice {
    font-size: 0.85rem;
    margin-top: 28px;
  }
  @media (max-width: 600px) {
    main {
      padding: 24px 20px;
    }
    section {
      padding-top: 55px;
    }
    .tag {
      display: none;
    }
    .section-title {
      margin-top: 55px;
    }
  }
</style>
