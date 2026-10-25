import type { Project, Task, TaskStatus, Priority } from './types';

export const taskLabels: Record<TaskStatus, string> = {
  BACKLOG: 'À préparer',
  READY: 'Prêt',
  IN_PROGRESS: 'En cours',
  IN_REVIEW: 'En revue',
  DONE: 'Terminé',
};
export const priorityLabels: Record<Priority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};
export const stageLabels = {
  DISCOVERED: 'À découvrir',
  QUALIFIED: 'Qualifié',
  CONTACTED: 'Contacté',
  NEGOTIATION: 'En discussion',
  WON: 'Gagné',
  LOST: 'Perdu',
  DO_NOT_CONTACT: 'À ne plus contacter',
};
export const roleLabels = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
  VIEWER: 'Lecture seule',
};
export function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');
}
export function matches(query: string, ...values: (string | null | undefined)[]) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const text = normalize(values.filter(Boolean).join(' '));
  return terms.every((term) => text.includes(term));
}
export function progress(tasks: Task[], projectId: string) {
  const items = tasks.filter((task) => task.projectId === projectId);
  const done = items.filter((task) => task.status === 'DONE').length;
  return {
    total: items.length,
    done,
    percent: items.length ? Math.round((done * 100) / items.length) : 0,
  };
}
export function today(timezone = 'Europe/Paris') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join('-');
}
export function overdue(task: Task, date = today()) {
  return task.status !== 'DONE' && !!task.dueDate && task.dueDate < date;
}
export function activeProjects(projects: Project[]) {
  return projects.filter((project) => project.status !== 'ARCHIVED');
}
export function dateLabel(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'Sans échéance';
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value);
  return new Intl.DateTimeFormat('fr-FR', options || { day: 'numeric', month: 'short' }).format(
    date,
  );
}
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}
