import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  Inbox,
  LoaderCircle,
  Mail as MailIcon,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { api } from './api';
import { useWorkspace } from './context';
import { activeProjects, dateLabel, priorityLabels } from './selectors';
import { Badge, Dialog, Empty, PageTitle } from './ui';
import type { AiRun, Mail, Proposal } from './types';

export function Assistant() {
  const { data, canWrite, endpoint, refresh, notify, go } = useWorkspace();
  const [prompt, setPrompt] = useState('');
  const [projectId, setProject] = useState(activeProjects(data.projects)[0]?.id || '');
  const [selectedId, setSelectedId] = useState(data.runs[0]?.id || '');
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const run = data.runs.find((item) => item.id === selectedId);
  useEffect(() => {
    setProposals(run?.result?.tasks || []);
    setChecked(new Set((run?.result?.tasks || []).map((_, index) => index)));
    if (run?.projectId) setProject(run.projectId);
  }, [run?.id, run?.status, run?.acceptedAt]);
  async function generate(event: FormEvent) {
    event.preventDefault();
    if (generating || !canWrite) return;
    setGenerating(true);
    setError('');
    try {
      const result = await api<AiRun>(endpoint('/ai/runs'), {
        method: 'POST',
        body: { projectId: projectId || null, prompt },
      });
      setSelectedId(result.id);
      await refresh();
      if (result.status === 'FAILED') setError(result.errorMessage || 'La génération a échoué.');
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  async function accept() {
    if (accepting || !run) return;
    setAccepting(true);
    setError('');
    try {
      const tasks = proposals.filter((_, index) => checked.has(index));
      await api(endpoint('/ai/runs/' + run.id + '/accept'), {
        method: 'POST',
        body: { projectId, tasks },
      });
      await refresh();
      notify(tasks.length + (tasks.length === 1 ? ' tâche créée.' : ' tâches créées.'));
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setAccepting(false);
    }
  }
  function update(index: number, key: keyof Proposal, value: string) {
    setProposals((previous) =>
      previous.map((proposal, n) => (n === index ? { ...proposal, [key]: value } : proposal)),
    );
  }
  const configured = data.connections.ai.configured;
  return (
    <>
      <PageTitle
        eyebrow="UNE AUTRE FAÇON D’AVANCER"
        title="Pensez à voix haute. Orbita vous aide."
        description="Un objectif en tête ? Préparez un plan, puis gardez la main sur la suite."
        action={
          <Badge tone={configured ? 'green' : 'neutral'}>
            <span className="live-dot" />
            {configured
              ? data.connections.ai.provider + ' · ' + data.connections.ai.model
              : 'IA à configurer'}
          </Badge>
        }
      />
      <div className="assistant-layout">
        <aside className="panel ai-history">
          <div className="panel-heading">
            <h2>Vos réflexions</h2>
            <Sparkles size={17} />
          </div>
          <button
            className="new-conversation"
            onClick={() => {
              setSelectedId('');
              setPrompt('');
              setProposals([]);
              setError('');
            }}
            disabled={generating}
          >
            <Plus size={16} />
            Nouvelle demande
          </button>
          {data.runs.map((item) => (
            <button
              key={item.id}
              className={'history-run' + (selectedId === item.id ? ' active' : '')}
              disabled={generating}
              onClick={() => {
                setSelectedId(item.id);
                setError('');
              }}
            >
              <span>{item.prompt}</span>
              <small>
                {dateLabel(item.createdAt)}
                {item.acceptedAt ? ' · Validée' : item.status === 'FAILED' ? ' · Échec' : ''}
              </small>
            </button>
          ))}
          {!data.runs.length && (
            <p className="history-empty">
              Vos demandes et propositions resteront accessibles ici, uniquement pour vous.
            </p>
          )}
          <div className="ai-context-note">
            <ShieldCheck size={18} />
            <p>
              Le contexte comprend les projets, les tâches et les notes partagées de cet espace. Vos
              notes privées restent à part.
            </p>
          </div>
        </aside>
        <section className="assistant-workspace">
          {!configured && (
            <div className="configuration-callout">
              <span className="connection-icon purple">
                <Sparkles size={24} />
              </span>
              <div>
                <h3>Votre assistant attend sa connexion.</h3>
                <p>
                  Choisissez OpenAI ou un modèle local Ollama sur le serveur. Vos demandes
                  utiliseront alors un véritable modèle IA.
                </p>
              </div>
              <button className="button secondary" onClick={() => go('settings')}>
                <Settings2 size={15} />
                Voir les connexions
              </button>
            </div>
          )}
          {!run && !generating && (
            <div className="assistant-welcome">
              <span className="assistant-sparkle">
                <Sparkles size={32} strokeWidth={1.4} />
              </span>
              <h2>
                Faisons un peu de place
                <br />à vos prochaines idées.
              </h2>
              <p>
                Je peux vous aider à clarifier un objectif et à le transformer en tâches concrètes,
                prêtes à être relues.
              </p>
              <div className="prompt-suggestions">
                {[
                  [
                    'Clarifier une idée',
                    'Aide-moi à clarifier les objectifs et les prochaines étapes de ce projet.',
                  ],
                  [
                    'Préparer un lancement',
                    'Propose un plan de lancement réaliste pour ce projet, en indiquant les informations qui manquent.',
                  ],
                  [
                    'Débloquer la suite',
                    'Analyse les tâches de ce projet et propose les prochaines actions pour lever les blocages.',
                  ],
                ].map(([title, text]) => (
                  <button key={title} onClick={() => setPrompt(text)}>
                    <WandSparkles size={17} />
                    <span>{title}</span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {generating && (
            <div className="ai-thinking" role="status">
              <span className="assistant-sparkle">
                <LoaderCircle className="spin" size={30} />
              </span>
              <h2>Vos idées prennent forme.</h2>
              <p>
                Le modèle prépare une réponse avec le contexte autorisé. Aucune tâche n’est créée
                automatiquement.
              </p>
            </div>
          )}
          {run && !generating && (
            <div className="ai-result">
              <div className="user-request">
                <span>VOTRE DEMANDE</span>
                <p>{run.prompt}</p>
                <small>
                  {dateLabel(run.createdAt, {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </div>
              {run.status === 'FAILED' ? (
                <div className="form-error">
                  <CircleAlert size={18} />
                  {run.errorMessage}
                </div>
              ) : run.status === 'RUNNING' ? (
                <div className="info-box">
                  <Clock3 size={18} />
                  Cette demande est encore en cours. Actualisez pour retrouver son résultat.
                </div>
              ) : (
                run.result && (
                  <>
                    <div className="ai-answer">
                      <div className="answer-label">
                        <span className="brand-mark mini">
                          <Sparkles size={15} />
                        </span>
                        <strong>La proposition d’Orbita</strong>
                        <Badge>{run.provider}</Badge>
                      </div>
                      <p>{run.result.summary}</p>
                    </div>
                    {proposals.length > 0 && (
                      <div className="proposal-section">
                        <div className="proposal-heading">
                          <div>
                            <h3>Des prochaines actions concrètes</h3>
                            <p>Relisez, ajustez et sélectionnez les tâches à créer.</p>
                          </div>
                          <Badge>{proposals.length} propositions</Badge>
                        </div>
                        {proposals.map((proposal, index) => (
                          <article
                            className={'proposal-card' + (checked.has(index) ? ' selected' : '')}
                            key={index}
                          >
                            <label className="proposal-selection">
                              <input
                                type="checkbox"
                                checked={checked.has(index)}
                                disabled={!!run.acceptedAt || !canWrite || accepting}
                                onChange={(event) =>
                                  setChecked((previous) => {
                                    const next = new Set(previous);
                                    event.target.checked ? next.add(index) : next.delete(index);
                                    return next;
                                  })
                                }
                              />
                              <span>Proposition {String(index + 1).padStart(2, '0')}</span>
                            </label>
                            <div className="proposal-edit">
                              <input
                                aria-label={'Titre de la proposition ' + (index + 1)}
                                value={proposal.title}
                                onChange={(event) => update(index, 'title', event.target.value)}
                                maxLength={160}
                                disabled={!!run.acceptedAt || !canWrite || accepting}
                              />
                              <textarea
                                aria-label={'Description de la proposition ' + (index + 1)}
                                value={proposal.description}
                                onChange={(event) =>
                                  update(index, 'description', event.target.value)
                                }
                                maxLength={8000}
                                rows={2}
                                disabled={!!run.acceptedAt || !canWrite || accepting}
                              />
                              <label>
                                Critères d’acceptation
                                <textarea
                                  value={proposal.acceptance}
                                  onChange={(event) =>
                                    update(index, 'acceptance', event.target.value)
                                  }
                                  maxLength={4000}
                                  rows={2}
                                  disabled={!!run.acceptedAt || !canWrite || accepting}
                                />
                              </label>
                              <select
                                aria-label={'Priorité de la proposition ' + (index + 1)}
                                value={proposal.priority}
                                disabled={!!run.acceptedAt || !canWrite || accepting}
                                onChange={(event) => update(index, 'priority', event.target.value)}
                              >
                                {Object.entries(priorityLabels).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </article>
                        ))}
                        {run.acceptedAt ? (
                          <div className="approval-complete">
                            <CheckCheck size={19} />
                            <span>Propositions validées et tâches créées.</span>
                            <button className="text-button" onClick={() => go('tasks')}>
                              Voir les tâches
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        ) : (
                          canWrite && (
                            <div className="proposal-approval">
                              <span>
                                {checked.size} proposition{checked.size > 1 ? 's' : ''} sélectionnée
                                {checked.size > 1 ? 's' : ''}
                              </span>
                              <button
                                className="button primary"
                                onClick={accept}
                                disabled={
                                  accepting ||
                                  !checked.size ||
                                  !projectId ||
                                  proposals.some(
                                    (proposal, index) =>
                                      checked.has(index) &&
                                      (!proposal.title.trim() ||
                                        !proposal.description.trim() ||
                                        !proposal.acceptance.trim()),
                                  )
                                }
                              >
                                {accepting ? (
                                  <LoaderCircle size={17} className="spin" />
                                ) : (
                                  <Check size={17} />
                                )}
                                Valider et créer les tâches
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <form className="ai-composer" onSubmit={generate}>
            <div className="composer-context">
              <Sparkles size={15} />
              <span>Contexte</span>
              <select
                aria-label="Projet utilisé par l’assistant"
                value={projectId}
                onChange={(event) => setProject(event.target.value)}
                disabled={generating || accepting}
              >
                <option value="">Tout l’espace</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              aria-label="Votre demande à l’assistant IA"
              placeholder="Décrivez ce que vous souhaitez faire avancer…"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              minLength={5}
              maxLength={4000}
              required
              rows={3}
              disabled={!canWrite || generating}
            />
            <footer>
              <span>{prompt.length}/4 000 · Relisez toujours les propositions.</span>
              <button
                className="button primary"
                disabled={!configured || !canWrite || generating || prompt.trim().length < 5}
                aria-label="Préparer un plan IA"
              >
                {generating ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={18} />}
                <span>Préparer le plan</span>
              </button>
            </footer>
          </form>
          <p className="ai-disclaimer">
            L’IA peut se tromper. Vous choisissez les tâches qui entrent dans votre projet ; aucune
            action externe n’est déclenchée.
          </p>
        </section>
      </div>
    </>
  );
}

export function Mails() {
  const { data, canWrite, isAdmin, edit, go, endpoint, refresh, notify } = useWorkspace();
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelected] = useState('');
  const [confirmation, setConfirmation] = useState<Mail | null>(null);
  const [sending, setSending] = useState(false);
  const list = data.mails.filter((mail) => filter === 'all' || mail.status === filter);
  const selected = list.find((mail) => mail.id === selectedId) || list[0];
  function create() {
    if (!data.contacts.some((contact) => contact.email && !contact.optedOut)) {
      notify('Ajoutez d’abord un contact avec une adresse e-mail utilisable.');
      edit({ kind: 'contact' });
    } else edit({ kind: 'mail' });
  }
  async function send() {
    if (!confirmation || sending) return;
    setSending(true);
    try {
      const result = await api<Mail>(endpoint('/mails/' + confirmation.id + '/send'), {
        method: 'POST',
        body: { version: confirmation.version },
      });
      setConfirmation(null);
      await refresh();
      notify(
        result.status === 'ACCEPTED'
          ? 'Le serveur SMTP a accepté le message.'
          : 'Résultat incertain : vérifiez le fournisseur avant toute autre action.',
        result.status !== 'ACCEPTED',
      );
    } catch (problem) {
      notify((problem as Error).message, true);
    } finally {
      setSending(false);
    }
  }
  const statusLabels = {
    DRAFT: 'Brouillon',
    SENDING: 'Envoi engagé',
    ACCEPTED: 'Accepté par SMTP',
    RECONCILE: 'À vérifier',
  };
  return (
    <>
      <PageTitle
        eyebrow="CHAQUE ÉCHANGE A SON CONTEXTE"
        title="Les bons mots, au bon endroit."
        description="Préparez vos messages et validez chaque envoi."
        action={
          <>
            <Badge tone={data.connections.smtp.configured ? 'green' : 'neutral'}>
              {data.connections.smtp.configured ? 'SMTP configuré' : 'Envoi à configurer'}
            </Badge>
            {canWrite && (
              <button className="button primary" onClick={create}>
                <Plus size={17} />
                Nouveau message
              </button>
            )}
          </>
        }
      />
      <div className="mail-layout">
        <aside className="panel mail-list">
          <div className="tabs mail-tabs">
            {[
              ['all', 'Tous'],
              ['DRAFT', 'Brouillons'],
              ['ACCEPTED', 'Acceptés'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? 'active' : ''}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {list.map((mail) => (
            <button
              key={mail.id}
              className={'mail-item' + (selected?.id === mail.id ? ' active' : '')}
              onClick={() => setSelected(mail.id)}
            >
              <div>
                <strong>
                  {data.contacts.find((contact) => contact.id === mail.contactId)?.name ||
                    mail.recipient}
                </strong>
                <small>{dateLabel(mail.createdAt)}</small>
              </div>
              <h3>{mail.subject}</h3>
              <p>{mail.body}</p>
              <Badge
                tone={
                  mail.status === 'ACCEPTED'
                    ? 'green'
                    : mail.status === 'RECONCILE'
                      ? 'red'
                      : 'neutral'
                }
              >
                {statusLabels[mail.status]}
              </Badge>
            </button>
          ))}
          {!list.length && (
            <Empty
              title="La place pour votre prochain échange."
              description="Vos brouillons et les résultats d’envoi apparaîtront ici."
              icon={<Inbox size={27} />}
            />
          )}
        </aside>
        <section className="panel mail-detail">
          {selected ? (
            <>
              <header>
                <Badge tone={selected.status === 'ACCEPTED' ? 'green' : 'neutral'}>
                  {statusLabels[selected.status]}
                </Badge>
                <span>
                  {dateLabel(selected.createdAt, {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </header>
              <h2>{selected.subject}</h2>
              <div className="mail-recipient">
                <span>À</span>
                <strong>{selected.recipient}</strong>
                {selected.projectId && (
                  <Badge>
                    {data.projects.find((project) => project.id === selected.projectId)?.name}
                  </Badge>
                )}
              </div>
              <div className="mail-body">{selected.body}</div>
              {selected.status === 'RECONCILE' && (
                <div className="info-box warning">
                  <CircleAlert size={19} />
                  <span>
                    Le résultat fournisseur est incertain. Aucune nouvelle tentative automatique
                    n’est effectuée. Vérifiez la boîte d’envoi ou les journaux SMTP avant de
                    préparer un autre message.
                  </span>
                </div>
              )}
              {selected.status === 'ACCEPTED' && (
                <div className="info-box">
                  <CheckCheck size={19} />
                  <span>
                    Le serveur SMTP a accepté ce message. Cela ne garantit ni sa distribution finale
                    ni sa lecture.
                  </span>
                </div>
              )}
              <footer>
                {selected.status === 'DRAFT' && canWrite && (
                  <button
                    className="button secondary"
                    onClick={() => edit({ kind: 'mail', item: selected })}
                  >
                    Modifier le brouillon
                  </button>
                )}
                {selected.status === 'DRAFT' &&
                  isAdmin &&
                  (data.connections.smtp.configured ? (
                    <button className="button primary" onClick={() => setConfirmation(selected)}>
                      <Send size={16} />
                      Relire et envoyer
                    </button>
                  ) : (
                    <button className="button secondary" onClick={() => go('settings')}>
                      <Settings2 size={16} />
                      Configurer l’envoi
                    </button>
                  ))}
                {selected.status === 'DRAFT' && !isAdmin && (
                  <span className="muted">L’envoi est réservé aux administrateurs.</span>
                )}
              </footer>
            </>
          ) : (
            <Empty
              title="Un échange à préparer ?"
              description="Choisissez un contact, écrivez votre message, puis relisez-le avant l’envoi."
              icon={<MailIcon size={30} strokeWidth={1.3} />}
              action={
                canWrite && (
                  <button className="button secondary" onClick={create}>
                    <Plus size={16} />
                    Préparer un message
                  </button>
                )
              }
            />
          )}
        </section>
      </div>
      <p className="page-footnote">
        <ShieldCheck size={14} />
        Cette première version gère les brouillons et l’envoi SMTP. La réception et la
        synchronisation Gmail restent à venir.
      </p>
      {confirmation && (
        <Dialog
          title="Confirmer l’envoi du message ?"
          onClose={() => setConfirmation(null)}
          busy={sending}
          wide
        >
          <div className="send-review">
            <p>
              <strong>Destinataire :</strong> {confirmation.recipient}
            </p>
            <p>
              <strong>Objet :</strong> {confirmation.subject}
            </p>
            <div className="send-body-preview">{confirmation.body}</div>
            <div className="info-box warning">
              <Send size={18} />
              <span>Cette action transmet réellement le message au serveur SMTP configuré.</span>
            </div>
          </div>
          <footer className="dialog-footer">
            <button
              className="button secondary"
              onClick={() => setConfirmation(null)}
              disabled={sending}
            >
              Revenir au brouillon
            </button>
            <button className="button primary" onClick={send} disabled={sending}>
              {sending ? <LoaderCircle size={17} className="spin" /> : <Send size={16} />}Confirmer
              et envoyer
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
