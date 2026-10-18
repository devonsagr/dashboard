import { CalendarClock } from 'lucide-react';
import { useData } from '../../data';
import { nowHm, today } from '../../data/time';
import { Empty } from '../../ui/ui';
import { useOverlay } from '../../workbench/app/overlay';

/* 日程：只显示「有时间点的行动」。课程/会议需要日历源 P10，尚未接入——不放假课表 */
export function Agenda() {
  const t = today(), now = nowHm();
  const list = useData((db) => db.actions.filter((a) => a.date === t && a.time && !a.deleted && !a.archived).sort((a, b) => a.time!.localeCompare(b.time!)));
  const { open } = useOverlay();
  return (
    <div className="agenda-wrap">
      {list.length === 0 ? <Empty title="今天没有定了时间的行动" hint="在行动里填上时间就会出现在这里" /> : (
        <ol className="agenda">
          {list.map((a, i) => {
            const showNow = (i === 0 ? true : list[i - 1].time! < now) && a.time! >= now;
            return (
              <li key={a.id}>
                {showNow && <div className="agenda-now"><span className="mono">{now}</span><i /></div>}
                <button data-nodrag className={`agenda-row k-行动 ${a.time! < now || a.done ? 'past' : ''}`} onClick={(e) => open({ kind: 'action', id: a.id }, e.currentTarget)}>
                  <span className="mono">{a.time}</span><span className="agenda-bar" /><span className={`ellipsis ${a.done ? 'strike-on' : ''}`}>{a.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <div className="card-foot-note"><CalendarClock size={12} />课程与会议需要日历源 <span className="mono">P10</span>，尚未接入</div>
    </div>
  );
}
