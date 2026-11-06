<script lang="ts">
  import Compose from "./Compose.svelte";
  import { readMessage, type MailDetail, type MailMessage } from "./mail";
  let { account, messages }: { account: string; messages: MailMessage[] } =
    $props();
  let selected = $state<MailDetail | null>(null);
  let composing = $state(false);
  let reply = $state<MailDetail | null>(null);
  let error = $state("");
  async function openMessage(id: string) {
    try {
      selected = await readMessage(account, id);
      composing = false;
      error = "";
    } catch {
      error = "Impossible de lire ce message.";
    }
  }
</script>

<button
  type="button"
  onclick={() => {
    reply = null;
    composing = true;
  }}>Nouveau message</button
>
{#if error}<p role="alert">{error}</p>{/if}
{#if messages.length === 0}
  <p>Aucun message correspondant parmi les derniers résultats.</p>
{:else}
  <ul>
    {#each messages as message (message.id)}
      <li>
        <button
          class="message-link"
          type="button"
          onclick={() => openMessage(message.id)}>{message.subject}</button
        >
        {#if message.unread}<span class="badge">Non lu</span>{/if}
        <p>{message.from}</p>
        <small>{message.date}</small>
      </li>
    {/each}
  </ul>
{/if}
{#if selected}
  <article>
    <h3>{selected.subject}</h3>
    <p>De : {selected.from}</p>
    <small>{selected.date}</small>
    <p class="body">
      {selected.body || "Aucun texte brut disponible dans ce message."}
    </p>
    <button
      type="button"
      onclick={() => {
        reply = selected;
        composing = true;
      }}
      disabled={!selected.reply_to}>Répondre</button
    >
  </article>
{/if}
{#if composing}{#key reply?.id ?? "new"}<Compose
      {account}
      original={reply}
      onclose={() => {
        composing = false;
      }}
    />{/key}{/if}

<style>
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
    cursor: not-allowed;
  }
  p,
  small {
    color: #afb2c1;
    line-height: 1.6;
  }
  small,
  .badge {
    font-size: 0.86rem;
  }
  ul {
    list-style: none;
    margin: 24px 0 0;
    padding: 0;
  }
  li {
    padding: 16px 0;
    border-top: 1px solid #353746;
    overflow-wrap: anywhere;
  }
  li p {
    margin: 6px 0 2px;
  }
  .badge {
    margin-left: 10px;
    color: #d7cbff;
  }
  .message-link {
    padding: 0;
    color: #f5f4f0;
    background: transparent;
    text-align: left;
  }
  .message-link:hover {
    text-decoration: underline;
  }
  article {
    margin-top: 24px;
    border-top: 1px solid #515363;
    padding-top: 20px;
  }
  .body {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
