/**
 * 业务对象的通用行组件：材料、行动、待采纳、请求。
 * 同一对象在卡片、完整页、项目页里都用这几个组件，保证显示一致（R05）。
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Check, Clock3, FolderKanban, Link2, RotateCw, X } from 'lucide-react';
import type { Action, Approval, Decision, Material, MaterialMain } from '../data/types';
import { store, useData } from '../data';
import { relDay, relTime, today } from '../data/time';
import { AiTag, Check2, Chip, SourceChip, Tag } from './ui';
import { useWrite } from './write';
import { useOverlay } from '../workbench/app/overlay';
import { host } from '../data/host';

export const MAIN_TONE: Record<MaterialMain, string> = { 新收到: 'accent', 已读: 'neutral', 已写备注: 'neutral', 'AI 处理中': 'ai', 待我选: 'ai', 自己处理中: 'info', 已消化: 'info', 已推送: 'accent', 已落地: 'ok', 以后读: 'faint', 已归档: 'faint' };
const AI_LABEL = { none: '', sent: 'AI 处理中', result: 'AI 初处理完', failed: 'AI 失败', unknown: 'AI 状态未知' } as const;

/** 材料的多项事实：一排小标签，可以同时出现 */
export function MaterialFacts({ m, full }: { m: Material; full?: boolean }) {
  const approvals = useData((db) => m.outputs.filter((o) => o.kind === 'approval').map((o) => db.approvals.find((a) => a.id === o.id)).filter(Boolean) as Approval[]);
  const acts = m.outputs.filter((o) => o.kind === 'action');
  return (
    <span className="facts">
      {full && <Tag tone={m.read ? 'neutral' : 'accent'}>{m.read ? '已读' : '未读'}</Tag>}
      {m.ai.state !== 'none' && <Tag tone={m.ai.state === 'failed' ? 'bad' : m.ai.state === 'unknown' ? 'warn' : 'ai'}>{AI_LABEL[m.ai.state]}</Tag>}
      {m.digested && <Tag tone="info">已消化</Tag>}
      {m.note && !m.digested && full && <Tag>有批注</Tag>}
      {approvals.map((a) => <Tag key={a.id} tone={a.state === 'pending' ? 'accent' : a.state === 'adopted' ? 'ok' : 'faint'}>{{ pending: '待采纳', adopted: '已采纳', rejected: '不采纳', later: '审批稍后' }[a.state]}</Tag>)}
      {acts.length > 0 && <Tag tone="ok">行动 {acts.length}</Tag>}
      {m.outputs.some((o) => o.kind === 'knowledge') && <Tag tone="ok">已入库</Tag>}
      {m.projectLinks.map((l) => <Tag key={l.projectId} tone="info">{l.as === '参考' ? '项目参考' : '项目需求'}</Tag>)}
      {m.gaps?.length ? <Tag tone="warn">有缺口</Tag> : null}
    </span>
  );
}

export function MaterialRow({ m, compact, selected, onSelect }: { m: Material; compact?: boolean; selected?: boolean; onSelect?: (on: boolean) => void }) {
  const { open } = useOverlay();
  const main = store.mainState(m);
  return (
    <motion.div layout="position" className={`item-row ${compact ? 'compact' : ''} ${!m.read ? 'unread' : ''}`} onClick={(e) => open({ kind: 'material', id: m.id }, e.currentTarget)} role="button" tabIndex={0}>
      {onSelect && <input type="checkbox" className="row-check" checked={!!selected} onClick={(e) => e.stopPropagation()} onChange={(e) => onSelect(e.target.checked)} aria-label="选择" />}
      <div className="item-main">
        <div className="item-title">{m.title}</div>
        {!compact && m.text.trim() !== m.title && <div className="item-ex muted">{m.text.trim().split('\n')[0]}</div>}
        <div className="item-meta">
          <SourceChip id={m.sourceId} label={m.channel} />
          <span className="mono faint" title="进入系统的时间">{relTime(m.receivedAt)}</span>
          {!compact && <MaterialFacts m={m} />}
          {!compact && m.ai.state === 'result' && m.ai.suggestion && <span className="ai-hint"><AiTag /> {m.ai.suggestion}</span>}
        </div>
      </div>
      <Chip tone={host ? 'neutral' : MAIN_TONE[main]}>{host ? (m.archived ? '已归档' : '已收录') : main}</Chip>
    </motion.div>
  );
}

export function ProjectChip({ id }: { id?: string }) {
  const p = useData((db) => db.projects.find((x) => x.id === id));
  if (!p) return null;
  return <Link to={`/c/projects/${p.id}`} className="src-chip" onClick={(e) => e.stopPropagation()}><FolderKanban size={11} />{p.name}</Link>;
}

/** 行动行：勾选有写入状态；点开去行动详情 */
export function ActionRow({ a, compact, showDate }: { a: Action; compact?: boolean; showDate?: boolean }) {
  const w = useWrite();
  const { open } = useOverlay();
  const overdue = !a.done && a.date && a.date < today();
  return (
    <motion.div layout className={`action-row ${a.done ? 'done' : ''} ${compact ? 'compact' : ''}`} transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}>
      <Check2 on={!!a.done} busy={w.busy} onClick={() => w.run(() => store.toggleDone(a.id))} />
      <div className="action-main" onClick={(e) => open({ kind: 'action', id: a.id }, e.currentTarget)} role="button">
        <div className="action-title"><span className="strike">{a.title}</span>{a.kind === '验收行动' && <Tag tone="accent">验收行动</Tag>}</div>
        {!compact && (a.projectId || a.refs.length > 0 || a.body) && (
          <div className="item-meta">
            {a.projectId && <ProjectChip id={a.projectId} />}
            {a.refs[0] && <SourceChip id={a.refs[0].source} label={a.refs[0].label} />}
            {a.refs.length > 1 && <span className="faint small">+{a.refs.length - 1} 来源</span>}
          </div>
        )}
        {w.status === 'failed' || w.status === 'unknown' || w.status === 'conflict' ? (
          <div className="wnote ws-failed compact" onClick={(e) => e.stopPropagation()}><AlertTriangle size={12} />{w.status === 'unknown' ? '不确定是否已勾上' : '没有勾上'}：{w.receipt?.error}<button className="btn xs" onClick={w.retry}><RotateCw size={11} />重试</button></div>
        ) : null}
      </div>
      <div className="action-side mono">
        {(showDate || overdue) && <span className={overdue ? 'tone-bad-text' : 'faint'}>{relDay(a.date)}</span>}
        {a.time && <span className="faint">{a.time}</span>}
        <span className={`prio p-${a.priority}`}>{a.priority}</span>
      </div>
    </motion.div>
  );
}

/** 待采纳行：采纳 / 不采纳（可写原因） / 稍后；采纳会创建行动（去重） */
export function ApprovalRow({ ap, compact }: { ap: Approval; compact?: boolean }) {
  const w = useWrite();
  const [reason, setReason] = useState<string | null>(null);
  const { open } = useOverlay();
  const mats = useData((db) => ap.materialIds.map((id) => db.materials.find((m) => m.id === id)).filter(Boolean) as Material[]);
  const decided = ap.state !== 'pending';
  return (
    <motion.div layout className={`appr-row ${decided ? 'decided' : ''}`}>
      <div className="appr-main">
        <div className="appr-title">{ap.title}{ap.by === 'AI' && <AiTag label="AI 建议" />}{ap.by === '工程' && <Tag tone="info">项目提出</Tag>}</div>
        {!compact && ap.body && <div className="muted small">{ap.body}</div>}
        <div className="item-meta">
          {mats.map((m) => <button key={m.id} className="src-chip" onClick={(e) => open({ kind: 'material', id: m.id }, e.currentTarget)}><Link2 size={11} />{m.title.slice(0, 22)}</button>)}
          {!mats.length && ap.refs[0] && <SourceChip id={ap.refs[0].source} label={ap.refs[0].label} />}
          {ap.projectId && <ProjectChip id={ap.projectId} />}
          {ap.suggestDate && !decided && <span className="faint small">建议 {relDay(ap.suggestDate)}</span>}
        </div>
        {decided && (
          <div className="small muted appr-result">
            {ap.state === 'adopted' && <>已采纳 → <button className="link" onClick={(e) => open({ kind: 'action', id: ap.actionId! }, e.currentTarget)}>行动 {ap.actionId}</button></>}
            {ap.state === 'rejected' && <>不采纳{ap.reason ? `：${ap.reason}` : ''}</>}
            {ap.state === 'later' && <>稍后再看</>}
            <span className="faint mono"> · {relTime(ap.decidedAt)}</span>
            <button className="link" onClick={() => w.run(() => store.decideApproval(ap.id, 'pending'))}>撤回</button>
          </div>
        )}
        {reason !== null && (
          <form className="row" style={{ gap: 6, marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); w.run(() => store.decideApproval(ap.id, 'rejected', reason)).then((r) => r.status === 'ok' && setReason(null)); }}>
            <input className="input sm" autoFocus placeholder="为什么不采纳（可不填）" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="btn sm">确定</button><button type="button" className="btn sm btn-ghost" onClick={() => setReason(null)}>取消</button>
          </form>
        )}
        {w.status !== 'idle' && w.status !== 'ok' && w.status !== 'pending' && <div className="wnote ws-failed compact"><AlertTriangle size={12} />{w.receipt?.error}<button className="btn xs" onClick={w.retry}><RotateCw size={11} />重试</button></div>}
        {w.status === 'ok' && w.receipt?.detail && <div className="wnote ws-ok compact"><Check size={12} />{w.receipt.detail}</div>}
      </div>
      {!decided && reason === null && (
        <div className="appr-acts">
          <button className="btn sm btn-primary" disabled={w.busy} onClick={() => w.run(() => store.decideApproval(ap.id, 'adopted'))}>{w.busy ? '…' : <><Check size={12} />采纳</>}</button>
          <button className="icon-btn xs" title="不采纳" disabled={w.busy} onClick={() => setReason('')}><X size={13} /></button>
          <button className="icon-btn xs" title="稍后" disabled={w.busy} onClick={() => w.run(() => store.decideApproval(ap.id, 'later'))}><Clock3 size={13} /></button>
        </div>
      )}
    </motion.div>
  );
}

export const KIND_TONE: Record<Decision['kind'], string> = { 验收: 'accent', 选择: 'info', 操作: 'warn', 补充: 'ai', 个人: 'neutral' };
export function DecisionRow({ d, compact }: { d: Decision; compact?: boolean }) {
  const { open } = useOverlay();
  const p = useData((db) => db.projects.find((x) => x.id === d.projectId));
  return (
    <button className={`dec-row ${d.freshness !== 'current' ? 'stale' : ''}`} onClick={(e) => open({ kind: 'decision', id: d.id }, e.currentTarget)}>
      <Tag tone={KIND_TONE[d.kind]}>{d.kind}</Tag>
      <div className="dec-main">
        <div className="dec-title">{d.title}</div>
        {!compact && <div className="item-meta"><span className="small muted ellipsis">{p?.name ?? d.raisedBy}</span><span className="mono faint" title="请求截至">{relTime(d.asOf)}</span>
          {d.freshness === 'stale' && <Tag tone="warn">可能过期</Tag>}{d.freshness === 'superseded' && <Tag tone="faint">已被取代</Tag>}{d.freshness === 'revoked' && <Tag tone="faint">已撤回</Tag>}
          {d.status === 'later' && <Tag tone="faint">稍后 · {relDay(d.laterUntil)}</Tag>}
          {d.response && d.status !== 'later' && <Tag tone="ok">{d.response.kind}</Tag>}
        </div>}
      </div>
      <ArrowUpRight size={14} className="faint" />
    </button>
  );
}
