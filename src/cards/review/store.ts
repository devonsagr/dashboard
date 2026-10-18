/**
 * 「review」卡的私有数据（只有这张卡读写）。无法确认的日子与我的复盘文字（完成度由共享的行动 / 日记计算）。
 * 前端阶段：样例 + localStorage['pkd.v5.card.review.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { addDays, nowIso, today } from '../../data/time';
import type { Day, ISO } from '../../data/types';

export interface DayMeta { date: Day; status: 'ok' | 'unknown'; reason?: string }
export interface Reflection { key: string; text: string; at: ISO }

export const dayMeta = (): DayMeta[] => [
  { date: addDays(today(), -5), status: 'unknown', reason: '行动文件解析失败（系统/行动/a-0812.md），这天的完成数不可信' },
  { date: addDays(today(), -11), status: 'unknown', reason: '这天没有任何记录（仪表盘未打开、也没有日记）' },
];
export const reflections = (): Reflection[] => [];

export const S = cardStore('review', () => ({ dayMeta: dayMeta(), reflections: reflections() }));

export const saveReflection = (key: string, text: string) => S.write('reflection', '保存复盘', () => { S.d.reflections = [...S.d.reflections.filter((r) => r.key !== key), { key, text, at: nowIso() }]; return { path: `系统/复盘/${key}.md` }; });
