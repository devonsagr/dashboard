/**
 * 通用界面组件（与业务无关）。业务对象的行组件在 ui/objects.tsx。
 */
import { Fragment, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, CornerDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Hist, SourceHealth } from '../data/types';
import { useData } from '../data';
import { host } from '../data/host';
import { full, hm, md, dateOf, relTime } from '../data/time';

/* 自有标志：四块卡片（一块高亮）。spinning 时高亮依次走动，表示“在处理” */
const TILES = [[1, 1], [9, 1], [9, 9], [1, 9]];
export function Spark({ spinning = false, size = 16 }: { spinning?: boolean; size?: number }) {
  return (
    <svg className={`mark ${spinning ? 'spin' : ''}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      {TILES.map(([x, y], i) => <rect key={i} x={x} y={y} width="6" height="6" rx="1.8" className={`t t${i}`} />)}
    </svg>
  );
}
export const Mark = Spark;
export function Thinking({ text = '正在读取' }: { text?: string }) { return <div className="thinking"><Spark spinning /> <span>{text}…</span></div>; }

export function Tag({ children, tone = 'neutral', title }: { children: ReactNode; tone?: string; title?: string }) { return <span className={`chip tone-${tone}`} title={title}>{children}</span>; }
export function Chip({ children, tone = 'neutral', title }: { children: ReactNode; tone?: string; title?: string }) { return <span className={`chip tone-${tone}`} title={title}><i className="dot" />{children}</span>; }
export function AiTag({ label = 'AI' }: { label?: string }) { return <span className="ai-tag">{label}</span>; }
/** 「样例」小标：凡是演示数据，在显眼处标出 */
export function SampleMark({ text = '样例' }: { text?: string }) { return host ? null : <span className="sample-mark" title="这是演示用的样例数据，不代表真实情况">{text}</span>; }

export const HEALTH_LABEL: Record<SourceHealth, string> = { ok: '正常', stale: '陈旧', offline: '离线', partial: '部分', missing: '缺文件', unverified: '未核验', planned: '计划中', unconfigured: '未配置' };
export const HEALTH_TONE: Record<SourceHealth, string> = { ok: 'ok', stale: 'warn', offline: 'bad', partial: 'warn', missing: 'bad', unverified: 'faint', planned: 'faint', unconfigured: 'faint' };
export function HealthChip({ h }: { h: SourceHealth }) { return <Chip tone={HEALTH_TONE[h]}>{HEALTH_LABEL[h]}</Chip>; }
export function HealthDot({ h }: { h: SourceHealth }) { return <i className={`hdot tone-${HEALTH_TONE[h]}`} title={HEALTH_LABEL[h]} />; }

export function SourceChip({ id, label }: { id: string; label?: string }) {
  const s = useData((db) => db.sources.find((x) => x.id === id));
  if (host) return <span className="src-chip">{label ?? s?.name ?? 'Vault'}</span>;
  return <Link to={`/c/sources/${id}`} className="src-chip" onClick={(e) => e.stopPropagation()}><span className="mono">{id}</span>{label ?? s?.name}</Link>;
}

/** 有含义的时间：标签 + 时间。没有值时写「未知」，不写 0 */
export function TimeMeta({ items }: { items: [string, string | undefined][] }) {
  return <span className="time-meta">{items.map(([k, v]) => <span key={k}><span className="faint">{k}</span> <span className="mono">{v ? full(v) : '未知'}</span></span>)}</span>;
}
export const Ago = ({ at }: { at?: string }) => <span className="mono faint" title={at ? full(at) : '时间未知'}>{relTime(at)}</span>;

export function PageHeader({ title, sub, actions, meta }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-row">
        <div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}{meta && <div className="page-meta">{meta}</div>}</div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}
export function Section({ title, desc, count, right, children, flush, id }: { title: ReactNode; desc?: ReactNode; count?: ReactNode; right?: ReactNode; children: ReactNode; flush?: boolean; id?: string }) {
  return (
    <section className={`section ${flush ? 'flush' : ''}`} id={id}>
      <div className="section-head">
        <div><h3>{title}{count !== undefined && <span className="count">{count}</span>}</h3>{desc && <p className="muted small">{desc}</p>}</div>
        {right}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}
export function Empty({ title, hint, icon, action }: { title: string; hint?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return <div className="empty">{icon ?? <Spark />}<div><div>{title}</div>{hint && <div className="muted small">{hint}</div>}{action && <div style={{ marginTop: 8 }}>{action}</div>}</div></div>;
}
export function Kpi({ value, unit, label, hint }: { value: ReactNode; unit?: string; label: string; hint?: ReactNode }) {
  return <div className="kpi"><div className="kpi-v serif">{value ?? '—'}{unit && value !== undefined && value !== '—' && <span className="kpi-u">{unit}</span>}</div><div className="kpi-l">{label}</div>{hint && <div className="kpi-h faint">{hint}</div>}</div>;
}
export function Check2({ on, onClick, disabled, busy }: { on: boolean; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button className={`check ${on ? 'on' : ''} ${busy ? 'busy' : ''}`} disabled={disabled || busy} onClick={(e) => { e.stopPropagation(); onClick(); }} aria-pressed={on} aria-label={on ? '恢复' : '完成'}>
      <AnimatePresence>{on && <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}><Check size={12} strokeWidth={3} /></motion.span>}</AnimatePresence>
    </button>
  );
}
export function Tabs<T extends string>({ items, value, onChange, id }: { items: { key: T; label: ReactNode; count?: number }[]; value: T; onChange: (k: T) => void; id: string }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button key={it.key} role="tab" aria-selected={value === it.key} className={`tab ${value === it.key ? 'on' : ''}`} onClick={() => onChange(it.key)}>
          {it.label}{it.count !== undefined && <span className="count">{it.count}</span>}
          {value === it.key && <motion.span layoutId={`tab-${id}`} className="tab-ind" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
        </button>
      ))}
    </div>
  );
}
export function Seg<T extends string>({ items, value, onChange, id }: { items: { key: T; label: ReactNode }[]; value: T; onChange: (k: T) => void; id: string }) {
  return <div className="seg">{items.map((it) => <button key={it.key} className={value === it.key ? 'on' : ''} onClick={() => onChange(it.key)}>{value === it.key && <motion.i layoutId={`seg-${id}`} className="seg-bg" />}<span>{it.label}</span></button>)}</div>;
}
/** 柱状图：v 为 undefined 的列画成虚线框（未知，不是 0） */
export function Bars({ data, h = 120, label, accent }: { data: { k: string; v?: number; v2?: number; unknown?: boolean; title?: string }[]; h?: number; label?: (k: string) => string; accent?: (k: string) => boolean }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.v ?? 0, d.v2 ?? 0)));
  return (
    <div className="bars" style={{ height: h }}>
      {data.map((d, i) => (
        <div key={d.k} className="bar-col" title={d.title ?? `${d.k}：${d.v ?? '未知'}${d.v2 !== undefined ? ' / ' + d.v2 : ''}`}>
          <div className="bar-stack">
            {d.v === undefined || d.unknown ? <div className="bar unknown" /> : <>
              {d.v2 !== undefined && <motion.div className="bar ghost" initial={{ height: 0 }} animate={{ height: `${(d.v2 / max) * 100}%` }} transition={{ delay: i * 0.012, duration: 0.4, ease: [0.2, 0, 0, 1] }} />}
              <motion.div className={`bar ${accent?.(d.k) ? 'accent' : ''}`} initial={{ height: 0 }} animate={{ height: `${(d.v / max) * 100}%` }} transition={{ delay: i * 0.012, duration: 0.4, ease: [0.2, 0, 0, 1] }} />
            </>}
          </div>
          {label && <div className="bar-k mono">{label(d.k)}</div>}
        </div>
      ))}
    </div>
  );
}
/** 折线：null 表示缺测，断开不连 */
export function Line({ data, h = 60, w = 300 }: { data: (number | null)[]; h?: number; w?: number }) {
  const vals = data.filter((v): v is number => v !== null);
  const max = Math.max(...vals), min = Math.min(...vals);
  const segs: string[][] = [[]];
  data.forEach((v, i) => { if (v === null) { segs.push([]); return; } segs[segs.length - 1].push(`${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * (h - 6) - 3}`); });
  return <svg className="line" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: h }}>{segs.filter((s) => s.length).map((s, i) => <polyline key={i} points={s.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}</svg>;
}
export function MoreLink({ to, children = '查看全部' }: { to: string; children?: ReactNode }) {
  return <Link to={to} className="more-link" onClick={(e) => e.stopPropagation()}>{children}<ChevronRight size={14} /></Link>;
}
export function History({ items }: { items: Hist[] }) {
  return (
    <ol className="timeline">
      {items.map((e, i) => (
        <li key={i} className={`tl-${e.by === 'AI' ? 'ai' : e.by === '我' ? 'me' : 'sys'}`}>
          <span className="tl-mark">{i === 0 ? '●' : <CornerDownRight size={12} />}</span>
          <div><div>{e.text}</div><div className="mono faint">{md(dateOf(e.at))} {hm(e.at)} · {e.by}</div></div>
        </li>
      ))}
    </ol>
  );
}
export function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return <dl className="kv small">{rows.map(([k, v], i) => <Fragment key={i}><dt>{k}</dt><dd>{v ?? <span className="faint">未知</span>}</dd></Fragment>)}</dl>;
}
