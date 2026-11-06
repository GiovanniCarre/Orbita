<script lang="ts">
  import { login } from "./auth";

  let email = $state("");
  let password = $state("");
  let error = $state("");
  let pending = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    pending = true;
    error = "";
    try {
      await login(email, password);
      window.location.reload();
    } catch (failure) {
      error =
        failure instanceof Error ? failure.message : "Connexion impossible.";
      password = "";
      pending = false;
    }
  }
</script>

<main class="login">
  <span class="brand">◉ ORBITA</span>
  <h1>Connexion</h1>
  <form onsubmit={submit}>
    <label for="email">Adresse e-mail</label>
    <input
      id="email"
      type="email"
      autocomplete="username"
      required
      bind:value={email}
    />
    <label for="password">Mot de passe</label>
    <input
      id="password"
      type="password"
      autocomplete="current-password"
      required
      bind:value={password}
    />
    {#if error}<p role="alert" class="error">{error}</p>{/if}
    <button type="submit" disabled={pending}>
      {pending ? "Connexion…" : "Se connecter"}
    </button>
  </form>
</main>

<style>
  .login {
    max-width: 380px;
    margin: 12vh auto;
    padding: 32px;
    color: #acafbd;
  }
  .brand {
    font-weight: 800;
    letter-spacing: 0.2em;
    color: #f5f4f0;
  }
  h1 {
    color: #f5f4f0;
    margin: 32px 0 24px;
  }
  form {
    display: grid;
    gap: 8px;
  }
  label {
    font-size: 0.85rem;
    margin-top: 8px;
  }
  input {
    font: inherit;
    padding: 11px 14px;
    border-radius: 10px;
    border: 1px solid #333744;
    background: #1b1e2a;
    color: #f5f4f0;
  }
  .error {
    color: #f3a6a6;
    margin: 8px 0 0;
  }
  button {
    margin-top: 20px;
    padding: 12px 20px;
    border: none;
    border-radius: 24px;
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
</style>
