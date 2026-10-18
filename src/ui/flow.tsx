/**
 * 统一处理流程（所有来源共用）：
 *   收到 → ① 写备注（为什么收 / 想拿它做什么）→ ② 交给 AI 按备注初处理 → ③ 我选：
 *        A 直接入库（按「设置 › 落点规则」算路径，原文 + 备注 + 标签 + 来源）
 *        B 我自己处理（原文 + AI 按备注整理的要点，我逐条划掉，划完 = 已消化）
 *   以后读（悬置）：任何一步都能放进去、拿出来。
 * 收件的材料详情用 <FlowPanel>；收藏卡有自己的数据，但用同一套步骤与文案（<FlowSteps>）。
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, BookOpen, CheckCheck, Clock, RotateCw, Send, Undo2 } from 'lucide-react';
import { store, useData, type Material } from '../data';
import { relTime } from '../data/time';
import { resolveRoute, useSettings } from '../data/settings';
import { AiTag, Tag } from './ui';
import { RefPath } from './refs';
import { useWrite, WriteNote } from './write';

export const STEPS = ['收到', '写备注', 'AI 初处理', '我选', '去向'] as const;
export function FlowSteps({ at, held }: { at: number; held?: boolean }) {
  return (
    <ol className="flow-steps" aria-label="处理进度">
      {STEPS.map((s, i) => <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''}>{s}</li>)}
      {held && <li className="held"><Clock size={11} />以后读</li>}
    </ol>
  );
}
export function stepOf(m: Material) {
  if (m.route || m.outputs.some((o) => o.kind === 'knowledge')) return 4;
  if (m.ai.state === 'result') return 3;
  if (m.ai.state === 'sent' || m.note?.text) return 2;
  return 1;
}

export function FlowPanel({ m }: { m: Material }) {
  const [note, setNote] = useState(m.note?.text ?? '');
  const [pick, setPick] = useState<null | '入库'>(null);
  const [path, setPath] = useState('');
  useSettings((s) => s.routes);
  useEffect(() => { setNote(m.note?.text ?? ''); setPick(null); }, [m.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const wn = useWrite(), wa = useWrite(), wc = useWrite();
  const f = store.facetOf(m); const r = resolveRoute(f);
  const dirty = note !== (m.note?.text ?? '');
  const ai = m.ai;
  const saveThen = async (next: () => Promise<unknown>) => { if (dirty) { const x = await wn.run(() => store.saveNote(m.id, note)); if (x.status !== 'ok') return; } await next(); };
  const crossed = new Set(m.route?.crossed ?? []);
  const pts = ai.points ?? [];
  return (
    <div className="flow">
      <FlowSteps at={stepOf(m)} held={!!m.later} />
      <div className="flow-step">
        <div className="flow-h"><b>① 备注</b><span className="small muted">先写为什么收它、想拿它做什么。AI 只按这个处理，不猜。</span></div>
        <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：以后做课程设计时查这个参数 / 这个概念没懂，想弄明白" aria-label="备注" />
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn sm btn-primary" disabled={!note.trim() || ai.state === 'sent' || wn.busy || wa.busy} title={note.trim() ? '' : '先写备注'} onClick={() => saveThen(() => wa.run(() => store.sendToAI(m.id)))}><Send size={13} />{ai.state === 'result' || ai.state === 'failed' ? '按新备注再过一遍' : '交给 AI 按备注过一遍'}</button>
          <button className="btn sm" disabled={!dirty || wn.busy} onClick={() => wn.run(() => store.saveNote(m.id, note))}>只保存备注</button>
          <button className="btn sm btn-ghost" onClick={() => wc.run(() => store.setLater(m.id, !m.later))}><Clock size={13} />{m.later ? `从以后读拿出（${relTime(m.later)}放入）` : '以后读'}</button>
        </div>
        <WriteNote w={wn} compact /><WriteNote w={wa} compact />
      </div>

      <div className="flow-step">
        <div className="flow-h"><b>② AI 初处理 <AiTag /></b><span className="small muted">{ai.state === 'none' ? '还没交给 AI；也可以不经 AI 直接选' : ai.state === 'sent' ? '处理中…' : ai.state === 'failed' ? '失败' : ai.state === 'unknown' ? '不知道有没有处理' : `完成 · ${relTime(ai.at)}`}</span></div>
        {ai.state === 'result' && <div className="ai-box">
          {ai.intent !== undefined && ai.intent !== m.note?.text && <div className="note-box warn small">备注改过了：这份结果按旧备注「{ai.intent}」做的。</div>}
          <div>{ai.summary}</div>
          {ai.suggestion && <div className="small muted">建议：{ai.suggestion}（只是建议，你来选）</div>}
        </div>}
        {(ai.state === 'failed' || ai.state === 'unknown') && <div className="note-box warn small">{ai.error ?? '已发出但没有收到结果'}<button className="link small" onClick={() => wa.run(() => store.sendToAI(m.id))}><RotateCw size={11} />重新交给 AI</button></div>}
      </div>

      <div className="flow-step">
        <div className="flow-h"><b>③ 我选</b><span className="small muted">两条路互斥；以后读随时可放</span></div>
        {m.route ? (
          <div className="stack" style={{ gap: 6 }}>
            <div className="row wrap" style={{ gap: 6 }}>
              <Tag tone={m.route.kind === '入库' ? 'ok' : 'info'}>{m.route.kind === '入库' ? 'A 已直接入库' : 'B 我自己处理'}</Tag><RefPath path={m.route.path} /><span className="small faint">{relTime(m.route.at)}</span>
              {m.route.kind === '自己处理' && !m.digested && <button className="link small" onClick={() => wc.run(() => store.unroute(m.id))}><Undo2 size={11} />撤回选择</button>}
            </div>
            {m.route.kind === '自己处理' && <>
              <div className="small muted">原文在上面；下面是 AI 按备注整理的要点。弄懂一条划掉一条。</div>
              {pts.length ? <ul className="cross-list">{pts.map((p, i) => <li key={i}><label><input type="checkbox" checked={crossed.has(i)} onChange={() => wc.run(() => store.crossPoint(m.id, i))} /><span className={crossed.has(i) ? 'crossed' : ''}>{p}</span></label></li>)}</ul>
                : <div className="small faint">没有 AI 要点（没交给 AI）：直接读原文。</div>}
              {m.digested ? <span className="row" style={{ gap: 6 }}><Tag tone="info">已消化 · {relTime(m.digested.at)}</Tag><button className="link small" onClick={() => wc.run(() => store.undoDigest(m.id))}><Undo2 size={11} />撤回</button></span>
                : <button className="btn sm" disabled={pts.length > 0 && crossed.size < pts.length} title={crossed.size < pts.length ? '要点还没划完' : ''} onClick={() => wc.run(() => store.confirmDigest(m.id, note))}><CheckCheck size={13} />处理完了（已消化）</button>}
            </>}
          </div>
        ) : (
          <>
            <div className="row wrap" style={{ gap: 6 }}>
              <button className={`btn sm ${pick === '入库' ? 'btn-primary' : ''} ${ai.suggest === '入库' ? 'suggested' : ''}`} onClick={() => { setPick(pick ? null : '入库'); setPath(''); }}><Archive size={13} />A 直接入库</button>
              <button className={`btn sm ${ai.suggest === '自己处理' ? 'suggested' : ''}`} disabled={wc.busy} onClick={() => saveThen(() => wc.run(() => store.selfProcess(m.id)))}><BookOpen size={13} />B 我自己处理</button>
              {ai.suggest && <span className="small faint">AI 建议 {ai.suggest}</span>}
            </div>
            {pick === '入库' && (
              <div className="panel stack" style={{ gap: 6 }}>
                <div className="small">落点：<b className="mono">{path || r.path}</b></div>
                <div className="small muted">{r.rule ? <>命中规则：{[r.rule.platform, r.rule.type, r.rule.topic].join(' × ')}（{f.platform} · {f.type} · {f.topic}）</> : '没有规则命中，落到未分类'} · <Link className="link" to="/settings#routes">改规则</Link></div>
                <input className="input sm" value={path} placeholder="这一条单独改路径（可空）" onChange={(e) => setPath(e.target.value)} aria-label="入库路径" />
                <div className="small muted">写入：原文全文 + 备注 + 标签 #{f.platform} #{f.type} #{f.topic} + 来源链接{ai.state === 'result' ? ' + AI 初处理（标注样例）' : ''}</div>
                <div className="row" style={{ gap: 6 }}><button className="btn sm btn-primary" disabled={wc.busy} onClick={() => saveThen(() => wc.run(() => store.toKnowledge(m.id, path.trim() || undefined)).then(() => setPick(null)))}>确认入库</button><button className="btn sm btn-ghost" onClick={() => setPick(null)}>取消</button></div>
              </div>
            )}
          </>
        )}
        <WriteNote w={wc} compact />
      </div>
    </div>
  );
}
/** 小号：卡片里显示流程位置 */
export function FlowMini({ m }: { m: Material }) {
  const s = stepOf(m);
  return <span className="small faint">{m.later ? '以后读' : STEPS[s]}</span>;
}
/** 还在流程里等我：没归档、没放以后读、没选、没消化、没落地；收藏的条目在收藏卡里走流程，不算 */
export const inFlow = (m: Material) => !m.archived && !m.later && !m.route && !m.digested && !m.home && !m.outputs.some((o) => o.kind === 'action' || o.kind === 'knowledge') && m.kind !== 'project';
export const useFlowCounts = () => useData((db) => {
  const L = db.materials.filter((m) => !m.archived);
  const open = L.filter(inFlow);
  return {
    noNote: open.filter((m) => !m.note?.text).length,
    pick: open.filter((m) => m.ai.state === 'result').length,
    self: L.filter((m) => m.route?.kind === '自己处理' && !m.digested).length,
    later: L.filter((m) => m.later).length,
  };
});
