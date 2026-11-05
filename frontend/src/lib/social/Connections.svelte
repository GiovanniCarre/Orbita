<script lang="ts">
  import { onMount } from "svelte";
  import {
    disconnectSocialAccount,
    loadSocialConnections,
    startSocialConnection,
    type SocialAccount,
    type SocialAvailability,
    type SocialProvider,
  } from "./connections";

  const providers: { id: SocialProvider; label: string }[] = [
    { id: "instagram", label: "Instagram professionnel" },
    { id: "facebook", label: "Page Facebook" },
  ];
  let availability: SocialAvailability = { instagram: false, facebook: false };
  let accounts: SocialAccount[] = [];
  let state: "loading" | "ready" | "error" = "loading";
  let busy = "";
  let message = "";

  onMount(async () => {
    const outcome = new URLSearchParams(window.location.search).get("meta");
    if (outcome === "connected") message = "Compte Meta connecté.";
    if (outcome === "no_accounts") {
      message = "Aucun compte admissible trouvé pour ces autorisations Meta.";
    }
    if (outcome === "connection_failed")
      message = "Meta n’a pas pu connecter le compte.";
    if (outcome === "oauth_cancelled") message = "Connexion annulée.";
    try {
      const result = await loadSocialConnections();
      availability = result.availability;
      accounts = result.accounts;
      state = "ready";
    } catch {
      state = "error";
    }
  });

  async function connect(provider: SocialProvider) {
    busy = provider;
    message = "";
    try {
      window.location.assign(await startSocialConnection(provider));
    } catch {
      message = "Vérifie la configuration Meta et réessaie.";
      busy = "";
    }
  }

  async function disconnect(account: SocialAccount) {
    busy = account.id;
    message = "";
    try {
      await disconnectSocialAccount(account.id);
      accounts = accounts.filter((item) => item.id !== account.id);
      message = `Jeton Orbita supprimé pour ${account.display_name}.`;
    } catch {
      message = "Impossible de déconnecter ce compte.";
    } finally {
      busy = "";
    }
  }
</script>

<section class="connections" aria-labelledby="accounts-heading">
  <h2 id="accounts-heading">Comptes connectés</h2>
  {#if state === "loading"}<p>Chargement des comptes…</p>
  {:else if state === "error"}
    <p role="alert">Impossible de joindre le stockage des comptes sociaux.</p>
  {:else}
    {#each providers as provider (provider.id)}
      <article>
        <div>
          <strong>{provider.label}</strong>
          {#if availability[provider.id]}
            <small>Connexion Meta disponible</small>
          {:else}
            <small>Accès Meta ou chiffrement à configurer dans .env</small>
          {/if}
        </div>
        <button
          type="button"
          disabled={!availability[provider.id] || busy !== ""}
          onclick={() => connect(provider.id)}
        >
          {busy === provider.id ? "Redirection…" : "Connecter"}
        </button>
      </article>
    {/each}
    {#each accounts as account (account.id)}
      <article class="account">
        <div>
          <strong>{account.display_name}</strong>
          <small
            >{account.platform === "instagram" ? "Instagram" : "Facebook"} · connecté</small
          >
        </div>
        <button
          type="button"
          class="remove"
          disabled={busy !== ""}
          onclick={() => disconnect(account)}
        >
          {busy === account.id ? "Suppression…" : "Retirer d’Orbita"}
        </button>
      </article>
    {/each}
  {/if}
  {#if message}<p class="message" role="status">{message}</p>{/if}
  <p class="hint">
    Instagram doit être un compte professionnel. Facebook se connecte par Page.
    Retirer un compte supprime son jeton stocké par Orbita. Cela ne révoque pas
    l’autorisation dans les réglages Meta. La publication depuis Orbita reste à
    configurer.
  </p>
</section>

<style>
  .connections {
    display: grid;
    gap: 12px;
    margin: 24px 0;
  }
  h2 {
    margin: 0 0 4px;
  }
  article {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    border: 1px solid #414353;
    border-radius: 10px;
    background: #1b1e2a;
  }
  small {
    display: block;
    color: #afb2c1;
    margin-top: 5px;
  }
  button {
    border: 0;
    border-radius: 8px;
    padding: 10px 14px;
    color: #10131d;
    background: #c4b7ef;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  button.remove {
    color: #f3dba6;
    background: #393126;
  }
  .message {
    color: #c4b7ef;
  }
  .hint {
    color: #afb2c1;
    line-height: 1.5;
    font-size: 0.86rem;
  }
</style>
