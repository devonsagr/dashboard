import { addDays, dayDiff, md, today, weekday } from '../../data/time';
import type { CardProps } from '../../workbench/cards/protocol';

/* 倒计时 */
export function Countdown({ inst }: CardProps) {
  const title = inst.props.title || '某件事', date = inst.props.date || addDays(today(), 4);
  const days = dayDiff(date, today());
  return (
    <div className="countdown">
      <div className="cd-n serif">{Math.abs(days)}<span>天</span></div>
      <div className="muted small">{days > 0 ? '距离' : days === 0 ? '就是今天：' : '已过去'} {title} · {md(date)} {weekday(date)}</div>
    </div>
  );
}
