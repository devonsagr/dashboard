import { motion } from 'motion/react';
import type { KNode, Known } from './store';

const KNOWN_TONE: Record<Known, string> = { 懂: 'var(--ok)', 半懂: 'var(--info)', 不懂: 'var(--bad)', 想拓展: 'var(--accent)' };
export const KNOWN_LIST = Object.keys(KNOWN_TONE) as Known[];
export const knownColor = (k?: Known) => (k ? KNOWN_TONE[k] : 'var(--faint)');

/** 知识景观：径向树（根在中心，子节点按层向外） */
export function Landscape({ nodes, height = 260, onPick, picked }: { nodes: KNode[]; height?: number; onPick?: (n: KNode) => void; picked?: string }) {
  const W = 520, H = 320, cx = W / 2, cy = H / 2;
  const root = nodes.find((n) => !n.parent)!;
  const pos = new Map<string, { x: number; y: number; d: number }>();
  pos.set(root.id, { x: cx, y: cy, d: 0 });
  const kids = (id: string) => nodes.filter((n) => n.parent === id);
  const lvl1 = kids(root.id);
  lvl1.forEach((n, i) => {
    const a = (i / lvl1.length) * Math.PI * 2 - Math.PI / 2;
    pos.set(n.id, { x: cx + Math.cos(a) * 92, y: cy + Math.sin(a) * 78, d: 1 });
    const k2 = kids(n.id);
    k2.forEach((m, j) => {
      const b = a + (j - (k2.length - 1) / 2) * 0.55;
      pos.set(m.id, { x: cx + Math.cos(b) * 190, y: cy + Math.sin(b) * 128, d: 2 });
    });
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="landscape" style={{ height, width: '100%' }}>
      {nodes.filter((n) => n.parent && pos.has(n.id)).map((n, i) => {
        const a = pos.get(n.parent!)!, b = pos.get(n.id)!;
        return <motion.path key={n.id} d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 - 14} ${b.x},${b.y}`} fill="none" stroke="var(--line-strong)" strokeWidth={1}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.2, 0, 0, 1] }} />;
      })}
      {nodes.filter((n) => pos.has(n.id)).map((n, i) => {
        const p = pos.get(n.id)!, r = p.d === 0 ? 7 : p.d === 1 ? 5 : 4;
        return (
          <motion.g key={n.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + 0.04 * i }} style={{ transformOrigin: `${p.x}px ${p.y}px`, cursor: onPick ? 'pointer' : 'default' }} onClick={() => onPick?.(n)}>
            {picked === n.id && <circle cx={p.x} cy={p.y} r={r + 6} fill="var(--accent-bg)" />}
            <circle cx={p.x} cy={p.y} r={r} fill={n.known ? knownColor(n.known) : 'var(--surface)'} stroke={n.known ? 'none' : (n.aiSuggest ? 'var(--ai)' : 'var(--faint)')} strokeDasharray={n.known ? undefined : '2 2'} />
            <text x={p.x} y={p.y + (p.d === 0 ? -14 : 16)} textAnchor="middle" fontSize={p.d === 0 ? 14 : 11.5} fill={p.d === 0 ? 'var(--text)' : 'var(--text-2)'} fontFamily={p.d === 0 ? 'var(--font-serif)' : 'var(--font-sans)'}>{n.title}</text>
          </motion.g>
        );
      })}
    </svg>
  );
}
export function KnownLegend() {
  return <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>{KNOWN_LIST.map((k) => <span key={k} className="row small muted" style={{ gap: 5 }}><i className="hdot" style={{ color: knownColor(k) }} />{k}</span>)}<span className="row small muted" style={{ gap: 5 }}><i className="hdot hollow" />我还没标（虚线 = 只有 AI 建议）</span></div>;
}
