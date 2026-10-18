import type { Hist, ISO } from '../../data/types';

/**
 * 收藏的前端模型（展示语义，不是后端存储结构）。
 * 一条原始来源（FavItem）可以有多份分流记录（Rec）：入库资料（A 直接入库）、自己处理材料（B 我自己处理）各自独立。
 * 流程和收件一致（ui/flow.tsx）：先写备注 → 交给 AI 按备注初处理（pre）→ 我选 A / B；以后读随时。
 * 宿主只看到「投影」：data/ 里的 Material（home = favorites），点开回到这里。
 */
export type Platform = 'bili' | 'yt' | 'douyin' | 'x' | 'xhh' | 'xhs' | 'reddit' | 'web';
export type Nature = '收藏' | '非收藏链接' | '人工补充';
export type RawStatus = '待处理' | '以后读' | '已分流';
export type BodyState = '完整' | '部分' | '未取得' | '仅元信息';
export type TrState = 'ok' | 'failed' | 'pending' | 'none';

export interface Img { id: string; label: string; w: number; h: number; hue: number; missing?: string; retryOk?: boolean; alt?: string }
export type Block =
  | { t: 'p'; text: string; tr?: string; trState?: TrState; trRetry?: string }
  | { t: 'img'; img: Img }
  | { t: 'gallery'; style: 'top' | 'grid' | 'xhs'; imgs: Img[] };
export interface Reply { id: string; who: string; text: string; tr?: string; trState?: TrState; imgs?: Img[]; quote?: string }
export interface Cue { s: number; e: number; text: string; tr?: string }
export type TrackKind = '平台字幕' | '平台自动字幕' | '机器转写' | '人工提供' | '来源未声明';
export type TrackState = '完整' | '部分' | '处理中' | '暂无字幕' | '音频受限' | '无语音' | '失败';
export interface Track { id: string; kind: TrackKind; lang: string; state: TrackState; note?: string; cues: Cue[]; model?: string; at?: ISO; retryable?: boolean; declared?: string }
export interface Video { mode: 'locatable' | 'link-only' | 'restricted'; duration?: number; note?: string }

export interface FavItem {
  id: string; platform: Platform; nature: Nature; title: string; author?: string; url: string;
  publishedAt?: ISO; importedAt: ISO; folders?: string[]; topic: string;
  body: { state: BodyState; intro?: string; blocks: Block[] };
  replies?: { scope: string; items: Reply[] };
  video?: Video; tracks?: Track[];
  /** 本机摘要：从已取得文字里选的原句（不是 AI） */
  summary?: string[]; summaryPartial?: boolean;
  /** 主动 AI 优化的阅读概括 */
  ai?: { state: 'none' | 'running' | 'ok' | 'failed' | 'unconfigured'; text?: string; at?: ISO; basisVersion?: number; error?: string };
  aiSample?: string;
  /** 按备注的 AI 初处理（统一流程第 ② 步）：备注 → AI 过一遍 → 我选 A 直接入库 / B 我自己处理 */
  pre?: { state: 'running' | 'ok' | 'failed' | 'unconfigured'; intent: string; at: ISO; text?: string; points?: string[]; suggest?: RecKind; error?: string };
  status: RawStatus; read?: ISO; trashed?: ISO;
  version: number; versions: { v: number; at: ISO; note: string }[];
  manual?: { declared: string; at: ISO; kind: '正文' | '字幕' };
  shared?: boolean;          // 这条来自宿主共享样例（收件里也能看到）
  demoFail?: boolean;        // 批量操作时演示失败
  history: Hist[];
}

export type RecKind = 'ref' | 'digest';
export const REC_NAME: Record<RecKind, string> = { ref: '入库资料', digest: '自己处理材料' };
export type RecStatus = '待加工' | '以后读' | 'AI 待审' | '已归位';
export interface Round { n: number; goal: string; refs: string[]; basis: string; at: ISO; state: 'running' | 'ok' | 'failed' | 'unconfigured'; result?: string; seen?: ISO; accepted?: ISO; comment?: string; error?: string }
export interface Rec {
  id: string; itemId: string; kind: RecKind; note: string; at: ISO; basisVersion: number; status: RecStatus;
  location: string; myNotes: string; rounds: Round[];
  placed?: { topic: string; path: string; from: string; at: ISO };
  draft?: { text: string; confirmedAt: ISO; path: string };
  outputs: { kind: 'action' | 'approval' | 'project' | 'attach'; id: string; label: string; at: ISO }[];
  trashed?: ISO; sharedAttachment?: boolean;
  history: Hist[];
}

export type TaskKind = '收藏列表' | '正文' | '图片' | '字幕' | '翻译' | '阅读概要' | '按批注整理' | '按备注初处理';
export type TaskState = 'waiting' | 'running' | 'blocked' | 'failed' | 'done' | 'cancelled' | 'unknown';
export interface Task {
  id: string; kind: TaskKind; platform: Platform; itemId?: string; recId?: string; label: string;
  stage: string; done?: number; total?: number; state: TaskState; reason?: string;
  startedAt: ISO; updatedAt: ISO; cancellable?: boolean; ticks?: number; effect?: string; arg?: string;
  retriedBy?: string; retryOf?: string;
}

export type Account = '未登录' | '已保存未核验' | '已登录' | '已过期' | '需本人验证' | '无法连接' | '未接入';
export interface ImportRow { title: string; result: '新增' | '重复' | '跳过' | '待补' | '失败'; why: string; itemId?: string; recollect?: boolean }
export interface ImportRun { id: string; platform: Platform; at: ISO; scope: string[]; mode: '最新核对' | '续读'; fill: boolean; rows: ImportRow[]; reachedEnd: boolean; note: string }

export interface Draft { text: string; loc?: string; at: ISO }

export interface FavData {
  items: FavItem[]; recs: Rec[]; tasks: Task[];
  accounts: Record<Platform, Account>;
  folders: { id: string; name: string; count: number }[];
  lastRun: Record<string, { at: ISO; scope: string[]; stopAt?: string } | undefined>;
  imports: ImportRun[];
  purged: { url: string; title: string; at: ISO }[];
  drafts: Record<string, Draft>;
  demo: { feed: 'live' | 'unknown' | 'offline'; ai: 'ok' | 'failed' | 'unconfigured'; snapshotAt?: ISO };
  locations: { raw: string; ref: string; digest: string; topic: string; attach: string; trash: string; knowledge: string };
  bilingual: boolean;
}
