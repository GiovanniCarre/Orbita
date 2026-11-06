<script lang="ts">
  import { loginUrl } from "./auth";

  let { message }: { message: string } = $props();
</script>

<main class="login">
  <span class="brand">◉ ORBITA</span>
  <h1>Connexion</h1>
  <p>Orbita est réservé à son propriétaire.</p>
  {#if message}<p role="alert" class="error">{message}</p>{/if}
  <a class="button" href={loginUrl}>Se connecter avec Google</a>
</main>

<style>
  .login {
    max-width: 420px;
    margin: 12vh auto;
    padding: 32px;
    text-align: center;
    color: #acafbd;
  }
  .brand {
    font-weight: 800;
    letter-spacing: 0.2em;
    color: #f5f4f0;
  }
  h1 {
    color: #f5f4f0;
    margin: 32px 0 8px;
  }
  .error {
    color: #f3a6a6;
  }
  .button {
    display: inline-block;
    margin-top: 24px;
    padding: 12px 20px;
    border-radius: 24px;
    background: #b7a5ee;
    color: #10131d;
    font-weight: 700;
    text-decoration: none;
  }
</style>
