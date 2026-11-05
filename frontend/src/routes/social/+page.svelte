<script lang="ts">
  import { onDestroy } from "svelte";
  import Connections from "$lib/social/Connections.svelte";
  import {
    platforms,
    selectedPlatforms,
    validVideo,
    type PlatformId,
  } from "$lib/social/platforms";

  let file: File | null = null;
  let previewUrl = "";
  let error = "";
  let title = "";
  let description = "";
  let selected: PlatformId[] = [];

  function selectFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const chosen = input.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    file = null;
    error = "";
    if (!chosen) return;
    if (!validVideo(chosen)) {
      error = "Choisis un fichier vidéo non vide.";
      input.value = "";
      return;
    }
    file = chosen;
    previewUrl = URL.createObjectURL(chosen);
  }

  onDestroy(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
</script>

<svelte:head><title>Réseaux sociaux — Orbita</title></svelte:head>
<main>
  <a class="back" href="/">← Tableau de bord</a>
  <p class="eyebrow">SPORTCOOKS · RÉSEAUX SOCIAUX</p>
  <h1>Préparer une vidéo</h1>
  <p class="intro">
    Prépare ton contenu pour YouTube, Instagram, Facebook, TikTok et Pinterest.
  </p>

  <aside>
    <strong>Connexion Meta et préparation du contenu</strong>
    <p>
      Tu peux connecter tes comptes professionnels ci-dessous. Le contenu vidéo
      reste local au navigateur et la publication depuis Orbita n’est pas encore
      disponible.
    </p>
  </aside>

  <Connections />

  <div class="layout">
    <section aria-labelledby="video-heading">
      <h2 id="video-heading">1. Choisir la vidéo</h2>
      <label for="video">Fichier vidéo</label>
      <input id="video" type="file" accept="video/*" onchange={selectFile} />
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      {#if file}
        <p class="file">
          {file.name} · {(file.size / 1024 / 1024).toFixed(1)} Mo
        </p>
        <video src={previewUrl} controls aria-label="Aperçu de la vidéo"
        ></video>
      {:else}
        <p class="hint">La vidéo reste dans ton navigateur.</p>
      {/if}
    </section>

    <section aria-labelledby="details-heading">
      <h2 id="details-heading">2. Préparer le texte</h2>
      <label for="title">Titre</label>
      <input
        id="title"
        type="text"
        bind:value={title}
        placeholder="Ex. Une recette SportCooks"
      />
      <label for="description">Description et hashtags</label>
      <textarea
        id="description"
        rows="6"
        bind:value={description}
        placeholder="Écris ta légende ici…"></textarea>
      <p class="hint">
        Tu peux reprendre ce texte lors de la publication sur chaque plateforme.
      </p>
    </section>
  </div>

  <section class="networks" aria-labelledby="networks-heading">
    <h2 id="networks-heading">3. Choisir les réseaux</h2>
    <div class="grid">
      {#each platforms as platform (platform.id)}
        <label class="network">
          <input type="checkbox" value={platform.id} bind:group={selected} />
          <span
            ><strong>{platform.label}</strong><small>{platform.detail}</small
            ></span
          >
          <span class="badge">Non connecté</span>
        </label>
      {/each}
    </div>
    {#if selected.length}
      <p class="hint">
        Sélection : {selectedPlatforms(selected)
          .map((item) => item.label)
          .join(", ")}. La publication n’est pas encore disponible.
      </p>
    {/if}
    <p class="hint">
      TikTok limite notamment l’accès à son API de publication pour les outils
      privés. Les conditions de chaque plateforme devront être vérifiées avant
      connexion.
    </p>
  </section>
</main>

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
  main {
    max-width: 1120px;
    margin: auto;
    padding: 40px 32px 80px;
  }
  .back {
    color: #c4b7ef;
    text-decoration: none;
  }
  .eyebrow {
    color: #b7a5ee;
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    margin-top: 64px;
  }
  h1 {
    font-size: clamp(2.4rem, 5vw, 4rem);
    letter-spacing: -0.04em;
    margin: 16px 0;
  }
  h2 {
    font-size: 1.1rem;
    margin: 0 0 24px;
  }
  .intro,
  .hint {
    color: #afb2c1;
    line-height: 1.6;
  }
  aside {
    border: 1px solid #665735;
    background: #29251d;
    border-radius: 14px;
    padding: 18px 22px;
    margin: 32px 0;
    color: #f3dba6;
  }
  aside p {
    margin: 8px 0 0;
    line-height: 1.5;
    font-size: 0.9rem;
  }
  .layout,
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  section {
    border: 1px solid #353746;
    background: #1b1e2a;
    border-radius: 15px;
    padding: 26px;
  }
  label:not(.network) {
    display: block;
    font-weight: bold;
    font-size: 0.88rem;
    margin: 18px 0 8px;
  }
  input[type="file"],
  input[type="text"],
  textarea {
    width: 100%;
    border: 1px solid #515363;
    border-radius: 8px;
    padding: 12px;
    background: #10131d;
    color: #f5f4f0;
    font: inherit;
  }
  textarea {
    resize: vertical;
  }
  video {
    max-height: 320px;
    max-width: 100%;
    border-radius: 8px;
  }
  .file,
  .hint {
    font-size: 0.86rem;
  }
  .error {
    color: #ffb4ae;
  }
  .networks {
    margin-top: 16px;
  }
  .network {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 16px;
    border: 1px solid #414353;
    border-radius: 10px;
    cursor: pointer;
  }
  .network input {
    accent-color: #b7a5ee;
  }
  .network small {
    display: block;
    color: #afb2c1;
    margin-top: 5px;
  }
  .badge {
    margin-left: auto;
    color: #e7c582;
    font-size: 0.75rem;
    white-space: nowrap;
  }
  @media (max-width: 650px) {
    main {
      padding: 28px 20px 50px;
    }
    .layout,
    .grid {
      grid-template-columns: 1fr;
    }
    .eyebrow {
      margin-top: 45px;
    }
  }
</style>
