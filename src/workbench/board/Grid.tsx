import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { compact, moveTo, type CardInst } from './store';

/**
 * 自研 12 列网格：指针拖动 / 右下角缩放，碰撞下推 + 垂直压实，
 * 其他卡片用 transform 过渡让位；窄屏退化为单列只读。
 */
export const COLS = 12, ROW_H = 44, GAP = 12;
interface Drag { id: string; mode: 'move' | 'resize'; sx: number; sy: number; dx: number; dy: number; orig: CardInst }

export function Grid({ cards: raw, edit, onChange: commitRaw, render, minSize }: {
  cards: CardInst[]; edit: boolean; onChange: (c: CardInst[]) => void;
  render: (c: CardInst, ctx: { dragging: boolean; index: number }) => ReactNode;
  minSize: (kind: string, props?: Record<string, string>) => { w: number; h: number };
}) {
  // 折叠的卡在布局里只占 1 行；渲染时总是重新压实，存储里保留原始高度
  const cards = compact(raw.map((c) => (c.collapsed ? { ...c, h: 1 } : c)));
  const onChange = (next: CardInst[]) => commitRaw(next.map((n) => { const o = raw.find((r) => r.id === n.id)!; return { ...o, x: n.x, y: n.y, w: n.w, h: o.collapsed ? o.h : n.h }; }));
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState<CardInst[] | null>(null);
  const liveRef = useRef<CardInst[] | null>(null);
  liveRef.current = live;

  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el); setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const narrow = width > 0 && width < 860; // Obsidian 分屏时常见的窄宽度：改成两列/单列流式
  const colW = (width - GAP * (COLS - 1)) / COLS;
  const px = (r: { x: number; y: number; w: number; h: number }) => ({
    left: r.x * (colW + GAP), top: r.y * (ROW_H + GAP), width: r.w * colW + (r.w - 1) * GAP, height: r.h * ROW_H + (r.h - 1) * GAP,
  });

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      setDrag((d) => (d ? { ...d, dx, dy } : d));
      const o = drag.orig, p = px(o), min = minSize(o.kind, o.props);
      let target: CardInst;
      if (drag.mode === 'move') {
        target = { ...o, x: Math.round((p.left + dx) / (colW + GAP)), y: Math.max(0, Math.round((p.top + dy) / (ROW_H + GAP))) };
      } else {
        const w = Math.max(min.w, Math.min(COLS - o.x, Math.round((p.width + dx + GAP) / (colW + GAP))));
        const h = Math.max(min.h, Math.round((p.height + dy + GAP) / (ROW_H + GAP)));
        target = { ...o, w, h };
      }
      const cur = (liveRef.current ?? cards).find((c) => c.id === o.id)!;
      if (cur.x !== target.x || cur.y !== target.y || cur.w !== target.w || cur.h !== target.h || !liveRef.current) {
        setLive(moveTo(cards, target, COLS));
      }
    };
    const onUp = () => {
      if (liveRef.current) onChange(liveRef.current);
      setDrag(null); setLive(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id, drag?.mode, cards, colW]);

  const start = (e: React.PointerEvent, c: CardInst, mode: Drag['mode']) => {
    if (!edit || narrow || e.button !== 0 || c.locked || (mode === 'resize' && c.collapsed)) return;
    if (mode === 'move' && (e.target as HTMLElement).closest('[data-nodrag]')) return;
    e.preventDefault();
    setDrag({ id: c.id, mode, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, orig: c });
  };

  if (narrow) {
    const sorted = [...cards].sort((a, b) => a.y - b.y || a.x - b.x);
    return (
      <div ref={ref} className="grid narrow">
        {sorted.map((c, i) => (
          <div key={c.id} className={`grid-cell static ${c.w >= 6 ? 'wide' : ''}`} style={{ height: c.collapsed ? ROW_H : Math.min(c.h, 9) * ROW_H + (Math.min(c.h, 9) - 1) * GAP }}>{render(c, { dragging: false, index: i })}</div>
        ))}
      </div>
    );
  }

  const layout = live ?? cards;
  const rows = Math.max(0, ...layout.map((c) => c.y + c.h)) + (edit ? 4 : 0);
  const dragged = drag ? layout.find((c) => c.id === drag.id) : undefined;

  return (
    <div ref={ref} className={`grid ${edit ? 'editing' : ''} ${drag ? 'is-dragging' : ''}`} style={{ height: rows * (ROW_H + GAP) - GAP, ['--colw' as string]: `${colW + GAP}px`, ['--rowh' as string]: `${ROW_H + GAP}px` }}>
      {width > 0 && dragged && (() => { const p = px(dragged); return <div className="grid-ph" style={{ transform: `translate(${p.left}px, ${p.top}px)`, width: p.width, height: p.height }} />; })()}
      {width > 0 && layout.map((c, i) => {
        const isD = drag?.id === c.id;
        const base = px(isD ? drag!.orig : c);
        let { left, top, width: w, height: h } = base;
        if (isD && drag!.mode === 'move') { left += drag!.dx; top += drag!.dy; }
        if (isD && drag!.mode === 'resize') { w = Math.max(colW, w + drag!.dx); h = Math.max(ROW_H, h + drag!.dy); }
        return (
          <div key={c.id} className={`grid-cell ${isD ? 'dragging' : ''} ${c.locked ? 'locked' : ''}`} style={{ transform: `translate(${left}px, ${top}px)`, width: w, height: h }} onPointerDown={(e) => start(e, c, 'move')}>
            {render(c, { dragging: isD, index: i })}
            {edit && !c.locked && !c.collapsed && <span className="grid-resize" data-nodrag onPointerDown={(e) => { e.stopPropagation(); start(e, c, 'resize'); }} aria-label="调整大小" />}
          </div>
        );
      })}
    </div>
  );
}
