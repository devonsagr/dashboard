import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layers, Eye } from 'lucide-react';
import { store, useData, type Material } from '../../data';
import { MaterialRow } from '../../ui/objects';
import { Empty, PageHeader, SampleMark, Section } from '../../ui/ui';
import { useWrite, WriteNote } from '../../ui/write';
import { digestList, LANES } from './cards';
import { useOverlay } from '../../workbench/app/overlay';
import { createBatch } from './store';
import { inFlow } from '../../ui/flow';

const F: { k: string; l: string; test: (m: Material) => boolean }[] = [
  { k: 'all', l: '全部', test: (m) => !m.archived },
  { k: 'unread', l: '未读', test: (m) => !m.read && !m.archived },
  { k: 'nonote', l: '没写备注', test: (m) => inFlow(m) && !m.note?.text },
  { k: 'digest', l: '我自己处理', test: (m) => digestList([m]).length > 0 },
  { k: 'ai', l: '待我选', test: (m) => inFlow(m) && m.ai.state === 'result' },
  { k: 'ai-bad', l: 'AI 失败 / 未知', test: (m) => (m.ai.state === 'failed' || m.ai.state === 'unknown') && !m.archived },
  { k: 'gaps', l: '有缺口', test: (m) => !!m.gaps?.length && !m.archived },
  { k: 'later', l: '以后读', test: (m) => !!m.later && !m.archived },
  { k: 'archived', l: '已归档', test: (m) => !!m.archived },
];

/** 收件（完整页）：所有材料；可以按状态、来源筛，多选后建处理批次 */
export default function InboxPage() {
  const [sp, setSp] = useSearchParams();
  const f = sp.get('f') ?? 'all', src = sp.get('src') ?? '';
  const all = useData((db) => db.materials);
  const sources = useData((db) => db.sources.filter((s) => all.some((m) => m.sourceId === s.id)));
  const [sel, setSel] = useState<string[]>([]);
  const w = useWrite();
  const { open } = useOverlay();
  const list = all.filter((m) => F.find((x) => x.k === f)!.test(m) && (!src || m.sourceId === src)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  return (
    <div className="page">
      <PageHeader title="收件" sub={<>所有来源进来的材料，都走同一条流程：写备注 → 交给 AI 按备注初处理 → 你选「直接入库」或「我自己处理」；不想现在处理就放「以后读」。<SampleMark /></>}
        actions={<><Link to="/c/inbox/batches" className="btn sm"><Layers size={13} />处理批次</Link><Link to="/c/inbox/flow" className="btn sm btn-ghost">流转</Link></>} />
      <div className="filter-bar">{F.map((x) => <button key={x.k} className={`pill ${f === x.k ? 'on' : ''}`} onClick={() => set('f', x.k === 'all' ? '' : x.k)}>{x.l}<span className="count">{all.filter((m) => x.test(m) && (!src || m.sourceId === src)).length}</span></button>)}</div>
      <div className="filter-bar">
        <span className="small faint">来源</span>
        <button className={`pill xs ${!src ? 'on' : ''}`} onClick={() => set('src', '')}>全部</button>
        {sources.map((s) => <button key={s.id} className={`pill xs ${src === s.id ? 'on' : ''}`} onClick={() => set('src', s.id)}><span className="mono">{s.id}</span>{s.name}</button>)}
      </div>
      {sel.length > 0 && (
        <div className="sel-bar">
          <span>已选 {sel.length} 条</span>
          <button className="btn sm btn-primary" disabled={w.busy} onClick={() => w.run(() => createBatch(sel, '手动选择')).then((r) => { if (r.status === 'ok') { setSel([]); open({ kind: 'path', to: `/c/inbox/batches/${r.targetId}` }); } })}><Layers size={13} />新建处理批次</button>
          <button className="btn sm" disabled={w.busy} onClick={async () => { for (const id of sel) await store.markRead(id); setSel([]); }}><Eye size={13} />标记已读</button>
          <button className="btn sm btn-ghost" onClick={() => setSel([])}>取消选择</button>
          <span className="small muted">批量交给 AI：确认之前不会发；没写备注的条目 AI 只做通用摘要</span>
          <WriteNote w={w} compact />
        </div>
      )}
      <Section title={F.find((x) => x.k === f)!.l} count={list.length}>
        {list.length ? list.map((m) => <MaterialRow key={m.id} m={m} selected={sel.includes(m.id)} onSelect={(on) => setSel(on ? [...sel, m.id] : sel.filter((x) => x !== m.id))} />) : <Empty title="这里没有材料" />}
      </Section>
    </div>
  );
}

/** 流转（完整页）：五段 + 每段的全部材料 */
export function FlowPage() {
  const ms = useData((db) => db.materials.filter((m) => !m.archived));
  return (
    <div className="page wide">
      <PageHeader title="流转" sub={<>材料从收到到落地的五段。每条只按「主状态」放在一段里，其他事实在标签上看。<SampleMark /></>} />
      <div className="board-lanes">
        {LANES.map((l) => {
          const items = ms.filter((m) => (l.states as readonly string[]).includes(store.mainState(m)));
          return (
            <section key={l.k} className="big-lane">
              <div className="lane-head"><span>{l.k}</span><span className="count">{items.length}</span></div>
              <p className="small muted">{l.d}</p>
              <div className="stack" style={{ gap: 2 }}>{items.map((m) => <MaterialRow key={m.id} m={m} compact />)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
