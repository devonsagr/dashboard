import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { store, useData, type ActionSection, type Priority } from '../../data';
import { full, hm, today, dateOf } from '../../data/time';
import { ActionRow } from '../../ui/objects';
import { Empty, PageHeader, SampleMark, Section, Tabs, Tag } from '../../ui/ui';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';

const SEC: { k: ActionSection; l: string; d: string }[] = [
  { k: 'overdue', l: '逾期', d: '日期已过还没完成' }, { k: 'today', l: '今天', d: '' }, { k: 'undated', l: '未排期', d: '没填日期的事，不会自动变成今天' },
  { k: 'later', l: '之后', d: '日期在今天以后' }, { k: 'done', l: '已完成', d: '勾掉的事；可以恢复' }, { k: 'archived', l: '归档', d: '收起来但不删除' }, { k: 'deleted', l: '已删除', d: '可以恢复；真实接入后由后端决定保留多久' },
];
type Tab = 'actions' | 'timeline';

/** 今日行动（完整页）：行动 / 今天的时间线。待采纳是另一张卡（cards/approvals） */
export default function TodayPage() {
  const { tab = 'actions' } = useParams();
  const nav = useNavigate();
  const t = today();
  const counts = useData(() => ({ a: store.liveActions().filter((a) => !a.done && a.date && a.date <= t).length }));
  return (
    <div className="page">
      <PageHeader title="今日行动" sub={<>行动是「我决定要做的事」。别人（AI、项目、我自己推送）提的候选在「待采纳」卡里，采纳了才变成行动。<SampleMark /></>} />
      <Tabs id="today" value={tab as Tab} onChange={(k) => nav(k === 'actions' ? '/c/today' : `/c/today/${k}`)} items={[{ key: 'actions', label: '行动', count: counts.a }, { key: 'timeline', label: '今天的时间线' }]} />
      {tab === 'actions' && <Actions />}
      {tab === 'timeline' && <Timeline />}
    </div>
  );
}

function Actions() {
  const all = useData((db) => db.actions);
  const [show, setShow] = useState<Record<string, boolean>>({ done: true });
  return (
    <div className="stack">
      <NewActionForm />
      {SEC.map((s) => {
        const list = all.filter((a) => store.sectionOf(a) === s.k).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '99').localeCompare(b.time ?? '99') || a.order - b.order);
        const fold = ['archived', 'deleted'].includes(s.k) ? !show[s.k] : s.k === 'done' ? !show.done : false;
        if (!list.length && ['archived', 'deleted', 'later', 'overdue'].includes(s.k)) return null;
        return (
          <Section key={s.k} title={<span className={s.k === 'overdue' ? 'tone-bad-text' : ''}>{s.l}</span>} count={list.length} desc={s.d}
            right={['done', 'archived', 'deleted'].includes(s.k) ? <button className="link small" onClick={() => setShow({ ...show, [s.k]: fold })}>{fold ? '展开' : '收起'}</button> : undefined}>
            {!fold && (list.length ? <AnimatePresence initial={false}>{list.map((a) => <ActionRow key={a.id} a={a} showDate={s.k !== 'today'} />)}</AnimatePresence> : <Empty title={s.k === 'today' ? '今天还没有排期的行动' : '没有'} />)}
          </Section>
        );
      })}
    </div>
  );
}

function NewActionForm() {
  const [f, setF] = useState({ title: '', date: today(), time: '', priority: '中' as Priority });
  const w = useWrite();
  return (
    <form className="new-action" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; w.run(() => store.createAction({ title: f.title.trim(), date: f.date || undefined, time: f.time || undefined, priority: f.priority })).then((r) => r.status === 'ok' && setF({ ...f, title: '' })); }}>
      <input className="input" placeholder="新建一条行动…" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="行动标题" />
      <input className="input sm" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="日期（可以留空=未排期）" title="留空 = 未排期" />
      <input className="input sm" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} aria-label="时间" />
      <select className="input sm" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })} aria-label="优先级">{['高', '中', '低'].map((p) => <option key={p}>{p}</option>)}</select>
      <button className="btn btn-primary sm" disabled={w.busy || !f.title.trim()}>添加</button>
      <div style={{ flexBasis: '100%' }}><WriteNote w={w} ok="已新建" /></div>
    </form>
  );
}

/** 今天发生了什么：由行动、写入回执、收到的材料、请求回应汇成（只读、衍生） */
function Timeline() {
  const t = today();
  const { open } = useOverlay();
  const items = useData((db) => [
    ...db.actions.filter((a) => a.date === t && a.time && !a.deleted).map((a) => ({ at: `${t}T${a.time}:00+08:00`, kind: '计划', text: a.title, done: !!a.done, go: () => open({ kind: 'action', id: a.id }) })),
    ...db.actions.filter((a) => a.done && dateOf(a.done) === t).map((a) => ({ at: a.done!, kind: '完成', text: a.title, done: true, go: () => open({ kind: 'action', id: a.id }) })),
    ...db.materials.filter((m) => dateOf(m.receivedAt) === t).map((m) => ({ at: m.receivedAt, kind: '收到', text: `${m.channel}：${m.title}`, done: false, go: () => open({ kind: 'material', id: m.id }) })),
    ...db.decisions.flatMap((d) => d.responses.filter((r) => dateOf(r.at) === t).map((r) => ({ at: r.at, kind: '回应', text: `${d.title} → ${r.kind}`, done: true, go: () => open({ kind: 'decision', id: d.id }) }))),
    ...db.receipts.filter((r) => dateOf(r.at) === t && r.status !== 'ok').map((r) => ({ at: r.at, kind: '写入失败', text: `${r.label}：${r.error}`, done: false, go: () => undefined })),
  ].sort((a, b) => a.at.localeCompare(b.at)));
  return (
    <Section title="今天的时间线" desc={`由行动、收到的材料、请求回应和写入回执汇成；只读。${full(`${t}T00:00:00+08:00`).split(' ').slice(0, 2).join(' ')}`}>
      {items.length ? (
        <ol className="tl">
          {items.map((x, i) => (
            <li key={i} className={`tl-row k-${x.kind}`} onClick={x.go}>
              <span className="mono faint">{hm(x.at)}</span><i className="tl-dot" /><Tag tone={x.kind === '写入失败' ? 'bad' : x.kind === '完成' ? 'ok' : x.kind === '收到' ? 'accent' : 'neutral'}>{x.kind}</Tag>
              <span className={x.kind === '计划' && x.done ? 'strike-on' : ''}>{x.text}</span>
            </li>
          ))}
        </ol>
      ) : <Empty title="今天还没有记录" />}
    </Section>
  );
}
