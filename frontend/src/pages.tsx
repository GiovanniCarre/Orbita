import { useState } from 'react';
import {
  Activity as ActivityIcon,
  Archive,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  GitBranch,
  ListTodo,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { api, download } from './api';
import { useWorkspace } from './context';
import {
  activeProjects,
  dateLabel,
  initials,
  matches,
  overdue,
  priorityLabels,
  progress,
  roleLabels,
  stageLabels,
  taskLabels,
} from './selectors';
import { Avatar, Badge, Dialog, Empty, LinkButton, Metric, PageTitle, PanelTitle } from './ui';
import type { Project, Task, TaskStatus } from './types';

function NewTaskButton({ compact = false }: { compact?: boolean }) {
  const { canWrite, data, edit, notify } = useWorkspace();
  function create() {
    if (!activeProjects(data.projects).length) {
      notify('Créez d’abord un projet actif pour y rattacher votre tâche.');
      edit({ kind: 'project' });
    } else edit({ kind: 'task' });
  }
  return canWrite ? (
    <button className={compact ? 'text-button' : 'button primary'} onClick={create}>
      <Plus size={17} />
      {compact ? 'Ajouter' : 'Nouvelle tâche'}
    </button>
  ) : null;
}

function TaskLine({ task }: { task: Task }) {
  const { data, edit, canWrite, endpoint, refresh, notify } = useWorkspace();
  const [pending, setPending] = useState(false);
  const project = data.projects.find((item) => item.id === task.projectId);
  async function toggle() {
    if (!canWrite || pending) return;
    setPending(true);
    try {
      await api(endpoint('/tasks/' + task.id), {
        method: 'PUT',
        body: taskBody(task, task.status === 'DONE' ? 'READY' : 'DONE'),
      });
      await refresh();
    } catch (problem) {
      notify((problem as Error).message, true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="task-line">
      <button
        className={'task-check' + (task.status === 'DONE' ? ' checked' : '')}
        onClick={toggle}
        disabled={!canWrite || pending}
        aria-label={task.status === 'DONE' ? 'Rouvrir ' + task.title : 'Terminer ' + task.title}
      >
        {task.status === 'DONE' ? <Check size={13} /> : null}
      </button>
      <button className="task-line-main" onClick={() => edit({ kind: 'task', item: task })}>
        <strong>{task.title}</strong>
        <span>
          <i className="project-dot" style={{ background: project?.color }} />
          {project?.name || 'Projet'}
          {task.blocked && <span className="blocked-dot">Bloquée</span>}
        </span>
      </button>
      <span className={'due-label' + (overdue(task) ? ' overdue' : '')}>
        {task.dueDate ? dateLabel(task.dueDate) : priorityLabels[task.priority]}
      </span>
    </div>
  );
}

function taskBody(task: Task, status: TaskStatus) {
  return {
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    acceptance: task.acceptance,
    priority: task.priority,
    status,
    blocked: task.blocked,
    dueDate: task.dueDate,
    assigneeId: task.assigneeId,
    version: task.version,
  };
}

export function Overview() {
  const { me, data, edit, go, canWrite } = useWorkspace();
  const d = data.dashboard;
  const projects = activeProjects(data.projects).slice(0, 3);
  const actionable = [...data.tasks]
    .filter((task) => task.status !== 'DONE')
    .sort(
      (a, b) =>
        Number(b.blocked) - Number(a.blocked) ||
        Number(overdue(b)) - Number(overdue(a)) ||
        ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].indexOf(a.priority) -
          ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].indexOf(b.priority),
    )
    .slice(0, 5);
  return (
    <>
      <PageTitle
        eyebrow="VOTRE POINT DE DÉPART"
        title={'Bonjour ' + me.user.name.split(' ')[0] + ', on avance ?'}
        description="Un regard sur vos projets. De la place pour la suite."
        action={
          canWrite && (
            <button className="button primary" onClick={() => edit({ kind: 'project' })}>
              <Plus size={17} />
              Nouveau projet
            </button>
          )
        }
      />
      <section className="ai-banner">
        <div className="ai-banner-copy">
          <span className="ai-banner-label">
            <Sparkles size={15} /> UN PEU D’AIDE POUR VOIR PLUS LOIN
          </span>
          <h2>Vos idées méritent un plan.</h2>
          <p>Transformez un objectif en prochaines actions, avec votre assistant IA.</p>
          <button onClick={() => go('assistant')}>
            Que voulez-vous faire avancer ?
            <span>
              <ArrowUpRight size={19} />
            </span>
          </button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="orbit-circle one" />
          <div className="orbit-circle two" />
          <div className="orbit-circle three" />
          <div className="orbit-core">
            <Sparkles size={33} strokeWidth={1.2} />
          </div>
          <span className="art-star star-one">✦</span>
          <span className="art-star star-two">✧</span>
          <span className="art-dot" />
        </div>
      </section>
      <div className="metrics-grid">
        <Metric
          title="Projets actifs"
          value={d.projects}
          detail="Des idées qui prennent forme"
          icon={<BriefcaseBusiness size={18} />}
          tone="green"
        />
        <Metric
          title="Tâches à faire"
          value={d.openTasks}
          detail={
            d.overdueTasks
              ? d.overdueTasks + ' avec une échéance dépassée'
              : 'Chaque prochaine action compte'
          }
          icon={<ListTodo size={18} />}
          tone="purple"
        />
        <Metric
          title="Contacts à suivre"
          value={d.activeContacts}
          detail={d.contacts + ' contacts dans votre CRM'}
          icon={<Users size={18} />}
          tone="orange"
        />
        <Metric
          title="Tâches terminées"
          value={d.doneTasks}
          detail="Du concret, pas à pas"
          icon={<CheckCheck size={18} />}
          tone="blue"
        />
      </div>
      <div className="overview-main-grid">
        <section className="panel projects-panel">
          <PanelTitle
            title="Vos projets en mouvement"
            subtitle={
              projects.length
                ? 'Gardez le cap sur l’essentiel.'
                : 'Votre prochain chapitre commence ici.'
            }
            action={<LinkButton onClick={() => go('projects')}>Tout voir</LinkButton>}
          />
          {projects.length ? (
            <div className="overview-projects">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} compact />
              ))}
            </div>
          ) : (
            <Empty
              title="Une idée en tête ?"
              description="Créez votre premier projet. Vos tâches, notes et contacts y trouveront leur place."
              action={
                canWrite && (
                  <button className="button secondary" onClick={() => edit({ kind: 'project' })}>
                    <Plus size={16} />
                    Créer mon premier projet
                  </button>
                )
              }
            />
          )}
        </section>
        <section className="panel priorities-panel">
          <PanelTitle
            title="À votre attention"
            subtitle="Une prochaine action à la fois."
            action={<span className="count-circle">{actionable.length}</span>}
          />
          {actionable.length ? (
            <div>
              {actionable.map((task) => (
                <TaskLine key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Empty
              title="L’esprit tranquille."
              description="Vos prochaines tâches et vos points de blocage apparaîtront ici."
              icon={<CheckCircle2 size={27} strokeWidth={1.3} />}
              action={<NewTaskButton compact />}
            />
          )}
          <button className="panel-bottom-link" onClick={() => go('tasks')}>
            Ouvrir le tableau de tâches
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
      <div className="overview-bottom-grid">
        <section className="panel rhythm-panel">
          <PanelTitle
            title="Votre rythme"
            subtitle="Tâches actuellement terminées, par date de dernière mise à jour."
            action={<span className="period-pill">7 derniers jours</span>}
          />
          <WeekChart week={d.week} />
          {!d.week.some((day) => day.count) && (
            <p className="chart-footnote">Vos premières tâches terminées donneront le tempo.</p>
          )}
        </section>
        <section className="panel activity-panel">
          <PanelTitle
            title="Le fil de votre espace"
            subtitle="Les dernières avancées, au même endroit."
          />
          <div className="activity-list">
            {data.activity.slice(0, 4).map((entry) => (
              <div key={entry.id} className="activity-entry">
                <span
                  className={'activity-marker ' + (entry.category === 'TASK_DONE' ? 'green' : '')}
                >
                  {entry.category === 'TASK_DONE' ? (
                    <Check size={13} />
                  ) : (
                    <ActivityIcon size={13} />
                  )}
                </span>
                <div>
                  <p>{entry.title}</p>
                  <span>
                    {entry.actorName || 'Orbita'}
                    <i>·</i>
                    {dateLabel(entry.createdAt, {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {!data.activity.length && (
              <p className="muted">Chaque avancée trouvera sa place ici.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function WeekChart({ week }: { week: { date: string; count: number }[] }) {
  const max = Math.max(2, ...week.map((day) => day.count));
  const points = week.map((day, index) => [32 + index * 82, 125 - (day.count / max) * 94]);
  const path = points
    .map((point, index) => (index ? 'L' : 'M') + point[0] + ',' + point[1])
    .join(' ');
  return (
    <div className="week-chart">
      <svg
        viewBox="0 0 558 160"
        role="img"
        aria-label={'Tâches terminées sur sept jours : ' + week.map((day) => day.count).join(', ')}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78b399" stopOpacity=".25" />
            <stop offset="100%" stopColor="#78b399" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[31, 78, 125].map((y) => (
          <line key={y} x1="25" y1={y} x2="536" y2={y} stroke="#edf0ed" strokeDasharray="4 5" />
        ))}
        <path d={path + 'L524,130L32,130Z'} fill="url(#chart-fill)" />
        <path d={path} fill="none" stroke="#458b6c" strokeWidth="2.7" strokeLinejoin="round" />
        {points.map(([x, y], index) => (
          <g key={index}>
            <circle cx={x} cy={y} r="3" fill="#fff" stroke="#458b6c" strokeWidth="2" />
            <text x={x} y="153" textAnchor="middle" fontSize="10" fill="#6a776d">
              {dateLabel(week[index].date, { weekday: 'short' })}
            </text>
            {week[index].count > 0 && (
              <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fill="#458b6c">
                {week[index].count}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  const { data, edit, canWrite } = useWorkspace();
  const p = progress(data.tasks, project.id);
  return (
    <article className={'project-card' + (compact ? ' compact' : '')}>
      <div className="project-card-top">
        <span
          className="project-symbol"
          style={{ background: project.color + '18', color: project.color }}
        >
          {initials(project.name)}
        </span>
        <div className="project-card-status">
          <Badge tone={project.status === 'ACTIVE' ? 'green' : 'neutral'}>
            {project.status === 'ACTIVE'
              ? 'Actif'
              : project.status === 'PAUSED'
                ? 'En pause'
                : 'Archivé'}
          </Badge>
          <button
            className="icon-button"
            aria-label={'Modifier ' + project.name}
            onClick={() => edit({ kind: 'project', item: project })}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
      <button
        className="project-title-button"
        onClick={() => edit({ kind: 'project', item: project })}
      >
        <h3>{project.name}</h3>
      </button>
      <p className="project-description">
        {project.goal || project.description || 'Un nouvel espace de possibilités.'}
      </p>
      <div className="progress-label">
        <span>Progression</span>
        <strong>{p.total ? p.percent + ' %' : 'À construire'}</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: p.percent + '%', background: project.color }} />
      </div>
      <footer>
        <span>
          <ListTodo size={13} />
          {p.done}/{p.total} tâches
        </span>
        {!compact && canWrite && project.status !== 'ARCHIVED' ? (
          <button
            className="text-button archive-action"
            onClick={() => edit({ kind: 'archive', item: project })}
          >
            <Archive size={13} />
            Archiver
          </button>
        ) : (
          <span className="project-card-date">{dateLabel(project.createdAt)}</span>
        )}
      </footer>
    </article>
  );
}

export function Projects() {
  const { data, canWrite, edit } = useWorkspace();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const list = data.projects.filter(
    (project) =>
      (filter === 'all' || project.status === filter) &&
      matches(search, project.name, project.goal, project.description),
  );
  return (
    <>
      <PageTitle
        eyebrow="DONNEZ FORME À VOS IDÉES"
        title="Vos projets, une vue claire."
        description="Un objectif, un espace, des prochaines actions."
        action={
          canWrite && (
            <button className="button primary" onClick={() => edit({ kind: 'project' })}>
              <Plus size={17} />
              Nouveau projet
            </button>
          )
        }
      />
      <div className="toolbar">
        <div className="tabs" aria-label="Filtrer les projets">
          {[
            ['all', 'Tous les projets'],
            ['ACTIVE', 'Actifs'],
            ['PAUSED', 'En pause'],
            ['ARCHIVED', 'Archivés'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
            >
              {label}
              {value === 'all' && <span>{data.projects.length}</span>}
            </button>
          ))}
        </div>
        <div className="local-search">
          <Search size={16} />
          <input
            aria-label="Rechercher un projet"
            placeholder="Trouver un projet…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      {list.length ? (
        <div className="project-grid">
          {list.map((project) => (
            <div key={project.id}>
              <ProjectCard project={project} />
              {project.githubRepository && <GitHubPreview project={project} />}
            </div>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title={
              data.projects.length
                ? 'Aucun projet dans cette vue.'
                : 'Faites de la place à votre première idée.'
            }
            description={
              data.projects.length
                ? 'Essayez un autre filtre ou une recherche plus courte.'
                : 'Un nom et un objectif suffisent pour commencer.'
            }
            action={
              canWrite && (
                <button className="button primary" onClick={() => edit({ kind: 'project' })}>
                  <Plus size={17} />
                  Créer un projet
                </button>
              )
            }
          />
        </section>
      )}
    </>
  );
}

function GitHubPreview({ project }: { project: Project }) {
  const { endpoint, notify } = useWorkspace();
  const [snapshot, setSnapshot] = useState<{
    repository: string;
    items: { number: number; title: string; state: string; pullRequest: boolean; url: string }[];
    fetchedAt: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  async function load() {
    setPending(true);
    try {
      setSnapshot(await api(endpoint('/projects/' + project.id + '/github')));
    } catch (problem) {
      notify((problem as Error).message, true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="github-preview">
      <button onClick={load} disabled={pending}>
        <GitBranch size={15} />
        <span>{project.githubRepository}</span>
        <span>{pending ? 'Lecture…' : 'Lire l’activité'}</span>
      </button>
      {snapshot && (
        <div className="github-items">
          <small>20 derniers tickets et PR au maximum · {dateLabel(snapshot.fetchedAt)}</small>
          {snapshot.items.map((item) => (
            <a key={item.number} href={item.url} target="_blank" rel="noreferrer">
              <span className={'github-state ' + item.state} />
              <span>
                #{item.number} {item.title}
              </span>
              <small>{item.pullRequest ? 'PR' : 'Issue'}</small>
              <ExternalLink size={12} />
            </a>
          ))}
          {!snapshot.items.length && <p>Aucun ticket ni PR dans ce dépôt.</p>}
        </div>
      )}
    </div>
  );
}

export function Tasks() {
  const { data, canWrite, edit, endpoint, refresh, notify } = useWorkspace();
  const [projectId, setProject] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [moving, setMoving] = useState(false);
  const list = data.tasks.filter(
    (task) =>
      (!projectId || task.projectId === projectId) &&
      (!priority || task.priority === priority) &&
      (!blocked || task.blocked) &&
      matches(search, task.title, task.description),
  );
  async function move(id: string, status: TaskStatus) {
    const task = data.tasks.find((item) => item.id === id);
    if (!canWrite || !task || task.status === status || moving) return;
    setMoving(true);
    try {
      await api(endpoint('/tasks/' + id), { method: 'PUT', body: taskBody(task, status) });
      await refresh();
    } catch (problem) {
      notify((problem as Error).message, true);
    } finally {
      setMoving(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="UNE PROCHAINE ACTION À LA FOIS"
        title="Le tableau de vos avancées."
        description="Préparez, priorisez, terminez. Le travail devient plus clair."
        action={<NewTaskButton />}
      />
      <div className="toolbar task-toolbar">
        <div className="filter-controls">
          <select
            aria-label="Filtrer par projet"
            value={projectId}
            onChange={(event) => setProject(event.target.value)}
          >
            <option value="">Tous les projets</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrer par priorité"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="">Toutes les priorités</option>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            className={'filter-chip' + (blocked ? ' active' : '')}
            onClick={() => setBlocked(!blocked)}
          >
            <Flag size={14} />
            Bloquées
          </button>
        </div>
        <div className="local-search">
          <Search size={16} />
          <input
            aria-label="Rechercher une tâche"
            placeholder="Trouver une tâche…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className={'kanban' + (moving ? ' moving' : '')}>
        {(Object.entries(taskLabels) as [TaskStatus, string][]).map(([status, label]) => {
          const tasks = list.filter((task) => task.status === status);
          return (
            <section
              key={status}
              className={'kanban-column status-' + status}
              onDragOver={(event) => {
                if (canWrite) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                void move(event.dataTransfer.getData('text/orbita-task'), status);
              }}
            >
              <header>
                <span className="column-dot" />
                <h2>{label}</h2>
                <span>{tasks.length}</span>
              </header>
              {tasks.map((task) => {
                const project = data.projects.find((item) => item.id === task.projectId);
                const assignee = data.members.find((member) => member.id === task.assigneeId);
                return (
                  <article
                    key={task.id}
                    className="kanban-card"
                    draggable={canWrite && !moving}
                    onDragStart={(event) => event.dataTransfer.setData('text/orbita-task', task.id)}
                  >
                    <div className="kanban-card-top">
                      <span className="project-tag">
                        <i style={{ background: project?.color }} />
                        {project?.name}
                      </span>
                      <span
                        className={'priority priority-' + task.priority}
                        title={priorityLabels[task.priority]}
                      >
                        <Flag size={12} />
                        {priorityLabels[task.priority]}
                      </span>
                    </div>
                    <button
                      className="kanban-title"
                      onClick={() => edit({ kind: 'task', item: task })}
                    >
                      {task.title}
                    </button>
                    {task.description && <p>{task.description}</p>}
                    {task.blocked && <Badge tone="red">Bloquée</Badge>}
                    <footer>
                      <span className={overdue(task) ? 'overdue' : ''}>
                        {task.dueDate && (
                          <>
                            <CalendarDays size={12} />
                            {dateLabel(task.dueDate)}
                          </>
                        )}
                      </span>
                      {assignee && <Avatar name={assignee.name} small />}
                    </footer>
                    <select
                      className="task-status-select"
                      aria-label={'État de ' + task.title}
                      value={task.status}
                      disabled={!canWrite || moving}
                      onChange={(event) => void move(task.id, event.target.value as TaskStatus)}
                    >
                      {Object.entries(taskLabels).map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </article>
                );
              })}
              {!tasks.length && (
                <div className="kanban-empty">
                  <span>La place est libre.</span>
                  <small>
                    {status === 'DONE' ? 'Vos résultats arriveront ici.' : 'Déposez une tâche ici.'}
                  </small>
                </div>
              )}
              {status === 'BACKLOG' && (
                <div className="kanban-add">
                  <NewTaskButton compact />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function Contacts() {
  const { data, canWrite, isAdmin, edit, endpoint, notify } = useWorkspace();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const list = data.contacts.filter(
    (contact) =>
      (!stage || contact.stage === stage) &&
      matches(search, contact.name, contact.company, contact.email),
  );
  return (
    <>
      <PageTitle
        eyebrow="DES RELATIONS QUI COMPTENT"
        title="Votre carnet d’opportunités."
        description="Le contexte, le suivi et la bonne prochaine action."
        action={
          <>
            {isAdmin && (
              <button
                className="button secondary"
                onClick={() =>
                  void download(endpoint('/exports/contacts.csv'), 'orbita-contacts.csv').catch(
                    (problem) => notify(problem.message, true),
                  )
                }
              >
                <ArrowDownToLine size={16} />
                Exporter
              </button>
            )}
            {canWrite && (
              <button className="button primary" onClick={() => edit({ kind: 'contact' })}>
                <Plus size={17} />
                Nouveau contact
              </button>
            )}
          </>
        }
      />
      <div className="crm-summary">
        {[
          ['Tous les contacts', data.contacts.length],
          ['À qualifier', data.contacts.filter((contact) => contact.stage === 'DISCOVERED').length],
          [
            'En discussion',
            data.contacts.filter((contact) => contact.stage === 'NEGOTIATION').length,
          ],
          ['Gagnés', data.contacts.filter((contact) => contact.stage === 'WON').length],
        ].map(([label, count]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="toolbar panel-toolbar">
          <div className="local-search">
            <Search size={16} />
            <input
              aria-label="Rechercher un contact"
              placeholder="Nom, entreprise, e-mail…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Filtrer les contacts par étape"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            <option value="">Toutes les étapes</option>
            {Object.entries(stageLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {list.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Coordonnées</th>
                  <th>Étape</th>
                  <th>Projet</th>
                  <th>Ajouté le</th>
                  <th>
                    <span className="sr-only">Détail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <button
                        className="contact-name"
                        onClick={() => edit({ kind: 'contact', item: contact })}
                      >
                        <Avatar name={contact.name} />
                        <span>
                          <strong>{contact.name}</strong>
                          <small>{contact.company || 'Indépendant'}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className="cell-email">{contact.email || 'Non renseigné'}</span>
                      {contact.website && (
                        <a
                          className="table-link"
                          href={contact.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Voir le site
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </td>
                    <td>
                      <Badge
                        tone={
                          contact.optedOut
                            ? 'red'
                            : contact.stage === 'WON'
                              ? 'green'
                              : contact.stage === 'NEGOTIATION'
                                ? 'purple'
                                : 'neutral'
                        }
                      >
                        {stageLabels[contact.stage]}
                      </Badge>
                    </td>
                    <td>
                      {data.projects.find((project) => project.id === contact.projectId)?.name ||
                        'Tout l’espace'}
                    </td>
                    <td>{dateLabel(contact.createdAt)}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={'Modifier ' + contact.name}
                        onClick={() => edit({ kind: 'contact', item: contact })}
                      >
                        <ChevronRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              data.contacts.length
                ? 'Aucun contact dans cette sélection.'
                : 'Une relation commence par un premier contact.'
            }
            description="Ajoutez vos contacts, leur contexte et l’étape de votre relation."
            action={
              canWrite && (
                <button className="button secondary" onClick={() => edit({ kind: 'contact' })}>
                  <Plus size={16} />
                  Ajouter un contact
                </button>
              )
            }
            icon={<Users size={27} />}
          />
        )}
      </section>
      <p className="page-footnote">
        <ShieldCheck size={14} />
        Les contacts « À ne plus contacter » sont exclus des envois. Leur opposition reste
        conservée.
      </p>
    </>
  );
}

export function Notes() {
  const { data, canWrite, edit } = useWorkspace();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all');
  const notes = data.notes.filter(
    (note) =>
      matches(search, note.title, note.content) &&
      (scope === 'all' || note.isPrivate === (scope === 'private')),
  );
  return (
    <>
      <PageTitle
        eyebrow="LES IDÉES MÉRITENT DE RESTER"
        title="Votre espace pour poser les choses."
        description="Notes rapides, comptes rendus et décisions à retrouver."
        action={
          canWrite && (
            <button className="button primary" onClick={() => edit({ kind: 'note' })}>
              <Plus size={17} />
              Nouvelle note
            </button>
          )
        }
      />
      <div className="toolbar">
        <div className="tabs">
          {[
            ['all', 'Toutes les notes'],
            ['shared', 'Partagées'],
            ['private', 'Privées'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={scope === value ? 'active' : ''}
              onClick={() => setScope(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="local-search">
          <Search size={16} />
          <input
            aria-label="Rechercher une note"
            placeholder="Retrouver une idée…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      {notes.length ? (
        <div className="notes-grid">
          {notes.map((note, index) => (
            <button
              key={note.id}
              className={'note-card note-tone-' + (index % 3)}
              onClick={() => edit({ kind: 'note', item: note })}
            >
              <header>
                <span>
                  {note.isPrivate ? (
                    <>
                      <LockKeyhole size={13} />
                      Privée
                    </>
                  ) : (
                    <>
                      <Users size={13} />
                      Partagée
                    </>
                  )}
                </span>
                <ArrowUpRight size={16} />
              </header>
              <h2>{note.title}</h2>
              <p>{note.content || 'Une page ouverte pour la suite.'}</p>
              <footer>
                <span>
                  {data.projects.find((project) => project.id === note.projectId)?.name ||
                    'Tout l’espace'}
                </span>
                <span>{dateLabel(note.updatedAt)}</span>
              </footer>
            </button>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Une page pour la prochaine idée."
            description="Gardez une trace des décisions, des échanges et des choses à ne pas oublier."
            action={
              canWrite && (
                <button className="button secondary" onClick={() => edit({ kind: 'note' })}>
                  <Plus size={16} />
                  Écrire une note
                </button>
              )
            }
            icon={<BookOpen size={28} strokeWidth={1.3} />}
          />
        </section>
      )}
    </>
  );
}

export function Reports() {
  const { data, canWrite, endpoint, refresh, notify } = useWorkspace();
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedReport = data.reports.find((report) => report.id === selected);
  const d = selectedReport?.snapshot || data.dashboard;
  async function generate() {
    setPending(true);
    try {
      const report = await api<{ id: string }>(endpoint('/reports'), { method: 'POST' });
      setSelected(report.id);
      await refresh();
      notify('Votre bilan est prêt.');
    } catch (problem) {
      notify((problem as Error).message, true);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="PRENDRE DU RECUL POUR AVANCER"
        title="Vos avancées, mises en perspective."
        description="Des bilans construits à partir des données de votre espace."
        action={
          <>
            <button className="button secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Imprimer / PDF
            </button>
            {canWrite && (
              <button className="button primary" onClick={generate} disabled={pending}>
                <Plus size={16} />
                {pending ? 'Création…' : 'Créer un bilan'}
              </button>
            )}
          </>
        }
      />
      <div className="reports-layout">
        <aside className="panel report-history">
          <PanelTitle title="Vos bilans" />
          <button className={!selected ? 'active' : ''} onClick={() => setSelected(null)}>
            <span className="report-icon">
              <BarChart3 size={18} />
            </span>
            <span>
              <strong>Situation actuelle</strong>
              <small>Au dernier chargement</small>
            </span>
          </button>
          {data.reports.map((report) => (
            <button
              key={report.id}
              className={selected === report.id ? 'active' : ''}
              onClick={() => setSelected(report.id)}
            >
              <span className="report-icon">
                <FileText size={18} />
              </span>
              <span>
                <strong>{report.title}</strong>
                <small>
                  {dateLabel(report.createdAt, {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </span>
            </button>
          ))}
          {!data.reports.length && (
            <p className="history-empty">Votre premier bilan apparaîtra ici.</p>
          )}
        </aside>
        <div className="report-content">
          <section className="panel report-cover">
            <span className="eyebrow">VOTRE BILAN ORBITA</span>
            <h2>{selectedReport?.title || 'Le point sur votre espace'}</h2>
            <p>
              {d.projects} projets actifs, {d.openTasks} tâches ouvertes et {d.activeContacts}{' '}
              contacts à suivre.
            </p>
            <div className="report-stamp">
              <Clock3 size={14} />
              Instantané du{' '}
              {dateLabel(d.generatedAt, {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: d.timezone,
              })}{' '}
              · {d.timezone}
            </div>
          </section>
          <div className="metrics-grid report-metrics">
            <Metric
              title="Tâches terminées"
              value={d.doneTasks}
              detail="Au moment de ce bilan"
              icon={<CheckCheck size={17} />}
              tone="green"
            />
            <Metric
              title="Tâches en retard"
              value={d.overdueTasks}
              detail="À reprendre en priorité"
              icon={<Clock3 size={17} />}
              tone="orange"
            />
            <Metric
              title="Blocages"
              value={d.blockedTasks}
              detail="Des points à débloquer"
              icon={<Flag size={17} />}
              tone="purple"
            />
          </div>
          <section className="panel report-progress">
            <PanelTitle
              title="Projet par projet"
              subtitle="Tâches terminées sur le nombre total de tâches."
            />
            {d.progress.length ? (
              d.progress.map((item) => (
                <div className="report-project-row" key={item.projectId}>
                  <i className="project-dot" style={{ background: item.color }} />
                  <strong>{item.name}</strong>
                  <div className="progress-track">
                    <span
                      style={{
                        width: (item.total ? (item.done * 100) / item.total : 0) + '%',
                        background: item.color,
                      }}
                    />
                  </div>
                  <span>
                    {item.done} / {item.total}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">Ajoutez un projet pour commencer à suivre votre progression.</p>
            )}
          </section>
          <section className="panel">
            <PanelTitle title="Le rythme de la semaine" />
            <WeekChart week={d.week} />
          </section>
          <div className="info-box">
            <Clock3 size={18} />
            <span>
              Un bilan quotidien est préparé à 18 h ({d.timezone}) lorsque le serveur fonctionne.
              Les chiffres financiers et les sources externes ne sont pas encore intégrés.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export function Settings() {
  const { me, space, data, isAdmin, edit, endpoint, refresh, notify } = useWorkspace();
  const [removal, setRemoval] = useState<{ id: string; name: string } | null>(null);
  const [pending, setPending] = useState(false);
  async function remove() {
    if (!removal) return;
    setPending(true);
    try {
      await api(endpoint('/members/' + removal.id), { method: 'DELETE' });
      setRemoval(null);
      await refresh();
      notify('L’accès a été révoqué.');
    } catch (problem) {
      notify((problem as Error).message, true);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="VOTRE ESPACE, VOS REPÈRES"
        title="Les bons réglages pour avancer."
        description="Membres, connexions et données de votre espace."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <PanelTitle title="Votre espace" subtitle="Le contexte partagé par vos projets." />
          <div className="space-profile">
            <span className="workspace-monogram large">{space.name[0]}</span>
            <div>
              <h3>{space.name}</h3>
              <Badge tone="green">{roleLabels[space.role]}</Badge>
            </div>
          </div>
          <label className="field">
            <span>Identifiant de l’espace</span>
            <div className="copy-field">
              <code>{space.id}</code>
              <button
                className="icon-button"
                aria-label="Copier l’identifiant de l’espace"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(space.id)
                    .then(() => notify('Identifiant copié.'))
                    .catch(() => notify('La copie est indisponible dans ce navigateur.', true))
                }
              >
                <Copy size={15} />
              </button>
            </div>
            <small>Utile pour associer une connexion serveur à cet espace précis.</small>
          </label>
          <button className="button secondary" onClick={() => edit({ kind: 'space' })}>
            <Plus size={16} />
            Créer un autre espace
          </button>
        </section>
        <section className="panel settings-card">
          <PanelTitle
            title="Les personnes de votre espace"
            subtitle="Chaque rôle a les accès dont il a besoin."
            action={
              isAdmin && (
                <button className="text-button" onClick={() => edit({ kind: 'member' })}>
                  <Plus size={15} />
                  Ajouter
                </button>
              )
            }
          />
          <div className="members-list">
            {data.members.map((member) => (
              <div className="member-row" key={member.id}>
                <Avatar name={member.name} />
                <div>
                  <strong>
                    {member.name}
                    {member.id === me.user.id ? ' (vous)' : ''}
                  </strong>
                  <span>{member.email}</span>
                </div>
                <Badge>{roleLabels[member.role]}</Badge>
                {isAdmin &&
                  member.role !== 'OWNER' &&
                  (space.role === 'OWNER' || member.role !== 'ADMIN') && (
                    <button
                      className="icon-button"
                      aria-label={'Révoquer l’accès de ' + member.name}
                      onClick={() => setRemoval({ id: member.id, name: member.name })}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
              </div>
            ))}
          </div>
        </section>
        <section className="panel settings-card connections-card">
          <PanelTitle
            title="Vos connexions"
            subtitle="Les capacités dépendent des accès configurés sur le serveur."
          />
          <div className="connection-row">
            <span className="connection-icon purple">
              <Sparkles size={21} />
            </span>
            <div>
              <strong>Assistant IA</strong>
              <span>
                {data.connections.ai.configured
                  ? data.connections.ai.provider + ' · ' + data.connections.ai.model
                  : 'OpenAI ou Ollama, au choix'}
              </span>
            </div>
            <Badge tone={data.connections.ai.configured ? 'green' : 'neutral'}>
              {data.connections.ai.configured ? 'Configuré' : 'À configurer'}
            </Badge>
          </div>
          <div className="connection-row">
            <span className="connection-icon green">
              <GitBranch size={21} />
            </span>
            <div>
              <strong>GitHub</strong>
              <span>
                {data.connections.github.authenticated
                  ? 'Accès authentifié limité à cet espace'
                  : 'Lecture des dépôts publics disponible'}
              </span>
            </div>
            <Badge tone="green">Lecture</Badge>
          </div>
          <div className="connection-row">
            <span className="connection-icon orange">
              <Mail size={21} />
            </span>
            <div>
              <strong>Envoi de mails</strong>
              <span>SMTP · confirmation avant chaque envoi</span>
            </div>
            <Badge tone={data.connections.smtp.configured ? 'green' : 'neutral'}>
              {data.connections.smtp.configured ? 'Configuré' : 'À configurer'}
            </Badge>
          </div>
          <a className="documentation-link" href="/guide.html" target="_blank" rel="noreferrer">
            Consulter le guide de configuration
            <ExternalLink size={14} />
          </a>
        </section>
        <section className="panel settings-card">
          <PanelTitle
            title="Vos données vous suivent"
            subtitle="Un export pour garder la maîtrise de votre travail."
          />
          <div className="data-illustration">
            <ShieldCheck size={30} strokeWidth={1.4} />
            <div>
              <h3>Dans le bon espace.</h3>
              <p>
                Les projets, tâches, contacts et notes sont conservés en base. Les notes privées
                restent limitées à leur auteur, y compris dans les exports.
              </p>
            </div>
          </div>
          {isAdmin ? (
            <button
              className="button secondary"
              onClick={() =>
                void download(endpoint('/export'), 'orbita-espace.json').catch((problem) =>
                  notify(problem.message, true),
                )
              }
            >
              <ArrowDownToLine size={16} />
              Exporter mon espace
            </button>
          ) : (
            <p className="muted">L’export complet est réservé aux administrateurs.</p>
          )}
        </section>
      </div>
      {removal && (
        <Dialog title="Révoquer cet accès ?" busy={pending} onClose={() => setRemoval(null)}>
          <p className="form-intro">
            {removal.name} ne pourra plus consulter ni modifier cet espace. Ses tâches seront
            désattribuées.
          </p>
          <footer className="dialog-footer">
            <button
              className="button secondary"
              onClick={() => setRemoval(null)}
              disabled={pending}
            >
              Annuler
            </button>
            <button className="button danger" onClick={remove} disabled={pending}>
              Confirmer la révocation
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
