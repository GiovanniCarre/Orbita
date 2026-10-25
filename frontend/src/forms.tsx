import { useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api } from './api';
import { priorityLabels, stageLabels, taskLabels } from './selectors';
import { Dialog, Field } from './ui';
import type { Editor, Me, Space, WorkspaceData } from './types';

export function EditorDialog({
  editor,
  onClose,
  me,
  space,
  data,
  refresh,
  refreshMe,
  notify,
  onSpaceCreated,
}: {
  editor: Editor;
  onClose: () => void;
  me: Me;
  space: Space | null;
  data: WorkspaceData | null;
  refresh: () => Promise<void>;
  refreshMe: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  onSpaceCreated?: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const existing = 'item' in editor ? editor.item : undefined;
  const readOnly = !!space && space.role === 'VIEWER' && editor.kind !== 'space';
  const mailLocked = editor.kind === 'mail' && !!editor.item && editor.item.status !== 'DRAFT';
  const titles = {
    project: existing ? 'Votre projet' : 'Un nouveau projet, un nouvel élan',
    archive: 'Archiver ce projet ?',
    task: existing ? 'Le détail de votre tâche' : 'Une prochaine action concrète',
    contact: existing ? 'La fiche de votre contact' : 'Une nouvelle relation à suivre',
    note: existing ? 'Votre note' : 'Capturez une idée',
    mail: existing ? 'Votre message' : 'Préparer un message',
    space: 'Un nouvel espace de travail',
    member: 'Ajouter un membre',
  };
  const projects = data?.projects || [];
  const projectOptions = projects.filter(
    (project) =>
      project.status !== 'ARCHIVED' ||
      (existing && 'projectId' in existing && existing.projectId === project.id),
  );
  const path = '/api/spaces/' + space?.id;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || readOnly || mailLocked) return;
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) || '').trim();
    setPending(true);
    setError('');
    try {
      if (editor.kind === 'space') {
        const result = await api<{ id: string }>('/api/spaces', {
          method: 'POST',
          body: { name: get('name') },
        });
        await refreshMe();
        onSpaceCreated?.(result.id);
        onClose();
        notify('Votre nouvel espace est prêt.');
        return;
      }
      if (!space) return;
      let collection = '';
      let body: Record<string, unknown> = {};
      let id: string | undefined;
      if (editor.kind === 'project') {
        collection = 'projects';
        id = editor.item?.id;
        body = {
          name: get('name'),
          description: get('description'),
          goal: get('goal'),
          color: get('color'),
          status: get('status'),
          website: get('website'),
          githubRepository: get('githubRepository'),
          version: editor.item?.version || 0,
        };
      } else if (editor.kind === 'archive') {
        collection = 'projects';
        id = editor.item.id;
        const { id: ignoredId, createdAt: ignoredDate, ...input } = editor.item;
        body = { ...input, status: 'ARCHIVED' };
      } else if (editor.kind === 'task') {
        collection = 'tasks';
        id = editor.item?.id;
        body = {
          projectId: get('projectId'),
          title: get('title'),
          description: get('description'),
          acceptance: get('acceptance'),
          status: get('status'),
          priority: get('priority'),
          blocked: form.get('blocked') === 'on',
          dueDate: get('dueDate') || null,
          assigneeId: get('assigneeId') || null,
          version: editor.item?.version || 0,
        };
      } else if (editor.kind === 'contact') {
        collection = 'contacts';
        id = editor.item?.id;
        body = {
          projectId: get('projectId') || null,
          name: get('name'),
          company: get('company'),
          email: get('email') || null,
          website: get('website'),
          stage: get('stage'),
          notes: get('notes'),
          version: editor.item?.version || 0,
        };
      } else if (editor.kind === 'note') {
        collection = 'notes';
        id = editor.item?.id;
        body = {
          projectId: get('projectId') || null,
          title: get('title'),
          content: get('content'),
          isPrivate:
            form.get('isPrivate') === 'on' ||
            (!!editor.item?.isPrivate && editor.item.authorId !== me.user.id),
          version: editor.item?.version || 0,
        };
      } else if (editor.kind === 'mail') {
        collection = 'mails';
        id = editor.item?.id;
        body = {
          projectId: get('projectId') || null,
          contactId: get('contactId'),
          subject: get('subject'),
          body: get('body'),
          version: editor.item?.version || 0,
        };
      } else if (editor.kind === 'member') {
        collection = 'members';
        body = { email: get('email'), role: get('role') };
      }
      await api(path + '/' + collection + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        body,
      });
      onClose();
      notify(
        editor.kind === 'archive'
          ? 'Projet archivé. Son historique est conservé.'
          : 'Enregistré dans votre espace.',
      );
      await refresh().catch((problem) => notify((problem as Error).message, true));
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setPending(false);
    }
  }

  function projectField(defaultValue = '', optional = false) {
    return (
      <Field label="Projet">
        <select
          name="projectId"
          defaultValue={defaultValue || (optional ? '' : projectOptions[0]?.id)}
          required={!optional}
        >
          {optional && <option value="">Tout l’espace</option>}
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
              {project.status === 'ARCHIVED' ? ' (archivé)' : ''}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <Dialog
      title={titles[editor.kind]}
      onClose={onClose}
      busy={pending}
      wide={editor.kind === 'note' || editor.kind === 'mail'}
    >
      <form onSubmit={submit}>
        <fieldset disabled={pending || readOnly || mailLocked} className="form-fields">
          {editor.kind === 'space' && (
            <>
              <p className="form-intro">
                Chaque espace garde ses projets, ses contacts et ses connexions séparés. Vous en
                serez propriétaire.
              </p>
              <Field label="Nom de l’espace">
                <input
                  name="name"
                  placeholder="Mon entreprise, mon studio…"
                  required
                  maxLength={100}
                  autoFocus
                />
              </Field>
            </>
          )}
          {editor.kind === 'member' && (
            <>
              <p className="form-intro">
                Ajoutez une personne qui a déjà créé un compte sur cette installation d’Orbita.
              </p>
              <Field label="Adresse e-mail du compte">
                <input name="email" type="email" required autoFocus />
              </Field>
              <Field label="Rôle">
                <select name="role" defaultValue="MEMBER">
                  <option value="MEMBER">Membre — lecture et modification</option>
                  <option value="VIEWER">Lecture seule</option>
                  {space?.role === 'OWNER' && <option value="ADMIN">Administrateur</option>}
                </select>
              </Field>
              <div className="info-box">
                <ShieldCheck size={18} />
                <span>
                  Les accès seront limités à cet espace. Les notes privées restent personnelles.
                </span>
              </div>
            </>
          )}
          {editor.kind === 'archive' && (
            <div className="archive-explanation">
              <span className="empty-icon">
                <Archive size={28} />
              </span>
              <p>
                <strong>{editor.item.name}</strong> quittera vos projets actifs. Ses tâches,
                contacts et notes resteront accessibles.
              </p>
              <p>Vous pourrez le réactiver depuis la liste des projets archivés.</p>
            </div>
          )}
          {editor.kind === 'project' && (
            <>
              <div className="form-row">
                <Field label="Nom du projet">
                  <input
                    name="name"
                    placeholder="Donnez un nom à votre idée"
                    defaultValue={editor.item?.name}
                    maxLength={120}
                    required
                    autoFocus
                  />
                </Field>
                <Field label="Couleur">
                  <input
                    className="color-input"
                    type="color"
                    name="color"
                    defaultValue={editor.item?.color || '#4b8b70'}
                    required
                  />
                </Field>
              </div>
              <Field label="Votre objectif">
                <textarea
                  name="goal"
                  rows={2}
                  placeholder="Quel résultat souhaitez-vous obtenir ?"
                  defaultValue={editor.item?.goal}
                  maxLength={2000}
                />
              </Field>
              <Field label="Description">
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Le contexte, l’offre, les grandes lignes…"
                  defaultValue={editor.item?.description}
                  maxLength={4000}
                />
              </Field>
              <Field label="État">
                <select name="status" defaultValue={editor.item?.status || 'ACTIVE'}>
                  <option value="ACTIVE">Actif</option>
                  <option value="PAUSED">En pause</option>
                  {editor.item?.status === 'ARCHIVED' && <option value="ARCHIVED">Archivé</option>}
                </select>
              </Field>
              <div className="form-row equal">
                <Field label="Site web (facultatif)">
                  <input
                    name="website"
                    type="url"
                    placeholder="https://…"
                    defaultValue={editor.item?.website}
                    maxLength={500}
                  />
                </Field>
                <Field label="Dépôt GitHub (facultatif)">
                  <input
                    name="githubRepository"
                    placeholder="propriétaire/dépôt"
                    defaultValue={editor.item?.githubRepository}
                    pattern="[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"
                    maxLength={200}
                  />
                </Field>
              </div>
            </>
          )}
          {editor.kind === 'task' && (
            <>
              <Field label="Titre de la tâche">
                <input
                  name="title"
                  placeholder="Une action claire, un résultat concret"
                  defaultValue={editor.item?.title}
                  maxLength={160}
                  required
                  autoFocus
                />
              </Field>
              {projectField(editor.item?.projectId)}
              <div className="form-row equal">
                <Field label="État">
                  <select name="status" defaultValue={editor.item?.status || 'BACKLOG'}>
                    {Object.entries(taskLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priorité">
                  <select name="priority" defaultValue={editor.item?.priority || 'MEDIUM'}>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editor.item?.description}
                  maxLength={8000}
                />
              </Field>
              <Field label="Critères d’acceptation">
                <textarea
                  name="acceptance"
                  rows={3}
                  placeholder="Comment saurez-vous que c’est terminé ?"
                  defaultValue={editor.item?.acceptance}
                  maxLength={4000}
                />
              </Field>
              <div className="form-row equal">
                <Field label="Échéance">
                  <input type="date" name="dueDate" defaultValue={editor.item?.dueDate || ''} />
                </Field>
                <Field label="Responsable">
                  <select name="assigneeId" defaultValue={editor.item?.assigneeId || ''}>
                    <option value="">Non attribuée</option>
                    {data?.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="checkbox-label">
                <input name="blocked" type="checkbox" defaultChecked={editor.item?.blocked} />
                <span>Cette tâche est bloquée</span>
              </label>
            </>
          )}
          {editor.kind === 'contact' && (
            <>
              <Field label="Nom du contact">
                <input
                  name="name"
                  defaultValue={editor.item?.name}
                  placeholder="Prénom et nom"
                  maxLength={120}
                  required
                  autoFocus
                />
              </Field>
              <div className="form-row equal">
                <Field label="Entreprise">
                  <input name="company" defaultValue={editor.item?.company} maxLength={160} />
                </Field>
                <Field label="Adresse e-mail">
                  <input
                    name="email"
                    type="email"
                    defaultValue={editor.item?.email || ''}
                    maxLength={254}
                  />
                </Field>
              </div>
              <Field label="Site web">
                <input
                  name="website"
                  type="url"
                  defaultValue={editor.item?.website}
                  placeholder="https://…"
                  maxLength={500}
                />
              </Field>
              <div className="form-row equal">
                {projectField(editor.item?.projectId || '', true)}
                <Field label="Étape du suivi">
                  <select name="stage" defaultValue={editor.item?.stage || 'DISCOVERED'}>
                    {Object.entries(stageLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Notes et provenance">
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={editor.item?.notes}
                  placeholder="Contexte de la relation, source des coordonnées, prochaine action…"
                  maxLength={8000}
                />
              </Field>
              {editor.item?.optedOut && (
                <div className="info-box warning">
                  <LockKeyhole size={18} />
                  <span>
                    Ce contact est exclu des envois. Son opposition reste conservée, même si son
                    adresse change.
                  </span>
                </div>
              )}
            </>
          )}
          {editor.kind === 'note' && (
            <>
              <Field label="Titre">
                <input
                  name="title"
                  defaultValue={editor.item?.title}
                  placeholder="Une idée à garder, une décision à noter…"
                  maxLength={160}
                  required
                  autoFocus
                />
              </Field>
              {projectField(editor.item?.projectId || '', true)}
              <Field label="Votre note">
                <textarea
                  className="note-textarea"
                  name="content"
                  rows={13}
                  defaultValue={editor.item?.content}
                  placeholder="Posez vos idées ici."
                  maxLength={30000}
                />
              </Field>
              <label className="checkbox-label">
                <input
                  name="isPrivate"
                  type="checkbox"
                  defaultChecked={editor.item?.isPrivate}
                  disabled={!!editor.item && editor.item.authorId !== me.user.id}
                />
                <span>Note privée — visible uniquement par son auteur</span>
              </label>
              <p className="form-hint">
                Seules les notes partagées sont utilisées comme contexte par l’assistant IA.
              </p>
            </>
          )}
          {editor.kind === 'mail' && (
            <>
              <Field label="Destinataire">
                <select name="contactId" defaultValue={editor.item?.contactId || ''} required>
                  <option value="" disabled>
                    Choisir un contact du CRM
                  </option>
                  {data?.contacts
                    .filter(
                      (contact) =>
                        contact.email &&
                        (!contact.optedOut || contact.id === editor.item?.contactId),
                    )
                    .map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} — {contact.email}
                      </option>
                    ))}
                </select>
              </Field>
              {projectField(editor.item?.projectId || '', true)}
              <Field label="Objet">
                <input
                  name="subject"
                  defaultValue={editor.item?.subject}
                  maxLength={300}
                  required
                  autoFocus
                />
              </Field>
              <Field label="Message">
                <textarea
                  name="body"
                  rows={12}
                  defaultValue={editor.item?.body}
                  maxLength={30000}
                  required
                />
              </Field>
              <div className="info-box">
                <ShieldCheck size={18} />
                <span>
                  L’enregistrement crée un brouillon. L’envoi demande une confirmation distincte et
                  un rôle administrateur.
                </span>
              </div>
            </>
          )}
        </fieldset>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <footer className="dialog-footer">
          <span className="form-hint">
            {readOnly
              ? 'Consultation en lecture seule'
              : mailLocked
                ? 'L’envoi a déjà été engagé'
                : 'Conservé dans votre espace'}
          </span>
          <div>
            <button type="button" className="button secondary" onClick={onClose} disabled={pending}>
              {readOnly || mailLocked ? 'Fermer' : 'Annuler'}
            </button>
            {!readOnly && !mailLocked && (
              <button
                className={'button ' + (editor.kind === 'archive' ? 'danger' : 'primary')}
                disabled={pending}
              >
                {pending ? (
                  <LoaderCircle size={17} className="spin" />
                ) : editor.kind === 'archive' ? (
                  'Confirmer l’archivage'
                ) : editor.kind === 'space' ? (
                  'Créer l’espace'
                ) : (
                  'Enregistrer'
                )}
              </button>
            )}
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
