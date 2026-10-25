import { describe, expect, it } from 'vitest';
import { matches, overdue, progress, activeProjects } from './selectors';
import type { Project, Task } from './types';

const task = (id: string, projectId: string, status = 'BACKLOG') =>
  ({ id, projectId, status }) as Task;

describe('Les données affichées dans l’espace', () => {
  it('retrouve les textes accentués avec plusieurs mots', () => {
    expect(matches('echeance partenariat', 'Échéance', 'Partenariat culinaire')).toBe(true);
    expect(matches('echeance facture', 'Échéance partenariat')).toBe(false);
  });
  it('calcule la progression uniquement à partir des tâches du projet', () => {
    expect(progress([task('1', 'a', 'DONE'), task('2', 'a'), task('3', 'b', 'DONE')], 'a')).toEqual(
      { total: 2, done: 1, percent: 50 },
    );
    expect(progress([], 'a')).toEqual({ total: 0, done: 0, percent: 0 });
  });
  it('ne marque pas une tâche terminée ou due aujourd’hui en retard', () => {
    expect(overdue({ ...task('1', 'a'), dueDate: '2026-10-24' }, '2026-10-25')).toBe(true);
    expect(overdue({ ...task('1', 'a', 'DONE'), dueDate: '2026-10-24' }, '2026-10-25')).toBe(false);
    expect(overdue({ ...task('1', 'a'), dueDate: '2026-10-25' }, '2026-10-25')).toBe(false);
  });
  it('conserve les projets en pause mais masque les projets archivés dans les choix actifs', () => {
    const projects = [
      { status: 'ACTIVE' },
      { status: 'PAUSED' },
      { status: 'ARCHIVED' },
    ] as Project[];
    expect(activeProjects(projects)).toHaveLength(2);
  });
});
