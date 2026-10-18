import { useParams } from 'react-router-dom';
import { RotateCw, Send, Check } from 'lucide-react';
import { store, useData } from '../../data';
import { full, relTime } from '../../data/time';
import { AiTag, Empty, PageHeader, SampleMark, Section, Tag } from '../../ui/ui';
import { RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';
import { S, confirmBatch, recheckItem, retryItem, type ProcBatch } from './store';

const B_TONE = { draft: 'faint', confirmed: 'ai', partial: 'warn', done: 'ok' } as const;
const B_TEXT = { draft: '草稿 · 未发送', confirmed: '已确认 · 处理中', partial: '部分完成', done: '完成' } as const;

/** 处理批次：你选一批材料 → 确认 → 才交给 AI；每条单独看结果、单独重试 */
export default function BatchesPage() {
  const { id } = useParams();
  const bs = useData((db) => S.d.batches);
  if (id) return <BatchDetail id={id} />;
  return (
    <div className="page">
      <PageHeader title="处理批次" sub={<>AI 只处理你确认过的批次。草稿不会被发送；失败的可以单条重试，状态未知的先重新读取。<SampleMark /></>} />
      <Section title="全部批次" count={bs.length}>{bs.map((b) => <BatchLine key={b.id} b={b} />)}</Section>
    </div>
  );
}
function BatchLine({ b }: { b: ProcBatch }) {
  const { open } = useOverlay();
  return (
    <button className="mini-row batch-line" onClick={(e) => open({ kind: 'path', to: `/c/inbox/batches/${b.id}` }, e.currentTarget)}>
      <Tag tone={B_TONE[b.status]}>{B_TEXT[b.status]}</Tag><span className="ellipsis">{b.source}</span><span className="small muted">{b.materialIds.length} 条{b.note ? ' · ' + b.note : ''}</span><span className="mono faint small" style={{ marginLeft: 'auto' }}>{relTime(b.createdAt)}</span>
    </button>
  );
}

function BatchDetail({ id }: { id: string }) {
  const b = useData((db) => S.d.batches.find((x) => x.id === id));
  const ms = useData((db) => db.materials.filter((m) => b?.materialIds.includes(m.id)));
  const w = useWrite();
  const { open } = useOverlay();
  if (!b) return <div className="page"><Empty title="找不到这个批次" /></div>;
  return (
    <div className="page">
      <PageHeader title={`批次 ${b.id} · ${b.source}`} sub={<span className="row" style={{ gap: 6 }}><Tag tone={B_TONE[b.status]}>{B_TEXT[b.status]}</Tag><span className="small muted">创建 {full(b.createdAt)}{b.confirmedAt ? ` · 确认 ${full(b.confirmedAt)}` : ''}</span><RefPath path={b.path} /></span>}
        actions={b.status === 'draft' ? <button className="btn sm btn-primary" disabled={w.busy} onClick={() => w.run(() => confirmBatch(b.id))}><Check size={13} />确认发送给 AI</button> : undefined} />
      <WriteNote w={w} ok="已确认；结果回来会逐条更新" />
      {b.status === 'draft' && <div className="note-box">这是草稿：确认之前 AI 不会看到这些材料。可以回收件页再选。</div>}
      <Section title="成员" count={ms.length}>
        {ms.map((m) => (
          <div key={m.id} className="batch-item">
            <div className="item-main" onClick={(e) => open({ kind: 'material', id: m.id }, e.currentTarget)} role="button">
              <div className="item-title">{m.title}</div>
              {m.ai.summary && <div className="small"><AiTag /> {m.ai.summary}</div>}
              {m.ai.error && <div className="small tone-bad-text">{m.ai.error}</div>}
              {m.gaps?.length ? <div className="small tone-warn-text">缺口：{m.gaps.join('；')}</div> : null}
            </div>
            <div className="row" style={{ gap: 4 }}>
              <Tag tone={m.ai.state === 'result' ? 'ok' : m.ai.state === 'failed' ? 'bad' : m.ai.state === 'unknown' ? 'warn' : m.ai.state === 'sent' ? 'ai' : 'faint'}>{{ none: '未发送', sent: '处理中', result: '有结果', failed: '失败', unknown: '未知' }[m.ai.state]}</Tag>
              {m.ai.state === 'failed' && <button className="btn xs" onClick={() => w.run(() => retryItem(b.id, m.id))}><RotateCw size={11} />重试</button>}
              {m.ai.state === 'unknown' && <button className="btn xs" onClick={() => w.run(() => recheckItem(m.id))}>重新读取</button>}
              {m.ai.state === 'result' && !m.outputs.some((o) => o.kind === 'approval') && <button className="btn xs" onClick={() => w.run(() => store.pushApproval([m.id], m.ai.suggestion ? `${m.title.slice(0, 20)}` : m.title, b.source, 'AI'))}><Send size={11} />推送</button>}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}
