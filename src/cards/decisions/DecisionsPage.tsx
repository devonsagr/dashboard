import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarCheck, ExternalLink, RotateCcw } from 'lucide-react';
import { store, useData, type Decision, type ResponseKind } from '../../data';
import { full, relDay, relTime } from '../../data/time';
import { ActionRow, DecisionRow, KIND_TONE, ProjectChip } from '../../ui/objects';
import { Empty, History, KV, PageHeader, SampleMark, Section, Tag } from '../../ui/ui';
import { RefLine, RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';

/** 待我决策（完整页）：按「需要我做什么」分组 */
export default function DecisionsPage() {
  const { id } = useParams();
  if (id) return <DecisionDetail id={id} />;
  return <DecisionList />;
}

function DecisionList() {
  const all = useData((db) => db.decisions);
  const open = all.filter((d) => d.status === 'open' && d.freshness === 'current');
  const stale = all.filter((d) => d.status === 'open' && d.freshness !== 'current');
  const later = all.filter((d) => d.status === 'later');
  const done = all.filter((d) => d.status === 'resolved' || d.status === 'dismissed');
  const kinds = [...new Set(open.map((d) => d.kind))];
  return (
    <div className="page">
      <PageHeader title="待我决策" sub={<>项目和 AI 需要我亲自做的事：验收、选方案、动手操作、补充信息。回应会写回请求文件，再投递给项目。<SampleMark /></>} />
      {kinds.map((k) => <Section key={k} title={<><Tag tone={KIND_TONE[k]}>{k}</Tag> 等我回应</>} count={open.filter((d) => d.kind === k).length}>{open.filter((d) => d.kind === k).map((d) => <DecisionRow key={d.id} d={d} />)}</Section>)}
      {!open.length && <Empty title="没有等你回应的请求" />}
      {later.length > 0 && <Section title="稍后" count={later.length} desc="到期后会回到上面">{later.map((d) => <DecisionRow key={d.id} d={d} />)}</Section>}
      {stale.length > 0 && <Section title="可能过期 / 已被取代" count={stale.length} desc="请求写下之后情况变了；先确认是否还需要回应">{stale.map((d) => <DecisionRow key={d.id} d={d} />)}</Section>}
      <Section title="已回应" count={done.length} desc="回应之后在等谁">{done.map((d) => <DecisionRow key={d.id} d={d} />)}</Section>
    </div>
  );
}

const RESP: Record<Decision['kind'], ResponseKind[]> = {
  验收: ['通过', '需修改', '补充', '稍后', '不适用'], 选择: ['选方案', '补充', '稍后', '不适用'], 操作: ['已操作', '补充', '稍后', '不适用'],
  补充: ['补充', '稍后', '不适用'], 个人: ['通过', '补充', '稍后', '不适用'],
};
const NEED_TEXT: ResponseKind[] = ['需修改', '补充', '不适用'];

function DecisionDetail({ id }: { id: string }) {
  const d = useData(() => store.dec(id));
  const acts = useData((db) => db.actions.filter((a) => d?.actionIds.includes(a.id)));
  const by = useData(() => store.dec(d?.supersededBy));
  const { open } = useOverlay();
  const [kind, setKind] = useState<ResponseKind | null>(null);
  const [opt, setOpt] = useState<string | undefined>(d?.recommend?.optionId);
  const [text, setText] = useState('');
  const w = useWrite(), w2 = useWrite();
  if (!d) return <div className="page"><Empty title="找不到这条请求" /></div>;
  const answered = d.status === 'resolved' || d.status === 'dismissed';
  const canSend = kind && (kind !== '选方案' || opt) && (!NEED_TEXT.includes(kind) || text.trim());
  const send = () => w.run(() => store.respond(d.id, { kind: kind!, optionId: kind === '选方案' ? opt : undefined, text: text.trim() })).then((r) => { if (r.status === 'ok') { setKind(null); setText(''); } });
  return (
    <div className="page">
      <PageHeader title={d.title}
        sub={<span className="row" style={{ gap: 6, flexWrap: 'wrap' }}><Tag tone={KIND_TONE[d.kind]}>{d.kind}</Tag>{d.projectId && <ProjectChip id={d.projectId} />}<span className="small muted">由 {d.raisedBy} 提出 · 截至 {relTime(d.asOf)}</span><RefPath path={d.path} /></span>}
        actions={answered || d.status === 'later' ? <button className="btn sm" onClick={() => w2.run(() => store.reopen(d.id))}><RotateCcw size={13} />重新打开</button> : undefined} />
      <WriteNote w={w2} />
      {d.freshness !== 'current' && (
        <div className="note-box warn">
          {d.freshness === 'stale' && <>这条请求可能已经过期：{d.freshNote ?? '写下之后项目又有了新进展'}。回应前先看看现在的情况。</>}
          {d.freshness === 'superseded' && <>已被新的请求取代{by && <> → <button className="link" onClick={() => open({ kind: 'decision', id: by.id })}>{by.title}</button></>}。{d.freshNote}</>}
          {d.freshness === 'revoked' && <>项目已撤回这条请求。{d.freshNote}</>}
        </div>
      )}
      <div className="detail-grid">
        <div className="stack">
          <Section title="为什么现在需要你">
            <p className="prose">{d.whyNow}</p>
            <KV rows={[['卡住了什么', d.blocks], ['已经做完的', d.done.length ? <ul className="ul">{d.done.map((x) => <li key={x}>{x}</li>)}</ul> : '—'], ['还不确定的', d.uncertain.length ? <ul className="ul">{d.uncertain.map((x) => <li key={x}>{x}</li>)}</ul> : '—']]} />
          </Section>
          {(d.entry || d.criteria.length > 0) && (
            <Section title={d.kind === '验收' ? '怎么验收' : '怎么做'}>
              {d.entry && <div className="entry">入口：{d.entry.url ? <a className="link" href={d.entry.url} target="_blank" rel="noreferrer"><ExternalLink size={12} />{d.entry.label}</a> : <span>{d.entry.label}</span>}{d.entry.path && <RefPath path={d.entry.path} />}</div>}
              {d.criteria.length > 0 && <ol className="criteria">{d.criteria.map((c) => <li key={c}>{c}</li>)}</ol>}
              {d.kind === '验收' && !answered && <button className="btn sm" onClick={() => w2.run(() => store.scheduleCheck(d.id))}><CalendarCheck size={13} />安排一条验收行动</button>}
            </Section>
          )}
          {d.options && (
            <Section title="选项">
              {d.options.map((o) => (
                <label key={o.id} className={`option ${opt === o.id ? 'on' : ''} ${d.response?.optionId === o.id ? 'chosen' : ''}`}>
                  <input type="radio" name="opt" checked={opt === o.id} disabled={answered} onChange={() => { setOpt(o.id); setKind('选方案'); }} />
                  <div><div>{o.label}{d.recommend?.optionId === o.id && <Tag tone="ai">{d.recommend.by === 'AI' ? 'AI 推荐' : '项目推荐'}</Tag>}{d.response?.optionId === o.id && <Tag tone="ok">你选的</Tag>}</div>{o.hint && <div className="small muted">{o.hint}</div>}</div>
                </label>
              ))}
              {d.recommend && <p className="small muted">推荐理由：{d.recommend.text}</p>}
            </Section>
          )}
          <Section title={answered ? '你的回应' : '回应'} desc={answered ? undefined : '写回请求文件，再投递给项目；投递前都可以改'}>
            {d.response && (
              <div className={`resp-box ${d.status}`}>
                <div className="row" style={{ gap: 6 }}><Tag tone={d.response.kind === '需修改' ? 'warn' : d.response.kind === '不适用' ? 'faint' : 'ok'}>{d.response.kind}</Tag>{d.response.optionId && <span>{d.options?.find((o) => o.id === d.response!.optionId)?.label}</span>}<span className="mono faint small">{full(d.response.at)}</span>{d.response.verify && <Tag tone={d.response.verify === '待核实' ? 'warn' : 'neutral'}>{d.response.verify}</Tag>}</div>
                {d.response.text && <p className="prose">{d.response.text}</p>}
                {d.after && <div className="small muted">接下来等 <b>{d.after.waitingOn}</b>：{d.after.note}</div>}
                {d.status === 'later' && <div className="small muted">稍后：{relDay(d.laterUntil)}再提醒</div>}
              </div>
            )}
            {!answered && (
              <div className="form">
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {RESP[d.kind].filter((k) => k !== '选方案' || d.options).map((k) => <button key={k} className={`btn sm ${kind === k ? 'btn-primary' : ''}`} onClick={() => setKind(k)}>{k}</button>)}
                </div>
                {kind && <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={NEED_TEXT.includes(kind) ? `写下${kind === '需修改' ? '要改什么' : kind === '补充' ? '补充的信息' : '为什么不适用'}（必填）` : '补充说明（可不填）'} aria-label="回应说明" />}
                {kind && <div className="row" style={{ gap: 8 }}><button className="btn btn-primary sm" disabled={!canSend || w.busy} onClick={send}>{w.busy ? '发送中…' : `确认「${kind}」`}</button><button className="btn btn-ghost sm" onClick={() => setKind(null)}>取消</button>{kind === '已操作' && <span className="small muted">项目会再核实操作是否生效</span>}</div>}
                <WriteNote w={w} ok="已写回请求文件，等待投递给项目" />
              </div>
            )}
          </Section>
          {acts.length > 0 && <Section title="验收行动" count={acts.length} desc="完成行动 ≠ 验收通过">{acts.map((a) => <ActionRow key={a.id} a={a} showDate />)}</Section>}
        </div>
        <div className="stack">
          <Section title="信息"><KV rows={[['类型', d.kind], ['状态', { open: '等我回应', later: '稍后', resolved: '已回应', dismissed: '不适用' }[d.status]], ['时效', { current: '当前有效', stale: '可能过期', superseded: '已被取代', revoked: '已撤回' }[d.freshness]], ['截至', full(d.asOf)], ['工作项', d.workItemId ?? '—']]} /></Section>
          <Section title="依据" count={d.refs.length}>{d.refs.length ? d.refs.map((r, i) => <RefLine key={i} r={r} />) : <Empty title="没有附依据" />}</Section>
          {d.responses.length > 1 && <Section title="历次回应" count={d.responses.length}>{d.responses.map((r, i) => <div key={i} className="small"><Tag>{r.kind}</Tag> {r.text} <span className="mono faint">{full(r.at)}</span></div>)}</Section>}
          <Section title="历史"><History items={d.history} /></Section>
        </div>
      </div>
    </div>
  );
}
