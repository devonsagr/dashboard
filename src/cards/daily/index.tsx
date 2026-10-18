import { useSearchParams, Link } from 'react-router-dom';
import { Check, Inbox, Send, Stamp, Undo2 } from 'lucide-react';
import { defineImpl, type CardProps } from '../../workbench/cards/protocol';
import { store, useData, type Material, type Source } from '../../data';
import { dayKey, full, getCutoff, relTime, whyToday, workday, md, weekday } from '../../data/time';
import { useSettings } from '../../data/settings';
import { SUB } from '../../data/subject';
import { useFlowCounts } from '../../ui/flow';
import { AiTag, Empty, HealthDot, PageHeader, SampleMark, Section, Tabs, Tag } from '../../ui/ui';
import { RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';
import { S, finalize, markPushed, seen, take, unfinalize } from './store';

/* ───────── 现算：今天各来源贡献了什么 ───────── */
type Cov = '实际贡献' | '部分' | '旧数据' | '没有新内容' | '没读取' | '未接入';
const COV_TONE: Record<Cov, string> = { 实际贡献: 'ok', 部分: 'warn', 旧数据: 'warn', 没有新内容: 'faint', 没读取: 'faint', 未接入: 'faint' };
function coverage(sources: Source[], mats: Material[]) {
  const W = workday();
  return sources.filter((s) => s.feedsFlow || s.id === 'C21').map((s) => {
    const today = mats.filter((m) => m.sourceId === s.id && dayKey(m.receivedAt) === W);
    const fresh = !!s.lastReadAt && dayKey(s.lastReadAt) === W;
    const cov: Cov = ['planned', 'unconfigured', 'missing'].includes(s.health) ? '未接入'
      : today.length ? (s.health === 'ok' ? '实际贡献' : '部分')
        : !s.lastReadAt ? '没读取' : fresh ? '没有新内容' : '旧数据';
    const late = today.filter((m) => m.contentAt && dayKey(m.contentAt) < W).length;
    const n = today.length ? `${today.length} 条${late ? `（${late} 条是昨天的内容今天才取得）` : ''}` : '';
    const reason = cov === '未接入' ? (s.limits ?? '还没接') : cov === '旧数据' ? `最后读取 ${relTime(s.lastReadAt)}` : cov === '部分' ? `${n} · ${s.limits ?? '只取到一部分'}` : cov === '实际贡献' ? n : cov === '没读取' ? '今天没读过，不知道有没有新东西' : '今天读过，没有新东西';
    return { s, cov, n: today.length, reason };
  });
}
function useBrief() {
  const sources = useData((db) => db.sources); const mats = useData((db) => db.materials);
  const groups = useSettings((s) => s.groups);
  const W = workday();
  const cov = coverage(sources, mats);
  const focusMsgs = mats.filter((m) => m.kind === 'qq' && groups.find((g) => g.id === m.group)?.mode === '关注' && (dayKey(m.receivedAt) === W || dayKey(m.contentAt) === W) && !m.archived);
  const decisions = useData(() => store.openDecisions());
  const todayActs = useData(() => store.liveActions().filter((a) => !a.done && a.date && a.date <= W));
  const projects = useData((db) => db.projects.filter((p) => p.refreshes.some((r) => dayKey(r.at) === W || r.status === 'pending') || p.follow.owner === '我'));
  return { W, cov, focusMsgs, decisions, todayActs, projects };
}
const dayTitle = (d: string) => `${md(d)} ${weekday(d)}`;

function FlowTodo() {
  const c = useFlowCounts();
  return <div className="mini-flow">
    <Link to="/c/inbox?f=nonote" data-nodrag><span className="faint">没写备注</span><b>{c.noNote}</b></Link>
    <Link to="/c/inbox?f=ai" data-nodrag><span className="faint">AI 完，待我选</span><b>{c.pick}</b></Link>
    <Link to="/c/inbox?f=digest" data-nodrag><span className="faint">我自己处理</span><b>{c.self}</b></Link>
    <Link to="/c/inbox?f=later" data-nodrag><span className="faint">以后读</span><b>{c.later}</b></Link>
  </div>;
}
function Focus({ compact }: { compact?: boolean }) {
  const b = useBrief(); const { open } = useOverlay();
  const rows = [
    ...b.focusMsgs.map((m) => ({ k: m.id, tag: '消息', t: m.title, why: whyToday(m.contentAt, m.receivedAt), go: (e: HTMLElement) => open({ kind: 'material', id: m.id }, e) })),
    ...b.decisions.slice(0, 2).map((d) => ({ k: d.id, tag: '决策', t: d.title, why: d.whyNow, go: (e: HTMLElement) => open({ kind: 'decision', id: d.id }, e) })),
    ...b.projects.slice(0, 2).map((p) => ({ k: p.id, tag: '项目', t: `${p.name}：${p.follow.next}`, why: p.refreshes.find((r) => r.status === 'pending')?.note ?? `下一步归${p.follow.owner}`, go: (e: HTMLElement) => open({ kind: 'project', id: p.id }, e) })),
  ];
  if (!rows.length) return <Empty title="今天没有必须关注的" />;
  return <div>{rows.slice(0, compact ? 4 : 99).map((r) => <button key={r.k} className="focus-row" data-nodrag style={{ width: '100%', textAlign: 'left' }} onClick={(e) => r.go(e.currentTarget)}>
    <Tag tone={r.tag === '消息' ? 'accent' : r.tag === '决策' ? 'warn' : 'info'}>{r.tag}</Tag><span className="ellipsis" style={{ flex: 1 }}>{r.t}</span>{!compact && <span className="why">{r.why}</span>}
  </button>)}</div>;
}
function DiscoverList({ compact }: { compact?: boolean }) {
  const list = S.use((d) => d.discover); const w = useWrite(); const { open } = useOverlay();
  const W = workday();
  return <div className="stack" style={{ gap: 2 }}>
    {list.map((d) => { const isNew = dayKey(d.firstSeen) === W; return <div key={d.id} className="queue-item" data-nodrag>
      <div className="row" style={{ gap: 6 }}><Tag>{d.src}</Tag><a className="link ellipsis" href={d.url} target="_blank" rel="noreferrer">{d.title}</a>{isNew ? <Tag tone="accent">新</Tag> : <Tag tone="faint">{relTime(d.firstSeen)}出现</Tag>}{d.seen && <Tag tone="faint">看过</Tag>}</div>
      {!compact && <><div className="small muted">为什么推给你：{d.why}</div>{(d.age || d.rel) && <div className="small faint">内容本身：{d.age ?? "—"}{d.rel ? ` · ${d.rel}` : ""}</div>}
        <div className="row" style={{ gap: 6 }}>
          {d.taken ? <button className="btn xs" onClick={(e) => open({ kind: 'material', id: d.taken! }, e.currentTarget)}>已收进收件 →</button> : <button className="btn xs" onClick={() => w.run(() => take(d.id))}><Inbox size={11} />收进收件</button>}
          {!d.seen && <button className="btn xs btn-ghost" onClick={() => w.run(() => seen(d.id))}><Check size={11} />看过了</button>}
        </div></>}
    </div>; })}
    <WriteNote w={w} compact />
    {!compact && <div className="small faint">推荐 ≠ 收藏：只有点「收进收件」才进入流程。（样例）</div>}
  </div>;
}
function Brief({ inst }: CardProps) {
  const b = useBrief(); const fin = S.use((d) => d.finalized);
  const counts = b.cov.reduce((a, x) => ({ ...a, [x.cov]: (a[x.cov] ?? 0) + 1 }), {} as Record<string, number>);
  return <div className="stack" style={{ gap: 8 }}>
    <div className="row wrap small" style={{ gap: 6 }}><b>{dayTitle(b.W)}</b><span className="faint">从 {getCutoff()} 算起</span>{fin?.day === b.W ? <Tag tone="ok">已定稿</Tag> : <Tag tone="faint">草稿</Tag>}
      <span className="faint">来源：{(['实际贡献', '部分', '旧数据', '未接入'] as Cov[]).map((k) => `${k} ${counts[k] ?? 0}`).join(' · ')}</span></div>
    <Focus compact={inst.w < 6} />
    <FlowTodo />
  </div>;
}

type T = 'brief' | 'discover';
function DailyPage() {
  const [sp, setSp] = useSearchParams(); const t = (sp.get('t') as T) ?? 'brief';
  const b = useBrief(); const fin = S.use((d) => d.finalized); const sug = S.use((d) => d.suggest); const health = S.use((d) => d.health);
  const subj = SUB.use((d) => d.queue.filter((q) => q.state === '待确认' || (q.state === '已生效' && dayKey(q.at) === b.W)));
  const after = useData((db) => (fin ? db.materials.filter((m) => m.receivedAt > fin.at).length : 0));
  const w = useWrite(), ws = useWrite();
  return <div className="page">
    <PageHeader title={`日报 · ${dayTitle(b.W)}`} sub={<>一天从 {getCutoff()} 算起（<Link className="link" to="/settings#flow">改</Link>）。先说清每个来源今天到底贡献了什么，再说该关注什么；AI 的建议与推荐单独标出。<SampleMark /></>}
      actions={fin?.day === b.W ? <><Tag tone="ok">已定稿 · {full(fin.at)}</Tag><button className="btn sm btn-ghost" onClick={() => w.run(unfinalize)}><Undo2 size={13} />撤回定稿</button></> : <button className="btn sm btn-primary" onClick={() => w.run(finalize)}><Stamp size={13} />定稿</button>} />
    <WriteNote w={w} />
    {fin?.day === b.W && <div className="small muted">定稿写到 <RefPath path={fin.path} />{after ? <Tag tone="warn">定稿后又进来 {after} 条，没写进这份日报</Tag> : null}</div>}
    <Tabs id="daily" value={t} onChange={(k) => setSp(k === 'brief' ? {} : { t: k }, { replace: true })} items={[{ key: 'brief', label: '日报' }, { key: 'discover', label: '新内容推荐', count: S.d.discover.filter((d) => !d.seen).length }]} />
    {t === 'discover' ? <Section title="新内容推荐" desc="来自外部发现（C19）：GitHub 热门、周报、关注作者。标出新 / 旧、看过没有"><DiscoverList /></Section> : <div className="detail-grid">
      <div className="stack">
        <Section title="来源覆盖" desc="今天每个来源实际给了什么。「昨天的内容今天才取得」单独说，不算今天发生">
          <div className="cov">{b.cov.filter((x) => ['实际贡献', '部分', '旧数据'].includes(x.cov)).map((x) => <div key={x.s.id} className="cov-item"><div className="cov-h"><HealthDot h={x.s.health} /><b className="ellipsis">{x.s.name}</b><Tag tone={COV_TONE[x.cov]}>{x.cov}</Tag></div><span className="small muted">{x.reason}</span></div>)}</div>
          {(['没有新内容', '没读取', '未接入'] as Cov[]).map((k) => { const l = b.cov.filter((x) => x.cov === k); return l.length ? <div key={k} className="small" style={{ marginTop: 6 }}><Tag tone="faint">{k}</Tag> <span className="muted">{l.map((x) => x.s.name).join('、')}</span></div> : null; })}
        </Section>
        <Section title="今天该关注" desc="关注组的消息、待我决策、项目变化"><Focus /></Section>
        <Section title="流程待办" desc="收件里各阶段卡着的"><FlowTodo /></Section>
      </div>
      <div className="stack">
        <Section title={<>建议 <AiTag /></>} desc="AI 根据上面的内容给的；推到待采纳后由你决定要不要做">
          {sug.map((s) => <div key={s.id} className="queue-item"><div>{s.text}</div><div className="small muted">依据：{s.basis}</div>
            <div>{s.pushed ? <Tag tone="ok">已推到待采纳</Tag> : <button className="btn xs" onClick={() => ws.run(() => store.pushApproval([], s.text, '日报建议', 'AI')).then((r) => { if (r.status === 'ok' && r.targetId) markPushed(s.id, r.targetId); })}><Send size={11} />推到待采纳</button>}</div></div>)}
          <WriteNote w={ws} compact />
        </Section>
        <Section title="主体更新" count={subj.length} desc="今天要写进主体文档的东西" right={<Link className="link small" to="/c/context">去处理 →</Link>}>
          {subj.length ? subj.slice(0, 4).map((q) => <div key={q.id} className="focus-row"><Tag tone={q.tier === '短期' ? 'info' : q.tier === '候选' ? 'ai' : 'warn'}>{q.tier}</Tag><span className="ellipsis" style={{ flex: 1 }}>{q.text}</span><span className="why">{q.state}</span></div>) : <Empty title="没有" />}
        </Section>
        <Section title="健康与饮食">
          <div className="small">睡眠：{health.sleep}；步数：{health.steps}。<span className="muted">{health.note}</span></div>
          <div className="small muted">饮食指导：消费记录（C21）未接入，暂时不做。</div>
        </Section>
      </div>
    </div>}
  </div>;
}
export default defineImpl({
  Card: (p) => (p.view === 'discover' ? <DiscoverList compact={p.inst.w < 5} /> : <Brief {...p} />),
  Meta: ({ props }) => { const n = S.use((d) => d.discover.filter((x) => !x.seen).length); return props.view === 'discover' ? <>{n} 未看</> : <>{dayTitle(workday())}</>; },
  Page: DailyPage,
});
