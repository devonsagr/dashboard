import type { Action, Project, Decision, Material, DiaryDay, LibraryDoc } from './types';

export interface HostSnapshot { actions: Action[]; projects: Project[]; decisions: Decision[]; materials: Material[]; diary: DiaryDay[]; library: LibraryDoc[]; recentDocs: { path: string; at: string }[] }
export interface DashboardHost {
  vaultName: string;
  preferences: Record<string, string>;
  load(): Promise<HostSnapshot>;
  execute(op: string, data: Record<string, unknown>): Promise<{ targetId?: string; path?: string; detail?: string }>;
  diary(date: string): Promise<DiaryDay>;
  open(path: string): Promise<void>;
  savePreference(key: string, value: string): Promise<void>;
}
declare global { interface Window { dashboardHost?: DashboardHost } }
export const host = window.dashboardHost;
export let hostSnapshot: HostSnapshot | undefined;
export async function connectHost() { if (host) hostSnapshot = await host.load(); }
export const connectedCards = new Set(['today', 'overdue', 'projects', 'decisions', 'quick-note', 'diary', 'inbox', 'recent-docs', 'clock', 'countdown']);
export const preferences = {
  getItem: (key: string) => host ? host.preferences[key] ?? null : localStorage.getItem(key),
  setItem(key: string, value: string) {
    if (!host) { localStorage.setItem(key, value); return; }
    host.preferences[key] = value;
    void host.savePreference(key, value).catch((error) => window.dispatchEvent(new CustomEvent('dashboard-save-error', { detail: String(error.message || error) })));
  },
};
