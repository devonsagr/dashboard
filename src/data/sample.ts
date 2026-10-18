/**
 * 样例数据集（全部为演示用，不代表真实最新状态）。
 * - 日期全部相对「真实今天」（Asia/Hong_Kong）生成；跨天打开会自动重新生成。
 * - 内容全部重新编写为合成场景；不包含真实收藏、原话、画像或工程快照。
 * - 每一组样例都对应 docs/产品/04-场景与检验.md 里的一个检验场景（S01–S26）。
 * 这里只有「共享对象」的样例；每张卡的私有样例在它自己的文件夹（src/cards/<id>/store.ts 或 fixtures.ts）。
 * 接入时：用真实 DataPort 替换 src/data/store.ts 的实现，不改页面。
 */
import type {
  Source, Material, Approval, Action, Decision, Project, DiaryDay, LibraryDoc, Receipt, Ref,
} from './types';
import { at, addDays, today, diaryDir } from './time';

export const sources = (): Source[] => [
  // 1. 仪表盘卡片与本地运行时
  { id: 'C01', name: '今日安排 · 行动', group: '仪表盘', mode: '手动', health: 'ok', provides: '事项标题、正文、时间、优先级、完成与归档历史、来源', via: '卡片新增/编辑/勾选；日记整理手动触发；文件监听', location: '系统/行动/', count: 26, lastReadAt: at(0, '08:12'), feedsFlow: false },
  { id: 'C02', name: '待我决策', group: '仪表盘', mode: '半自动', health: 'ok', provides: '待验收、选项、待人工操作、依据与上下文', via: '项目交接投影 + 手动「刷新项目监控」', location: '系统/需要我/', count: 10, lastReadAt: at(0, '08:12'), limits: '含示例与历史，不保证每条仍待处理', feedsFlow: true },
  { id: 'C03', name: '项目雷达', group: '仪表盘', mode: '半自动', health: 'stale', provides: '阶段、模块、风险、下一步、需介入事项', via: '读取路线图/交接/Git，人工触发语义刷新', location: '系统/项目/', count: 5, lastReadAt: at(-3, '22:40'), feedsFlow: true },
  { id: 'C04', name: '工程总览', group: '仪表盘', mode: '自动', health: 'unverified', provides: '本地工程、Git 状态、当前交接、待验收事项', via: '示例工程状态端口（未接入）', location: '未配置（示例）', limits: '不把 Git 提交数当作完成数', feedsFlow: true },
  { id: 'C05', name: '示例专注工具', group: '仪表盘', mode: '自动', health: 'offline', provides: '专注状态、开始/暂停、走神纠错、历史场次、日累计', via: '本机 loopback API + SQLite；定时生成状态投影', location: '系统/专注计时/专注计时实时状态.md', lastReadAt: at(-1, '23:02'), feedsFlow: false },
  { id: 'C06', name: '本机使用时长', group: '仪表盘', mode: '自动', health: 'unverified', provides: '程序/窗口时段、网站域名分组时长', via: 'Windows 本地程序 + Chrome 扩展心跳', limits: '只有域名与时长，不是完整浏览记录', feedsFlow: false },
  { id: 'C07', name: '节点监控', group: '仪表盘', mode: '自动', health: 'unverified', provides: '示例节点延迟、状态、1/3/7 天曲线、路由事件', via: '本地监控脚本 loopback API / SQLite', feedsFlow: false },
  { id: 'C08', name: '随手记', group: '仪表盘', mode: '手动', health: 'ok', provides: '临时文字、原话、类型、时间', via: '仪表盘内直接写入', location: '系统/随手记/随手记收件箱.md', count: 41, lastReadAt: at(0, '09:30'), limits: '不自动变成任务', feedsFlow: true },
  { id: 'C11', name: '日记接入', group: '仪表盘', mode: '手动', health: 'ok', provides: '示例材料 / 生活整理版 / AI 项目日志 三份文件', via: '语音或文字输入后整理落盘', location: '示例数据/日记/YYYY-MM/…/YYYY-MM-DD/', lastReadAt: at(0, '07:50'), feedsFlow: true },
  { id: 'C12', name: '知识景观', group: '仪表盘', mode: '手动', health: 'ok', provides: '主题节点、关系、挂载笔记', via: 'Markdown 明确编辑', location: '系统/知识景观/如何用好AI.md', feedsFlow: false },
  { id: 'C13', name: '信息收集', group: '仪表盘', mode: '半自动', health: 'partial', provides: 'X、B站、小黑盒、YouTube、Reddit 本人收藏', via: '登录页手动选平台确认，采集器导出 JSON 再导入', location: '系统/信息收集/', count: 3, lastReadAt: at(-6, '20:15'), limits: '只有指定收藏列表；YouTube/Reddit 是受限小样', feedsFlow: true },
  { id: 'C14', name: '收集下游处理', group: '仪表盘', mode: '半自动', health: 'ok', provides: '批次、AI 处理状态、已读、采纳回执', via: '人工触发批次整理/推送/采纳', location: '系统/收集处理/', feedsFlow: true },
  { id: 'C15', name: 'QQ 群消息', group: '仪表盘', mode: '半自动', health: 'stale', provides: '白名单群历史消息、昵称、文本、图片批次', via: '点击「收集所选群」；本机只读 NapCat 按需启停', location: '系统/信息接入/QQ/', lastReadAt: at(-48, '21:00'), limits: '不自动监听、不采私聊、不发消息', feedsFlow: true },
  { id: 'C16', name: 'B站倍速', group: '仪表盘', mode: '手动', health: 'unverified', provides: '当前 B站页面、倍速预设与映射', via: '浏览器扩展 + 本地桥', limits: '不是观看历史', feedsFlow: false },
  { id: 'C09', name: '本周复盘', group: '仪表盘', mode: '自动', health: 'ok', provides: '七日行动完成情况、日记节奏', via: '聚合既有行动和日记（衍生视图）', limits: '不是新的原始输入', feedsFlow: false },
  { id: 'C10', name: '数据诊断', group: '仪表盘', mode: '自动', health: 'partial', provides: '解析与写入出了什么问题、涉及哪个文件、影响哪张卡', via: '读取仪表盘运行与 Markdown 解析结果', limits: '技术指标，不等于生活数据', lastReadAt: at(0, '08:12'), feedsFlow: false },
  { id: 'C17', name: '卡片直接操作', group: '仪表盘', mode: '手动', health: 'ok', provides: '新建、编辑、完成、归档、布局', via: '在仪表盘里点击', limits: '布局是界面偏好，不写进业务 Markdown', feedsFlow: false },
  // 2. 示例知识库
  { id: 'V01', name: '日记原文与整理', group: '示例知识库', mode: '手动', health: 'ok', provides: '每日语音原文、整理版、项目日志', via: '口述/文字 + 整理；FolderSync / Drive 同步', location: '示例数据/日记/', feedsFlow: true },
  { id: 'V02', name: '仪表盘项目文档', group: '示例知识库', mode: '手动', health: 'ok', provides: '项目索引、路线图、当前交接、架构与卡片规格', via: '本地项目的精选 Markdown 镜像', location: '示例工程/示例仪表盘/', feedsFlow: false },
  { id: 'V16', name: '系统结构化目录', group: '示例知识库', mode: '手动', health: 'ok', provides: '行动、项目、待确认请求、随手记四套结构化内容', via: '仪表盘读写', location: '系统/', feedsFlow: false },
  { id: 'V04', name: '个人 AI 主体', group: '示例知识库', mode: '手动', health: 'ok', provides: '身份边界、当前状态、未解决问题、自述、AI 观察', via: '结构化 Markdown', location: '示例数据/主体上下文/', count: 8, feedsFlow: false },
  { id: 'V05', name: '待整理杂想', group: '示例知识库', mode: '手动', health: 'ok', provides: '未确定的想法、原话、待研究问题', via: '手写/语音整理', location: '示例数据/随想/', feedsFlow: true },
  { id: 'V09', name: '资料与教程', group: '示例知识库', mode: '手动', health: 'ok', provides: '学习资料、知识材料', via: '手工积累', location: '示例数据/资料/', feedsFlow: false },
  { id: 'V11', name: '网页剪藏', group: '示例知识库', mode: '手动', health: 'ok', provides: '网页剪藏、社交帖子文字', via: 'Web Clipper / 人工剪藏', location: '示例数据/剪藏/ · Clippings/', feedsFlow: true },
  { id: 'V07', name: '视频文案与创作', group: '示例知识库', mode: '手动', health: 'ok', provides: '视频脚本、说唱、游戏创作草稿', via: '手工编辑', location: '示例数据/创作/', feedsFlow: false },
  { id: 'V10', name: '专辑学习', group: '示例知识库', mode: '手动', health: 'ok', provides: '音乐/专辑研究笔记', via: '手工编辑', location: '示例数据/音乐/', feedsFlow: false },
  // 3. 健康
  { id: 'H02', name: 'Health Sync · 步数', group: '健康', mode: '自动', health: 'partial', provides: '按日步数', via: '示例健康应用 → Health Sync → Drive CSV', count: 6, limits: '不保证每次同步成功', feedsFlow: false },
  { id: 'H03', name: 'Health Sync · 心率', group: '健康', mode: '自动', health: 'partial', provides: '心率序列', via: 'Health Sync CSV', count: 6, feedsFlow: false },
  { id: 'H04', name: 'Health Sync · 睡眠', group: '健康', mode: '自动', health: 'partial', provides: '睡眠记录', via: 'Health Sync CSV', count: 3, feedsFlow: false },
  { id: 'H05', name: 'Health Sync · 血氧', group: '健康', mode: '自动', health: 'partial', provides: '血氧测量', via: 'Health Sync CSV', count: 4, feedsFlow: false },
  { id: 'H07', name: '日常健康记录', group: '健康', mode: '手动', health: 'ok', provides: '饮食、体重、运动（人可读 MD）', via: '拍照/口述后整理；热量为 AI 估计', location: '示例数据/健康/日常/', feedsFlow: true },
  { id: 'H10', name: '外卖订单', group: '健康', mode: '计划', health: 'planned', provides: '订单、店铺、价格、时间', via: '本地标准化处理器（未接平台）', limits: '订单 ≠ 已经吃了', feedsFlow: true },
  { id: 'H01', name: '示例健康设备', group: '健康', mode: '未知', health: 'unverified', provides: '设备原始记录（步数、心率、睡眠、体重）', via: '经 Health Sync 间接导出', limits: '没有华为原生 API', feedsFlow: false },
  // 4. 对话与语音
  { id: 'A02', name: '手写截图与语音原话', group: '对话', mode: '手动', health: 'ok', provides: '原话 DEMO-001–DEMO-008、整理稿、图像旁证', via: '对话归档到杂想目录', feedsFlow: true },
  { id: 'A04', name: '对话中发送的图片', group: '对话', mode: '手动', health: 'unverified', provides: '餐食、试卷、题目、截图', via: '人工发送', feedsFlow: true },
  { id: 'A08', name: '对话里提过的计划', group: '对话', mode: '计划', health: 'planned', provides: '主动 Agent、全平台日志日报、Goodnotes 框选', via: '尚未接入', feedsFlow: true },
  // 5. 平台
  { id: 'P01', name: 'X / Twitter', group: '平台', mode: '半自动', health: 'partial', provides: '书签导出、剪藏帖子', via: '采集器 / Clippings', count: 3, limits: '不是浏览记录或账号活动流', feedsFlow: true },
  { id: 'P02', name: 'B 站', group: '平台', mode: '半自动', health: 'partial', provides: '指定收藏夹导出、字幕（按条件）', via: '采集器', feedsFlow: true },
  { id: 'P03', name: '小黑盒', group: '平台', mode: '半自动', health: 'unverified', provides: '本人收藏列表样本', via: '采集器', feedsFlow: true },
  { id: 'P04', name: 'YouTube / Reddit', group: '平台', mode: '半自动', health: 'partial', provides: '稍后观看 / saved 小样', via: '受限 DOM 小样', limits: '1–3 条小样', feedsFlow: true },
  { id: 'P06', name: '微信', group: '平台', mode: '半自动', health: 'partial', provides: '白名单群聊天导出（样例）', via: '本机聊天记录导出工具（待定）→ 按群落盘', location: '系统/信息接入/微信/（建议，待确认）', lastReadAt: at(0, '07:10'), limits: '采集方式还没定；现在是样例', feedsFlow: true },
  { id: 'C18', name: 'AI 对话记录', group: '对话', mode: '手动', health: 'partial', provides: 'Codex / Claude 对话里的结论与待办', via: '对话导出 → 归档', location: '系统/AI对话/（建议，待确认）', lastReadAt: at(0, '07:00'), limits: '只有手动导出的几段', feedsFlow: true },
  { id: 'C19', name: '外部发现', group: '平台', mode: '半自动', health: 'ok', provides: 'GitHub 热门、周报、关注作者的新内容', via: '每天 06:00 抓一次（样例）', lastReadAt: at(0, '06:00'), limits: '只是推荐来源，不是我收藏的东西', feedsFlow: true },
  { id: 'C20', name: '浏览内容', group: '平台', mode: '计划', health: 'planned', provides: '看过的网页正文（不只是域名时长）', via: '浏览器扩展（计划）', limits: '未接入', feedsFlow: true },
  { id: 'C21', name: '消费记录', group: '健康', mode: '计划', health: 'unconfigured', provides: '外卖 / 饮食消费', via: '—', limits: '未接入：饮食指导暂时做不了', feedsFlow: false },
  { id: 'P09', name: 'Goodnotes / iPad', group: '平台', mode: '手动', health: 'planned', provides: '试卷、手写笔记截图', via: '人工截图', feedsFlow: true },
  { id: 'P10', name: '日历 / 邮件', group: '平台', mode: '计划', health: 'unconfigured', provides: '日程、邮件', via: '候选 API', feedsFlow: true },
  { id: 'P07', name: 'Chrome 浏览器', group: '平台', mode: '半自动', health: 'partial', provides: '域名时长、网页剪藏、当前页抓取', via: '扩展 + Web Clipper', limits: '不是完整浏览历史', feedsFlow: true },
  { id: 'P12', name: '学习与考试', group: '平台', mode: '手动', health: 'ok', provides: 'Goodnotes 题目照片、答疑、教材笔记', via: '人工拍照/整理', limits: '没有自动错题统计', feedsFlow: true },
  { id: 'P11', name: 'AI 成本与额度', group: '平台', mode: '手动', health: 'ok', provides: '成本产出记录、订阅经验', via: '手写 MD', location: '示例数据/成本/订阅.md', limits: '不是实时 Token 账单', feedsFlow: false },
];

const INBOX = '系统/随手记/随手记收件箱.md';
const cap = (id: string, text: string, n: number, hmv: string, type: Material['captureType'], extra: Partial<Material> = {}): Material => ({
  id, kind: 'capture', sourceId: 'C08', channel: '随手记', captureType: type, title: text.trim().split('\n')[0].slice(0, 40), text,
  contentAt: at(n, hmv), receivedAt: at(n, hmv), ref: { source: 'C08', label: '随手记收件箱', path: INBOX, anchor: `^${id}`, at: at(n, hmv) },
  ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [], history: [{ at: at(n, hmv), by: '我', text: `随手记保存（类型：${type}）` }], ...extra,
});

export function materials(): Material[] {
  return [
    cap('m01', '  合成随想：把几段示例讨论按主题归档。\n保留原始段落，另外展示摘要。\n', 0, '09:30', '想法', { topic: '游戏' }),
    cap('m02', '合成需求：卡片使用统一间距和轻量反馈', -1, '00:42', '待办线索', {
      read: at(-1, '08:05'), outputs: [{ kind: 'action', id: 'a02', label: '重做画板前端（安静极简）', at: at(-1, '08:06'), path: '系统/行动/a02.md' }],
      projectLinks: [{ projectId: 'p01', as: '已确认需求', at: at(-1, '08:06') }],
      history: [{ at: at(-1, '00:42'), by: '我', text: '随手记保存（类型：待办线索）' }, { at: at(-1, '08:05'), by: '我', text: '标记已读' }, { at: at(-1, '08:06'), by: '我', text: '转为行动 a02；作为「个人 AI 仪表盘」已确认需求' }],
    }),
    cap('m03', '合成问题：如何给材料附上可追溯引用', -2, '16:20', '问题', { later: at(-2, '21:00'), history: [{ at: at(-2, '16:20'), by: '我', text: '随手记保存（类型：问题）' }, { at: at(-2, '21:00'), by: '我', text: '放进以后读' }] }),
    {
      id: 'm04', kind: 'collect', home: { card: 'favorites', id: 'm04' }, sourceId: 'P01', platform: 'x', channel: 'X 书签', title: '示例·用字段组织工作台', author: '示例作者 A',
      text: '合成文章：为演示工作台设计字段、列表与复盘入口。\n\n示例模板 A 只用于验证材料来源和多种输出。',
      contentAt: at(-8, '11:20'), receivedAt: at(-7, '20:15'),
      ref: { source: 'P01', label: 'X 书签导出 · 第 3 批', path: '材料/X/2026-10_demo_author_a_demo-post-01.md', url: 'https://example.com/demo/reference-1', at: at(-7, '20:15') },
      read: at(-6, '22:00'),
      ai: { state: 'result', at: at(-2, '23:10'), batchId: 'pb1', summary: '合成摘要：示例模板 A 用字段组织面板和列表。', suggestion: '作为画板空状态与模板的参考', confidence: '中' },
      digested: { at: at(-1, '00:05'), note: '合成备注：记录字段如何关联示例列表，供下次查阅。' },
      note: { text: '合成备注：记录字段如何关联示例列表，供下次查阅。', at: at(-1, '00:05') },
      outputs: [
        { kind: 'knowledge', id: 'l1', label: '示例模板 A 模板拆解', at: at(-1, '00:06'), path: '知识库/收集整理/信息收集/X/示例模板 A 模板拆解.md' },
        { kind: 'action', id: 'a08', label: '参考 示例模板 A / 示例模板 B 写画板空状态文案', at: at(-1, '00:07'), path: '系统/行动/a08.md' },
      ],
      projectLinks: [{ projectId: 'p01', as: '参考', at: at(-1, '00:06') }],
      media: [{ kind: '视频', label: '1:12 演示视频', available: true, path: '系统/信息收集/原始导出/X/media/demo-post-01.mp4' }],
      batchIds: ['pb1'],
      history: [
        { at: at(-7, '20:15'), by: '系统', text: '导入文件：X 书签导出（第 3 批）' }, { at: at(-6, '22:00'), by: '我', text: '标记已读' },
        { at: at(-2, '23:00'), by: '我', text: '加入处理批次 pb1 并确认发送' }, { at: at(-2, '23:10'), by: 'AI', text: '批次 pb1 返回结果' },
        { at: at(-1, '00:05'), by: '我', text: '确认已消化，写下理解' }, { at: at(-1, '00:06'), by: '我', text: '入库：知识库/收集整理/信息收集/X/' },
        { at: at(-1, '00:07'), by: '我', text: '转为行动 a08' },
      ],
    },
    {
      id: 'm05', kind: 'collect', home: { card: 'favorites', id: 'm05' }, sourceId: 'P01', platform: 'x', channel: 'X 书签', title: '示例·笔记工作区的页面结构', author: '示例作者 B',
      text: '合成文章：用一个笔记工作区展示今日事项、项目和复盘；用于验证阅读与待采纳。',
      contentAt: at(-9, '08:00'), receivedAt: at(-7, '20:15'),
      ref: { source: 'P01', label: 'X 书签导出 · 第 3 批', path: '材料/X/2026-10_demo_author_b_demo-template-b.md', url: 'https://example.com/demo/reference-2', at: at(-7, '20:15') },
      read: at(-2, '22:40'),
      ai: { state: 'result', at: at(-2, '23:10'), batchId: 'pb1', summary: '合成摘要：示例模板 B 的页面包含标题、区块和一个主动作。', suggestion: '学它的页面模板：标题 + 区块 + 打开并行动', confidence: '高' },
      outputs: [{ kind: 'approval', id: 'ap1', label: '待采纳：学 示例模板 B 的页面模板', at: at(-2, '23:15') }],
      projectLinks: [], batchIds: ['pb1'],
      media: [{ kind: '视频', label: '0:59 演示视频', available: false, reason: '导出时视频未下载（只存了链接）', url: 'https://example.com/demo/reference-3' }, { kind: '链接', label: '示例模板仓库', available: true, url: 'https://example.com/demo/reference-4' }],
      history: [{ at: at(-7, '20:15'), by: '系统', text: '导入文件：X 书签导出（第 3 批）' }, { at: at(-2, '22:40'), by: '我', text: '标记已读' }, { at: at(-2, '23:10'), by: 'AI', text: '批次 pb1 返回结果' }, { at: at(-2, '23:15'), by: '我', text: '推送到今日待采纳（ap1）' }],
    },
    {
      id: 'm06', kind: 'collect', home: { card: 'favorites', id: 'm06' }, sourceId: 'P02', platform: 'bili', channel: 'B站 · 收藏夹「工具」', title: '示例·卡片工作台布局演示', author: '示例作者 C',
      text: '合成简介：演示卡片排列和工作台导航；此条未取得字幕。',
      contentAt: at(-20, '19:00'), receivedAt: at(-8, '22:01'),
      ref: { source: 'P02', label: 'B站收藏夹「工具」导出', path: '材料/B站/DEMO-VIDEO-01.md', url: 'https://example.com/demo/reference-5', at: at(-8, '22:01') },
      ai: { state: 'unknown', at: at(-2, '23:05'), batchId: 'pb2', error: '已发出，但没有收到返回；不确定是否处理过' },
      outputs: [], projectLinks: [], batchIds: ['pb2'],
      media: [{ kind: '视频', label: '原视频', available: true, url: 'https://example.com/demo/reference-6' }, { kind: '字幕', label: 'CC 字幕', available: false, reason: '该视频没有 CC 字幕' }],
      gaps: ['字幕未取得：只有标题与简介，AI 结果只能基于简介'],
      history: [{ at: at(-8, '22:01'), by: '系统', text: '浏览器采集：B站收藏夹「工具」' }, { at: at(-2, '23:05'), by: '我', text: '加入批次 pb2 并确认发送' }, { at: at(-2, '23:40'), by: '系统', text: '等待超时：AI 状态未知' }],
    },
    {
      id: 'm07', kind: 'collect', home: { card: 'favorites', id: 'm07' }, sourceId: 'P02', platform: 'bili', channel: 'B站 · 收藏夹「工具」', title: '示例·长视频阅读与字幕检验', author: '示例作者 D',
      text: '合成字幕：介绍列表、阅读区与时间轴；用长文本演示处理失败分支。',
      contentAt: at(-15, '12:00'), receivedAt: at(-8, '22:01'),
      ref: { source: 'P02', label: 'B站收藏夹「工具」导出', path: '材料/B站/DEMO-VIDEO-02.md', url: 'https://example.com/demo/reference-7', at: at(-8, '22:01') },
      ai: { state: 'failed', at: at(-2, '23:06'), batchId: 'pb2', error: '字幕过长，超出单次处理上限' },
      outputs: [], projectLinks: [], batchIds: ['pb2'],
      media: [{ kind: '视频', label: '原视频', available: true, url: 'https://example.com/demo/reference-8' }, { kind: '字幕', label: '字幕全文', available: true, path: '系统/信息收集/原始导出/B站/DEMO-VIDEO-02.srt' }],
      history: [{ at: at(-8, '22:01'), by: '系统', text: '浏览器采集：B站收藏夹「工具」' }, { at: at(-2, '23:05'), by: '我', text: '加入批次 pb2 并确认发送' }, { at: at(-2, '23:06'), by: 'AI', text: '处理失败：字幕过长' }],
    },
    {
      id: 'm08', kind: 'collect', home: { card: 'favorites', id: 'm08' }, sourceId: 'P03', platform: 'xhh', channel: '小黑盒 · 收藏', title: '示例·探索游戏的路线草稿',
      text: '示例·探索游戏的路线草稿', contentAt: undefined, receivedAt: at(-3, '21:10'),
      ref: { source: 'P03', label: '小黑盒收藏 · 浏览器采集', path: '材料/小黑盒/xhh-demo-01.md', url: 'https://example.com/demo/reference-9', at: at(-3, '21:10') },
      ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: ['pb4'],
      gaps: ['只取到标题：正文未加载（登录态过期）', '发布时间未知'],
      history: [{ at: at(-3, '21:10'), by: '系统', text: '浏览器采集：小黑盒（部分失败）' }],
    },
    {
      id: 'm09', kind: 'qq', sourceId: 'C15', channel: 'QQ · 示例通知群', group: 'g1', title: '示例·【通知】示例作品评审时间调整', author: '示例组织者',
      text: '合成通知：示例作品将在下周四上午评审，初稿周一前提交；分组图片尚未取得。',
      contentAt: at(-2, '20:41'), receivedAt: at(-2, '21:00'),
      ref: { source: 'C15', label: 'QQ 批次 qq-b07 · 示例通知群', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例通知群.md', anchor: '#demo-msg-01', at: at(-2, '21:00') },
      read: at(-2, '21:30'),
      ai: { state: 'result', at: at(-2, '22:00'), batchId: 'pb5', summary: '合成摘要：下周四上午评审，周一前提交初稿。', confidence: '高' },
      outputs: [{ kind: 'approval', id: 'ap2', label: '已采纳：回复示例作品分组', at: at(-2, '22:05') }, { kind: 'approval', id: 'ap6', label: '待采纳：提交示例作品初稿', at: at(-2, '22:05') }, { kind: 'action', id: 'a03', label: '回复示例作品分组', at: at(-1, '08:00'), path: '系统/行动/a03.md' }],
      projectLinks: [], batchIds: ['pb5'],
      media: [{ kind: '图片', label: '分组表.jpg', available: false, reason: '图片未下载：本批次只取文字' }],
      gaps: ['分组只在图片里，图片未读取'],
      context: [
        { who: '示例协调员', text: '合成说明：示例作品安排稍后公布', at: at(-2, '20:35') },
        { who: '示例组织者', text: '合成通知：示例作品将在下周四上午评审，初稿周一前提交；分组图片尚未取得。', at: at(-2, '20:41'), self: true },
        { who: '示例成员', text: '收到', at: at(-2, '20:42') },
        { who: '示例成员', text: '示例提问：分组图片是否完整？', at: at(-2, '20:45') },
      ],
      history: [{ at: at(-2, '21:00'), by: '系统', text: '开始收集：示例通知群（批次 qq-b07）' }, { at: at(-2, '21:30'), by: '我', text: '标记已读' }, { at: at(-2, '22:00'), by: 'AI', text: '处理批次 pb5 返回' }, { at: at(-2, '22:05'), by: '我', text: '推送 2 条到今日待采纳' }, { at: at(-1, '08:00'), by: '我', text: '采纳 ap2 → 行动 a03' }],
    },
    {
      id: 'm10', kind: 'qq', sourceId: 'C15', channel: 'QQ · 示例休闲群', group: 'g2', title: '示例·[图片] 示例插图的出处在哪里？', author: '示例成员',
      text: '[图片] 示例插图的出处在哪里？', contentAt: at(-3, '23:12'), receivedAt: at(-2, '21:00'),
      ref: { source: 'C15', label: 'QQ 批次 qq-b07 · 示例休闲群', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例休闲群.md', anchor: '#demo-msg-02', at: at(-2, '21:00') },
      ai: { state: 'none' }, outputs: [{ kind: 'approval', id: 'ap5', label: '稍后：查这张图的原网站', at: at(-2, '22:06') }], projectLinks: [], batchIds: ['pb4'],
      media: [{ kind: '图片', label: 'screenshot.png', available: true, path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/media/demo-msg-02.png' }],
      gaps: ['只有图片，没有链接'],
      context: [{ who: '示例成员', text: '[图片] 示例插图的出处在哪里？', at: at(-3, '23:12'), self: true }, { who: '另一位', text: '示例回复：尚未确认来源', at: at(-3, '23:14') }],
      history: [{ at: at(-2, '21:00'), by: '系统', text: '开始收集：示例休闲群（批次 qq-b07）' }],
    },
    {
      id: 'm11', kind: 'project', sourceId: 'C04', channel: '工程 · 示例阅读器', title: '示例·请检查这次字幕阅读结果是否符合要求', author: '示例阅读器 · 当前交接',
      text: '字幕阅读器第二版已生成。需要用户打开 3 个样例，确认长段落是否可读、中英混排是否错位。',
      contentAt: at(-4, '18:20'), receivedAt: at(-4, '18:20'),
      ref: { source: 'C04', label: '示例阅读器 当前交接.md › 需要用户', path: '示例工程/示例阅读器/docs/project/当前交接.md', anchor: '#需要用户', at: at(-4, '18:20') },
      read: at(-3, '09:00'), ai: { state: 'none' },
      outputs: [{ kind: 'action', id: 'a04', label: '检查示例阅读器字幕阅读 3 个样例', at: at(-3, '09:05'), path: '系统/行动/a04.md' }],
      projectLinks: [{ projectId: 'p04', as: '已确认需求', at: at(-4, '18:20') }], batchIds: [],
      history: [{ at: at(-4, '18:20'), by: '工程', text: '当前交接 → 需要用户事项，投影为请求 d01' }, { at: at(-3, '09:00'), by: '我', text: '标记已读' }, { at: at(-3, '09:05'), by: '我', text: '安排验收行动 a04（完成行动 ≠ 验收通过）' }],
    },
    {
      id: 'm12', kind: 'clip', sourceId: 'V11', channel: '网页剪藏', title: '示例·知识库链接整理',
      text: '合成文章：为示例笔记补充链接，原文与摘要分别展示。', contentAt: at(-6, '09:40'), receivedAt: at(-6, '10:02'),
      ref: { source: 'V11', label: 'Web Clipper 剪藏', path: '示例数据/剪藏/示例作者 E 知识整理示例.md', url: 'https://example.com/demo/reference-10', at: at(-6, '10:02') },
      ai: { state: 'sent', at: at(0, '08:40'), batchId: 'pb3' }, outputs: [], projectLinks: [], batchIds: ['pb3'],
      history: [{ at: at(-6, '10:02'), by: '我', text: 'Web Clipper 剪藏' }, { at: at(0, '08:40'), by: '我', text: '加入批次 pb3 并确认发送' }],
    },
    {
      id: 'm13', kind: 'collect', home: { card: 'favorites', id: 'm13' }, sourceId: 'P04', platform: 'reddit', channel: 'Reddit · saved', title: '示例·说明清晰的空状态', author: 'u/demo_reader',
      text: 'Synthetic example: explain the empty view and offer a clear next action.', contentAt: at(-12, '03:00'), receivedAt: at(-5, '09:00'),
      ref: { source: 'P04', label: 'Reddit saved 受限小样', path: '材料/Reddit/empty-states.md', url: 'https://example.com/demo/reference-11', at: at(-5, '09:00') },
      read: at(-1, '00:02'), ai: { state: 'none' },
      outputs: [{ kind: 'action', id: 'a08', label: '参考 示例模板 A / 示例模板 B 写画板空状态文案', at: at(-1, '00:08'), path: '系统/行动/a08.md' }],
      projectLinks: [{ projectId: 'p01', as: '参考', at: at(-1, '00:08') }], batchIds: [],
      history: [{ at: at(-5, '09:00'), by: '系统', text: '受限小样导入（Reddit）' }, { at: at(-1, '00:02'), by: '我', text: '标记已读' }, { at: at(-1, '00:08'), by: '我', text: '作为支持材料挂到已有行动 a08（没有新建重复行动）' }],
    },
    {
      id: 'm14', kind: 'collect', home: { card: 'favorites', id: 'm14' }, sourceId: 'P04', platform: 'yt', channel: 'YouTube · 稍后观看', title: '示例·笔记工作区使用演示', author: '示例作者 F',
      text: '合成字幕：展示示例笔记、列表和复盘入口。', contentAt: at(-30, '10:00'), receivedAt: at(-10, '09:00'),
      ref: { source: 'P04', label: 'YouTube 稍后观看 受限小样', path: '材料/YouTube/run-life-obsidian.md', url: 'https://example.com/demo/reference-12', at: at(-10, '09:00') },
      read: at(-6, '21:00'), archived: at(-5, '09:00'), ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [],
      history: [{ at: at(-10, '09:00'), by: '系统', text: '受限小样导入' }, { at: at(-6, '21:00'), by: '我', text: '标记已读' }, { at: at(-5, '09:00'), by: '我', text: '看过了，归档' }],
    },
    {
      id: 'm15', kind: 'diary', sourceId: 'C11', channel: '日记 · 用户原文', title: '示例日记：今天完成了页面草图',
      text: '合成日记：今天完成一个页面草图，留下两条交互问题供下次检查。', contentAt: at(-1, '23:55'), receivedAt: at(-1, '23:58'),
      ref: { source: 'C11', label: '日记 · 用户原文', path: `${diaryDir(addDays(today(), -1))}/${addDays(today(), -1)}_用户原文.md`, anchor: '#^p3', at: at(-1, '23:58') },
      read: at(0, '07:50'), ai: { state: 'none' }, digested: { at: at(0, '07:50'), note: '示例备注：草图完成与交互验收分别记录。' },
      note: { text: '示例备注：草图完成与交互验收分别记录。', at: at(0, '07:50') },
      outputs: [], projectLinks: [{ projectId: 'p01', as: '参考', at: at(0, '07:51') }], batchIds: [],
      history: [{ at: at(-1, '23:58'), by: '我', text: '日记原文落盘' }, { at: at(0, '07:50'), by: '我', text: '示例确认：区分草图完成与交互验收' }],
    },
    {
      id: 'm16', kind: 'handwrite', sourceId: 'A02', channel: '手写截图 · DEMO-008', title: '示例·定时整理材料的想法',
      text: '合成想法：把几条示例材料整理成摘要；只作为候选方向，不自动排期。', contentAt: at(-2, '15:00'), receivedAt: at(-2, '15:00'),
      ref: { source: 'A02', label: '杂想归档 DEMO-008', path: '示例数据/随想/主动 Agent 想法.md', anchor: '#DEMO-008', at: at(-2, '15:00') },
      read: at(-2, '15:30'), ai: { state: 'result', at: at(-2, '16:00'), summary: '这是一个项目方向，不是已决定的需求。', suggestion: '作为线索关联「示例助手」', confidence: '中' },
      outputs: [{ kind: 'approval', id: 'ap4', label: '不采纳：列为本周项目', at: at(-2, '16:05') }], projectLinks: [{ projectId: 'p08', as: '参考', at: at(-2, '16:10') }], batchIds: [],
      history: [{ at: at(-2, '15:00'), by: '我', text: '对话归档' }, { at: at(-2, '16:00'), by: 'AI', text: '整理稿生成' }, { at: at(-2, '16:30'), by: '我', text: '不采纳 ap4：只是方向，先不排期' }],
    },
    /* ── v5：消息分组（关注 / 钻研 / 无所谓）与统一流程各阶段的样例 ── */
    {
      id: 'm17', kind: 'qq', sourceId: 'P06', platform: '微信', channel: '微信 · 示例活动群', group: 'w1', topic: '学习', title: '示例·明早 8 点示例活动，带签到码', author: '示例组织者',
      text: '示例通知：明早 8 点参加活动，携带签到码；无法参加可登记其他场次。', contentAt: at(-1, '23:40'), receivedAt: at(0, '07:10'),
      ref: { source: 'P06', label: '微信 · 示例活动群（样例导出）', path: '系统/信息接入/微信/示例活动群/样例.md', anchor: '#demo-wechat-01', at: at(0, '07:10') },
      ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [],
      history: [{ at: at(0, '07:10'), by: '系统', text: '微信导出：示例活动群（样例）' }],
    },
    {
      id: 'm18', kind: 'qq', sourceId: 'C15', channel: 'QQ · 示例通知群', group: 'g1', topic: '学习', title: '示例场地今晚 21:00 关闭', author: '示例协调员',
      text: '合成通知：示例场地今晚 21:00 关闭，关闭前归还材料。', contentAt: at(0, '00:30'), receivedAt: at(0, '07:10'),
      ref: { source: 'C15', label: 'QQ 批次 qq-b08 · 示例通知群', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b08/示例通知群.md', anchor: '#demo-msg-03', at: at(0, '07:10') },
      ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [],
      history: [{ at: at(0, '07:10'), by: '系统', text: '开始收集：示例通知群（批次 qq-b08）' }],
    },
    {
      id: 'm19', kind: 'qq', sourceId: 'C15', channel: 'QQ · 示例技术群', group: 'g5', topic: 'AI 工具', title: '示例·MCP 和 A2A 到底什么关系？', author: '群友 A',
      text: '合成讨论：MCP 提供工具入口，A2A 描述协作消息。\n示例成员 B：先用示例工具检查一次引用。\n示例成员 C：真实插件接入需要另外验证。', contentAt: at(0, '01:20'), receivedAt: at(0, '07:10'),
      ref: { source: 'C15', label: 'QQ 批次 qq-b08 · 示例技术群', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b08/示例技术群.md', anchor: '#demo-msg-04', at: at(0, '07:10') },
      ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [],
      history: [{ at: at(0, '07:10'), by: '系统', text: '开始收集：示例技术群（批次 qq-b08）' }],
    },
    {
      id: 'm20', kind: 'qq', sourceId: 'P06', platform: '微信', channel: '微信 · 示例研究群', group: 'w2', topic: 'AI 工具', title: '示例·有人推荐 DSPy：把 prompt 当程序来优化', author: '群友 D',
      text: '合成讨论：为一组提示词编写评估用例，再对比调整前后的输出。', contentAt: at(-1, '22:10'), receivedAt: at(0, '07:10'),
      ref: { source: 'P06', label: '微信 · 示例研究群（样例导出）', path: '系统/信息接入/微信/示例研究群/样例.md', anchor: '#demo-wechat-02', at: at(0, '07:10') },
      ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [],
      history: [{ at: at(0, '07:10'), by: '系统', text: '微信导出：示例研究群（样例）' }],
    },
    {
      id: 'm21', kind: 'qq', sourceId: 'C15', channel: 'QQ · 示例休闲群', group: 'g2', topic: '游戏', title: '示例·合成闲聊：周末是否参加示例活动', author: '示例成员',
      text: '合成闲聊：周末是否参加示例活动', contentAt: at(0, '06:50'), receivedAt: at(0, '07:10'),
      ref: { source: 'C15', label: 'QQ 批次 qq-b08 · 示例休闲群', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b08/示例休闲群.md', anchor: '#demo-msg-05', at: at(0, '07:10') },
      ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [],
      history: [{ at: at(0, '07:10'), by: '系统', text: '开始收集：示例休闲群（只存档）' }],
    },
    cap('m22', '示例摘录：整理一个参数选择表', -1, '15:10', '摘录', {
      topic: '学习', read: at(-1, '15:12'), note: { text: '示例作品要用，以后查参数', at: at(-1, '15:12') },
      ai: { state: 'result', at: at(-1, '15:14'), intent: '示例作品要用，以后查参数', summary: '（样例）按你的备注「示例作品要用，以后查参数」：原文里的模数表和选取步骤可以直接查。', points: ['（样例）模数按齿根弯曲强度初算，再取标准值', '（样例）常用标准模数：1.5 / 2 / 2.5 / 3', '（样例）小齿轮齿数一般取 17–30'], suggest: '入库', suggestion: '备注说是以后查 → 建议直接入库', confidence: '中' },
      history: [{ at: at(-1, '15:10'), by: '我', text: '随手记保存（类型：摘录）' }, { at: at(-1, '15:12'), by: '我', text: '保存备注' }, { at: at(-1, '15:14'), by: 'AI', text: '初处理完成，等你选' }],
    }),
    {
      id: 'm23', kind: 'clip', sourceId: 'V11', channel: '网页剪藏', topic: '学习', title: '示例·图解注意力机制（长文）',
      text: '注意力 = 用查询去和所有键比相似度，再按相似度加权求值。多头 = 并行做几次，各看各的子空间……', contentAt: at(-3, '20:00'), receivedAt: at(-3, '20:05'),
      ref: { source: 'V11', label: 'Web Clipper 剪藏', path: '示例数据/剪藏/图解注意力机制.md', url: 'https://example.com/attention', at: at(-3, '20:05') },
      read: at(-3, '20:30'), note: { text: '合成备注：对照三个示例要点检查注意力机制的说明', at: at(-3, '20:30') },
      ai: { state: 'result', at: at(-3, '20:33'), intent: '合成备注：对照三个示例要点检查注意力机制的说明', summary: '（样例）按备注整理了三处待核对的说明。', points: ['（样例）为什么要分成多个头：每个头学一种关系', '（样例）每个头的维度 = 总维度 ÷ 头数', '（样例）最后把各头结果拼起来再线性变换'], suggest: '自己处理', confidence: '中' },
      route: { kind: '自己处理', at: at(-3, '20:40'), path: '系统/收集处理/我自己处理/图解注意力机制（长文）.md', crossed: [0] },
      outputs: [], projectLinks: [], batchIds: [],
      history: [{ at: at(-3, '20:05'), by: '我', text: 'Web Clipper 剪藏' }, { at: at(-3, '20:30'), by: '我', text: '保存备注' }, { at: at(-3, '20:33'), by: 'AI', text: '初处理完成' }, { at: at(-3, '20:40'), by: '我', text: '我自己处理' }],
    },
  ];
}

export function approvals(): Approval[] {
  return [
    { id: 'ap1', title: '示例·学 示例模板 B 的页面模板：标题 + 区块 + 打开并行动', body: '把它的页面结构用到项目档案页。', group: '信息收集 · X', sourceId: 'P01', by: 'AI', createdAt: at(-2, '23:15'), materialIds: ['m05'], refs: [{ source: 'P01', label: '示例·笔记工作区的页面结构', path: '材料/X/2026-10_demo_author_b_demo-template-b.md' }], state: 'pending', projectId: 'p01', suggestDate: addDays(today(), 1) },
    { id: 'ap2', title: '示例·回复示例作品分组', group: 'QQ · 示例通知群', sourceId: 'C15', by: 'AI', createdAt: at(-2, '22:05'), materialIds: ['m09'], refs: [{ source: 'C15', label: '【通知】示例作品评审时间调整', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例通知群.md', anchor: '#demo-msg-01' }], state: 'adopted', decidedAt: at(-1, '08:00'), actionId: 'a03' },
    { id: 'ap6', title: '示例·周一前提交示例作品初稿到示例协调员邮箱', group: 'QQ · 示例通知群', sourceId: 'C15', by: 'AI', createdAt: at(-2, '22:05'), materialIds: ['m09'], refs: [{ source: 'C15', label: '【通知】示例作品评审时间调整', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例通知群.md', anchor: '#demo-msg-01' }], state: 'pending', suggestDate: addDays(today(), 2) },
    { id: 'ap3', title: '示例·安排 10 分钟：重载采集扩展 0.5.0 并确认权限', body: '对应待我决策里的「需要你亲自操作」。', group: '项目 · 信息收集管线', sourceId: 'C04', by: '工程', createdAt: at(-5, '21:00'), materialIds: [], refs: [{ source: 'C04', label: '信息收集管线 当前交接.md', path: '示例工程/仪表盘/docs/project/当前交接.md', anchor: '#需要用户' }], state: 'pending', decisionId: 'd03', projectId: 'p06' },
    { id: 'ap4', title: '示例·把「主动 Agent」列为本周项目', group: '手写 / 杂想', sourceId: 'A02', by: 'AI', createdAt: at(-2, '16:05'), materialIds: ['m16'], refs: [{ source: 'A02', label: 'DEMO-008', path: '示例数据/随想/主动 Agent 想法.md', anchor: '#DEMO-008' }], state: 'rejected', decidedAt: at(-2, '16:30'), reason: '只是方向，先不排期' },
    { id: 'ap5', title: '示例·查这张图的原网站', group: 'QQ · 示例休闲群', sourceId: 'C15', by: '我', createdAt: at(-2, '22:06'), materialIds: ['m10'], refs: [{ source: 'C15', label: '示例休闲群 #demo-msg-02', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例休闲群.md', anchor: '#demo-msg-02' }], state: 'later', decidedAt: at(-1, '09:00') },
  ];
}

const A = (id: string, title: string, o: Partial<Action>, n = 0): Action => ({
  id, title, priority: '中', order: n, createdAt: at(-3, '08:00'), path: `系统/行动/${id}.md`, refs: [], materialIds: [],
  history: [{ at: o.createdAt ?? at(-3, '08:00'), by: '我', text: '创建' }], ...o,
});
export function actions(): Action[] {
  const T = today();
  return [
    A('a01', '示例练习第 1 章', { body: '合成练习：完成三道示例题，并保留参考出处。', date: T, time: '10:00', priority: '高', refs: [{ source: 'C11', label: '日记 · 生活日记整理版', path: `${diaryDir(addDays(T, -1))}/${addDays(T, -1)}_生活日记整理版.md`, anchor: '#明天' }] }, 1),
    A('a02', '重做画板前端（安静极简）', { body: '合成任务：检查现有卡片结构和导航入口。', date: T, priority: '高', projectId: 'p01', workItemId: 'w1', materialIds: ['m02'], refs: [{ source: 'C08', label: '随手记', path: INBOX, anchor: '^m02' }], createdAt: at(-1, '08:06'), history: [{ at: at(-1, '08:06'), by: '我', text: '由随手记 m02 转为行动' }] }, 2),
    A('a03', '回复示例作品分组', { date: T, time: '14:00', done: at(0, '09:10'), approvalId: 'ap2', materialIds: ['m09'], refs: [{ source: 'C15', label: 'QQ · 示例通知群 #demo-msg-01', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例通知群.md', anchor: '#demo-msg-01' }], createdAt: at(-1, '08:00'), history: [{ at: at(-1, '08:00'), by: '我', text: '采纳 ap2 创建' }, { at: at(0, '09:10'), by: '我', text: '完成' }] }, 3),
    A('a04', '检查示例阅读器字幕阅读 3 个样例', { body: '打开样例 1–3，按验收标准看；看完回到「待我决策」给结论。', date: T, kind: '验收行动', decisionId: 'd01', projectId: 'p04', workItemId: 'w41', materialIds: ['m11'], refs: [{ source: 'C02', label: '请求 d01', path: '系统/需要我/d01.md' }] }, 4),
    A('a05', '示例户外活动', { date: T, time: '19:30', priority: '低' }, 5),
    A('a06', '示例数学练习', { date: addDays(T, -2), priority: '中' }, 6),
    A('a07', '提交示例练习报告', { date: addDays(T, -1), time: '23:59', priority: '高' }, 7),
    A('a08', '参考 示例模板 A / 示例模板 B 写画板空状态文案', { date: addDays(T, 2), priority: '低', projectId: 'p01', materialIds: ['m04', 'm13'], refs: [{ source: 'P01', label: '示例模板 A 视频', url: 'https://example.com/demo/reference-13' }, { source: 'P04', label: 'Reddit：Empty states', url: 'https://example.com/demo/reference-14' }], createdAt: at(-1, '00:07') }, 8),
    A('a09', '整理示例项目介绍', { date: addDays(T, 4) }, 9),
    A('a10', '整理 X 书签第 3 批', { date: addDays(T, -1), done: at(-1, '00:10'), priority: '低' }, 10),
    A('a11', '想清楚 QQ 图片追源要做多深', { decisionId: 'd04', body: '和待我决策 d04 是同一件事。' }, 11),
    A('a12', '补充示例文具', { priority: '低' }, 12),
    A('a13', '给专注计时换图标', { archived: at(-3, '10:00'), priority: '低' }, 13),
    A('a14', '回复示例作品分组（重复）', { deleted: at(-1, '08:01'), date: T, history: [{ at: at(-1, '08:00'), by: '我', text: '手动创建' }, { at: at(-1, '08:01'), by: '我', text: '发现重复，删除（可恢复）' }] }, 14),
    A('a15', '复习示例课程第 2 章', { date: addDays(T, -1), done: at(-1, '22:00') }, 15),
  ];
}

export function decisions(): Decision[] {
  return [
    {
      id: 'd01', kind: '验收', title: '示例阅读器：这次字幕阅读结果是否符合要求？', projectId: 'p04', workItemId: 'w41', raisedBy: '示例阅读器 · 当前交接', path: '系统/需要我/d01.md', asOf: at(-4, '18:20'),
      whyNow: '阅读器 v2 已生成样例；下一步是否进入批注取决于你的判断。', blocks: '「批注与归档」阶段不能开始。',
      done: ['导入 3 个样例', '长段落分页', '中英混排断行'], uncertain: ['40 分钟访谈的时间轴是否对齐（只做了本地检查）'],
      entry: { label: '打开样例页', url: 'https://example.com/demo/reference-15', path: '示例工程/示例阅读器/samples/' },
      criteria: ['样例 2 的长段落能连续读下去', '样例 3 的中英混排不错位', '时间轴点击能跳到对应位置'],
      options: [{ id: 'pass', label: '通过', hint: '进入批注阶段' }, { id: 'fix', label: '需修改', hint: '写下哪里不可读' }],
      recommend: { text: '先看样例 2（最长的一段）', by: '项目' },
      status: 'open', freshness: 'current', responses: [], actionIds: ['a04'],
      refs: [{ source: 'C04', label: '示例阅读器 当前交接.md › 需要用户', path: '示例工程/示例阅读器/docs/project/当前交接.md', anchor: '#需要用户' }],
      history: [{ at: at(-4, '18:20'), by: '工程', text: '从当前交接投影出请求' }, { at: at(-3, '09:05'), by: '我', text: '安排验收行动 a04' }],
    },
    {
      id: 'd02', kind: '选择', title: '示例·仪表盘：画板默认用规整网格，还是自由拼贴？', projectId: 'p01', workItemId: 'w1', raisedBy: '个人 AI 仪表盘 · 前端重构', path: '系统/需要我/d02.md', asOf: at(-2, '08:00'),
      whyNow: '影响布局数据形状，Codex 接后端前要定。', blocks: '布局持久化格式。', done: ['两种布局都做了原型'], uncertain: [],
      criteria: [], options: [{ id: 'grid', label: '规整为默认', hint: '拼贴作为画板可选模式' }, { id: 'collage', label: '拼贴为默认' }],
      recommend: { optionId: 'grid', text: '规整为默认；拼贴放到单独画板', by: 'AI' },
      status: 'resolved', freshness: 'current',
      response: { kind: '选方案', optionId: 'grid', text: '规整为默认，拼贴单独一个画板，两个都要能切换。', at: at(-1, '21:00'), verify: '用户已反馈' },
      responses: [{ kind: '选方案', optionId: 'grid', text: '规整为默认，拼贴单独一个画板，两个都要能切换。', at: at(-1, '21:00'), verify: '用户已反馈' }],
      after: { waitingOn: 'AI', note: '前端按此实现；Codex 按 Board.mode 存储' }, actionIds: [],
      refs: [{ source: 'V02', label: '前端重构 参考拆解与架构提案', path: '示例工程/示例仪表盘/前端重构/00-提案.md' }],
      history: [{ at: at(-2, '08:00'), by: '项目', text: '提出' }, { at: at(-1, '21:00'), by: '我', text: '选方案：规整为默认' }],
    },
    {
      id: 'd03', kind: '操作', title: '示例·需要你在浏览器里重新加载采集扩展 0.5.0', projectId: 'p06', raisedBy: '信息收集管线 · 当前交接', path: '系统/需要我/d03.md', asOf: at(-5, '21:00'),
      whyNow: '新版本需要 X 详情读取与本机回传权限，只能本人确认。', blocks: 'X 采集拿不到回复与图片。', done: ['0.5.0 本地实现', '夹具验证通过'], uncertain: ['真实账号下的回执'],
      entry: { label: '打开扩展管理页', url: 'https://example.com/demo/extensions' }, criteria: ['扩展页显示 0.5.0', '首次采集出现回执'],
      status: 'later', laterUntil: addDays(today(), 1), freshness: 'current',
      response: { kind: '稍后', text: '这两天没空开电脑上的 Chrome', at: at(-1, '10:00') }, responses: [{ kind: '稍后', text: '这两天没空开电脑上的 Chrome', at: at(-1, '10:00') }],
      actionIds: [], refs: [{ source: 'C04', label: '管线 当前交接', path: '示例工程/仪表盘/docs/project/当前交接.md', anchor: '#需要用户' }],
      history: [{ at: at(-5, '21:00'), by: '工程', text: '提出' }, { at: at(-1, '10:00'), by: '我', text: '稍后（到明天）' }],
    },
    {
      id: 'd04', kind: '补充', title: '示例·QQ 图片追源要做到什么深度？', projectId: 'p05', raisedBy: 'QQ 群日报 · 设计', path: '系统/需要我/d04.md', asOf: at(-6, '19:00'),
      whyNow: '群里大量消息只有图片，追源可能无限展开。', blocks: '日报里图片消息的处理方式。', done: [], uncertain: ['识别准确率'],
      criteria: [], options: [{ id: 'ocr', label: '只识别图片文字' }, { id: 'once', label: '识别 + 搜一次来源' }, { id: 'ask', label: '每次问我' }],
      recommend: { optionId: 'once', text: '识别 + 搜一次来源，搜不到就停', by: 'AI' },
      status: 'open', freshness: 'current', responses: [], actionIds: ['a11'],
      refs: [{ source: 'C15', label: '示例休闲群 #demo-msg-02', path: '系统/信息接入/QQ/QQ消息收件箱/批次/qq-b07/示例休闲群.md', anchor: '#demo-msg-02' }],
      history: [{ at: at(-6, '19:00'), by: '项目', text: '提出' }],
    },
    {
      id: 'd05', kind: '验收', title: '示例·专注计时：嵌入尺寸与操作密度是否可以签收？', projectId: 'p03', raisedBy: '专注计时 · 当前交接', path: '系统/需要我/d05.md', asOf: at(-20, '22:00'),
      whyNow: '已完成一次合成部署演示，等待实机签收。', blocks: '专注计时卡的稳定版本。', done: ['合成部署演示'], uncertain: [], criteria: ['卡片 3×4 时按钮不挤', '暂停/继续一次点击生效'],
      entry: { label: '在 Obsidian 打开专注计时卡', path: '系统/专注计时/' },
      status: 'resolved', freshness: 'current',
      response: { kind: '需修改', text: '3×4 时「停止」按钮被挤到第二行；暂停后计时没立刻停。', at: at(-3, '20:00'), verify: '用户已反馈' },
      responses: [{ kind: '需修改', text: '3×4 时「停止」按钮被挤到第二行；暂停后计时没立刻停。', at: at(-3, '20:00'), verify: '用户已反馈' }],
      after: { waitingOn: '项目', note: '专注计时项目按反馈修改后重新提请求' }, actionIds: [],
      refs: [{ source: 'C05', label: '专注计时 部署记录', path: '示例工程/专注计时/docs/project/当前交接.md' }],
      history: [{ at: at(-20, '22:00'), by: '工程', text: '提出' }, { at: at(-3, '20:00'), by: '我', text: '需修改（附原因）' }],
    },
    {
      id: 'd06', kind: '选择', title: '示例·今日安排与待我决策是否合并成一张卡？', projectId: 'p01', raisedBy: '个人 AI 仪表盘 · 路线图', path: '系统/需要我/d06.md', asOf: at(-15, '10:00'),
      whyNow: '旧路线图提出。', blocks: '—', done: [], uncertain: [], criteria: [],
      options: [{ id: 'merge', label: '合并' }, { id: 'keep', label: '保持分开' }],
      status: 'open', freshness: 'superseded', supersededBy: 'd02', freshNote: '前端重构已把两者定为两张卡 + 今日页的「待采纳」，这条请求不再需要回答。',
      responses: [], actionIds: [], refs: [{ source: 'V02', label: '路线图', path: '示例工程/示例仪表盘/路线图.md', anchor: '#待确认' }],
      history: [{ at: at(-15, '10:00'), by: '项目', text: '提出' }, { at: at(-2, '08:00'), by: '项目', text: '被 d02 取代' }],
    },
    {
      id: 'd07', kind: '验收', title: '示例画布：画布与对话联动是否可用？', projectId: 'p02', raisedBy: 'DemoCanvas · 当前交接', path: '系统/需要我/d07.md', asOf: at(-12, '20:00'),
      whyNow: '原型可用，等你试一次。', blocks: '与工程总览的职责收口。', done: ['画布节点', '关联对话'], uncertain: ['与仪表盘工程总览是否重复'], criteria: ['点节点能打开对应对话'],
      status: 'open', freshness: 'stale', freshNote: '这条请求 12 天没有更新，项目可能已经变了；回答前先看项目跟进。',
      responses: [], actionIds: [], refs: [{ source: 'C04', label: 'DemoCanvas 当前交接', path: '示例工程/DemoCanvas/docs/project/当前交接.md' }],
      history: [{ at: at(-12, '20:00'), by: '工程', text: '提出' }],
    },
    {
      id: 'd08', kind: '个人', title: '示例·是否启用示例提醒？', raisedBy: '随手记', path: '系统/需要我/d08.md', asOf: at(-3, '12:00'),
      whyNow: '合成随想中提到了可选提醒。', blocks: '—', done: [], uncertain: [], criteria: [],
      status: 'dismissed', freshness: 'current', response: { kind: '不适用', text: '示例回应：此项无需继续处理。', at: at(-2, '09:00') },
      responses: [{ kind: '不适用', text: '示例回应：此项无需继续处理。', at: at(-2, '09:00') }], actionIds: [], refs: [{ source: 'C08', label: '随手记', path: INBOX }],
      history: [{ at: at(-3, '12:00'), by: '系统', text: '提出' }, { at: at(-2, '09:00'), by: '我', text: '不适用' }],
    },
  ];
}

const PJ = '示例工程/仪表盘/docs/project';
export function projects(): Project[] {
  return [
    {
      id: 'p01', name: '示例仪表盘', ownership: '产品项目', status: '进行中', stage: '前端重构 v3', path: '系统/项目/个人AI仪表盘.md', asOf: at(0, '08:00'),
      purpose: '把个人输入、日常行动、学习和项目推进连成一个每天打开的工作入口。',
      scenario: '早上打开看今天；白天随手记、处理材料、回答项目请求；晚上复盘。挂在 Obsidian 里作为一个标签页。',
      scope: { in: ['画板与卡片', '材料 → 审批 → 行动闭环', '项目跟进投影', '本机运行时的入口与控制'], out: ['重写专注计时 / 节点监控的采集算法', '自动发消息', '替代 Obsidian 编辑器'] },
      doneDef: ['示例模块的入口与职责清楚', '核心闭环在真实 Vault 上跑通', '用户在 Obsidian 实机签收'],
      requirements: [
        { id: 'r1', text: 'Markdown 是长期事实层，卡片只是投影', state: '有效', ref: { source: 'V02', label: '总架构 01', path: `${PJ}/架构/01-总边界.md` } },
        { id: 'r2', text: '随手记不自动变成任务', state: '有效', ref: { source: 'C08', label: '示例材料', path: INBOX, anchor: '^demo-ref-01' } },
        { id: 'r3', text: '合成需求：卡片使用统一间距和轻量反馈', state: '有效', ref: { source: 'C08', label: '随手记 m02', path: INBOX, anchor: '^m02' } },
        { id: 'r4', text: '每张卡用独立生成外壳', state: '已替代', replacedBy: 'r5', ref: { source: 'V02', label: 'V12 视觉合同', path: `${PJ}/历史/V12-视觉合同.md` } },
        { id: 'r5', text: '所有卡片共用一个外壳（CardShell）', state: '有效', ref: { source: 'V02', label: '前端重构提案', path: '示例工程/示例仪表盘/前端重构/00-提案.md' } },
        { id: 'r6', text: 'B站倍速是否迁入新版', state: '待确认', ref: { source: 'V02', label: '需求审查 R31', path: `${PJ}/审查/前端需求深化.md`, anchor: '#R31' } },
      ],
      modules: [
        { name: '工作台核心', duty: '外壳、画板、卡片协议、设置', io: '读：布局偏好；写：localStorage', deps: [], status: '进行中' },
        { name: '今日与审批', duty: '待采纳 → 行动的闭环', io: '读写：系统/行动/', deps: ['收件与处理'], status: '进行中' },
        { name: '收件与处理', duty: '材料多事实、批次、推送', io: '读：系统/信息收集/、QQ/；写：系统/收集处理/', deps: ['信息收集管线'], status: '准备中' },
        { name: '项目跟进', duty: '档案、跟进、工程、交接', io: '读：各工程 docs/project、示例工程状态端口', deps: [], status: '准备中' },
        { name: 'Obsidian 挂载', duty: '在可选宿主中显示示例视图', io: '插件 ItemView', deps: ['工作台核心'], status: '未开始' },
      ],
      docs: [
        { label: '当前路线图', path: `${PJ}/路线图.md`, role: '权威', at: at(-1, '22:00') },
        { label: '当前交接', path: `${PJ}/当前交接.md`, role: '权威', at: at(0, '08:00') },
        { label: '架构 01–15', path: `${PJ}/架构/`, role: '权威', at: at(-5, '10:00') },
        { label: '示例知识库镜像', path: '示例工程/示例仪表盘/', role: '镜像', at: at(-2, '23:00') },
        { label: 'V12 视觉合同', path: `${PJ}/历史/V12-视觉合同.md`, role: '历史', at: at(-40, '10:00') },
      ],
      follow: { current: 'w1', next: '前端 v3 交付后，Codex 按数据契约接真实 Vault', owner: 'AI', asOf: at(0, '08:00') },
      eng: { registered: true, reachable: true, repo: '示例工程/仪表盘', branch: 'frontend-v3', worktree: '示例工程/仪表盘-前端重构', head: '0000001', dirty: 14, asOf: at(0, '09:40'),
        commits: [{ hash: '0000001', msg: 'v2 前端：画板、整理模式、卡片属性面', at: at(-1, '23:30') }, { hash: '0000002', msg: '收件详情区分原文 / AI / 我的理解', at: at(-2, '22:10') }, { hash: '0000003', msg: '去掉侧栏，导航收束到画板', at: at(-3, '21:00') }] },
      handoff: { lastReliable: { text: 'v2 前端可运行，布局与卡片协议稳定', at: at(-1, '23:30'), ref: { source: 'V02', label: '当前交接', path: `${PJ}/当前交接.md` } }, unfinished: ['业务对象关系（本轮 v3）', 'Obsidian 挂载', '真实数据接入'], failed: ['v2 决策理由未持久化（F03，已在 v3 修复）'], resumeWith: [{ source: 'V02', label: '前端 docs/00-索引.md', path: '仪表盘-前端重构/docs/00-索引.md' }, { source: 'V02', label: '数据契约', path: '仪表盘-前端重构/docs/架构/02-数据契约.md' }] },
      workItems: [
        { id: 'w1', title: '示例·前端重构 v3：业务对象关系与写入语义', status: '进行中', trigger: { text: 'Codex 需求审查：卡片有了，对象关系和处理结果没成立', ref: { source: 'V02', label: '前端需求深化', path: `${PJ}/审查/前端需求深化.md` } }, change: '多事实材料、审批闭环、决策回应持久化、项目四视图、写入回执', criteria: ['S01–S26 场景在样例数据上可走通', '写入失败保留输入'], version: 'v3', checks: [{ kind: '本地检查', state: '通过', note: 'tsc + vite build', at: at(0, '09:30') }, { kind: '浏览器效果', state: '通过', note: 'Playwright 截图', at: at(0, '09:35') }, { kind: '真实设备', state: '未做' }, { kind: '用户认可', state: '等待' }], gaps: ['未接真实 Vault'], nextOwner: '我', decisionIds: ['d02'], actionIds: ['a02', 'a08'], updatedAt: at(0, '09:40') },
        { id: 'w2', title: '示例·挂载可选示例视图', status: '未开始', trigger: { text: '前端稳定后' }, change: '把 dist 作为插件视图加载', criteria: ['在 Obsidian 标签页打开', '跟随 Obsidian 主题'], checks: [{ kind: '本地检查', state: '未做' }, { kind: '真实设备', state: '未做' }, { kind: '用户认可', state: '未做' }], gaps: ['插件挂载方式待确认'], nextOwner: 'AI', decisionIds: [], actionIds: [], updatedAt: at(-1, '10:00') },
        { id: 'w0', title: '示例·前端重构 v2：去侧栏、画板、整理模式', status: '已完成', version: 'v2', trigger: { text: '合成需求：统一导航入口' }, change: '顶栏 + 画板 + 卡片完整页', criteria: ['无侧栏', '整理可取消'], checks: [{ kind: '本地检查', state: '通过' }, { kind: '浏览器效果', state: '通过' }, { kind: '用户认可', state: '通过', note: '合成验收记录，仅演示状态' }], gaps: [], nextOwner: 'AI', decisionIds: [], actionIds: [], updatedAt: at(-1, '23:30') },
      ],
      refreshes: [{ kind: '普通读取', at: at(0, '09:40'), status: 'ok', note: '读取 Git 与当前交接' }, { kind: 'AI 语义刷新', at: at(-2, '22:00'), status: 'ok', note: '重写跟进摘要' }, { kind: '投递', at: at(-1, '21:05'), status: 'ok', note: 'd02 的回答已投递给项目' }],
    },
    {
      id: 'p01c', name: '示例行动卡', ownership: '卡片模块', parentId: 'p01', status: '进行中', stage: '审批队列', path: '系统/项目/个人AI仪表盘-今日安排.md', asOf: at(0, '08:00'),
      purpose: '今天该做什么、待采纳从哪来。', scenario: '早上和下午各看一次。', scope: { in: ['待采纳分组', '行动全生命周期'], out: ['日历同步'] }, doneDef: ['逾期/今天/未排期/之后/已完成/归档 都能找到'],
      requirements: [{ id: 'rc1', text: '采纳才创建行动，按来源去重', state: '有效', ref: { source: 'V02', label: '跨卡合同 14', path: `${PJ}/架构/14-跨卡.md` } }],
      modules: [{ name: '待采纳队列', duty: '按来源分组的推送', io: '读：系统/收集处理/', deps: [], status: '进行中' }],
      docs: [{ label: '今日安排 卡片规格', path: `${PJ}/卡片/01-今日安排.md`, role: '权威' }],
      follow: { next: '随 v3 一起交付', owner: 'AI', asOf: at(0, '08:00') },
      eng: { registered: true, reachable: true, repo: '示例工程/仪表盘', branch: 'frontend-v3', asOf: at(0, '09:40'), note: '与父项目同仓库；父项目的提交不算这张卡自己的完成证据' },
      handoff: { lastReliable: { text: '审批分组交互已定', at: at(0, '09:00') }, unfinished: ['拖拽排序的真实写回'], failed: [], resumeWith: [] },
      workItems: [], refreshes: [],
    },
    {
      id: 'p06', name: '示例收集管线', ownership: '卡片模块', parentId: 'p01', status: '等待用户', stage: '采集扩展 0.5.0', path: '系统/项目/信息收集管线.md', asOf: at(-5, '21:00'),
      purpose: '多平台本人收藏 → 有来源的材料。', scenario: '每周一两次手动采集。', scope: { in: ['X / B站 / 小黑盒 / YouTube / Reddit'], out: ['自动定时采集', '采别人的内容'] }, doneDef: ['每次采集有回执：新增 / 重复 / 失败 / 缺媒体'],
      requirements: [{ id: 'rq1', text: '收集阶段不调用 AI', state: '有效', ref: { source: 'V02', label: '收藏合同 13', path: `${PJ}/架构/13-收藏.md` } }],
      modules: [{ name: 'X', duty: '书签', io: '浏览器采集 / 导入 JSON', deps: [], status: '部分完成' }, { name: 'B站', duty: '指定收藏夹 + 字幕', io: '浏览器采集', deps: [], status: '部分完成' }, { name: '小黑盒', duty: '收藏', io: '浏览器采集', deps: [], status: '准备中' }],
      docs: [{ label: '管线文档', path: `${PJ}/卡片/08-信息收集.md`, role: '权威' }],
      follow: { next: '你重载扩展并确认权限（d03）', owner: '我', blocker: '扩展需要本人确认权限', asOf: at(-5, '21:00') },
      eng: { registered: true, reachable: true, repo: '示例工程/仪表盘', branch: 'collector-0.5', head: '0000004', dirty: 0, asOf: at(-5, '21:00') },
      handoff: { lastReliable: { text: '0.5.0 本地实现 + 夹具验证', at: at(-5, '21:00') }, unfinished: ['真实回执'], failed: ['小黑盒登录态过期'], resumeWith: [] },
      workItems: [], refreshes: [{ kind: '普通读取', at: at(-1, '09:00'), status: 'ok', note: '' }],
    },
    {
      id: 'p04', name: '示例阅读器', ownership: '产品项目', status: '等待用户', stage: '阅读器 v2', path: '系统/项目/示例阅读器.md', asOf: at(-4, '18:20'),
      purpose: '收藏的视频和文章能真正被读：材料列表、导入、阅读器、批注与归档。', scenario: '周末集中读收藏。', scope: { in: ['导入', '阅读器', '批注'], out: ['推荐算法'] }, doneDef: ['一条 B站收藏能从导入读到批注归档'],
      requirements: [{ id: 'rp1', text: '原文不可被摘要覆盖', state: '有效', ref: { source: 'C04', label: '示例阅读器 架构', path: '示例工程/示例阅读器/docs/project/架构.md' } }],
      modules: [{ name: '导入任务', duty: '拉取字幕和正文', io: '读：材料/B站', deps: ['信息收集管线'], status: '已完成' }, { name: '阅读器', duty: '分页与时间轴', io: '—', deps: ['导入任务'], status: '等待用户' }, { name: '批注', duty: '高亮 + 笔记', io: '写：知识库/', deps: ['阅读器'], status: '未开始' }],
      docs: [{ label: '当前交接', path: '示例工程/示例阅读器/docs/project/当前交接.md', role: '权威', at: at(-4, '18:20') }, { label: '路线图', path: '示例工程/示例阅读器/docs/project/路线图.md', role: '权威' }],
      follow: { current: 'w41', next: '你验收字幕阅读样例（d01）', owner: '我', asOf: at(-4, '18:20') },
      eng: { registered: true, reachable: false, repo: '示例工程/示例阅读器', branch: 'main', head: '0000005', asOf: at(-4, '18:20'), note: '示例工程端口 本次读取超时；以下是 4 天前的快照' },
      handoff: { lastReliable: { text: '字幕阅读 v2 样例生成', at: at(-4, '18:20') }, unfinished: ['批注'], failed: [], resumeWith: [{ source: 'C04', label: '当前交接', path: '示例工程/示例阅读器/docs/project/当前交接.md' }] },
      workItems: [{ id: 'w41', title: '示例·字幕阅读器 v2', status: '待验收', version: 'v2', trigger: { text: 'v1 长段落不可读', ref: { source: 'C04', label: 'v1 反馈' } }, change: '分页、时间轴、中英混排断行', criteria: ['样例 2 长段落可连续读', '样例 3 不错位', '时间轴可跳转'], checks: [{ kind: '本地检查', state: '通过', at: at(-4, '18:00') }, { kind: '浏览器效果', state: '通过', at: at(-4, '18:10') }, { kind: '真实设备', state: '未做' }, { kind: '用户认可', state: '等待' }], gaps: ['时间轴只做了本地检查'], nextOwner: '我', decisionIds: ['d01'], actionIds: ['a04'], updatedAt: at(-4, '18:20') }],
      refreshes: [{ kind: '普通读取', at: at(0, '09:40'), status: 'failed', note: '工程服务读取超时' }],
    },
    {
      id: 'p03', name: '示例专注工具', ownership: '独立工具', status: '部分完成', stage: '待修改后重新签收', path: '系统/项目/专注计时.md', asOf: at(-3, '20:00'),
      purpose: '专注监督：当前任务、窗口、走神纠错。', scenario: '写作业、写代码时开一场。', scope: { in: ['本机服务', '状态投影', '嵌入卡'], out: ['仪表盘重写计时'] }, doneDef: ['卡片与服务同一场次', '实机签收'],
      requirements: [{ id: 'rn1', text: '关卡片不等于停服务', state: '有效', ref: { source: 'V02', label: '画布架构 11', path: `${PJ}/架构/11-画布.md` } }],
      modules: [{ name: '本地服务', duty: '计时与监督', io: 'loopback API + SQLite', deps: [], status: '进行中' }, { name: '状态投影', duty: '写可读快照', io: '写：系统/专注计时/专注计时实时状态.md', deps: ['本地服务'], status: '已完成' }],
      docs: [{ label: '专注计时当前交接', path: '示例工程/专注计时/docs/project/当前交接.md', role: '权威' }],
      follow: { next: '按 d05 反馈修改后重新提请求', owner: 'AI', asOf: at(-3, '20:00') },
      eng: { registered: true, reachable: true, repo: '示例工程/专注计时', branch: 'main', head: '0000006', dirty: 2, asOf: at(-1, '23:00') },
      handoff: { lastReliable: { text: '合成部署演示', at: at(-20, '22:00') }, unfinished: ['按钮挤压', '暂停延迟'], failed: [], resumeWith: [] },
      workItems: [], refreshes: [],
    },
    {
      id: 'p05', name: '示例群日报', ownership: '独立工具', status: '部分完成', stage: '多群小样', path: '系统/项目/QQ群日报.md', asOf: at(-2, '21:00'),
      purpose: '白名单群的覆盖状态、原文、日报精选。', scenario: '示例通知不漏，闲聊不打扰。', scope: { in: ['白名单群只读采集'], out: ['私聊', '发消息', '自动监听'] }, doneDef: ['每次收集逐群回执'],
      requirements: [{ id: 'rq5', text: '不发消息、不采私聊', state: '有效', ref: { source: 'V02', label: '接入规则', path: `${PJ}/架构/05-数据.md` } }],
      modules: [{ name: 'QQ 只读采集', duty: 'NapCat 按需启停', io: '写：系统/信息接入/QQ/', deps: [], status: '部分完成' }],
      docs: [{ label: 'QQ 接入文档', path: `${PJ}/卡片/09-QQ.md`, role: '权威' }],
      follow: { next: '回答 d04 图片追源深度', owner: '我', asOf: at(-2, '21:00') },
      eng: { registered: true, reachable: true, repo: '示例工程/qq-reader', branch: 'main', head: '0000007', dirty: 0, asOf: at(-2, '21:00') },
      handoff: { lastReliable: { text: 'qq-b07 三群收集（一群失败）', at: at(-2, '21:00') }, unfinished: ['失败群重试'], failed: ['示例资料群：登录态失效'], resumeWith: [] },
      workItems: [], refreshes: [],
    },
    {
      id: 'p02', name: '示例画布 · DemoCanvas', ownership: '产品项目', status: '受阻', stage: '可用原型', path: '系统/项目/DemoCanvas.md', asOf: at(-12, '20:00'),
      purpose: '把工程的想法、需求、对话、模块、验收放在一张可回看的画布。', scenario: '开新工程前梳理。', scope: { in: ['画布', '对话关联'], out: [] }, doneDef: ['与工程总览职责收口'],
      requirements: [], modules: [], docs: [{ label: '当前交接', path: '示例工程/DemoCanvas/docs/project/当前交接.md', role: '权威' }],
      follow: { next: '决定与工程总览的边界', owner: '我', blocker: '与工程总览职责重叠', asOf: at(-12, '20:00') },
      eng: { registered: true, reachable: undefined, asOf: at(-12, '20:00'), note: '12 天未读取，现场未知' },
      handoff: { lastReliable: { text: '画布与对话联动', at: at(-12, '20:00') }, unfinished: ['自动拆解'], failed: [], resumeWith: [] }, workItems: [], refreshes: [],
    },
    {
      id: 'p08', name: '示例助手', ownership: '产品项目', status: '未开始', stage: '想法', path: '系统/项目/示例助手.md', asOf: at(-2, '16:10'),
      purpose: 'AI 在合适时机主动问我、帮我整理。', scenario: '—', scope: { in: [], out: [] }, doneDef: [],
      requirements: [{ id: 'rl1', text: '主动建议出现的时机', state: '待确认', ref: { source: 'A02', label: 'DEMO-008', path: '示例数据/随想/主动 Agent 想法.md', anchor: '#DEMO-008' } }],
      modules: [], docs: [], follow: { next: '先想清楚时机', owner: '我', asOf: at(-2, '16:10') },
      eng: { registered: false, note: '还没有登记工程：没有仓库、分支或交接文档。这里只有想法和材料。' },
      handoff: { lastReliable: { text: '—', at: at(-2, '16:10') }, unfinished: [], failed: [], resumeWith: [] }, workItems: [], refreshes: [],
    },
  ];
}

export function diary(): DiaryDay[] {
  const mk = (n: number, st: [DiaryDayState, DiaryDayState, DiaryDayState], texts: [string?, string?, string?] = []): DiaryDay => {
    const date = addDays(today(), n), dir = diaryDir(date);
    const kinds = ['用户原文', '生活日记整理版', 'AI项目日志'] as const;
    return { date, files: kinds.map((k, i) => ({ kind: k, path: `${dir}/${date}_${k}.md`, state: st[i], text: st[i] === 'exists' ? texts[i] ?? '' : st[i] === 'empty' ? '' : undefined, mtime: st[i] === 'exists' || st[i] === 'empty' ? at(n, '23:40') : undefined, error: st[i] === 'failed' ? 'frontmatter 解析失败：第 3 行缩进不对' : undefined })) };
  };
  return [
    mk(0, ['exists', 'missing', 'empty'], ['合成日记：今天阅读一篇示例文章，并尝试整理一条笔记。\n\n下一次检查材料与行动的引用关系。']),
    mk(-1, ['exists', 'exists', 'exists'], ['合成日记：今天完成一个页面草图，留下两条交互问题供下次检查。', '## 合成整理示例\n- 阅读示例材料\n- 记录一个问题\n\n## 明天\n- 完成示例练习第 1 章', '## 合成项目日志\n- 完成一个示例草图\n- 下次检查交互与引用关系']),
    mk(-2, ['exists', 'failed', 'missing'], ['合成日记：示例作品评审改期，分组图片尚未取得。']),
    mk(-3, ['missing', 'missing', 'missing']),
  ];
}
type DiaryDayState = 'exists' | 'missing' | 'empty' | 'failed';

export const library = (): LibraryDoc[] => [
  { id: 'l1', title: '示例模板 A 模板拆解', path: '知识库/收集整理/信息收集/X/示例模板 A 模板拆解.md', source: '信息收集', scope: 'X', at: at(-1, '00:06'), materialId: 'm04', nodeId: 'k6', text: '## 合成笔记\n示例模板 A 用字段组织列表。\n\n## 来源\n合成文章与示例视频。\n\n## 示例观察\n- 保留来源与材料版本\n- 每个区块给出清楚的操作' },
  { id: 'l2', title: '示例作品评审通知（整理）', path: '知识库/收集整理/QQ/示例通知群/示例作品评审通知.md', source: 'QQ', scope: '示例通知群', at: at(-2, '22:10'), materialId: 'm09', text: '- 答辩：下周四上午\n- 初稿：周一前交示例协调员邮箱\n- 分组：见原图（未读取）' },
  { id: 'l3', title: '示例课程：齿轮强度', path: '示例数据/资料/示例课程/齿轮强度.md', source: '资料与教程', scope: '手工', at: at(-7, '20:05'), text: '弯曲强度、接触强度两条校核路线……' },
  { id: 'l4', title: '示例阅读器 阅读器 v2 说明', path: '知识库/收集整理/工程/示例阅读器/阅读器v2.md', source: '工程', scope: '示例阅读器', at: at(-4, '18:30'), text: '分页规则、时间轴、断行策略。' },
];
export const receipts = (): Receipt[] => [
  { id: 'rc0', op: 'capture', label: '随手记：合成随想：把示例讨论按主题归档', at: at(0, '09:30'), status: 'ok', path: INBOX, targetId: 'm01' },
];
export const refOf = (r: Ref) => r;
