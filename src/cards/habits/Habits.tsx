import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { addDays, md, today, weekday } from '../../data/time';
import { habits as content, useHabits as useContent } from './store';
import type { CardProps } from '../../workbench/cards/protocol';

/* 打卡：按真实日期存（content.checks[YYYY-MM-DD]），近 7 天 */
export function Habits({ inst, edit }: CardProps) {
  const habits = useContent((c) => c.habits);
  const checks = useContent((c) => c.checks);
  const [adding, setAdding] = useState<string | null>(null);
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  return (
    <div className="habits">
      {inst.h > 3 && <div className="habit-row head"><span /><span className="dots">{days.map((d) => <span key={d} className={d === t ? 'today' : ''} title={d}>{weekday(d).slice(1)}</span>)}</span></div>}
      {habits.map((h) => (
        <div key={h.id} className="habit-row">
          <span className="ellipsis">{h.name}{edit && <button className="icon-btn xs" data-nodrag title="删除这项" onClick={() => content.removeHabit(h.id)}><X size={11} /></button>}</span>
          <span className="dots">
            {days.map((d) => {
              const on = (checks[d] ?? []).includes(h.id);
              const can = d === t || d === addDays(t, -1);
              return (
                <button key={d} data-nodrag className={`hdot2 ${on ? 'on' : ''} ${d === t ? 'today' : ''}`} disabled={!can} title={`${md(d)} ${weekday(d)}${can ? '' : '（只能补昨天和今天）'}`} aria-label={`${h.name} ${d}`}
                  onClick={() => content.toggleCheck(d, h.id)}>
                  {on ? <motion.i initial={{ scale: 0.3 }} animate={{ scale: 1 }} /> : null}
                </button>
              );
            })}
          </span>
        </div>
      ))}
      {adding === null ? (inst.h > 4 || edit) && <button className="link small" data-nodrag onClick={() => setAdding('')}><Plus size={11} />加一项</button> : (
        <form className="row" data-nodrag style={{ gap: 4 }} onSubmit={(e) => { e.preventDefault(); if (adding.trim()) content.addHabit(adding.trim()); setAdding(null); }}>
          <input className="input sm" autoFocus value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="名称" /><button className="btn xs">加</button>
        </form>
      )}
    </div>
  );
}
