import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { today } from '../../data/time';
import { ActionRow } from '../../ui/objects';
import { Empty } from '../../ui/ui';
import { useWrite, WriteNote } from '../../ui/write';

/** 今日行动：逾期 + 今天（含今天已完成，带删除线）；底部一行快速新建 */
export function TodayQueue({ inst }: CardProps) {
  const t = today();
  const list = useData(() => store.liveActions().filter((a) => (a.date && a.date < t && !a.done) || a.date === t || (a.done && a.done.slice(0, 10) === t)).sort((a, b) => Number(!!a.done) - Number(!!b.done) || (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '99').localeCompare(b.time ?? '99') || a.order - b.order));
  const overdue = list.filter((a) => !a.done && a.date! < t);
  const rest = list.filter((a) => !overdue.includes(a));
  return (
    <div className="stack" style={{ gap: 4 }}>
      {list.length === 0 && <Empty title="今天没有排期的行动" hint="可以从待采纳里挑几条，或者直接写一条" />}
      {overdue.length > 0 && <div className="mini-head tone-bad-text">逾期 {overdue.length}</div>}
      <AnimatePresence initial={false}>{overdue.map((a) => <ActionRow key={a.id} a={a} compact={inst.w < 5} showDate />)}</AnimatePresence>
      {overdue.length > 0 && rest.length > 0 && <div className="mini-head">今天</div>}
      <AnimatePresence initial={false}>{rest.map((a) => <ActionRow key={a.id} a={a} compact={inst.w < 5} />)}</AnimatePresence>
      <NewAction date={t} />
    </div>
  );
}
export const todayMeta = () => { const t = today(); const l = store.liveActions().filter((a) => a.date && a.date <= t); return `${l.filter((a) => a.done && a.date === t).length}/${l.filter((a) => a.date === t || !a.done).length}`; };

/** 一行新建：回车保存；失败时输入保留 */
export function NewAction({ date, placeholder = '加一件今天的事…' }: { date?: string; placeholder?: string }) {
  const [v, setV] = useState('');
  const w = useWrite();
  return (
    <form className="add-row" data-nodrag onSubmit={(e) => { e.preventDefault(); if (!v.trim()) return; w.run(() => store.createAction({ title: v.trim(), date })).then((r) => r.status === 'ok' && setV('')); }}>
      <Plus size={13} className="faint" /><input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label="新建行动" disabled={w.busy} />
      <WriteNote w={w} compact ok="已加入" />
    </form>
  );
}
