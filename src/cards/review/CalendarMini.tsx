import { useData } from '../../data';
import { addDays, md, today } from '../../data/time';
import { useOverlay } from '../../workbench/app/overlay';
import { S } from './store';

/* 月历：每天的行动完成度（由行动计算）；无法确认的日子画成虚线 */
export function CalendarMini() {
  const { open } = useOverlay();
  const acts = useData((db) => db.actions.filter((a) => !a.deleted));
  const unknown = S.use((d) => d.dayMeta.filter((x) => x.status === 'unknown'));
  const t = today(), first = `${t.slice(0, 8)}01`;
  const lead = new Date(first + 'T12:00:00+08:00').getUTCDay();
  const days = new Date(+t.slice(0, 4), +t.slice(5, 7), 0).getDate();
  return (
    <div className="cal">
      {['日', '一', '二', '三', '四', '五', '六'].map((w) => <span key={w} className="cal-w">{w}</span>)}
      {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
      {Array.from({ length: days }, (_, i) => {
        const date = addDays(first, i), planned = acts.filter((a) => a.date === date), done = planned.filter((a) => a.done);
        const unk = unknown.find((u) => u.date === date);
        const r = planned.length ? done.length / planned.length : 0;
        const future = date > t;
        return (
          <button key={date} data-nodrag className={`cal-d ${date === t ? 'today' : ''} ${future ? 'future' : ''} ${unk ? 'unknown' : ''}`}
            title={unk ? `未知：${unk.reason}` : planned.length ? `${md(date)} 完成 ${done.length}/${planned.length}` : `${md(date)} 没有排期的行动`}
            onClick={(e) => open({ kind: 'path', to: `/review/day?d=${date}` }, e.currentTarget)}>
            {!future && !unk && <i style={{ opacity: planned.length ? 0.15 + r * 0.75 : 0 }} />}{+date.slice(8)}
          </button>
        );
      })}
    </div>
  );
}
