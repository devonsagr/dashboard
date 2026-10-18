import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getLastBoard, boardPath } from '../board/store';
import { store } from '../../data';

/**
 * 全局浮层与导航意图。没有侧栏、没有右侧速览：
 * 点卡片里的东西 = 打开它的完整页（带从卡片放大的过渡）。
 */
export type OpenTarget =
  | { kind: 'material'; id: string } | { kind: 'action'; id: string } | { kind: 'decision'; id: string } | { kind: 'project'; id: string; tab?: string }
  | { kind: 'source'; id: string } | { kind: 'path'; to: string };
/** 共享对象的「主场」：点一个对象，进它所属卡片的完整页 */
export const targetPath = (t: OpenTarget): string => {
  if (t.kind === 'material') { const h = store.mat(t.id)?.home; return h?.card === 'favorites' ? `/c/favorites/i/${h.id}` : `/c/inbox/m/${t.id}`; }
  return t.kind === 'action' ? `/c/today/a/${t.id}` : t.kind === 'decision' ? `/c/decisions/${t.id}`
    : t.kind === 'project' ? `/c/projects/${t.id}${t.tab ? '/' + t.tab : ''}` : t.kind === 'source' ? `/c/sources/${t.id}` : t.to;
};

export interface Toast { id: number; msg: string; tone?: 'ok' | 'bad'; action?: { label: string; run: () => void } }
interface Ctx {
  open: (t: OpenTarget, from?: Element | null) => void;
  origin: DOMRect | null; clearOrigin: () => void;
  palette: boolean; setPalette: (v: boolean) => void;
  capture: boolean; setCapture: (v: boolean) => void;
  library: boolean; setLibrary: (v: boolean) => void;
  toast: (msg: string, action?: Toast['action'], tone?: Toast['tone']) => void; toasts: Toast[];
}
const C = createContext<Ctx>(null!);
export const useOverlay = () => useContext(C);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const [palette, setPalette] = useState(false);
  const [capture, setCapture] = useState(false);
  const [library, setLibrary] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((msg: string, action?: Toast['action'], tone?: Toast['tone']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, action, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 5000 : 2600);
  }, []);
  const open = useCallback((t: OpenTarget, from?: Element | null) => {
    const el = (from ?? document.activeElement)?.closest?.('.card');
    setOrigin(el ? el.getBoundingClientRect() : null);
    nav(targetPath(t));
  }, [nav]);
  const onBoard = loc.pathname === '/' || loc.pathname.startsWith('/b/');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); }
      else if (mod && e.key.toLowerCase() === 'j') { e.preventDefault(); setCapture((v) => !v); }
      else if (e.key === 'Escape') {
        if (palette || capture || library) { setPalette(false); setCapture(false); setLibrary(false); }
        else if (!onBoard && !(e.target as HTMLElement).closest('input,textarea,select')) nav(boardPath(getLastBoard()));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette, capture, library, onBoard, nav]);
  const v = useMemo(() => ({ open, origin, clearOrigin: () => setOrigin(null), palette, setPalette, capture, setCapture, library, setLibrary, toast, toasts }), [open, origin, palette, capture, library, toasts, toast]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
