<script lang="ts">
  import { onMount } from "svelte";
  import Inbox from "$lib/mail/Inbox.svelte";
  import {
    connectGoogle,
    disconnectGoogle,
    loadMessages,
    loadStatus,
    type MailMessage,
    type MailStatus,
  } from "$lib/mail/mail";

  let status: MailStatus | null = null;
  let messages: MailMessage[] = [];
  let destination = "contact@sportcooks.fr";
  let loading = true;
  let busy = false;
  let error = "";
  let account = "";
  let newAccount = "giovannicarre1@gmail.com";

  async function refresh() {
    loading = true;
    error = "";
    try {
      status = await loadStatus();
      if (status.connected) {
        if (!status.accounts?.includes(account))
          account = status.accounts?.[0] ?? "";
        const data = await loadMessages(account);
        messages = data.messages;
        destination = data.destination;
      }
    } catch {
      error =
        "Impossible de récupérer les messages. Vérifie la connexion Gmail et réessaie.";
    } finally {
      loading = false;
    }
  }

  async function connect() {
    busy = true;
    error = "";
    try {
      window.location.assign(await connectGoogle(newAccount));
    } catch {
      error = "Impossible de lancer la connexion Google.";
      busy = false;
    }
  }

  async function disconnect() {
    if (!confirm("Retirer la connexion Gmail d’Orbita ?")) return;
    busy = true;
    try {
      await disconnectGoogle(account);
      messages = [];
      await refresh();
    } catch {
      error = "Impossible de retirer la connexion Gmail.";
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    const outcome = new URLSearchParams(window.location.search).get("google");
    void refresh().then(() => {
      if (outcome === "connection_failed")
        error =
          "La connexion Google a échoué. Vérifie le compte choisi et la configuration.";
    });
  });
</script>

<svelte:head><title>Messages — Orbita</title></svelte:head>
<main>
  <p class="eyebrow">VOTRE ESPACE DE TRAVAIL</p>
  <h1>Messages</h1>
  <p class="intro">Retrouve les e-mails de tes projets au même endroit.</p>
  <section>
    <div class="header">
      <div>
        <h2>SportCooks</h2>
        <p>Messages destinés à {destination}</p>
      </div>
      {#if status?.connected}<button
          type="button"
          onclick={refresh}
          disabled={loading}>Actualiser</button
        >{/if}
    </div>
    {#if loading}
      <p>Chargement…</p>
    {:else if error}
      <p class="error" role="alert">{error}</p>
      <button type="button" onclick={refresh}>Réessayer</button>
    {:else if !status?.configured}
      <p>
        La connexion Gmail doit d’abord être configurée par l’administrateur.
      </p>
    {:else if !status.connected}
      <p>Connecte un compte Gmail pour consulter les messages SportCooks.</p>
      <p class="hint">
        Google demandera les accès nécessaires à la lecture et à l’envoi. Orbita
        affichera seulement les messages adressés à SportCooks.
      </p>
      <label for="new-account">Adresse Gmail</label>
      <input id="new-account" type="email" bind:value={newAccount} />
      <button type="button" onclick={connect} disabled={busy || !newAccount}
        >Connecter Gmail</button
      >
    {:else}
      <label for="mail-account">Boîte connectée</label>
      <select id="mail-account" bind:value={account} onchange={refresh}>
        {#each status.accounts ?? [] as address}<option value={address}
            >{address}</option
          >{/each}
      </select>
      <p class="hint">
        Les messages envoyés utiliseront l’adresse Gmail sélectionnée.
      </p>
      {#key account}<Inbox {account} {messages} />{/key}
      <div class="add-account">
        <label for="additional-account">Ajouter une adresse Gmail</label>
        <input id="additional-account" type="email" bind:value={newAccount} />
        <button type="button" onclick={connect} disabled={busy || !newAccount}
          >Connecter</button
        >
      </div>
      <button
        class="secondary"
        type="button"
        onclick={disconnect}
        disabled={busy}>Retirer la connexion Gmail</button
      >
      <p class="hint">
        Retirer la connexion supprime le jeton d’Orbita. Tu peux aussi révoquer
        son accès dans ton compte Google.
      </p>
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 1120px;
    margin: auto;
    padding: 40px 32px 80px;
  }
  .eyebrow {
    color: #b7a5ee;
    font-size: 0.72rem;
    letter-spacing: 0.16em;
  }
  h1 {
    font-size: clamp(2.4rem, 5vw, 4rem);
    letter-spacing: -0.04em;
    margin: 16px 0;
  }
  .intro,
  .hint,
  section p {
    color: #afb2c1;
    line-height: 1.6;
  }
  section {
    margin-top: 32px;
    padding: 26px;
    background: #1b1e2a;
    border: 1px solid #353746;
    border-radius: 15px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .header p {
    margin-bottom: 0;
  }
  button {
    border: 0;
    border-radius: 9px;
    padding: 11px 16px;
    background: #b7a5ee;
    color: #10131d;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  .secondary {
    margin-top: 20px;
    background: transparent;
    color: #afb2c1;
    border: 1px solid #515363;
  }
  .hint {
    font-size: 0.86rem;
  }
  .error {
    color: #ffb4ae;
  }
  label {
    display: block;
    margin: 20px 0 8px;
    font-size: 0.86rem;
  }
  input,
  select {
    padding: 10px;
    background: #10131d;
    color: #f5f4f0;
    border: 1px solid #515363;
    border-radius: 8px;
    font: inherit;
  }
  .add-account {
    margin-top: 24px;
  }
  @media (max-width: 600px) {
    main {
      padding: 28px 20px 50px;
    }
    .header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
