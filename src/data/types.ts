/**
 * 业务对象模型（前端视角的数据契约）。
 * 详细字段解释见 docs/架构/02-数据契约.md。原则：
 *  - 一件材料可以同时有多项事实（已读、AI 结果、已消化、推送、行动、入库、关联项目…），主状态由事实推导，不是单值替换；
 *  - 每个对象都带精确来源 Ref（路径 / URL / 锚点 / 时间）；
 *  - 写入有回执 Receipt，失败、不确定、冲突都要能看见；
 *  - 未知 ≠ 0：缺数据的字段留空（undefined），界面写「未知 / 未接入」。
 */
export type ISO = string;            // 带时区的时间，如 2026-10-17T09:30:00+08:00
export type Day = string;            // YYYY-MM-DD（Asia/Hong_Kong）
export type By = '我' | 'AI' | '系统' | '工程' | '项目' | '外部';
export interface Hist { at: ISO; by: By; text: string }

/** 精确来源：能点回原处 */
export interface Ref { source: string; label: string; path?: string; url?: string; anchor?: string; at?: ISO }

/* ───────── 写入语义 ───────── */
export type WriteStatus = 'idle' | 'pending' | 'ok' | 'failed' | 'unknown' | 'conflict';
export interface Receipt {
  id: string; op: string; label: string; at: ISO;
  status: Exclude<WriteStatus, 'idle' | 'pending'>;
  path?: string; targetId?: string; detail?: string; error?: string;
}

/* ───────── 接入源 ───────── */
export type SourceHealth = 'ok' | 'stale' | 'offline' | 'partial' | 'missing' | 'unverified' | 'planned' | 'unconfigured';
export type SourceMode = '自动' | '半自动' | '手动' | '计划' | '未知';
export interface Source {
  id: string; name: string; group: '仪表盘' | '示例知识库' | '健康' | '对话' | '平台';
  mode: SourceMode; health: SourceHealth; provides: string; via: string;
  location?: string; count?: number; lastReadAt?: ISO; asOf?: ISO; limits?: string; feedsFlow: boolean;
}
/* ───────── 材料（收件） ───────── */
export type MaterialKind = 'capture' | 'collect' | 'qq' | 'diary' | 'clip' | 'project' | 'health' | 'handwrite';
export type CaptureType = '想法' | '问题' | '待办线索' | '摘录' | '原话';
export type AiState = 'none' | 'sent' | 'result' | 'failed' | 'unknown';
export interface MediaRef { kind: '图片' | '视频' | '链接' | '字幕' | '附件'; label: string; available: boolean; reason?: string; url?: string; path?: string }
export interface Output { kind: 'approval' | 'action' | 'knowledge' | 'project'; id: string; label: string; at: ISO; path?: string }
export interface Material {
  id: string; kind: MaterialKind; sourceId: string; channel: string; platform?: string; group?: string;
  title: string; text: string;                    // text = 原文全文（只读，不 trim、不改写）
  author?: string; captureType?: CaptureType;
  contentAt?: ISO;                                // 内容本身的时间（发帖 / 消息 / 写下）
  receivedAt: ISO;                                // 进入系统的时间
  ref: Ref;
  read?: ISO;                                     // 用户明确标记已读的时间（打开不算）
  topic?: string;                                 // 主题（落点规则用；没有就是「未归类」）
  /** AI 初处理：按「备注」做。intent = 这一轮用的备注快照；points = 按备注整理出的要点（B 路线里由我逐条划掉） */
  ai: { state: AiState; at?: ISO; batchId?: string; intent?: string; summary?: string; points?: string[]; suggestion?: string; suggest?: '入库' | '自己处理' | '以后读'; confidence?: '高' | '中' | '低'; error?: string };
  /** 我的选择（初处理之后）：A 直接入库 / B 我自己处理。以后读 = later 字段（悬置，随时可放） */
  route?: { kind: '入库' | '自己处理'; at: ISO; path: string; rule?: string; crossed?: number[]; done?: ISO };
  digested?: { at: ISO; note: string };          // 只有用户明确「确认已消化」才有
  note?: { text: string; at: ISO };               // 备注：收的时候写下意图（AI 按它处理）；之后也可以补充理解
  later?: ISO; archived?: ISO;                    // later = 放进「以后读」的时间（悬置，不设到期日）
  outputs: Output[];
  projectLinks: { projectId: string; as: '参考' | '已确认需求'; at: ISO }[];
  media?: MediaRef[]; gaps?: string[];
  context?: { who: string; text: string; at: ISO; self?: boolean }[];   // QQ 上下文（self = 本条）
  batchIds: string[]; dupOf?: string;
  /** 这条材料的「主场」卡片：比如平台收藏由「收藏」卡管理，收件流里点开会跳过去 */
  home?: { card: string; id: string };
  history: Hist[];
}
export type MaterialMain = '新收到' | '已读' | '已写备注' | 'AI 处理中' | '待我选' | '自己处理中' | '已消化' | '已推送' | '已落地' | '以后读' | '已归档';

/* ───────── 待采纳（审批） ───────── */
export interface Approval {
  id: string; title: string; body?: string; group: string; sourceId: string;
  by: 'AI' | '我' | '工程'; createdAt: ISO; refs: Ref[]; materialIds: string[];
  state: 'pending' | 'adopted' | 'rejected' | 'later'; decidedAt?: ISO; reason?: string;
  actionId?: string; projectId?: string; decisionId?: string; suggestDate?: Day;
}

/* ───────── 行动 ───────── */
export type Priority = '高' | '中' | '低';
export interface Action {
  id: string; title: string; body?: string; date?: Day; time?: string; priority: Priority; order: number;
  createdAt: ISO; path: string;
  done?: ISO; archived?: ISO; deleted?: ISO;
  projectId?: string; workItemId?: string; decisionId?: string; approvalId?: string;
  kind?: '验收行动';
  refs: Ref[]; materialIds: string[]; history: Hist[];
}
export type ActionSection = 'overdue' | 'today' | 'undated' | 'later' | 'done' | 'archived' | 'deleted';

/* ───────── 待我决策 ───────── */
export type DecisionKind = '验收' | '选择' | '操作' | '补充' | '个人';
export type ResponseKind = '通过' | '需修改' | '选方案' | '已操作' | '补充' | '稍后' | '不适用';
export interface DecisionResponse { kind: ResponseKind; optionId?: string; text: string; at: ISO; verify?: '用户已反馈' | '待核实' }
export interface Decision {
  id: string; kind: DecisionKind; title: string; projectId?: string; workItemId?: string;
  raisedBy: string; path: string; asOf: ISO;
  whyNow: string; blocks: string; done: string[]; uncertain: string[];
  entry?: { label: string; url?: string; path?: string }; criteria: string[];
  options?: { id: string; label: string; hint?: string }[];
  recommend?: { optionId?: string; text: string; by: 'AI' | '项目' };
  status: 'open' | 'later' | 'resolved' | 'dismissed';
  freshness: 'current' | 'stale' | 'superseded' | 'revoked'; supersededBy?: string; freshNote?: string;
  response?: DecisionResponse; responses: DecisionResponse[];
  after?: { waitingOn: 'AI' | '我' | '外部' | '项目'; note: string };
  laterUntil?: Day;
  actionIds: string[]; refs: Ref[]; history: Hist[];
}

/* ───────── 项目 ───────── */
export type Ownership = '产品项目' | '卡片模块' | '独立工具';
export type ProjectStatus = '未开始' | '准备中' | '进行中' | '等待用户' | '等待外部' | '已完成' | '部分完成' | '受阻' | '已归档';
export type CheckKind = '本地检查' | '浏览器效果' | '真实设备' | '用户认可';
export interface WorkItem {
  id: string; title: string; status: '进行中' | '待验收' | '已完成' | '暂停' | '未开始';
  trigger: { text: string; ref?: Ref }; change: string; criteria: string[]; version?: string;
  checks: { kind: CheckKind; state: '通过' | '未通过' | '未做' | '等待'; note?: string; at?: ISO }[];
  gaps: string[]; nextOwner: 'AI' | '我' | '外部'; decisionIds: string[]; actionIds: string[]; updatedAt: ISO;
}
export interface Project {
  id: string; name: string; ownership: Ownership; parentId?: string; status: ProjectStatus; stage: string;
  purpose: string; scenario: string; scope: { in: string[]; out: string[] }; doneDef: string[];
  requirements: { id: string; text: string; state: '有效' | '已替代' | '待确认'; ref: Ref; replacedBy?: string }[];
  modules: { name: string; duty: string; io: string; deps: string[]; status: ProjectStatus }[];
  docs: { label: string; path: string; role: '权威' | '镜像' | '历史'; at?: ISO }[];
  follow: { current?: string; next: string; owner: 'AI' | '我' | '外部'; blocker?: string; asOf: ISO };
  eng: { registered: boolean; reachable?: boolean; repo?: string; branch?: string; worktree?: string; head?: string; dirty?: number; commits?: { hash: string; msg: string; at: ISO }[]; asOf?: ISO; note?: string };
  handoff: { lastReliable: { text: string; at: ISO; ref?: Ref }; unfinished: string[]; failed: string[]; resumeWith: Ref[] };
  workItems: WorkItem[];
  refreshes: { kind: '普通读取' | 'AI 语义刷新' | '投递'; at: ISO; status: 'ok' | 'failed' | 'unknown' | 'pending'; note: string }[];
  path: string;
  /** asOf = 项目资料本身截至什么时候（文件内容的时间）；lastReadAt = 我们最后一次读它。重新读取只改 lastReadAt */
  asOf: ISO; lastReadAt?: ISO;
}

/* ───────── 日记 ───────── */
export type DiaryFileKind = '用户原文' | '生活日记整理版' | 'AI项目日志';
export interface DiaryFile { kind: DiaryFileKind; path: string; state: 'exists' | 'missing' | 'empty' | 'failed'; text?: string; mtime?: ISO; error?: string }
export interface DiaryDay { date: Day; files: DiaryFile[] }

/* ───────── 知识 ───────── */
export interface LibraryDoc { id: string; title: string; path: string; source: string; scope: string; at: ISO; text: string; materialId?: string; nodeId?: string }
