/**
 * 「qq」卡的私有数据（只有这张卡读写）。白名单群与收集记录。
 * 前端阶段：样例 + localStorage['pkd.v5.card.qq.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { addDays, at, nowIso } from '../../data/time';
import { nid } from '../../data/store';
import type { ISO } from '../../data/types';

export interface QQGroup { id: string; name: string; whitelisted: boolean; lastCollected?: ISO; coverage: string; members?: number }
export interface QQRun {
  id: string; at: ISO; mode: '读取存档' | '开始收集';
  groups: { groupId: string; status: 'ok' | 'failed' | 'running'; count?: number; error?: string; batchPath?: string }[];
}

export const qqGroups = (): QQGroup[] => [
  { id: 'g1', name: '示例通知群', whitelisted: true, lastCollected: at(0, '07:10'), coverage: '近 7 天完整', members: 12 },
  { id: 'g2', name: '示例休闲群', whitelisted: true, lastCollected: at(-2, '21:00'), coverage: '近 3 天，图片只存了缩略图', members: 18 },
  { id: 'g3', name: '示例资料群', whitelisted: true, lastCollected: at(-50, '21:00'), coverage: '最近一次失败；上次成功是 50 天前', members: 24 },
  { id: 'g4', name: '示例未授权群', whitelisted: false, coverage: '不在白名单，不读取' },
  { id: 'g5', name: '示例技术群', whitelisted: true, lastCollected: at(0, '07:10'), coverage: '近 3 天完整', members: 30 },
];
export const qqRuns = (): QQRun[] => [
  { id: 'qq-b07', at: at(-2, '21:00'), mode: '开始收集', groups: [{ groupId: 'g1', status: 'ok', count: 4, batchPath: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例通知群.md' }, { groupId: 'g2', status: 'ok', count: 7, batchPath: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例休闲群.md' }, { groupId: 'g3', status: 'failed', error: 'NapCat 登录态失效，这个群没有读到' }] },
];

/** 钻研：从「钻研」模式的群里挑出我知识库里还没有的话题（样例；真实由 AI 对照知识库判断） */
export interface StudyTopic { id: string; groupId: string; topic: string; gist: string; why: string; materialIds: string[]; known: '没有' | '有一点'; at: ISO }
export const studyTopics = (): StudyTopic[] => [
  { id: 'st1', groupId: 'g5', topic: 'MCP 与 A2A 的区别', gist: 'MCP 管「模型调工具」，A2A 管「agent 之间互相说话」', why: '知识库里搜不到 A2A；MCP 只有一篇安装笔记', materialIds: ['m19'], known: '有一点', at: at(0, '07:12') },
  { id: 'st2', groupId: 'w2', topic: 'DSPy：把 prompt 当程序优化', gist: '用数据自动调 prompt，而不是手搓', why: '知识库里没有 DSPy 相关笔记', materialIds: ['m20'], known: '没有', at: at(0, '07:12') },
  { id: 'st3', groupId: 'g5', topic: 'Obsidian Local REST API', gist: '让外部程序读写 vault 的插件，MCP server 常用它', why: '和你在做的「仪表盘接入 Obsidian」直接相关，但没有笔记', materialIds: ['m19'], known: '没有', at: at(0, '07:12') },
];
export const S = cardStore('qq', () => ({ qqGroups: qqGroups(), qqRuns: qqRuns(), study: studyTopics(), seen: [] as string[] }));
export const markSeen = (id: string) => S.write('study-seen', '钻研话题：看过了', () => { if (!S.d.seen.includes(id)) S.d.seen.push(id); }, { noConflict: true });

export function collectQQ(groupIds: string[], mode: '读取存档' | '开始收集') {
  return S.write('qq', `QQ · ${mode}（${groupIds.length} 个群）`, () => {
    const id = nid('qq-b');
    S.d.qqRuns = [{ id, at: nowIso(), mode, groups: groupIds.map((g) => g === 'g3' ? { groupId: g, status: 'failed' as const, error: 'NapCat 登录态失效，这个群没有读到' } : { groupId: g, status: 'ok' as const, count: mode === '读取存档' ? 0 : 3, batchPath: `系统/信息接入/QQ/QQ消息收件箱/批次/${id}/${S.d.qqGroups.find((x) => x.id === g)?.name}.md` }) }, ...S.d.qqRuns];
    groupIds.filter((g) => g !== 'g3').forEach((g) => { const gr = S.d.qqGroups.find((x) => x.id === g); if (gr && mode === '开始收集') gr.lastCollected = nowIso(); });
    return { targetId: id, path: `系统/信息接入/QQ/QQ消息收件箱/批次/${id}/` };
  }, { noConflict: true, runtime: mode === '开始收集' });
}
