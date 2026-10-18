import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useData, type SourceHealth, type SourceMode } from '../../data';
import { full, relTime } from '../../data/time';
import { MODULES } from '../../workbench/cards/registry';
import { MaterialRow } from '../../ui/objects';
import { RefPath } from '../../ui/refs';
import { Empty, HEALTH_LABEL, HealthChip, HealthDot, KV, Kpi, PageHeader, SampleMark, Section, Seg, Tag } from '../../ui/ui';
import { useOverlay } from '../../workbench/app/overlay';
import { S, type Diagnostic } from './store';

/**
 * 接入源与数据诊断，是两件不同的事：
 *  - 接入源健康 = 这个源还能不能读到（在线 / 陈旧 / 离线 / 缺文件 / 未核验 / 计划中）；
 *  - 数据诊断 = 读到之后解析 / 写入实际出了什么错，落到具体文件和受影响的卡片。
 * 前端只显示后端报告的状态，不自己推断「正常」。
 */
export const PLAN: { tier: string; desc: string; ids: string[] }[] = [
  { tier: '第一批 · 直接接', desc: '已经是 Markdown 文件，读起来稳定，画板主要靠它们', ids: ['C01', 'C02', 'C08', 'C11', 'C03', 'C12', 'V11', 'H07'] },
  { tier: '第二批 · 按批次接', desc: '有导出或手动触发，适合收件和流转', ids: ['C13', 'C14', 'P01', 'P02', 'C15', 'H02', 'H03', 'H04', 'H05', 'P11'] },
  { tier: '第三批 · 本机服务', desc: '需要服务在线；离线时卡片显示「离线」而不是 0', ids: ['C05', 'C07', 'C06', 'C04', 'C10'] },
  { tier: '先不接', desc: '还在计划、不稳定，或本轮不迁移', ids: ['C16', 'P04', 'P06', 'H10', 'A08', 'P10', 'P09', 'H01'] },
];
const BAD: SourceHealth[] = ['offline', 'missing', 'stale', 'partial'];
const MODES: SourceMode[] = ['自动', '半自动', '手动', '计划', '未知'];
const LEVEL = { error: ['错误', 'bad'], warn: ['警告', 'warn'], info: ['信息', 'faint'] } as const;

/* ───────── 卡片 ───────── */
export function SourceHealthCard() {
  const ss = useData((db) => db.sources);
  const bad = ss.filter((s) => BAD.includes(s.health));
  const counts = (['ok', 'stale', 'partial', 'offline', 'unverified', 'planned'] as SourceHealth[]).map((h) => [h, ss.filter((s) => s.health === h).length] as const).filter(([, n]) => n);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row wrap small" style={{ gap: 8 }}>{counts.map(([h, n]) => <span key={h} className="row" style={{ gap: 4 }}><HealthDot h={h} />{HEALTH_LABEL[h]} <b className="mono">{n}</b></span>)}</div>
      <div className="mini-head">需要留意 {bad.length}</div>
      {bad.slice(0, 6).map((s) => <Link key={s.id} to={`/c/sources/${s.id}`} className="mini-row"><HealthDot h={s.health} /><span className="mono faint">{s.id}</span><span className="ellipsis">{s.name}</span><span className="faint small" style={{ marginLeft: 'auto' }}>{relTime(s.lastReadAt)}</span></Link>)}
    </div>
  );
}

export function DiagnosticsCard() {
  const l = useData((db) => S.d.diagnostics.filter((d) => !d.resolved && d.level !== 'info'));
  if (!l.length) return <Empty title="没有未处理的问题" />;
  return (
    <div className="stack" style={{ gap: 4 }}>
      {l.map((d) => <Link key={d.id} to={`/c/sources/diagnostics#${d.id}`} className="diag-mini"><Tag tone={LEVEL[d.level][1]}>{d.area}</Tag><span className="ellipsis small">{d.text}</span></Link>)}
      <div className="small faint">影响哪张卡写在详情里 <SampleMark /></div>
    </div>
  );
}

/* ───────── 页面 ───────── */
export default function SourcesPage() {
  const ss = useData((db) => db.sources);
  const [mode, setMode] = useState<SourceMode | '全部'>('全部');
  const groups = [...new Set(ss.map((s) => s.group))];
  const list = ss.filter((s) => mode === '全部' || s.mode === mode);
  return (
    <div className="page wide">
      <PageHeader title="接入源" sub={<>仪表盘能读到哪些东西、怎么来的、不能当成什么。<SampleMark text="健康状态为样例" /></>} actions={<Link className="btn sm" to="/c/sources/diagnostics">数据诊断</Link>} />
      <Section title="概况"><div className="kpis">{MODES.map((m) => <Kpi key={m} value={ss.filter((s) => s.mode === m).length} label={m} />)}<Kpi value={ss.filter((s) => s.feedsFlow).length} label="进入收件流" /><Kpi value={ss.filter((s) => BAD.includes(s.health)).length} label="需要留意" /></div></Section>
      <Section title="建议的接入顺序" desc="给后端的建议：已有可读文件 > 有导出 > 依赖本机服务 > 计划 / 未知">
        <div className="plan">
          {PLAN.map((p, i) => (
            <div key={p.tier} className="plan-col">
              <div className="plan-head"><span className="mono faint">{String(i + 1).padStart(2, '0')}</span><b>{p.tier}</b></div>
              <div className="small muted">{p.desc}</div>
              <div className="stack" style={{ gap: 2, marginTop: 8 }}>{p.ids.map((id) => { const s = ss.find((x) => x.id === id); return s ? <Link key={id} to={`/c/sources/${id}`} className="plan-item"><HealthDot h={s.health} /><span className="mono faint">{id}</span><span className="ellipsis">{s.name}</span></Link> : null; })}</div>
            </div>
          ))}
        </div>
      </Section>
      <div className="filter-bar"><Seg id="smode" value={mode} onChange={setMode} items={(['全部', ...MODES] as const).map((m) => ({ key: m, label: m }))} /></div>
      {groups.map((g) => {
        const gl = list.filter((s) => s.group === g);
        return gl.length ? (
          <Section key={g} title={g} count={gl.length} flush>
            <div className="src-table">{gl.map((s) => (
              <Link key={s.id} to={`/c/sources/${s.id}`} className="src-row">
                <span className="mono faint">{s.id}</span><span className="src-name">{s.name}{s.feedsFlow && <span className="flow-mark" title="进入收件流">→ 收件</span>}</span>
                <span className="small muted ellipsis">{s.provides}</span><Tag>{s.mode}</Tag><HealthChip h={s.health} />
              </Link>))}
            </div>
          </Section>
        ) : null;
      })}
    </div>
  );
}

export function SourceDetail() {
  const { id = '' } = useParams();
  const s = useData((db) => db.sources.find((x) => x.id === id));
  const mats = useData((db) => db.materials.filter((m) => m.sourceId === id && !m.archived));
  const diags = useData((db) => S.d.diagnostics.filter((d) => d.path && s?.location && d.path.startsWith(s.location.split(' ')[0])));
  if (!s) return <div className="page"><Empty title="没有这个接入源" action={<Link className="btn sm" to="/c/sources">返回接入源</Link>} /></div>;
  const tier = PLAN.find((p) => p.ids.includes(id));
  const used = MODULES.filter((c) => c.data.sources.includes(id));
  return (
    <div className="page">
      <PageHeader title={s.name} sub={s.provides} actions={<><span className="mono faint">{s.id}</span><Tag>{s.mode}</Tag><HealthChip h={s.health} /></>} />
      <div className="detail-grid">
        <div>
          <Section title="来自这个源的材料" count={mats.length}>{mats.length ? <div className="stack" style={{ gap: 0 }}>{mats.slice(0, 30).map((m) => <MaterialRow key={m.id} m={m} />)}</div> : <Empty title="没有材料" hint={s.feedsFlow ? '接入后会出现在收件里' : '这个源不进收件流，只在对应卡片里显示'} />}</Section>
          {diags.length > 0 && <Section title="相关诊断" count={diags.length}>{diags.map((d) => <DiagRow key={d.id} d={d} />)}</Section>}
        </div>
        <div>
          <Section title="说明"><KV rows={[['获取方式', s.via], ['位置', s.location ? <RefPath path={s.location} /> : '—'], ['限制', s.limits ?? '—'], ['条目数', s.count ?? '未知'], ['最后读取', s.lastReadAt ? full(s.lastReadAt) : '未知'], ['进入收件流', s.feedsFlow ? '是' : '否']]} /></Section>
          <SourceSettings id={s.id} location={s.location} />
          <Section title="用到它的卡片" count={used.length}>{used.length ? <div className="pill-row" style={{ padding: '0 8px 8px' }}>{used.map((c) => <Tag key={c.id}>{c.name}</Tag>)}</div> : <Empty title="还没有卡片用它" />}</Section>
          {tier && <Section title="接入建议"><div className="note-box" style={{ margin: '0 8px 8px' }}><b>{tier.tier}</b><div className="small muted">{tier.desc}</div></div></Section>}
        </div>
      </div>
    </div>
  );
}

/** 接入设置（仅界面）：真正保存由后端实现，建议写到 系统/界面/接入设置.json（建议，待确认） */
function SourceSettings({ id, location }: { id: string; location?: string }) {
  const { toast } = useOverlay();
  const [path, setPath] = useState(location ?? '');
  const [mode, setMode] = useState('open');
  useEffect(() => { setPath(location ?? ''); }, [id, location]);
  return (
    <Section title="接入设置" desc="界面占位 · 本轮不会真的保存">
      <div className="form" style={{ padding: '0 8px 10px' }}>
        <label><span>读取位置</span><input className="input mono" value={path} placeholder="Vault 内相对路径或本机地址" onChange={(e) => setPath(e.target.value)} /></label>
        <label><span>刷新</span><select className="input" value={mode} onChange={(e) => setMode(e.target.value)}><option value="open">打开画板时</option><option value="watch">文件变化时</option><option value="hour">每小时</option><option value="manual">只手动</option></select></label>
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}><button className="btn sm btn-ghost" onClick={() => toast(`已请求重新读取 ${id}（样例，不会真的读取）`)}>立即读取</button><button className="btn sm" onClick={() => toast('没有保存：接入设置等后端实现', undefined, 'bad')}>保存</button></div>
        <div className="small faint">建议存到 <span className="mono">系统/界面/接入设置.json</span>（建议，待确认）。</div>
      </div>
    </Section>
  );
}

function DiagRow({ d }: { d: Diagnostic }) {
  const { hash } = useLocation();
  return (
    <div id={d.id} className={`diag-row ${hash === '#' + d.id ? 'flash' : ''}`}>
      <Tag tone={LEVEL[d.level][1]}>{LEVEL[d.level][0]}</Tag>
      <div className="item-main">
        <div><b>{d.area}</b> · {d.text}</div>
        <div className="small muted">影响：{d.affects}</div>
        {d.path && <RefPath path={d.path} />}
      </div>
      <span className="mono small faint">{full(d.at)}</span>
    </div>
  );
}

export function DiagnosticsPage() {
  const l = useData((db) => S.d.diagnostics);
  const { hash } = useLocation();
  const [lv, setLv] = useState<'all' | Diagnostic['level']>('all');
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' }); }, [hash]);
  const shown = l.filter((d) => lv === 'all' || d.level === lv);
  const areas = [...new Set(shown.map((d) => d.area))];
  return (
    <div className="page">
      <PageHeader title="数据诊断" sub={<>读到的数据在解析 / 写入时出了什么问题，涉及哪个文件，影响哪张卡。这是技术指标，不是生活数据。<SampleMark /></>}
        actions={<Seg id="dlv" value={lv} onChange={setLv} items={[{ key: 'all', label: '全部' }, { key: 'error', label: '错误' }, { key: 'warn', label: '警告' }, { key: 'info', label: '信息' }]} />} />
      <Section title="概况"><div className="kpis"><Kpi value={l.filter((d) => d.level === 'error').length} label="错误" /><Kpi value={l.filter((d) => d.level === 'warn').length} label="警告" /><Kpi value={l.filter((d) => d.resolved).length} label="已解决" /><Kpi value={new Set(l.map((d) => d.path).filter(Boolean)).size} label="涉及文件" /></div></Section>
      {areas.map((a) => <Section key={a} title={a} count={shown.filter((d) => d.area === a).length}>{shown.filter((d) => d.area === a).map((d) => <DiagRow key={d.id} d={d} />)}</Section>)}
      {!shown.length && <Empty title="没有这一级别的问题" />}
      <div className="note-box small">修复方式：打开对应文件改正后，后端重新解析；前端不会自动改你的文件。接入源是否在线见 <Link className="link" to="/c/sources">接入源</Link>。</div>
    </div>
  );
}
