/**
 * 「daily」卡的私有数据：定稿记录、外部发现（推荐）、AI 建议、健康摘要（样例）。
 * 覆盖、关注、流程待办都由共享数据现算（data/），不存。
 */
import { cardStore } from '../../data/cardStore';
import { at, nowIso, workday } from '../../data/time';
import { flowPath } from '../../data/settings';
import { H, nid, upsertProjection } from '../../data/store';
import type { ISO } from '../../data/types';

export interface Discover { id: string; src: 'GitHub 热门' | '周报' | '关注作者'; title: string; url: string; why: string; firstSeen: ISO; seen?: ISO; taken?: string; /** 内容本身的新旧 / 统计区间（不是我们看到它的时间） */ age?: string; /** 和我已有东西的关系：收藏过 / 自己的项目 / 都没有 */ rel?: string }
export interface Suggest { id: string; text: string; basis: string; pushed?: string }
const discover = (): Discover[] => [
  { id: 'd1', src: 'GitHub 热门', title: '示例·笔记连接器', url: 'https://example.com/demo/reference-1', why: '和「仪表盘接入 Obsidian」直接相关；群里也有人提到', firstSeen: at(0, '06:00'), age: '合成条目 · 本周榜单示例', rel: '和自己的项目「个人 AI 仪表盘」有关' },
  { id: 'd2', src: 'GitHub 热门', title: '示例·提示词评估工具', url: 'https://example.com/demo/reference-2', why: '微信群讨论到，知识库里没有', firstSeen: at(0, '06:00'), age: '合成条目 · 本周榜单示例', rel: '没收藏过，也不在自己的项目里' },
  { id: 'd3', src: '周报', title: '本周 AI 工具周报：Agent 记忆的三种做法', url: 'https://example.com/weekly', why: '和「主体上下文」思路相近', firstSeen: at(-2, '06:00'), age: '合成周报 · 上周统计示例', rel: '没收藏过', seen: at(-2, '21:00') },
  { id: 'd4', src: '关注作者', title: '示例作者 A · 工作台设计续篇', url: 'https://example.com/demo/reference-3', why: '你收藏过第一期', firstSeen: at(-1, '06:00'), age: '合成帖子 · 前一天发布示例', rel: '收藏过第一期（收藏 · X）' },
];
const suggest = (): Suggest[] => [
  { id: 's1', text: '示例提醒：今晚 21:00 前归还材料', basis: 'QQ · 示例通知群 00:30 的消息（按 04:00 切换算昨天，但影响今天）' },
  { id: 's2', text: '示例作品初稿周一交：今天可以先把分组图要来', basis: '示例通知群通知 + 分组只在图片里、图片未读取' },
  { id: 's3', text: '「我自己处理」里有 1 条还剩 2 个要点没划', basis: '收件 · 图解注意力机制' },
];
export const S = cardStore('daily', () => ({ finalized: undefined as undefined | { at: ISO; path: string; day: string }, discover: discover(), suggest: suggest(), health: { sleep: '6 小时 40 分（样例）', steps: '未知', note: '手环数据只到昨晚 23:00' } }));

export const finalize = () => S.write('daily-final', `日报定稿 ${workday()}`, () => {
  const path = flowPath('daily'); S.d.finalized = { at: nowIso(), path, day: workday() }; return { path };
});
export const unfinalize = () => S.write('daily-final', '撤回定稿（文件保留，标记为草稿）', () => { S.d.finalized = undefined; }, { noConflict: true });
export const seen = (id: string) => S.write('discover-seen', '推荐：看过了', () => { const d = S.d.discover.find((x) => x.id === id)!; d.seen = nowIso(); }, { noConflict: true });
/** 推荐收进收件：成为一条材料，之后走统一流程（写备注 → AI → 入库 / 自己处理） */
export const take = (id: string) => S.write('discover-take', '推荐收进收件', () => {
  const d = S.d.discover.find((x) => x.id === id)!;
  const mid = d.taken ?? nid('m');
  upsertProjection({ id: mid, kind: 'clip', sourceId: 'C19', platform: 'GitHub', channel: `外部发现 · ${d.src}`, title: d.title, text: `${d.title}\n${d.url}\n推荐理由（样例）：${d.why}`, contentAt: d.firstSeen, receivedAt: nowIso(), ref: { source: 'C19', label: `外部发现 · ${d.src}`, url: d.url, at: d.firstSeen }, ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [], history: [H('我', '从日报的新内容推荐收进收件')] });
  d.taken = mid; d.seen = d.seen ?? nowIso();
  return { targetId: mid };
});
export const markPushed = (id: string, apId: string) => { const s = S.d.suggest.find((x) => x.id === id); if (s) { s.pushed = apId; S.emit(); } };
