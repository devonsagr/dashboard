import { useEffect, useState } from 'react';
import { dayDiff, nowHm, today, weekday } from '../../data/time';
import type { CardProps } from '../../workbench/cards/protocol';

/* 时间：按 Asia/Hong_Kong 的真实日期 */
export function Clock({ inst }: CardProps) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 15000); return () => clearInterval(id); }, []);
  const d = today();
  const week = Math.ceil((dayDiff(d, `${d.slice(0, 4)}-01-01`) + new Date(`${d.slice(0, 4)}-01-01T12:00:00+08:00`).getUTCDay() + 1) / 7);
  return (
    <div className="clock">
      <div className="clock-time serif">{nowHm()}</div>
      <div className="muted">{+d.slice(0, 4)} 年 {+d.slice(5, 7)} 月 {+d.slice(8, 10)} 日 · {weekday(d)}</div>
      {inst.h > 3 && <div className="small faint">第 {week} 周 · 香港时间</div>}
    </div>
  );
}
