import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X, Undo2 } from 'lucide-react';
import { defineImpl, type CardProps } from '../../workbench/cards/protocol';
import { relTime, full } from '../../data/time';
import { useSettings } from '../../data/settings';
import { SUB, decide, type Tier } from '../../data/subject';
import { SubjectPaths } from '../../ui/settings';
import { AiTag, Empty, PageHeader, SampleMark, Section, Tabs, Tag } from '../../ui/ui';
import { RefLine, RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';

const TIER: Record<Tier, { tone: string; rule: string }> = {
  短期: { tone: 'info', rule: 'AI 直接写（已生效），你可以撤回' },
  候选: { tone: 'ai', rule: 'AI 的推测，等你看：接受才写进去' },
  长期: { tone: 'warn', rule: '长期画像：只有你确认才改' },
};
function Queue({ compact }: { compact?: boolean }) {
  const q = SUB.use((d) => d.queue); const docs = useSettings((s) => s.subject);
  const [all, setAll] = useState(false);
  const w = useWrite();
  const name = (k: string) => docs.find((x) => x.key === k)?.name ?? k;
  const list = q.filter((x) => all || x.state === '待确认' || x.state === '已生效');
  if (!list.length) return <Empty title="没有待处理的主体更新" />;
  return <div className="stack" style={{ gap: 0 }} data-nodrag>
    {list.slice(0, compact ? 4 : 99).map((x) => <div key={x.id} className="queue-item">
      <div className="row wrap" style={{ gap: 6 }}><Tag tone={TIER[x.tier].tone}>{x.tier}</Tag><span className="small muted">→ {name(x.doc)}</span>{x.by === 'AI' && <AiTag />}<Tag tone={x.state === '待确认' ? 'accent' : x.state === '已生效' || x.state === '已接受' ? 'ok' : 'faint'}>{x.state}</Tag></div>
      <div>{x.text}</div>
      {!compact && <RefLine r={x.ref} />}
      <div className="row" style={{ gap: 6 }}>
        {x.state === '待确认' && <><button className="btn xs" onClick={() => w.run(() => decide(x.id, true))}><Check size={11} />接受</button><button className="btn xs btn-ghost" onClick={() => w.run(() => decide(x.id, false))}><X size={11} />不接受</button></>}
        {x.state === '已生效' && <button className="btn xs btn-ghost" onClick={() => w.run(() => decide(x.id, false))}><Undo2 size={11} />撤回</button>}
      </div>
    </div>)}
    <WriteNote w={w} compact />
    {!compact && <button className="link small" onClick={() => setAll(!all)}>{all ? '只看待处理' : '也显示已处理的'}</button>}
  </div>;
}
function Docs({ compact }: { compact?: boolean }) {
  const docs = useSettings((s) => s.subject); const asOf = SUB.use((d) => d.asOf);
  return <div data-nodrag>{docs.map((d) => <div key={d.key} className="doc-row">
    <b>{d.name}</b>
    <div className="row wrap" style={{ gap: 6 }}>{d.path ? <RefPath path={d.path} /> : <Tag tone="warn">路径未设置</Tag>}{!compact && <span className="small faint">截至 {asOf[d.key] ? relTime(asOf[d.key]) : '未知'}</span>}</div>
  </div>)}</div>;
}
/** 继续做事：AI 接手一件事之前会读哪些文档（演示读取顺序；未设置的会跳过并说出来） */
const TASKS: { k: string; l: string; read: string[]; extra?: string }[] = [
  { k: 'dash', l: '继续做仪表盘前端', read: ['entry', 'identity', 'state', 'projects', 'lessons'], extra: '项目权威文档：示例工程/示例仪表盘/当前交接.md' },
  { k: 'exam', l: '准备示例作品评审', read: ['entry', 'state', 'open'], extra: '群消息：示例通知群的示例作品通知' },
  { k: 'talk', l: '陪我聊聊最近的状态', read: ['entry', 'identity', 'state', 'self', 'observe'] },
];
function Resume() {
  const docs = useSettings((s) => s.subject); const asOf = SUB.use((d) => d.asOf);
  const [k, setK] = useState('dash'); const t = TASKS.find((x) => x.k === k)!;
  return <div className="stack" style={{ gap: 6 }}>
    <div className="seg">{TASKS.map((x) => <button key={x.k} className={k === x.k ? 'on' : ''} onClick={() => setK(x.k)}><span>{x.l}</span></button>)}</div>
    <ol className="criteria">{t.read.map((key) => { const d = docs.find((x) => x.key === key)!; return <li key={key}><b>{d.name}</b> {d.path ? <><RefPath path={d.path} /> <span className="small faint">截至 {asOf[key] ? full(asOf[key]) : '未知'}</span></> : <span className="small tone-bad-text">会跳过：路径未设置</span>}</li>; })}
      {t.extra && <li className="muted">{t.extra}</li>}</ol>
    <div className="small faint">（样例）真实由后端按这个顺序读取；读不到的文档会写进交接里，而不是假装读过。</div>
  </div>;
}
function Card({ view, inst }: CardProps) { return view === 'docs' ? <Docs compact={inst.w < 5} /> : <Queue compact />; }
function Page() {
  const [sp, setSp] = useSearchParams(); const t = sp.get('t') ?? 'queue';
  const n = SUB.use((d) => d.queue.filter((x) => x.state === '待确认').length);
  const unset = useSettings((s) => s.subject.filter((x) => !x.path).length);
  return <div className="page">
    <PageHeader title="主体上下文" sub={<>AI 了解你、接手事情时先读的 8 份文档。AI 想写进去的东西先进队列：短期状态直接生效可撤回，推测要你接受，长期画像只有你确认才改。每一条都带来源。<SampleMark /></>} />
    {unset > 0 && <div className="note-box warn small">{unset} 份文档还没设置路径，AI 读不到它们。<Link className="link" to="/c/context?t=docs">去设置</Link></div>}
    <Tabs id="ctx" value={t} onChange={(k) => setSp(k === 'queue' ? {} : { t: k }, { replace: true })} items={[{ key: 'queue', label: '更新队列', count: n }, { key: 'docs', label: '文档与路径' }, { key: 'resume', label: '继续做事' }]} />
    {t === 'queue' && <div className="detail-grid"><Section title="更新队列"><Queue /></Section><Section title="三档规则">{(Object.keys(TIER) as Tier[]).map((k) => <div key={k} className="focus-row"><Tag tone={TIER[k].tone}>{k}</Tag><span className="small">{TIER[k].rule}</span></div>)}</Section></div>}
    {t === 'docs' && <div className="detail-grid"><Section title="文档" desc="截至 = 最后一次更新依据的材料时间"><Docs /></Section><Section title="设置路径" desc="和设置页是同一份"><SubjectPaths compact /></Section></div>}
    {t === 'resume' && <Section title="继续做事时会读什么" desc="选一件事，看 AI 接手前的读取顺序"><Resume /></Section>}
  </div>;
}
export default defineImpl({ Card, Page, Meta: () => { const n = SUB.use((d) => d.queue.filter((x) => x.state === '待确认').length); return <>{n} 待确认</>; } });
