/**
 * 「sources」卡的私有数据（只有这张卡读写）。数据诊断（接入源列表是共享对象 db.sources，别的卡的「属性」面也读它）。
 * 前端阶段：样例 + localStorage['pkd.v5.card.sources.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { addDays, at, diaryDir, today } from '../../data/time';
import type { ISO } from '../../data/types';
const INBOX = '系统/随手记/随手记收件箱.md';

export interface Diagnostic {
  id: string; level: 'error' | 'warn' | 'info'; area: string; text: string; at: ISO;
  path?: string; object?: string; affects: string; resolved?: ISO;
}

export const diagnostics = (): Diagnostic[] => [
  { id: 'dg1', level: 'error', area: '行动', text: '解析失败：frontmatter 缺少 date 字段的引号', at: at(-5, '08:12'), path: '系统/行动/a-0812.md', object: 'a-0812', affects: '今日行动、复盘（那天的完成数不可信）' },
  { id: 'dg2', level: 'error', area: '日记', text: 'frontmatter 解析失败：第 3 行缩进不对', at: at(-2, '23:40'), path: `${diaryDir(addDays(today(), -2))}/${addDays(today(), -2)}_生活日记整理版.md`, affects: '今日日记（那天的整理版打不开）' },
  { id: 'dg3', level: 'warn', area: '项目', text: '示例工程端口 读取「示例阅读器」超时，显示的是 4 天前的快照', at: at(0, '09:40'), object: 'p04', affects: '项目控制室、单个项目' },
  { id: 'dg4', level: 'warn', area: 'QQ', text: '示例资料群：登录态失效，本批次没有读到', at: at(-2, '21:00'), path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/', affects: 'QQ 消息、收件流' },
  { id: 'dg5', level: 'info', area: '写入', text: '随手记追加成功 41 次，失败 0 次（近 7 天）', at: at(0, '09:30'), path: INBOX, affects: '—' },
  { id: 'dg6', level: 'warn', area: '信息收集', text: '小黑盒 4 条正文没加载（登录态过期）', at: at(-3, '21:10'), path: '系统/信息收集/原始导出/小黑盒/demo-run-03.json', affects: '信息收集、收件流', resolved: undefined },
];

export const S = cardStore('sources', () => ({ diagnostics: diagnostics() }));
