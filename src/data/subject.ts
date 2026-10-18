/**
 * 主体上下文：8 份主体文档的「更新队列」（共享：日报显示候选数，主体上下文卡处理）。
 * 三档，确认要求不同：
 *   短期（当前状态）       AI 可以直接写，已生效；我能撤回
 *   候选（AI 观察模型）    AI 的推测，等我看：接受 / 不接受
 *   长期（用户自我画像）   只有我确认才写进去
 * 每一条都带来源（哪条日记 / 消息 / 对话），说不出来源的不进队列。
 * 前端阶段：样例 + localStorage['pkd.v5.card.subject.v1']（按天重置）。路径在 data/settings.ts（主体文档路径）。
 */
import { cardStore } from './cardStore';
import { at, nowIso } from './time';
import type { ISO, Ref } from './types';

export type Tier = '短期' | '候选' | '长期';
export interface SubjectUpdate {
  id: string; doc: string; tier: Tier; text: string; ref: Ref; by: 'AI' | '我'; at: ISO;
  state: '已生效' | '待确认' | '已接受' | '不接受' | '已撤回'; decidedAt?: ISO;
}
const sample = (): SubjectUpdate[] => [
  { id: 'su1', doc: 'state', tier: '短期', text: '合成状态：正在整理示例材料，下一次检查页面交互', ref: { source: 'C11', label: '日记 · 用户原文（昨天）', path: '示例数据/日记/…/用户原文.md', at: at(-1, '23:58') }, by: 'AI', at: at(0, '07:20'), state: '已生效' },
  { id: 'su2', doc: 'state', tier: '短期', text: '合成提醒：明早 8 点有示例活动', ref: { source: 'P06', label: '微信 · 示例活动群', at: at(-1, '23:40') }, by: 'AI', at: at(0, '07:20'), state: '已生效' },
  { id: 'su3', doc: 'observe', tier: '候选', text: '合成观察：示例记录里有三次材料整理；这只是待确认的推测', ref: { source: 'C11', label: '日记 · 近 7 天 3 处', at: at(-1, '23:58') }, by: 'AI', at: at(0, '07:21'), state: '待确认' },
  { id: 'su4', doc: 'observe', tier: '候选', text: '合成观察：示例材料同时保留原始段落与摘要，偏好尚待确认', ref: { source: 'C08', label: '随手记 m01', at: at(0, '09:30') }, by: 'AI', at: at(0, '09:31'), state: '待确认' },
  { id: 'su5', doc: 'self', tier: '长期', text: '合成画像候选：希望每周留出一次整理材料的时间', ref: { source: 'C08', label: '随手记 m02', at: at(-1, '00:42') }, by: 'AI', at: at(0, '07:22'), state: '待确认' },
  { id: 'su6', doc: 'open', tier: '候选', text: '合成问题：如何判断一个示例话题是否已有对应笔记', ref: { source: 'C15', label: 'QQ · 示例技术群', at: at(0, '01:20') }, by: 'AI', at: at(0, '07:23'), state: '待确认' },
  { id: 'su7', doc: 'observe', tier: '候选', text: '合成观察：三段示例对话都涉及引用管理，不自动推断长期特征', ref: { source: 'C18', label: '合成对话 · 三段示例', at: at(-1, '21:30') }, by: 'AI', at: at(0, '07:24'), state: '待确认' },
];
/** 每份文档「截至」到什么时候（最后一次被更新时依据的材料时间）。样例 */
const asOf = (): Record<string, ISO | undefined> => ({ entry: undefined, identity: at(-40, '20:00'), state: at(0, '07:20'), self: at(-12, '22:00'), observe: at(-3, '23:00'), lessons: at(-9, '21:00'), open: at(-2, '23:00'), projects: at(-1, '22:00') });

export const SUB = cardStore('subject', () => ({ queue: sample(), asOf: asOf() }));
export const pendingSubject = () => SUB.d.queue.filter((q) => q.state === '待确认');
export function decide(id: string, ok: boolean) {
  const q = SUB.d.queue.find((x) => x.id === id)!;
  const label = q.state === '已生效' ? '撤回已生效的更新' : ok ? '接受主体更新' : '不接受主体更新';
  return SUB.write('subject', `${label}：${q.text.slice(0, 18)}`, () => {
    q.state = q.state === '已生效' ? '已撤回' : ok ? '已接受' : '不接受'; q.decidedAt = nowIso();
    if (q.state === '已接受') SUB.d.asOf[q.doc] = q.ref.at ?? nowIso();
  });
}
