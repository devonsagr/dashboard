import { Link } from 'react-router-dom';
import { defineImpl, type CardProps } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { dayDiff, md, today } from '../../data/time';
import { Empty } from '../../ui/ui';

/** 只读：列出逾期最久的行动，点开到行动详情（行动的主场是「今日行动」卡） */
function Overdue({ inst }: CardProps) {
  const t = today();
  const min = Number(inst.props.minDays || '1');
  const l = useData(() => store.liveActions().filter((a) => !a.done && a.date && dayDiff(t, a.date) >= min).sort((a, b) => a.date!.localeCompare(b.date!)));
  if (!l.length) return <Empty title={`没有逾期 ${min} 天以上的事`} />;
  return (
    <div className="stack" style={{ gap: 2 }}>
      {l.slice(0, Math.max(3, inst.h * 2 - 3)).map((a) => (
        <Link key={a.id} to={`/c/today/a/${a.id}`} className="mini-row"><span className="mono tone-bad-text">{dayDiff(t, a.date!)} 天</span><span className="ellipsis">{a.title}</span><span className="faint small" style={{ marginLeft: 'auto' }}>{md(a.date)}</span></Link>
      ))}
    </div>
  );
}
export default defineImpl({ Card: Overdue });
