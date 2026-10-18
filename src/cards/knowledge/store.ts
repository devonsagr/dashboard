/**
 * 「knowledge」卡的私有数据（只有这张卡读写）。知识景观节点与问题（知识库文档是共享对象 db.library）。
 * 前端阶段：样例 + localStorage['pkd.v5.card.knowledge.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { addDays, at, diaryDir, nowIso, today } from '../../data/time';
import { H, nid } from '../../data/store';
import type { Hist, ISO, Ref } from '../../data/types';

const KL = '系统/知识景观/如何用好AI.md';
const PJ = '示例工程/仪表盘/docs/project';
const INBOX = '系统/随手记/随手记收件箱.md';
export type Known = '懂' | '半懂' | '不懂' | '想拓展';
export interface KNode {
  id: string; title: string; parent?: string; body: string;
  known?: Known; knownAt?: ISO; aiSuggest?: { known: Known; why: string };
  notes: Ref[]; relations: { to: string; kind: '依赖' | '相关' | '对比' }[];
  materialIds: string[]; actionIds: string[]; questionIds: string[];
}
export interface Question { id: string; text: string; ref: Ref; status: 'open' | 'answered' | 'dropped'; answer?: { text: string; at: ISO }; nodeId?: string; history: Hist[] }

export const knodes = (): KNode[] => [
  { id: 'k0', title: '如何用好 AI', body: '总主题：我怎么让 AI 真正帮上忙，而不是多一个要照顾的东西。', known: '半懂', knownAt: at(-10, '20:00'), notes: [{ source: 'C12', label: '景观总览', path: KL }], relations: [], materialIds: [], actionIds: [], questionIds: [] },
  { id: 'k1', title: '提示词', parent: 'k0', body: '写清楚目标、上下文、约束和输出形状。', known: '懂', knownAt: at(-20, '20:00'), notes: [{ source: 'C12', label: '提示词', path: '系统/知识景观/节点/提示词.md' }], relations: [{ to: 'k8', kind: '相关' }], materialIds: [], actionIds: [], questionIds: [] },
  { id: 'k2', title: 'Agent 与工具调用', parent: 'k0', body: '模型决定调用哪个工具、拿到结果再决定下一步。', known: '半懂', knownAt: at(-8, '20:00'), aiSuggest: { known: '懂', why: '你最近两周的随手记和项目里多次正确使用了这个概念' }, notes: [{ source: 'C12', label: 'Agent', path: '系统/知识景观/节点/Agent.md' }], relations: [{ to: 'k4', kind: '依赖' }, { to: 'k5', kind: '相关' }], materialIds: ['m16'], actionIds: [], questionIds: ['q2'] },
  { id: 'k3', title: '上下文与记忆', parent: 'k0', body: '模型一次能看到什么；跨会话怎么延续——交接文档就是我的做法。', known: '想拓展', knownAt: at(-6, '20:00'), notes: [{ source: 'C12', label: '上下文', path: '系统/知识景观/节点/上下文.md' }], relations: [{ to: 'k6', kind: '相关' }], materialIds: ['m12'], actionIds: [], questionIds: ['q1'] },
  { id: 'k4', title: 'MCP', parent: 'k2', body: '把工具和数据以统一协议暴露给模型。', known: '半懂', notes: [{ source: 'C12', label: 'MCP', path: '系统/知识景观/节点/MCP.md' }], relations: [], materialIds: [], actionIds: [], questionIds: ['q2'] },
  { id: 'k5', title: 'Computer Use', parent: 'k2', body: '', aiSuggest: { known: '不懂', why: '没有找到你写过的相关笔记' }, notes: [], relations: [], materialIds: [], actionIds: [], questionIds: [] },
  { id: 'k6', title: '个人知识 wiki', parent: 'k3', body: '人写结构、模型维护链接和摘要。', known: '想拓展', notes: [{ source: 'C12', label: '知识整理示例', path: '系统/知识景观/节点/个人知识wiki.md' }], relations: [], materialIds: ['m12', 'm04'], actionIds: ['a08'], questionIds: [] },
  { id: 'k7', title: '交接文档', parent: 'k3', body: '当前交接 = 下一个会话的起点。', known: '懂', notes: [{ source: 'V02', label: '当前交接', path: `${PJ}/当前交接.md` }], relations: [], materialIds: [], actionIds: [], questionIds: [] },
  { id: 'k8', title: '结构化输出', parent: 'k1', body: '让模型按 schema 输出。', known: '懂', notes: [], relations: [], materialIds: [], actionIds: [], questionIds: [] },
  { id: 'k9', title: '多 Agent 并行', parent: 'k2', body: '', notes: [], relations: [{ to: 'k2', kind: '依赖' }], materialIds: [], actionIds: [], questionIds: [] },
];
export const questions = (): Question[] => [
  { id: 'q1', text: '知识库里有，怎么判断我真的懂了？', ref: { source: 'C08', label: '随手记', path: INBOX, anchor: '^q-1012' }, status: 'open', nodeId: 'k3', history: [{ at: at(-5, '21:00'), by: '我', text: '提出' }] },
  { id: 'q2', text: 'MCP 和本地 REST API 有什么区别？', ref: { source: 'P01', label: '示例模板 B 参考', path: '材料/X/2026-10_demo_author_b_demo-template-b.md' }, status: 'open', nodeId: 'k4', history: [{ at: at(-2, '23:30'), by: '我', text: '提出' }] },
  { id: 'q3', text: '级数的比值判别什么时候失效？', ref: { source: 'C11', label: '日记', path: `${diaryDir(addDays(today(), -4))}/${addDays(today(), -4)}_用户原文.md` }, status: 'answered', answer: { text: '极限等于 1 时失效，要换根值或比较判别。', at: at(-3, '20:30') }, history: [{ at: at(-4, '20:00'), by: '我', text: '提出' }, { at: at(-3, '20:30'), by: '我', text: '写下回答' }] },
];

export const S = cardStore('knowledge', () => ({ knodes: knodes(), questions: questions() }));

export const setKnown = (id: string, known: Known, accept = false) => S.write('known', accept ? `接受 AI 建议：${known}` : `理解程度：${known}`, () => { const n = S.d.knodes.find((k) => k.id === id)!; n.known = known; n.knownAt = nowIso(); if (accept) n.aiSuggest = undefined; return { path: '系统/知识景观/如何用好AI.md' }; });
export const saveNodeBody = (id: string, body: string) => S.write('node', '保存节点正文', () => { const n = S.d.knodes.find((k) => k.id === id)!; n.body = body; return { path: n.notes[0]?.path ?? `系统/知识景观/节点/${n.title}.md` }; });
export const answerQuestion = (id: string, text: string) => S.write('answer', '保存回答', () => { const q = S.d.questions.find((x) => x.id === id)!; q.answer = { text, at: nowIso() }; q.status = 'answered'; q.history.push(H('我', '写下回答')); return { path: q.ref.path }; });
export const addQuestion = (text: string, nodeId?: string) => S.write('question', '新问题', () => { const id = nid('q'); S.d.questions = [{ id, text, nodeId, status: 'open', ref: { source: 'C12', label: '在仪表盘里提出', path: '系统/知识景观/问题.md' }, history: [H('我', '提出')] }, ...S.d.questions]; return { path: '系统/知识景观/问题.md', targetId: id }; });
