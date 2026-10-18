import { useSyncExternalStore } from 'react';
import { write, touch, nid } from './store';
import { setCutoff, workday } from './time';

/**
 * 全局设置（共享）：流程结果写到哪里。所有卡片读同一份，不各自记路径。
 *   1. 日切换时刻（默认 04:00）
 *   2. 流程去向：初处理结果、我自己处理、以后读、日报 各写到哪
 *   3. 知识库落点规则：平台 × 类型 × 主题 → 路径（「直接入库」按这里算）
 *   4. 主体文档路径：8 份主体文档在哪（默认不绑定真实文件）
 *   5. 消息分组：QQ / 微信 群的重要程度与模式（关注 / 钻研 / 只存档）
 * 这是浏览器内的流程设置，默认值为合成示例：存在 localStorage['pkd.v5.settings.v1']，不按天重置。
 * 接入后端时：改成读写示例知识库里的一份设置文件（建议 系统/仪表盘/设置.md，待确认）。
 */
export const ANY = '*';
export interface RouteRule { id: string; platform: string; type: string; topic: string; path: string }
export interface SubjectDoc { key: string; name: string; duty: string; path: string; asOf?: string }
export type Importance = '重要' | '一般' | '无所谓';
export type GroupMode = '关注' | '钻研' | '只存档';
export interface MsgGroup { id: string; platform: 'QQ' | '微信'; name: string; importance: Importance; mode: GroupMode; whitelisted: boolean }
export interface Settings {
  cutoff: string;
  flow: { pre: string; self: string; later: string; daily: string };
  routes: RouteRule[];
  subject: SubjectDoc[];
  groups: MsgGroup[];
}

export const PLATFORMS = ['B站', 'X', '小黑盒', 'YouTube', 'Reddit', '小红书', '抖音', '网页', 'QQ', '微信', '随手记', '日记', 'AI 对话', 'GitHub'];
export const TYPES = ['视频', '图文', '长文', '消息', '想法', '对话', '项目'];
export const TOPICS = ['AI 工具', '学习', '游戏', '生活', '编程', '音乐', '工具与工作流', '资料整理', '设计', '未归类'];
export const SUBJECT_DIR_HINT = '示例数据/主体上下文/';

const init = (): Settings => ({
  cutoff: '04:00',
  flow: {
    pre: '系统/收集处理/初处理/{日期}/{标题}.md',
    self: '系统/收集处理/我自己处理/{标题}.md',
    later: '系统/收集处理/以后读.md',
    daily: '系统/日报/{日期}.md',
  },
  routes: [
    { id: 'r1', platform: ANY, type: ANY, topic: ANY, path: '知识库/收集整理/{平台}/{主题}/{标题}.md' },
    { id: 'r2', platform: 'B站', type: '视频', topic: ANY, path: '知识库/视频笔记/{主题}/{标题}.md' },
    { id: 'r3', platform: ANY, type: ANY, topic: 'AI 工具', path: '知识库/AI/{平台}/{标题}.md' },
    { id: 'r4', platform: 'QQ', type: '消息', topic: ANY, path: '知识库/群消息/{主题}/{日期}-{标题}.md' },
    { id: 'r5', platform: '微信', type: '消息', topic: ANY, path: '知识库/群消息/{主题}/{日期}-{标题}.md' },
    { id: 'r6', platform: '小红书', type: '图文', topic: '生活', path: '示例数据/生活材料/{标题}.md' },
  ],
  subject: [
    { key: 'entry', name: '主体入口', duty: 'AI 先读这份：其余文档在哪、按什么顺序读', path: '' },
    { key: 'identity', name: '身份与边界', duty: '我是谁、AI 能做什么不能做什么', path: '' },
    { key: 'state', name: '当前状态', duty: '最近在忙什么、精力与心情（短期，常变）', path: '' },
    { key: 'self', name: '用户自我画像', duty: '我自己写的长期画像（只有我确认才改）', path: '' },
    { key: 'observe', name: 'AI 观察模型', duty: 'AI 对我的观察与推测（标明是推测）', path: '' },
    { key: 'lessons', name: '经验索引', duty: '做过的事里沉淀的经验、踩过的坑', path: '' },
    { key: 'open', name: '未解决问题', duty: '还没想清楚、等待答案的问题', path: '' },
    { key: 'projects', name: '当前项目总览', duty: '在做的项目和各自下一步', path: '' },
  ],
  groups: [
    { id: 'g1', platform: 'QQ', name: '示例通知群', importance: '重要', mode: '关注', whitelisted: true },
    { id: 'w1', platform: '微信', name: '示例活动群', importance: '重要', mode: '关注', whitelisted: true },
    { id: 'g5', platform: 'QQ', name: '示例技术群', importance: '一般', mode: '钻研', whitelisted: true },
    { id: 'w2', platform: '微信', name: '示例研究群', importance: '一般', mode: '钻研', whitelisted: true },
    { id: 'g3', platform: 'QQ', name: '示例资料群', importance: '一般', mode: '只存档', whitelisted: true },
    { id: 'g2', platform: 'QQ', name: '示例休闲群', importance: '无所谓', mode: '只存档', whitelisted: true },
    { id: 'g4', platform: 'QQ', name: '示例未授权群', importance: '一般', mode: '只存档', whitelisted: false },
  ],
});

const KEY = 'pkd.v5.settings.v1';
function load(): Settings {
  try { const s = localStorage.getItem(KEY); if (s) return { ...init(), ...JSON.parse(s) }; } catch { /* ignore */ }
  return init();
}
let st: Settings = load();
setCutoff(st.cutoff);
let v = 0;
const ls = new Set<() => void>();
const sub = (f: () => void) => { ls.add(f); return () => { ls.delete(f); }; };
const emit = () => { v++; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* quota */ } setCutoff(st.cutoff); ls.forEach((f) => f()); touch(); };

export const settings = () => st;
export function useSettings<R>(sel: (s: Settings) => R): R { useSyncExternalStore(sub, () => v); return sel(st); }
/** 保存设置（走统一写入语义：有回执；失败时不改） */
export const saveSettings = (label: string, f: (s: Settings) => void) =>
  write('settings', label, () => { const n = structuredClone(st); f(n); st = n; emit(); return { path: '系统/仪表盘/设置.md（建议，待确认）' }; }, { noConflict: true });
export function resetSettings() { st = init(); emit(); }
export const newRuleId = () => nid('r');

/* ───────── 路径解析 ───────── */
export interface Facet { platform: string; type: string; topic: string; title: string; date?: string }
const clean = (s: string) => s.replace(/[\\/:*?"<>|#^[\]]/g, '').trim().slice(0, 40) || '未命名';
export function fill(tpl: string, f: Partial<Facet>) {
  return tpl.replace(/\{平台\}/g, f.platform || '未知平台').replace(/\{类型\}/g, f.type || '未知类型').replace(/\{主题\}/g, f.topic || '未归类')
    .replace(/\{标题\}/g, clean(f.title ?? '')).replace(/\{日期\}/g, f.date ?? workday());
}
/** 选规则：越具体越优先（平台、类型、主题每匹配一项 +1；* 不加分）；同分取靠前的 */
export function matchRule(f: Facet, rules = st.routes) {
  let best: RouteRule | undefined, score = -1;
  for (const r of rules) {
    const ok = [[r.platform, f.platform], [r.type, f.type], [r.topic, f.topic]].every(([a, b]) => a === ANY || a === b);
    if (!ok) continue;
    const s = [r.platform, r.type, r.topic].filter((x) => x !== ANY).length;
    if (s > score) { best = r; score = s; }
  }
  return best;
}
/** 直接入库的落点：返回路径 + 用了哪条规则（没有任何规则命中时 rule 为空，路径落到收集处理/未分类） */
export function resolveRoute(f: Facet, rules = st.routes) {
  const rule = matchRule(f, rules);
  return { rule, path: rule ? fill(rule.path, f) : fill('系统/收集处理/未分类/{标题}.md', f) };
}
export const flowPath = (k: keyof Settings['flow'], f: Partial<Facet> = {}) => fill(st.flow[k], f);
export const groupOf = (id?: string) => st.groups.find((g) => g.id === id);
