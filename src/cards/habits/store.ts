/**
 * 「打卡」卡的私有数据：按真实日期存（checks[YYYY-MM-DD] = 当天打过卡的项）。
 * 前端阶段存 localStorage['pkd.v5.content.habits.v1']（我的内容，不按天重置）；建议落盘：系统/打卡/YYYY-MM.md（建议，待确认）。
 */
import { cardStore } from '../../data/cardStore';

export interface Habit { id: string; name: string }
const seed = () => ({
  habits: [{ id: 'h1', name: '早起' }, { id: 'h2', name: '跑步' }, { id: 'h3', name: '背单词' }, { id: 'h4', name: '写日记' }] as Habit[],
  checks: {} as Record<string, string[]>,
});
export const S = cardStore('habits', seed, { content: true });
export const useHabits = <T,>(sel: (c: ReturnType<typeof seed>) => T) => S.use(sel);
export const habits = {
  toggleCheck(date: string, hid: string) { const d = S.d.checks[date] ?? []; S.d.checks = { ...S.d.checks, [date]: d.includes(hid) ? d.filter((x) => x !== hid) : [...d, hid] }; S.emit(); },
  addHabit(name: string) { S.d.habits = [...S.d.habits, { id: 'h' + Date.now().toString(36), name }]; S.emit(); },
  removeHabit(id: string) { S.d.habits = S.d.habits.filter((h) => h.id !== id); S.emit(); },
};
