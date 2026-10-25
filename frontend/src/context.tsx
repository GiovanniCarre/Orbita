import { createContext, useContext } from 'react';
import type { Editor, Me, Space, View, WorkspaceData } from './types';

interface WorkspaceContext {
  me: Me;
  space: Space;
  data: WorkspaceData;
  canWrite: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  refreshMe: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  edit: (editor: Editor) => void;
  go: (view: View) => void;
  endpoint: (path: string) => string;
}
export const Workspace = createContext<WorkspaceContext | null>(null);
export function useWorkspace() {
  const context = useContext(Workspace);
  if (!context) throw new Error('Espace de travail absent');
  return context;
}
