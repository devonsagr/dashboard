import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, Sparkles, Unlink } from 'lucide-react';
import { store, useData, type Project, type WorkItem } from '../../data';
import { full, nowIso, relTime } from '../../data/time';
import { ActionRow, DecisionRow, MaterialRow } from '../../ui/objects';
import { Chip, Empty, KV, PageHeader, SampleMark, Section, Tabs, Tag } from '../../ui/ui';
import { RefLine, RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { OWN_TONE, ProjectLine, STATUS_TONE } from './cards';

export default function ProjectsPage() {
  const { id } = useParams();
  return id ? <ProjectDetail id={id} /> : <ProjectList />;
}

function ProjectList() {
  const ps = useData((db) => db.projects);
  const groups: Project['ownership'][] = ['产品项目', '卡片模块', '独立工具'];
  return (
    <div className="page">
      <PageHeader title="项目" sub={<>项目是长期推进的事。信息来自项目自己的路线图、交接和工程仓库（只读投影）；我的回应通过「待我决策」回到项目。<SampleMark /></>} />
      <div className="note-box small">三种归属：<b>产品项目</b>（有自己的目标和仓库）、<b>卡片模块</b>（某个产品里的一块，比如仪表盘的一张卡）、<b>独立工具</b>（单独跑的小工具）。</div>
      {groups.map((g) => { const l = ps.filter((p) => p.ownership === g); return l.length ? <Section key={g} title={g} count={l.length}>{l.map((p) => <ProjectLine key={p.id} p={p} />)}</Section> : null; })}
    </div>
  );
}

const TABS = [['overview', '档案'], ['follow', '跟进'], ['work', '工作项'], ['eng', '工程'], ['handoff', '交接'], ['links', '关联']] as const;
type T = (typeof TABS)[number][0];

function ProjectDetail({ id }: { id: string }) {
  const { tab = 'overview' } = useParams();
  const nav = useNavigate();
  const p = useData(() => store.proj(id));
  const parent = useData(() => store.proj(p?.parentId));
  const kids = useData((db) => db.projects.filter((x) => x.parentId === id));
  const asks = useData((db) => db.decisions.filter((d) => d.projectId === id));
  const w = useWrite();
  if (!p) return <div className="page"><Empty title="找不到这个项目" /></div>;
  const refresh = (kind: '普通读取' | 'AI 语义刷新') => w.run(() => store.write('refresh', `${kind}：${p.name}`, () => {
    const q = store.proj(id)!;
    q.refreshes.unshift({ kind, at: nowIso(), status: kind === '普通读取' ? 'ok' : 'pending', note: kind === '普通读取' ? '重新读取路线图 / 交接 / Git（样例：内容没有变化）' : '已请求 AI 重新理解项目文档；结果回来前沿用旧摘要' });
    if (kind === '普通读取') q.lastReadAt = nowIso();   // 读了一次 ≠ 资料变新：asOf 只跟文件内容走
    return { path: q.path };
  }, { noConflict: true, runtime: kind === 'AI 语义刷新' }));
  const openAsks = asks.filter((d) => d.status === 'open');
  return (
    <div className="page">
      <PageHeader title={p.name}
        sub={<span className="row" style={{ gap: 6, flexWrap: 'wrap' }}><Tag tone={OWN_TONE[p.ownership]}>{p.ownership}</Tag><Chip tone={STATUS_TONE[p.status]}>{p.status}</Chip><span className="small muted">{p.stage}</span>{parent && <span className="small muted">属于 <button className="link" onClick={() => nav(`/c/projects/${parent.id}`)}>{parent.name}</button></span>}<span className="small faint">截至 {relTime(p.asOf)}</span></span>}
        actions={<><button className="btn sm" disabled={w.busy} onClick={() => refresh('普通读取')}><RefreshCw size={13} />重新读取</button><button className="btn sm btn-ghost" disabled={w.busy} onClick={() => refresh('AI 语义刷新')}><Sparkles size={13} />AI 语义刷新</button></>} />
      <WriteNote w={w} />
      <Tabs id="proj" value={tab as T} onChange={(k) => nav(`/c/projects/${id}${k === 'overview' ? '' : '/' + k}`)} items={TABS.map(([k, l]) => ({ key: k, label: l, count: k === 'work' ? p.workItems.filter((x) => x.status !== '已完成').length : k === 'follow' ? openAsks.length || undefined : undefined }))} />
      {tab === 'overview' && <Overview p={p} kids={kids} />}
      {tab === 'follow' && <Follow p={p} />}
      {tab === 'work' && <Work p={p} />}
      {tab === 'eng' && <Eng p={p} />}
      {tab === 'handoff' && <Handoff p={p} />}
      {tab === 'links' && <Links p={p} />}
    </div>
  );
}

function Overview({ p, kids }: { p: Project; kids: Project[] }) {
  return (
    <div className="detail-grid">
      <div className="stack">
        <Section title="目的与场景"><p className="prose">{p.purpose}</p><p className="prose muted">{p.scenario}</p></Section>
        <Section title="范围"><div className="grid2"><div><div className="mini-head">做</div><ul className="ul">{p.scope.in.map((x) => <li key={x}>{x}</li>)}</ul></div><div><div className="mini-head">不做</div><ul className="ul muted">{p.scope.out.map((x) => <li key={x}>{x}</li>)}</ul></div></div></Section>
        <Section title="完成的定义"><ol className="criteria">{p.doneDef.map((x) => <li key={x}>{x}</li>)}</ol></Section>
        <Section title="需求" count={p.requirements.length} desc="每条都能点回原话；被替代的保留但划掉">
          {p.requirements.map((r) => (
            <div key={r.id} className={`req-row ${r.state === '已替代' ? 'superseded' : ''}`}>
              <Tag tone={r.state === '有效' ? 'ok' : r.state === '待确认' ? 'warn' : 'faint'}>{r.state}</Tag>
              <div className="item-main"><div className={r.state === '已替代' ? 'strike-on' : ''}>{r.text}{r.replacedBy && <span className="small muted"> → 由 {r.replacedBy} 替代</span>}</div><RefLine r={r.ref} time={false} /></div>
            </div>
          ))}
        </Section>
      </div>
      <div className="stack">
        {p.modules.length > 0 && <Section title="模块" count={p.modules.length}>{p.modules.map((m) => <div key={m.name} className="mod-row"><div className="row between"><b>{m.name}</b><Chip tone={STATUS_TONE[m.status]}>{m.status}</Chip></div><div className="small muted">{m.duty}</div><div className="small faint">输入输出：{m.io}{m.deps.length ? ` · 依赖 ${m.deps.join('、')}` : ''}</div></div>)}</Section>}
        {kids.length > 0 && <Section title="下属卡片模块" count={kids.length}>{kids.map((k) => <ProjectLine key={k.id} p={k} compact />)}</Section>}
        <Section title="文档" count={p.docs.length} desc="权威 = 以它为准；镜像 = 复制品；历史 = 旧版">{p.docs.map((d) => <div key={d.path} className="row" style={{ gap: 6 }}><Tag tone={d.role === '权威' ? 'accent' : 'faint'}>{d.role}</Tag><span className="small">{d.label}</span><RefPath path={d.path} /></div>)}</Section>
        <Section title="档案文件"><RefPath path={p.path} /></Section>
      </div>
    </div>
  );
}

function Follow({ p }: { p: Project }) {
  const asks = useData((db) => db.decisions.filter((d) => d.projectId === p.id));
  return (
    <div className="detail-grid">
      <div className="stack">
        <Section title="现在"><KV rows={[['正在做', p.follow.current ?? '—'], ['下一步', <>{p.follow.next} <Tag>{p.follow.owner}</Tag></>], ['卡点', p.follow.blocker ? <span className="tone-bad-text">{p.follow.blocker}</span> : '—'], ['资料截至', full(p.asOf)], ['最后读取', p.lastReadAt ? full(p.lastReadAt) : '—']]} /></Section>
        <Backflow p={p} />
        <Section title="向我提的请求" count={asks.length}>{asks.length ? asks.map((d) => <DecisionRow key={d.id} d={d} />) : <Empty title="没有请求" />}</Section>
      </div>
      <div className="stack">
        <Section title="刷新与投递记录" desc="普通读取 = 重新读文件；AI 语义刷新 = 让 AI 重新理解；投递 = 把我的回应送回项目">
          {p.refreshes.length ? p.refreshes.map((r, i) => <div key={i} className="refresh-row"><Tag tone={r.status === 'ok' ? 'ok' : r.status === 'failed' ? 'bad' : r.status === 'pending' ? 'warn' : 'faint'}>{r.kind}</Tag><span className="small">{r.note}</span><span className="mono faint small">{relTime(r.at)}</span></div>) : <Empty title="还没有记录" />}
        </Section>
      </div>
    </div>
  );
}

const CHECK_TONE = { 通过: 'ok', 未通过: 'bad', 未做: 'faint', 等待: 'warn' } as const;
function Work({ p }: { p: Project }) {
  if (!p.workItems.length) return <Empty title="没有登记的工作项" hint="工作项 = 一次具体改动：为什么改、改了什么、怎么算完成" />;
  return <div className="stack">{p.workItems.map((w) => <WorkCard key={w.id} p={p} w={w} />)}</div>;
}
function WorkCard({ p, w }: { p: Project; w: WorkItem }) {
  const decs = useData((db) => db.decisions.filter((d) => w.decisionIds.includes(d.id)));
  const acts = useData((db) => db.actions.filter((a) => w.actionIds.includes(a.id)));
  return (
    <Section title={<>{w.title} <Tag tone={w.status === '待验收' ? 'accent' : w.status === '已完成' ? 'ok' : 'neutral'}>{w.status}</Tag></>} desc={`${w.version ?? ''} · 更新于 ${relTime(w.updatedAt)} · 下一步由 ${w.nextOwner}`}>
      <KV rows={[['起因', <>{w.trigger.text}{w.trigger.ref && <RefLine r={w.trigger.ref} time={false} />}</>], ['改了什么', w.change], ['怎么算完成', <ol className="criteria">{w.criteria.map((c) => <li key={c}>{c}</li>)}</ol>]]} />
      <div className="checks">{w.checks.map((c) => <div key={c.kind} className="check-cell"><span className="small faint">{c.kind}</span><Tag tone={CHECK_TONE[c.state]}>{c.state}</Tag>{c.note && <span className="small muted">{c.note}</span>}</div>)}</div>
      {w.gaps.length > 0 && <div className="note-box warn small">还缺：{w.gaps.join('；')}</div>}
      {decs.map((d) => <DecisionRow key={d.id} d={d} />)}
      {acts.map((a) => <ActionRow key={a.id} a={a} showDate />)}
      <span className="sr-only">{p.id}</span>
    </Section>
  );
}

function Eng({ p }: { p: Project }) {
  const e = p.eng;
  if (!e.registered) return <Empty title="没有登记工程仓库" hint={e.note ?? '这个项目的工程信息需要在工程服务（5273）里登记后才能读到'} />;
  return (
    <div className="stack">
      {e.reachable === false && <div className="note-box warn">工程服务读不到这个仓库，下面是 {relTime(e.asOf)} 的快照。{e.note}</div>}
      <Section title="仓库"><KV rows={[['路径', e.repo ? <RefPath path={e.repo} /> : '—'], ['分支', e.branch ?? '—'], ['工作区', e.worktree ?? '—'], ['HEAD', <span className="mono">{e.head ?? '—'}</span>], ['未提交文件', e.dirty ?? '未知'], ['截至', e.asOf ? full(e.asOf) : '未知']]} /></Section>
      <Section title="最近提交" desc="提交数不等于完成数">{e.commits?.length ? e.commits.map((c) => <div key={c.hash} className="row" style={{ gap: 8 }}><span className="mono faint">{c.hash}</span><span className="small">{c.msg}</span><span className="mono faint small" style={{ marginLeft: 'auto' }}>{relTime(c.at)}</span></div>) : <Empty title="没有读到提交" />}</Section>
    </div>
  );
}

function Handoff({ p }: { p: Project }) {
  const h = p.handoff;
  return (
    <div className="stack">
      <Section title="最后一个可靠的状态" desc="下一个会话从这里接着做"><p className="prose">{h.lastReliable.text}</p><div className="small faint">{full(h.lastReliable.at)}</div>{h.lastReliable.ref && <RefLine r={h.lastReliable.ref} />}</Section>
      <div className="grid2">
        <Section title="没做完" count={h.unfinished.length}>{h.unfinished.length ? <ul className="ul">{h.unfinished.map((x) => <li key={x}>{x}</li>)}</ul> : <Empty title="没有" />}</Section>
        <Section title="失败过" count={h.failed.length}>{h.failed.length ? <ul className="ul">{h.failed.map((x) => <li key={x}>{x}</li>)}</ul> : <Empty title="没有" />}</Section>
      </div>
      <Section title="继续时先读">{h.resumeWith.map((r, i) => <RefLine key={i} r={r} time={false} />)}</Section>
    </div>
  );
}

function Links({ p }: { p: Project }) {
  const mats = useData((db) => db.materials.filter((m) => m.projectLinks.some((l) => l.projectId === p.id)));
  const acts = useData((db) => db.actions.filter((a) => a.projectId === p.id && !a.deleted));
  const w = useWrite();
  const as = (m: (typeof mats)[number]) => m.projectLinks.find((l) => l.projectId === p.id)!.as;
  return (
    <div className="stack">
      {(['已确认需求', '参考'] as const).map((k) => (
        <Section key={k} title={k === '参考' ? '参考材料' : '已确认的需求'} count={mats.filter((m) => as(m) === k).length} desc={k === '参考' ? '只是参考，不代表要做' : '我确认过要做；会进入项目需求'}>
          {mats.filter((m) => as(m) === k).map((m) => <div key={m.id} className="row" style={{ gap: 4 }}><div style={{ flex: 1, minWidth: 0 }}><MaterialRow m={m} compact /></div><button className="icon-btn xs" title="取消关联" onClick={() => w.run(() => store.unlinkProject(m.id, p.id))}><Unlink size={13} /></button></div>)}
          {!mats.some((m) => as(m) === k) && <Empty title="没有" hint="在材料详情里「关联项目」" />}
        </Section>
      ))}
      <WriteNote w={w} />
      <Section title="行动" count={acts.length}>{acts.length ? acts.map((a) => <ActionRow key={a.id} a={a} showDate />) : <Empty title="没有挂在这个项目下的行动" />}</Section>
    </div>
  );
}

/** 回流：我回应了项目的请求之后，项目那边到底知道了没有 */
function Backflow({ p }: { p: Project }) {
  const done = useData((db) => db.decisions.filter((d) => d.projectId === p.id && d.response && d.response.kind !== '稍后'));
  if (!done.length) return null;
  return <Section title="我的回应回流到哪了" count={done.length} desc="已回应 ≠ 项目已知道：要送达、项目资料更新之后才算回流完">
    {done.map((d) => {
      const r = d.response!;
      const deliver = p.refreshes.find((x) => x.kind === '投递' && x.note.includes(d.title));
      const stale = p.asOf < r.at;
      return <div key={d.id} className="queue-item">
        <div className="row" style={{ gap: 6 }}><b className="ellipsis">{d.title}</b></div>
        <div className="row wrap" style={{ gap: 6 }}>
          <Tag tone="ok">已回应：{r.kind} · {relTime(r.at)}</Tag>
          <Tag tone={!deliver ? 'faint' : deliver.status === 'ok' ? 'ok' : deliver.status === 'failed' ? 'bad' : 'warn'}>{!deliver ? '没有投递记录' : deliver.status === 'ok' ? '已送达' : deliver.status === 'failed' ? '送达失败' : '待送达'}</Tag>
          <Tag tone={stale ? 'warn' : 'ok'}>{stale ? `项目资料仍旧（截至 ${relTime(p.asOf)}）` : '项目资料已更新'}</Tag>
          {d.after && <Tag tone="info">下一步归{d.after.waitingOn}</Tag>}
        </div>
        {d.after && <div className="small muted">{d.after.note}</div>}
      </div>;
    })}
  </Section>;
}
