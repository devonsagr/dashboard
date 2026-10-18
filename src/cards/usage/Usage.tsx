import type { CardProps } from '../../workbench/cards/protocol';
import { useData } from '../../data';
import { full, relTime } from '../../data/time';
import { Empty, KV, Kpi, PageHeader, SampleMark, Section, Tag } from '../../ui/ui';
import { S } from './store';

/**
 * 电脑使用时长。口径写在卡片上：前台窗口时长、空闲不计、只有域名不是浏览记录。
 * 缺口（扩展没上报的时段）单独列出，不平摊、不补。
 */
const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m}m`);
function BarList({ rows, max }: { rows: { k: string; v: number }[]; max: number }) {
  return (
    <div className="hbar-list">
      {rows.map((r) => (
        <div key={r.k} className="hbar"><span className="ellipsis">{r.k}</span><i style={{ width: `${(r.v / max) * 100}%` }} /><span className="mono small">{fmt(r.v)}</span></div>
      ))}
    </div>
  );
}

export function UsageCard({ inst }: CardProps) {
  const u = useData((db) => S.d.usage);
  if (!u.online) return <Empty title="使用时长服务离线" hint={`最后数据 ${relTime(u.asOf)}`} />;
  const total = u.apps.reduce((s, a) => s + a.min, 0);
  const max = Math.max(...u.apps.map((a) => a.min), 1);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between"><span><b className="serif" style={{ fontSize: 22 }}>{fmt(total)}</b> <span className="small muted">前台</span></span><span className="small faint">截至 {relTime(u.asOf)} <SampleMark /></span></div>
      <BarList rows={u.apps.slice(0, Math.max(2, inst.h - 2)).map((a) => ({ k: a.name, v: a.min }))} max={max} />
      {u.gaps.length > 0 && <div className="small tone-warn-text">有 {u.gaps.length} 段没上报</div>}
    </div>
  );
}

export default function UsagePage() {
  const u = useData((db) => S.d.usage);
  const total = u.apps.reduce((s, a) => s + a.min, 0);
  const sites = u.sites.reduce((s, a) => s + a.min, 0);
  return (
    <div className="page">
      <PageHeader title="电脑使用" sub={<>本机前台窗口与网站域名时长。只有程序名、域名和时长，不是完整浏览记录。<SampleMark /></>} actions={u.online ? <Tag tone="ok">在线</Tag> : <Tag tone="bad">离线</Tag>} />
      <Section title="今天" desc={`数据截至 ${full(u.asOf)}`}>
        <div className="kpis"><Kpi value={fmt(total)} label="前台合计" /><Kpi value={fmt(sites)} label="已识别网站" hint="包含在 Chrome 里" /><Kpi value={u.idleMin == null ? '未知' : fmt(u.idleMin)} label="空闲（不计入）" /><Kpi value={u.gaps.length} label="没上报的时段" /></div>
      </Section>
      <div className="grid2">
        <Section title="程序" count={u.apps.length}><div style={{ padding: '4px 8px 10px' }}><BarList rows={u.apps.map((a) => ({ k: a.name, v: a.min }))} max={Math.max(...u.apps.map((a) => a.min), 1)} /></div></Section>
        <Section title="网站（按域名）" count={u.sites.length} desc="Chrome 扩展心跳，只记域名">{u.sites.length ? <div style={{ padding: '4px 8px 10px' }}><BarList rows={u.sites.map((a) => ({ k: a.domain, v: a.min }))} max={Math.max(...u.sites.map((a) => a.min), 1)} /></div> : <Empty title="没有网站数据" />}</Section>
      </div>
      <Section title="口径与缺口">
        <KV rows={[['统计口径', u.basis], ['覆盖范围', u.coverage], ['来源', 'C06 本机程序 + P07 Chrome 扩展'], ['缺口', u.gaps.length ? u.gaps.join('；') : '无']]} />
        <div className="note-box small" style={{ margin: '4px 8px 10px' }}>缺口时段不平摊、不估算；手机与平板的使用不在这里。</div>
      </Section>
    </div>
  );
}
