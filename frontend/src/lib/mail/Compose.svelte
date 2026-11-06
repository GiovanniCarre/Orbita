<script lang="ts">
  import { untrack } from "svelte";
  import { sendMail, type MailDetail } from "./mail";

  let {
    account,
    original,
    onclose,
  }: { account: string; original: MailDetail | null; onclose: () => void } =
    $props();
  const initialOriginal = untrack(() => original);
  let recipient = $state(initialOriginal?.reply_to ?? "");
  let subject = $state(
    initialOriginal
      ? initialOriginal.subject.toLowerCase().startsWith("re:")
        ? initialOriginal.subject
        : `Re: ${initialOriginal.subject}`
      : "",
  );
  let body = $state("");
  let busy = $state(false);
  let result = $state("");
  let uncertain = $state(false);
  const attemptId = crypto.randomUUID();

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (
      !confirm(
        `Envoyer cet e-mail depuis ${account} à ${recipient} ?\n\nObjet : ${subject}\n\n${body}`,
      )
    )
      return;
    busy = true;
    result = "";
    try {
      await sendMail({
        account,
        recipient,
        subject,
        body,
        attempt_id: attemptId,
        confirmed: true,
        ...(original ? { reply_to_id: original.id } : {}),
      });
      result = "Message envoyé.";
    } catch {
      uncertain = true;
      result =
        "Envoi non confirmé. Vérifie les messages envoyés dans Gmail avant de réessayer.";
    } finally {
      busy = false;
    }
  }
</script>

<form onsubmit={submit}>
  <h3>{original ? "Répondre" : "Nouveau message"}</h3>
  <p>Expéditeur : {account}</p>
  <label for="recipient">Destinataire</label>
  <input
    id="recipient"
    type="email"
    required
    bind:value={recipient}
    readonly={!!original}
  />
  <label for="subject">Objet</label>
  <input
    id="subject"
    required
    maxlength="200"
    bind:value={subject}
    readonly={!!original}
  />
  <label for="body">Message</label>
  <textarea id="body" rows="8" required bind:value={body}></textarea>
  {#if result}<p role="status">{result}</p>{/if}
  <div class="actions">
    <button
      type="submit"
      disabled={busy || uncertain || result === "Message envoyé."}
      >{busy ? "Envoi…" : "Vérifier et envoyer"}</button
    >
    <button type="button" class="secondary" onclick={onclose} disabled={busy}
      >Fermer</button
    >
  </div>
</form>

<style>
  form {
    display: grid;
    gap: 9px;
    margin-top: 24px;
    padding: 22px;
    border: 1px solid #515363;
    border-radius: 12px;
  }
  h3,
  p {
    margin: 0 0 8px;
  }
  p {
    color: #c5c5d1;
    overflow-wrap: anywhere;
  }
  label {
    margin-top: 6px;
    font-size: 0.86rem;
  }
  input,
  textarea {
    padding: 10px;
    background: #10131d;
    color: #f5f4f0;
    border: 1px solid #515363;
    border-radius: 8px;
    font: inherit;
  }
  textarea {
    resize: vertical;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
  }
  button {
    padding: 10px 14px;
    border: 0;
    border-radius: 8px;
    background: #b7a5ee;
    color: #10131d;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .secondary {
    color: #afb2c1;
    background: transparent;
    border: 1px solid #515363;
  }
</style>
