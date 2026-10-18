/**
 * 「recent-docs」卡的私有数据（只有这张卡读写）。最近改过的文件（只读 Vault 修改时间）。
 * 前端阶段：样例 + localStorage['pkd.v5.card.recent-docs.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { addDays, at, diaryDir, today } from '../../data/time';
const INBOX = '系统/随手记/随手记收件箱.md';
const KL = '系统/知识景观/如何用好AI.md';

export const recentDocs = () => [
  { path: `${diaryDir(today())}/${today()}_用户原文.md`, at: at(0, '09:52') },
  { path: '示例工程/示例仪表盘/当前交接.md', at: at(0, '09:20') },
  { path: INBOX, at: at(0, '09:30') },
  { path: `示例数据/健康/日常/${addDays(today(), -1)}.md`, at: at(-1, '21:40') },
  { path: '示例数据/资料/示例课程/齿轮强度.md', at: at(-1, '20:05') },
  { path: '示例工程/示例阅读器/路线图.md', at: at(-1, '16:11') },
  { path: '示例数据/随想/主动 Agent 想法.md', at: at(-2, '23:30') },
  { path: KL, at: at(-2, '19:02') },
];
/** 快捷编辑卡可读写的样例文件（真实接入时由后端读写 Vault 文件） */

export const S = cardStore('recent-docs', () => ({ recentDocs: recentDocs() }));
