import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Mail as MailIcon,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Auth from './Auth';
import { api, ApiError } from './api';
import { Workspace } from './context';
import { EditorDialog } from './forms';
import { Overview, Projects, Tasks, Contacts, Notes, Reports, Settings } from './pages';
import { Assistant, Mails } from './communication';
import { Avatar, Empty, Logo, Spinner } from './ui';
import { dateLabel, matches, overdue } from './selectors';
import type {
  Activity,
  AiRun,
  Connections,
  Contact,
  Dashboard,
  Editor,
  Mail,
  Me,
  Member,
  Note,
  Project,
  Report,
  Task,
  View,
  WorkspaceData,
} from './types';

const navigation: { id: View; label: string; icon: LucideIcon; group?: boolean }[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'projects', label: 'Projets', icon: BriefcaseBusiness },
  { id: 'tasks', label: 'Tâches', icon: ListTodo },
  { id: 'contacts', label: 'Contacts & CRM', icon: Users },
  { id: 'mails', label: 'Messagerie', icon: MailIcon },
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'assistant', label: 'Assistant IA', icon: Sparkles, group: true },
  { id: 'reports', label: 'Rapports', icon: LayoutDashboard },
  { id: 'settings', label: 'Paramètres', icon: Settings2, group: true },
];

function rememberedSpace() {
  try {
    return localStorage.getItem('orbita:space');
  } catch {
    return null;
  }
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [booting, setBooting] = useState(true);
  const [spaceId, setSpaceId] = useState('');
  const [view, setView] = useState<View>('overview');
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState('');
  const [notices, setNotices] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const request = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const space = me?.spaces.find((item) => item.id === spaceId);
  const currentData = data?.spaceId === spaceId ? data : null;

  const refreshMe = useCallback(async () => {
    const result = await api<Me>('/api/me');
    window.scrollTo(0, 0);
    setMe(result);
    setSpaceId((previous) =>
      result.spaces.some((item) => item.id === previous)
        ? previous
        : result.spaces.find((item) => item.id === rememberedSpace())?.id ||
          result.spaces[0]?.id ||
          '',
    );
  }, []);

  useEffect(() => {
    const expired = () => {
      setMe(null);
      setData(null);
      setEditor(null);
    };
    window.addEventListener('orbita:session-expired', expired);
    refreshMe()
      .catch((problem) => {
        if (!(problem instanceof ApiError && problem.status === 401)) setError(problem.message);
      })
      .finally(() => setBooting(false));
    return () => window.removeEventListener('orbita:session-expired', expired);
  }, [refreshMe]);

  const refresh = useCallback(async () => {
    if (!spaceId) return;
    const sequence = ++request.current;
    const path = '/api/spaces/' + spaceId;
    setError('');
    try {
      const [
        projects,
        tasks,
        contacts,
        notes,
        mails,
        members,
        activity,
        runs,
        reports,
        dashboard,
        connections,
      ] = await Promise.all([
        api<Project[]>(path + '/projects'),
        api<Task[]>(path + '/tasks'),
        api<Contact[]>(path + '/contacts'),
        api<Note[]>(path + '/notes'),
        api<Mail[]>(path + '/mails'),
        api<Member[]>(path + '/members'),
        api<Activity[]>(path + '/activity'),
        api<AiRun[]>(path + '/ai/runs'),
        api<Report[]>(path + '/reports'),
        api<Dashboard>(path + '/dashboard'),
        api<Connections>(path + '/connections'),
      ]);
      if (sequence === request.current)
        setData({
          spaceId,
          projects,
          tasks,
          contacts,
          notes,
          mails,
          members,
          activity,
          runs,
          reports,
          dashboard,
          connections,
        });
    } catch (problem) {
      if (sequence === request.current) setError((problem as Error).message);
      throw problem;
    }
  }, [spaceId]);

  useEffect(() => {
    setEditor(null);
    setQuery('');
    setNotices(false);
    if (spaceId) {
      try {
        localStorage.setItem('orbita:space', spaceId);
      } catch {
        /* Storage is optional. */
      }
      void refresh().catch(() => {});
    }
    return () => {
      request.current++;
    };
  }, [spaceId, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setMobile(false);
        setQuery('');
        setNotices(false);
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);

  const notify = useCallback(
    (message: string, failed = false) => setToast({ message, error: failed }),
    [],
  );
  function go(next: View) {
    window.scrollTo(0, 0);
    setView(next);
    setMobile(false);
    setQuery('');
    setNotices(false);
  }
  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
      setMe(null);
      setData(null);
      setEditor(null);
    } catch (problem) {
      notify((problem as Error).message, true);
    }
  }

  if (booting)
    return (
      <div className="boot">
        <Logo />
        <Spinner />
      </div>
    );
  if (!me)
    return (
      <>
        {error && (
          <div className="connection-banner" role="alert">
            {error}
          </div>
        )}
        <Auth onSuccess={refreshMe} />
      </>
    );
  if (!space)
    return (
      <div className="boot">
        <Logo />
        <Empty
          title="Choisissez votre prochain départ"
          description="Créez un espace pour organiser vos projets."
          action={
            <button className="button primary" onClick={() => setEditor({ kind: 'space' })}>
              <Plus size={17} />
              Créer un espace
            </button>
          }
        />
        {editor && (
          <EditorDialog
            editor={editor}
            onClose={() => setEditor(null)}
            me={me}
            space={null}
            data={null}
            refresh={refresh}
            refreshMe={refreshMe}
            notify={notify}
          />
        )}
      </div>
    );

  const canWrite = space.role !== 'VIEWER';
  const isAdmin = space.role === 'OWNER' || space.role === 'ADMIN';
  const navTitle = navigation.find((item) => item.id === view)?.label;
  const searchResults: {
    key: string;
    title: string;
    detail: string;
    editor: Editor;
    view: View;
  }[] =
    currentData && query.trim()
      ? [
          ...currentData.projects
            .filter((item) => matches(query, item.name, item.goal))
            .map((item) => ({
              key: item.id,
              title: item.name,
              detail: 'Projet',
              editor: { kind: 'project', item } as Editor,
              view: 'projects' as View,
            })),
          ...currentData.tasks
            .filter((item) => matches(query, item.title, item.description))
            .map((item) => ({
              key: item.id,
              title: item.title,
              detail: 'Tâche',
              editor: { kind: 'task', item } as Editor,
              view: 'tasks' as View,
            })),
          ...currentData.contacts
            .filter((item) => matches(query, item.name, item.company, item.email))
            .map((item) => ({
              key: item.id,
              title: item.name,
              detail: 'Contact',
              editor: { kind: 'contact', item } as Editor,
              view: 'contacts' as View,
            })),
          ...currentData.notes
            .filter((item) => matches(query, item.title, item.content))
            .map((item) => ({
              key: item.id,
              title: item.title,
              detail: item.isPrivate ? 'Note privée' : 'Note',
              editor: { kind: 'note', item } as Editor,
              view: 'notes' as View,
            })),
        ].slice(0, 9)
      : [];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
      {mobile && <div className="sidebar-backdrop" onClick={() => setMobile(false)} />}
      <aside className={'sidebar' + (mobile ? ' open' : '')}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            onClick={() => setMobile(false)}
            aria-label="Fermer la navigation"
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-select">
          <span className="workspace-monogram">{space.name[0]?.toUpperCase()}</span>
          <div>
            <span className="subtle-label">ESPACE DE TRAVAIL</span>
            <select
              aria-label="Espace de travail"
              value={space.id}
              onChange={(event) =>
                event.target.value === '__new'
                  ? setEditor({ kind: 'space' })
                  : setSpaceId(event.target.value)
              }
            >
              {me.spaces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              <option value="__new">+ Nouvel espace</option>
            </select>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-caption">VOTRE QUOTIDIEN</span>
        <nav aria-label="Navigation principale">
          {navigation.map(({ id, label, icon: Icon, group }) => (
            <button
              key={id}
              className={
                'nav-item' +
                (view === id ? ' active' : '') +
                (group ? ' nav-separated' : '') +
                (id === 'assistant' ? ' ai-nav' : '')
              }
              onClick={() => go(id)}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {id === 'tasks' && !!currentData?.dashboard.openTasks && (
                <span className="nav-count">{currentData.dashboard.openTasks}</span>
              )}
              {id === 'assistant' && <span className="ai-mini">IA</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="live-dot" />
            <span>{currentData ? 'Votre espace est à jour' : 'Connexion à votre espace…'}</span>
          </div>
          <div className="sidebar-user">
            <Avatar name={me.user.name} />
            <div>
              <strong>{me.user.name}</strong>
              <span>
                {space.role === 'VIEWER' ? 'Lecture seule' : 'Votre espace, votre rythme'}
              </span>
            </div>
            <button className="icon-button" aria-label="Se déconnecter" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobile(true)}
              aria-label="Ouvrir la navigation"
            >
              <Menu size={22} />
            </button>
            <span className="desktop-only">{space.name}</span>
            <ChevronRight size={14} className="desktop-only" />
            <strong>{navTitle}</strong>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher dans votre espace…"
                aria-label="Rechercher dans votre espace"
              />
              <kbd>
                <Command size={10} /> K
              </kbd>
              {query.trim() && (
                <div className="search-results" role="region" aria-label="Résultats de recherche">
                  {searchResults.length ? (
                    searchResults.map((result) => (
                      <button
                        key={result.key}
                        onClick={() => {
                          go(result.view);
                          setEditor(result.editor);
                        }}
                      >
                        <span>{result.title}</span>
                        <small>{result.detail}</small>
                        <ChevronRight size={14} />
                      </button>
                    ))
                  ) : (
                    <p>Aucun résultat pour « {query} ».</p>
                  )}
                </div>
              )}
            </div>
            <div className="notification-anchor">
              <button
                className="icon-button notification-button"
                aria-label="Ouvrir le centre de suivi"
                onClick={() => setNotices(!notices)}
              >
                <Bell size={19} />
                {!!currentData?.dashboard.overdueTasks && <span className="notification-dot" />}
              </button>
              {notices && (
                <div className="notification-panel">
                  <h3>Votre centre de suivi</h3>
                  {currentData?.tasks
                    .filter((task) => overdue(task))
                    .slice(0, 5)
                    .map((task) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          setEditor({ kind: 'task', item: task });
                          setNotices(false);
                        }}
                      >
                        <span className="notice-dot" />
                        <div>
                          <strong>{task.title}</strong>
                          <small>Échéance dépassée · {dateLabel(task.dueDate)}</small>
                        </div>
                      </button>
                    ))}
                  {!currentData?.dashboard.overdueTasks && (
                    <p>Aucune tâche en retard. Vous pouvez avancer sereinement.</p>
                  )}
                  {!!currentData?.reports.length && (
                    <button onClick={() => go('reports')}>
                      <span className="notice-dot green" />
                      <div>
                        <strong>Votre dernier bilan est disponible</strong>
                        <small>{dateLabel(currentData.reports[0].createdAt)}</small>
                      </div>
                    </button>
                  )}
                  <small className="panel-footnote">
                    Ce centre est actualisé avec votre espace. Les push ne sont pas encore activés.
                  </small>
                </div>
              )}
            </div>
            <Avatar name={me.user.name} small />
          </div>
        </header>
        <main id="main-content" className="main-content">
          {error ? (
            <div className="error-panel" role="alert">
              <CircleHelp size={28} />
              <h2>La connexion demande un instant.</h2>
              <p>{error}</p>
              <button className="button primary" onClick={() => void refresh().catch(() => {})}>
                Réessayer
              </button>
            </div>
          ) : !currentData ? (
            <Spinner />
          ) : (
            <Workspace.Provider
              value={{
                me,
                space,
                data: currentData,
                canWrite,
                isAdmin,
                refresh,
                refreshMe,
                notify,
                edit: setEditor,
                go,
                endpoint: (path) => '/api/spaces/' + space.id + path,
              }}
            >
              {view === 'overview' && <Overview />}
              {view === 'projects' && <Projects />}
              {view === 'tasks' && <Tasks />}
              {view === 'contacts' && <Contacts />}
              {view === 'notes' && <Notes />}
              {view === 'assistant' && <Assistant />}
              {view === 'mails' && <Mails />}
              {view === 'reports' && <Reports />}
              {view === 'settings' && <Settings />}
            </Workspace.Provider>
          )}
        </main>
        <footer className="app-footer">
          <span>Un espace pour faire avancer vos idées.</span>
          <span>
            Orbita <span className="footer-dot">·</span>{' '}
            {dateLabel(new Date().toISOString(), {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </footer>
      </div>
      {editor && (
        <EditorDialog
          editor={editor}
          onClose={() => setEditor(null)}
          me={me}
          space={space}
          data={currentData}
          refresh={refresh}
          refreshMe={refreshMe}
          notify={notify}
          onSpaceCreated={setSpaceId}
        />
      )}
      {toast && (
        <div
          className={'toast' + (toast.error ? ' error' : '')}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <CircleHelp size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Fermer le message"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
