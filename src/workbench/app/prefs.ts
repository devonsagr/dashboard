import { useSyncExternalStore } from 'react';

/** 界面偏好：只存在浏览器本地，不写进业务 Markdown */
export type Palette = 'warm' | 'neutral' | 'obsidian';
export type Accent = 'clay' | 'graphite' | 'moss' | 'indigo' | 'obsidian';
/** boardNav：画板在顶栏里展开成标签（tabs，默认）还是收成一个下拉菜单（menu） */
export interface Prefs { theme: 'light' | 'dark' | 'system'; palette: Palette; accent: Accent; density: 'comfortable' | 'compact'; motion: 'on' | 'off'; userName: string; boardNav: 'tabs' | 'menu'; boardIcons: boolean }
export const PALETTES: { id: Palette; name: string; desc: string; swatch: [string, string] }[] = [
  { id: 'warm', name: '暖纸', desc: '默认，安静的暖白', swatch: ['#faf9f5', '#f0eee6'] },
  { id: 'neutral', name: '中性', desc: '贴近 Obsidian 默认主题的白和灰', swatch: ['#ffffff', '#f6f6f6'] },
  { id: 'obsidian', name: '跟随 Obsidian', desc: '挂进 Obsidian 后直接用当前主题的颜色', swatch: ['#ffffff', '#ebe6fb'] },
];
export const ACCENTS: { id: Accent; name: string; color: string }[] = [
  { id: 'clay', name: '陶土', color: '#c96442' }, { id: 'graphite', name: '石墨', color: '#3d3d3a' }, { id: 'moss', name: '苔绿', color: '#5b7a4c' },
  { id: 'indigo', name: '靛蓝', color: '#4f5fa8' }, { id: 'obsidian', name: '跟随 Obsidian', color: '#7c5cff' },
];
export const PREFS_KEY = 'pkd.v5.prefs.v2';
const KEY = PREFS_KEY;
const defaults: Prefs = { theme: 'light', palette: 'warm', accent: 'clay', density: 'comfortable', motion: 'on', userName: '访客', boardNav: 'tabs', boardIcons: true };
let prefs: Prefs = { ...defaults, ...safeParse(localStorage.getItem(KEY)) };
const ls = new Set<() => void>();
function safeParse(s: string | null) { try { return s ? JSON.parse(s) : {}; } catch { return {}; } }

export function applyPrefs() {
  const r = document.documentElement;
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  r.dataset.theme = dark ? 'dark' : 'light';
  r.dataset.density = prefs.density;
  r.dataset.palette = prefs.palette;
  r.dataset.accent = prefs.accent;
  r.dataset.motion = prefs.motion;
}
export function setPrefs(p: Partial<Prefs>) {
  prefs = { ...prefs, ...p };
  localStorage.setItem(KEY, JSON.stringify(prefs));
  applyPrefs();
  ls.forEach((l) => l());
}
export function usePrefs(): Prefs {
  return useSyncExternalStore((f) => { ls.add(f); return () => ls.delete(f); }, () => prefs);
}
