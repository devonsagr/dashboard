/**
 * 「health」卡的私有数据（只有这张卡读写）。设备数据与日常健康记录。
 * 前端阶段：样例 + localStorage['pkd.v5.card.health.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { addDays, at, today } from '../../data/time';
import type { Day, ISO, Ref } from '../../data/types';

export interface HealthDay {
  date: Day; steps?: number; sleepMin?: number; restingHr?: number; spo2?: number;
  deviceAt?: ISO; syncedAt?: ISO; meals: { label: string; kcal?: number; estimate: boolean; ref: Ref }[]; orders: { label: string; at: ISO }[]; gaps: string[];
}

export function health(): HealthDay[] {
  return Array.from({ length: 7 }, (_, k) => {
    const n = k - 6, date = addDays(today(), n);
    const r = (s: number, m: number) => Math.floor(Math.abs(Math.sin((k + s) * 12.9898) * 43758.5453) % m);
    const synced = n > -1 ? undefined : at(n + 1, '07:10');
    return {
      date, steps: n === 0 || n === -3 ? undefined : 4000 + r(1, 7000), sleepMin: n === 0 || n === -5 ? undefined : 330 + r(2, 150), restingHr: n === 0 ? undefined : 58 + r(3, 10), spo2: n === 0 || n === -2 ? undefined : 95 + r(4, 4),
      deviceAt: n === 0 ? undefined : at(n, '23:50'), syncedAt: synced,
      meals: n === -1 ? [{ label: '示例午餐（合成记录）', kcal: 640, estimate: true, ref: { source: 'H07', label: '日常健康记录', path: `示例数据/健康/日常/${date}.md` } }] : [],
      orders: n === -1 ? [{ label: '示例订单 · 餐食 A', at: at(-1, '11:50') }] : [],
      gaps: n === 0 ? ['今天的设备数据还没同步（Health Sync 每天早上 7 点同步前一天）'] : n === -3 ? ['这天步数没有同步到'] : [],
    };
  });
}

export const S = cardStore('health', () => ({ health: health() }));
