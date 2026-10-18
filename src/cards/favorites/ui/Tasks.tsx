import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, RotateCw, X } from 'lucide-react';
import { full, hm, relTime } from '../../../data/time';
import { PageHeader, Tag } from '../../../ui/ui';
import type { Task } from '../model';
import { S, cancelTask, retryTask } from '../store';
import { PF } from '../platforms';
import { SampleBadge } from './common';

const isCur = (t: Task) => t.state === 'waiting' || t.state === 'running';
const isNeed = (t: Task) => (t.state === 'blocked' || t.state === 'failed') && !t.retriedBy;
const isEnded = (t: Task) => !isCur(t) && !isNeed(t);
const STATE: Record<Task['state'], [string, string]> = { waiting: ['等待', 'faint'], running: ['运行中', 'info'], blocked: ['需你处理', 'warn'], failed: ['失败', 'bad'], done: ['结束', 'ok'], cancelled: ['已取消', 'faint'], unknown: ['待核对', 'warn'] };

/** 顶栏任务入口（宿主顶栏插槽）：离开收藏、切画板、移除卡片都不会让它消失，也不会取消任务 */
export function TaskButton({ inline }: { inline?: boolean }) {
  const tasks = S.use((d) => d.tasks); const feed = S.use((d) => d.demo.feed);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', k); window.addEventListener('mousedown', c);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('mousedown', c); };
  }, [open]);
  const cur = tasks.filter(isCur).length, need = tasks.filter(isNeed).length;
  return (
    <div className="fav-taskbtn" ref={ref}>
      <button className={`btn sm ${inline ? '' : 'btn-ghost'}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="收藏任务" title="收藏任务">
        <Bookmark size={13} />{feed === 'unknown' ? <span>任务 ?</span> : <span>{cur ? `${cur} 进行中` : '任务'}{need ? <b className="fav-need"> · {need} 需处理</b> : null}</span>}
        {feed === 'offline' && <span className="faint">（截至 {hm(S.d.demo.snapshotAt)}）</span>}
      </button>
      {open && <div className="fav-taskwin" role="dialog" aria-label="收藏任务"><TaskList compact onClose={() => setOpen(false)} /></div>}
    </div>
  );
}

export function TaskList({ compact, onClose }: { compact?: boolean; onClose?: () => void }) {
  const tasks = S.use((d) => d.tasks); const demo = S.use((d) => d.demo);
  const [tab, setTab] = useState<'cur' | 'need' | 'ended'>('cur');
  const groups = { cur: tasks.filter(isCur), need: tasks.filter(isNeed), ended: tasks.filter(isEnded) };
  const off = demo.feed === 'offline';
  const list = groups[tab].slice(0, compact ? 6 : 200);
  return (
    <div className="fav fav-tasks">
      <div className="row">
        <div className="seg">{([['cur', '当前'], ['need', '需处理'], ['ended', '最近结束']] as const).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><span>{l} {demo.feed === 'unknown' ? '?' : groups[k].length}</span></button>)}</div>
        <span style={{ flex: 1 }} />
        {onClose && <button className="icon-btn" onClick={onClose} aria-label="收起（任务继续）" title="收起（任务继续）"><X size={15} /></button>}
      </div>
      {demo.feed === 'unknown' ? <div className="fav-note-line warn">还没拿到任务状态（首次读取未完成）。这不是 0 个任务。</div> : <>
        {off && <div className="fav-note-line warn">连接断开：下面是截至 {full(demo.snapshotAt)} 的状态，可能已经变化。</div>}
        {!list.length && <div className="small muted fav-pad">{tab === 'cur' ? '没有进行中的任务' : tab === 'need' ? '没有需要你处理的' : '最近没有结束的任务'}</div>}
        {list.map((t) => <TaskRow key={t.id} t={t} off={off} />)}
        {groups[tab].length > list.length && <Link className="link small" to="/c/favorites/tasks" onClick={onClose}>还有 {groups[tab].length - list.length} 个 · 看全部任务</Link>}
      </>}
      {compact && <div className="small faint fav-pad">共 {demo.feed === 'unknown' ? '?' : tasks.length} 个任务 · 关闭窗口只是收起，任务继续 · <Link className="link" to="/c/favorites/tasks" onClick={onClose}>任务页</Link></div>}
    </div>
  );
}
function TaskRow({ t, off }: { t: Task; off: boolean }) {
  const [label, tone] = t.retriedBy ? ['已重试', 'faint'] : STATE[t.state];
  const prog = t.total ? `${t.done ?? 0} / ${t.total}` : t.done !== undefined ? `已处理 ${t.done}（总数未知）` : '';
  const to = t.recId ? `/c/favorites/r/${t.recId}` : t.itemId ? `/c/favorites/i/${t.itemId}` : `/c/favorites/import/${t.platform}`;
  return (
    <div className="fav-task">
      <div className="row wrap small"><Tag tone="neutral">{t.kind}</Tag><span className="muted">{PF[t.platform].name}</span><Tag tone={tone}>{label}</Tag><span className="faint">开始 {relTime(t.startedAt)} · 更新 {relTime(t.updatedAt)}</span></div>
      <Link className="fav-task-title" to={to}>{t.label}</Link>
      <div className="small muted">{t.stage}{prog && ` · ${prog}`}</div>
      {t.total && t.state === 'running' && <div className="meter"><i style={{ width: `${((t.done ?? 0) / t.total) * 100}%` }} /></div>}
      {t.reason && <div className="small tone-warn-text">{t.reason}</div>}
      {t.retryOf && <div className="small faint">这是对一次失败任务的重试</div>}
      <div className="row">
        {t.state === 'failed' && !t.retriedBy && <button className="btn sm" disabled={off} onClick={() => retryTask(t.id)}><RotateCw size={12} />重试</button>}
        {t.state === 'blocked' && <Link className="btn sm" to={`/c/favorites/import/${t.platform}`}>去处理（需你本人在原站验证）</Link>}
        {t.cancellable && t.state === 'running' && <button className="btn sm btn-ghost" disabled={off} onClick={() => cancelTask(t.id)}>停止</button>}
      </div>
    </div>
  );
}
export function TasksPage() {
  return (
    <div className="page fav">
      <PageHeader title={<>收藏任务 <SampleBadge /></>} sub="列表核对、正文、图片、字幕 / 转写、双语、阅读概要、按批注整理。没有总数时只显示阶段和已处理数；任务结束不等于材料完整。" />
      <TaskList />
    </div>
  );
}
