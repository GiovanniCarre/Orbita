export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type View =
  | 'overview'
  | 'projects'
  | 'tasks'
  | 'contacts'
  | 'mails'
  | 'notes'
  | 'assistant'
  | 'reports'
  | 'settings';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Stage =
  'DISCOVERED' | 'QUALIFIED' | 'CONTACTED' | 'NEGOTIATION' | 'WON' | 'LOST' | 'DO_NOT_CONTACT';
export interface User {
  id: string;
  name: string;
  email: string;
}
export interface Space {
  id: string;
  name: string;
  role: Role;
}
export interface Me {
  user: User;
  spaces: Space[];
}
export interface Member extends User {
  role: Role;
}
export interface Project {
  id: string;
  name: string;
  description: string;
  goal: string;
  color: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  website: string;
  githubRepository: string;
  version: number;
  createdAt: string;
}
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  acceptance: string;
  status: TaskStatus;
  priority: Priority;
  blocked: boolean;
  dueDate: string | null;
  assigneeId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Contact {
  id: string;
  projectId: string | null;
  name: string;
  company: string;
  email: string | null;
  website: string;
  stage: Stage;
  notes: string;
  optedOut: boolean;
  version: number;
  createdAt: string;
}
export interface Note {
  id: string;
  projectId: string | null;
  authorId: string;
  title: string;
  content: string;
  isPrivate: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Mail {
  id: string;
  projectId: string | null;
  contactId: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'DRAFT' | 'SENDING' | 'ACCEPTED' | 'RECONCILE';
  providerId: string | null;
  version: number;
  createdAt: string;
}
export interface Activity {
  id: string;
  category: string;
  title: string;
  actorName: string | null;
  entityId: string | null;
  createdAt: string;
}
export interface Proposal {
  title: string;
  description: string;
  priority: Priority;
  acceptance: string;
}
export interface AiRun {
  id: string;
  projectId: string | null;
  prompt: string;
  provider: string;
  model: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  result: { summary: string; tasks: Proposal[] } | null;
  errorMessage: string | null;
  acceptedAt: string | null;
  createdAt: string;
}
export interface Dashboard {
  projects: number;
  openTasks: number;
  doneTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  contacts: number;
  activeContacts: number;
  sharedNotes: number;
  week: { date: string; count: number }[];
  progress: { projectId: string; name: string; color: string; total: number; done: number }[];
  generatedAt: string;
  timezone: string;
}
export interface Report {
  id: string;
  title: string;
  snapshot: Dashboard;
  createdAt: string;
}
export interface Connections {
  ai: { configured: boolean; provider: string; model: string };
  smtp: { configured: boolean };
  github: { authenticated: boolean; publicReadAvailable: boolean };
}
export interface WorkspaceData {
  spaceId: string;
  projects: Project[];
  tasks: Task[];
  contacts: Contact[];
  notes: Note[];
  mails: Mail[];
  members: Member[];
  activity: Activity[];
  runs: AiRun[];
  reports: Report[];
  dashboard: Dashboard;
  connections: Connections;
}
export type Editor =
  | { kind: 'project'; item?: Project }
  | { kind: 'archive'; item: Project }
  | { kind: 'task'; item?: Task }
  | { kind: 'contact'; item?: Contact }
  | { kind: 'note'; item?: Note }
  | { kind: 'mail'; item?: Mail }
  | { kind: 'space' }
  | { kind: 'member' };
