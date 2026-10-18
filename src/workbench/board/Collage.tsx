import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { CardInst, CollagePos } from './store';

/**
 * 拼贴布局：自由像素坐标，允许遮挡。
 * - 按下一张未锁定的卡（浏览或整理时都一样）就把它放到最上面（onFront）；
 * - 锁定（固定）的卡：不能拖、不能缩放、不能移除；层级在最顶层，按固定的先后叠（见 store.bringToFront / setLocked）；
 * - 边界：左右都夹在画板里（x ∈ [0, 宽 − 卡宽]），上边 y ≥ 0；画板变窄时渲染位置也会收回来，不会被右边裁掉；
 * - 坐标吸附 8px；折叠的卡只剩标题栏（高 44）。
 */
const SNAP = 8, HEAD = 44;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
interface Drag { id: string; mode: 'move' | 'resize'; sx: number; sy: number; orig: CollagePos }

export function Collage({ cards, edit, onChange, onFront, render, minSize }: {
  cards: CardInst[]; edit: boolean; onChange: (id: string, c: CollagePos) => void; onFront: (id: string) => void;
  render: (c: CardInst, ctx: { dragging: boolean; index: number }) => ReactNode;
  minSize: (kind: string, props?: Record<string, string>) => { w: number; h: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState<CollagePos | null>(null);
  const liveRef = useRef<CollagePos | null>(null); liveRef.current = live;

  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el); setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  /** 把一个位置夹进画板：宽度不超过画板，左右都不出界 */
  const clamp = (p: CollagePos, minW = 140): CollagePos => {
    if (!W) return p;
    const w = Math.max(Math.min(minW, W), Math.min(p.w, W));
    return { ...p, w, x: Math.max(0, Math.min(p.x, W - w)), y: Math.max(0, p.y) };
  };

  useEffect(() => {
    if (!drag) return;
    const card = cards.find((c) => c.id === drag.id)!;
    const min = minSize(card.kind, card.props);
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy, o = drag.orig;
      if (drag.mode === 'move') {
        setLive(clamp({ ...o, x: snap(o.x + dx), y: snap(o.y + dy) }));
      } else {
        const maxW = W ? W - o.x : Infinity;
        setLive({ ...o, w: Math.min(maxW, Math.max(min.w * 70, snap(o.w + dx))), h: Math.max(min.h * 40, snap(o.h + dy)) });
      }
    };
    const onUp = () => { if (liveRef.current) onChange(drag.id, liveRef.current); setDrag(null); setLive(null); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, W]);

  const down = (e: React.PointerEvent, c: CardInst, mode: Drag['mode']) => {
    if (e.button !== 0 || c.locked || !c.c) return;
    // 浏览或整理：按下即置顶。不拖动时（点按钮、勾选、输入）等这次点击结束后再置顶，
    // 否则 DOM 重新排序会让按钮收不到 click。
    const later = () => window.addEventListener('pointerup', () => setTimeout(() => onFront(c.id), 0), { once: true });
    if (!edit) return later();
    if (mode === 'move' && (e.target as HTMLElement).closest('[data-nodrag]')) return later();
    if (mode === 'resize' && c.collapsed) return later();
    onFront(c.id);
    e.preventDefault();
    setDrag({ id: c.id, mode, sx: e.clientX, sy: e.clientY, orig: clamp(c.c) });
  };

  const pos = (c: CardInst) => (drag?.id === c.id && live ? live : clamp(c.c ?? { x: 0, y: 0, w: 300, h: 240, z: 1 }));
  const height = Math.max(560, ...cards.map((c) => { const p = pos(c); return p.y + (c.collapsed ? HEAD : p.h); })) + (edit ? 240 : 40);
  const ordered = [...cards].sort((a, b) => (a.c?.z ?? 0) - (b.c?.z ?? 0));

  return (
    <div ref={ref} className={`collage ${edit ? 'editing' : ''} ${drag ? 'is-dragging' : ''}`} style={{ height }}>
      {W > 0 && ordered.map((c, i) => {
        const p = pos(c), isD = drag?.id === c.id;
        return (
          <div key={c.id} className={`collage-cell ${isD ? 'dragging' : ''} ${c.locked ? 'locked' : ''} ${c.collapsed ? 'folded' : ''}`} data-z={c.c?.z}
            style={{ transform: `translate(${p.x}px, ${p.y}px)`, width: p.w, height: c.collapsed ? HEAD : p.h, zIndex: isD ? 999 : p.z }}
            onPointerDown={(e) => down(e, c, 'move')}>
            {render(c, { dragging: isD, index: i })}
            {edit && !c.locked && !c.collapsed && <span className="grid-resize" data-nodrag onPointerDown={(e) => { e.stopPropagation(); down(e, c, 'resize'); }} aria-label="调整大小" />}
          </div>
        );
      })}
    </div>
  );
}
