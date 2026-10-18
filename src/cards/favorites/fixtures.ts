import { at } from '../../data/time';
import type { Cue, FavData, FavItem, Img, Rec, Task } from './model';

/**
 * 完全合成的演示数据（DEMO-01…24）。链接一律 https://example.com/demo/…，路径只作展示。
 * 不含任何真实账号、真实帖子或真实文件。
 */
const U = (p: string) => `https://example.com/demo/${p}`;
const img = (id: string, label: string, w: number, h: number, hue: number, o: Partial<Img> = {}): Img => ({ id, label, w, h, hue, ...o });
const sys = (n: number, hm: string, text: string) => ({ at: at(n, hm), by: '系统' as const, text });

/* DEMO-04 合成字幕片段 */
const CUES4: Cue[] = [
  { s: 0, e: 8, text: '这是合成字幕的第一句，我们先说明材料的来源。', tr: 'This is the first synthetic caption. We begin with its source.' },
  { s: 8, e: 17, text: '读过和理解是两件事，保存文件也不是理解的证明。', tr: 'Reading and understanding are separate. Saving a file is not proof of understanding.' },
  { s: 17, e: 28, text: '如果只想以后使用，可以留下用途批注，不必现在写完整心得。', tr: 'A short note about future use is enough when you are saving a reference.' },
  { s: 28, e: 40, text: '这是合成字幕的最后一句，所有时间轴都应可以找到。', tr: 'This is the last synthetic caption. Every timestamp should remain reachable.' },
];
/* DEMO-05 长字幕：首尾唯一，「检索点」出现三次 */
const POOL = ['先把今天的范围说清楚，免得后面跑题。', '这一段讲的是怎么给材料起一个能找回来的名字。', '名字不用漂亮，关键是半年后的自己能认出来。', '接下来看一个反例：所有东西都叫「新建笔记」。',
  '标签可以有，但别指望标签替你理解内容。', '我们换个角度，看看来源信息为什么要留着。', '如果来源丢了，你连这句话是谁说的都不知道。', '这里停一下，回头看刚才那个例子。',
  '有人问要不要每条都写心得，我的答案是不用。', '只写一句用途就够了：以后在什么场合会用到它。', '再往下是关于主题目录的讨论。', '主题目录是放材料的地方，不是放结论的地方。'];
export const LONG_FIRST = '这是长字幕样例的第一句：今天只讲一件事，怎么让材料以后找得回来。';
export const LONG_LAST = '这是长字幕样例的最后一句：谢谢看到最后，散会。';
const CUES5: Cue[] = Array.from({ length: 240 }, (_, i) => {
  const s = i * 10;
  const text = i === 0 ? LONG_FIRST : i === 239 ? LONG_LAST : [37, 121, 203].includes(i) ? `第 ${[37, 121, 203].indexOf(i) + 1} 个检索点：这一句是专门用来测试搜索能跳过去的。` : `${POOL[i % POOL.length]}（第 ${i + 1} 句）`;
  return { s, e: s + 10, text };
});
/* DEMO-06 机器转写，部分（03:10–05:40 缺失）+ DEMO-09 双语部分失败 */
const CUES6: Cue[] = [
  { s: 0, e: 9, text: 'Welcome back. Today is about keeping notes you can actually find later.', tr: '欢迎回来。今天讲怎么留下以后真的找得到的笔记。' },
  { s: 9, e: 21, text: 'The first rule: always keep where something came from.', tr: '第一条：永远留着它从哪里来。' },
  { s: 21, e: 35, text: 'Second, write one line about why you saved it.' },
  { s: 35, e: 190, text: 'Third, a topic folder is a shelf, not a verdict.', tr: '第三，主题文件夹是书架，不是结论。' },
  { s: 340, e: 352, text: 'So that is the whole idea. Thanks for watching.', tr: '这就是全部想法。谢谢观看。' },
];

const ARTICLE = [
  '整理桌面资料时，先把来源留清楚，再决定以后如何使用。',
  '第一步，把文章、图片和视频文字放回各自来源，保留链接与时间。',
  '第二步，写一句用途批注。只是以后查阅的材料可以直接入库，有疑问的内容可以我自己处理。',
  '第三步，选择主题时仍然保留原文和批注。把材料存好，不代表已经形成自己的理解。',
];

const base = (o: Partial<FavItem> & Pick<FavItem, 'id' | 'platform' | 'title' | 'body'>): FavItem => ({
  nature: '收藏', url: U(o.id), importedAt: at(-2, '21:00'), topic: '未归类', status: '待处理', version: 1, versions: [{ v: 1, at: o.importedAt ?? at(-2, '21:00'), note: '首次取得' }], history: [sys(-2, '21:00', '导入')], ...o,
});

export function demoItems(): FavItem[] {
  const list: FavItem[] = [
    base({ id: 'f01', platform: 'web', nature: '非收藏链接', title: '示例·整理桌面资料的四个步骤', author: '示例作者', url: U('article/desk-steps'), publishedAt: at(-12, '10:00'), importedAt: at(-3, '20:10'), topic: '资料整理',
      body: { state: '完整', blocks: [{ t: 'p', text: ARTICLE[0] }, { t: 'p', text: ARTICLE[1] }, { t: 'img', img: img('f01-1', '示例插图：来源卡片', 1200, 640, 210) }, { t: 'p', text: ARTICLE[2] }, { t: 'img', img: img('f01-2', '示例插图：两种用途', 1200, 700, 150) }, { t: 'p', text: ARTICLE[3] }] },
      summary: [ARTICLE[0], ARTICLE[3]], aiSample: '（AI 概括 · 样例）文章给出整理资料的顺序：先留来源，再写一句用途批注，最后放进主题；并提醒存好不等于理解。依据：已取得的完整正文。',
      status: '已分流', read: at(-3, '20:30'), history: [sys(-3, '20:10', '你粘贴了链接（非收藏）'), { at: at(-3, '20:30'), by: '我', text: '标记已读' }, { at: at(-3, '20:40'), by: '我', text: '直接入库（r01）' }, { at: at(-2, '22:00'), by: '我', text: '我自己处理（r02）' }] }),
    base({ id: 'f02', platform: 'bili', title: '示例·资料整理的三种节奏', author: '示例UP主', url: U('bili/rhythm'), publishedAt: at(-20, '19:00'), importedAt: at(-1, '22:05'), folders: ['示例·工具资料', '示例·课程'], topic: '资料整理',
      body: { state: '完整', intro: '简介（原文）：这期聊三种整理节奏。字幕为平台自动字幕。', blocks: [] },
      video: { mode: 'locatable', duration: 40 }, tracks: [{ id: 't2', kind: '平台自动字幕', lang: '中文', state: '完整', cues: CUES4, at: at(-1, '22:06'), note: '平台自动生成，可能有错字' }],
      summary: [CUES4[0].text, CUES4[3].text], aiSample: '（AI 概括 · 样例）视频说明读过、理解、保存是三件不同的事；只想以后用的材料留一句用途批注即可。依据：完整的平台自动字幕。',
      history: [sys(-1, '22:05', 'B站收藏夹「示例·工具资料」核对：新增'), sys(-1, '22:05', 'B站收藏夹「示例·课程」核对：同一视频，记为第二个出处')] }),
    base({ id: 'f03', platform: 'bili', title: '示例·一场很长的分享（长字幕）', author: '示例讲者', url: U('bili/long-talk'), publishedAt: at(-30, '20:00'), importedAt: at(-1, '22:05'), folders: ['示例·课程'], topic: '资料整理',
      body: { state: '完整', intro: '简介（原文）：四十分钟的合成分享，用来演示连续长字幕。', blocks: [] },
      video: { mode: 'locatable', duration: 2400 }, tracks: [{ id: 't3', kind: '平台字幕', lang: '中文', state: '完整', cues: CUES5, at: at(-1, '22:07') }],
      summary: [LONG_FIRST, CUES5[1].text, LONG_LAST], aiSample: '（AI 概括 · 样例）分享围绕「材料以后找得回来」：起名、留来源、一句用途、主题目录只是书架。依据：完整字幕 240 段。' }),
    base({ id: 'f04', platform: 'yt', title: 'Sample · Notes you can find later', author: 'Sample Channel', url: U('yt/notes'), publishedAt: at(-40, '08:00'), importedAt: at(-4, '09:00'), topic: '资料整理',
      body: { state: '完整', intro: 'Description (original): a synthetic talk about note-taking.', blocks: [] },
      video: { mode: 'locatable', duration: 352 }, tracks: [{ id: 't4', kind: '机器转写', lang: 'English', state: '部分', model: '示例转写模型', cues: CUES6, at: at(-4, '09:20'), note: '没有平台字幕；机器转写在 03:10–05:40 缺一段（音频读取中断），内容可能不准确，需核查' }],
      summary: [CUES6[0].text, CUES6[4].text], summaryPartial: true, aiSample: '(AI summary · sample) Keep the source, write one line on why, treat topic folders as shelves. Based on a PARTIAL machine transcript.' }),
    base({ id: 'f05', platform: 'douyin', title: '示例·一条只有标题的视频', author: '示例作者', url: U('douyin/title-only'), importedAt: at(-1, '23:00'), topic: '未归类',
      body: { state: '仅元信息', intro: '简介：#整理 #效率（只取得了标题和简介）', blocks: [] }, video: { mode: 'restricted', note: '播放地址已过期，需要回原站' }, tracks: [] }),
    base({ id: 'f06', platform: 'douyin', title: '示例·纯音乐延时摄影', url: U('douyin/no-speech'), importedAt: at(-1, '23:00'), topic: '未归类',
      body: { state: '完整', intro: '简介：一段没有人声的延时摄影。', blocks: [] }, video: { mode: 'restricted', note: '抖音当前页不可嵌入，可回原站播放' },
      tracks: [{ id: 't6', kind: '机器转写', lang: '—', state: '无语音', cues: [], note: '检测范围 00:00–01:12：未检测到人声。这不是转写成功，也不代表平台没有字幕。' }] }),
    base({ id: 'f07', platform: 'yt', title: 'Sample · Members-only lecture', url: U('yt/members'), importedAt: at(-4, '09:00'), topic: '未归类',
      body: { state: '仅元信息', intro: 'Description only.', blocks: [] }, video: { mode: 'restricted', note: '会员 / 地区限制：当前账号不能播放' },
      tracks: [{ id: 't7', kind: '机器转写', lang: '—', state: '音频受限', cues: [], note: '取不到音频（会员限制），没法转写；简介不能代替字幕。' }] }),
    base({ id: 'f08', platform: 'bili', title: '示例·转写失败的一期', author: '示例UP主', url: U('bili/asr-failed'), importedAt: at(-1, '22:05'), folders: ['示例·工具资料'], topic: '工具与工作流',
      body: { state: '完整', intro: '简介（原文）：一期没有平台字幕的视频。', blocks: [] }, video: { mode: 'locatable', duration: 600 },
      tracks: [{ id: 't8', kind: '机器转写', lang: '中文', state: '失败', cues: [], retryable: true, note: '转写服务返回错误（样例）：可以重试；平台没有字幕' }] }),
    base({ id: 'f09', platform: 'x', title: 'Sample · Three photos of a tidy desk', author: '@sample_user', url: U('x/tidy-desk'), publishedAt: at(-5, '07:30'), importedAt: at(-2, '21:00'), topic: '资料整理',
      body: { state: '完整', blocks: [
        { t: 'p', text: 'Tidied my desk notes this weekend. Source first, then one line on why I kept it.', tr: '周末整理了桌面笔记。先留来源，再写一句为什么留着它。', trState: 'ok' },
        { t: 'gallery', style: 'grid', imgs: [img('f09-1', '照片 1', 1000, 1000, 30), img('f09-2', '照片 2', 1000, 1300, 60), img('f09-3', '照片 3', 1600, 900, 90)] },
      ] },
      replies: { scope: '本次取得 3 条回复（线程未全量；嵌套回复未取得）', items: [
        { id: 'x1', who: '@reply_a', text: 'Do you tag everything too?', tr: '你也给每条都打标签吗？', trState: 'ok' },
        { id: 'x2', who: '@sample_user', text: 'Only topics. Tags never told me what I understood.', trState: 'failed', quote: '@reply_a', imgs: [img('x2-1', '回复配图', 900, 600, 120)] },
        { id: 'x3', who: '@reply_b', text: '👍🔥' },
      ] },
      summary: ['Tidied my desk notes this weekend. Source first, then one line on why I kept it.'], aiSample: '(AI summary · sample) Short post: keep source, write one line why. Based on full text; replies not included.' }),
    base({ id: 'f10', platform: 'xhh', title: '示例·桌搭整理全记录', author: '示例玩家', url: U('xhh/desk'), publishedAt: at(-8, '13:00'), importedAt: at(-2, '21:30'), topic: '设计',
      body: { state: '完整', blocks: [
        { t: 'gallery', style: 'top', imgs: [img('f10-g1', '顶部图 1', 1200, 800, 15), img('f10-g2', '顶部图 2', 1200, 800, 45), img('f10-g3', '顶部图 3', 1200, 800, 75, { missing: '图片地址过期（样例）', retryOk: true }), img('f10-g4', '顶部图 4', 1200, 800, 105)] },
        { t: 'p', text: '先说结论：桌面上的东西越少，找资料越快。下面按区域说。' },
        { t: 'img', img: img('f10-1', '段中图：左侧收纳', 1200, 900, 180) },
        { t: 'p', text: '左边放每天用的，右边放一周用一次的。抽屉里只放有标签的盒子。' },
        { t: 'img', img: img('f10-2', '段中图：抽屉', 1200, 900, 200, { missing: '图片超过单张大小限制（样例），未取得' }) },
        { t: 'p', text: '最后，线材全部走桌底，桌面只留一根。' },
      ] },
      replies: { scope: '已加载评论 2 条（平台默认只加载前几条）', items: [
        { id: 'h1', who: '示例网友A', text: '抽屉盒子哪里买的？', imgs: [img('h1-1', '评论图', 800, 800, 260)] },
        { id: 'h2', who: '示例网友B', text: '线材那步最有用。', imgs: [img('h2-1', '评论图', 800, 600, 290, { missing: '评论图片未取得（样例）' })] },
      ] },
      summary: ['先说结论：桌面上的东西越少，找资料越快。下面按区域说。', '最后，线材全部走桌底，桌面只留一根。'] }),
    base({ id: 'f11', platform: 'xhs', title: '示例·九张图讲清楚资料夹分类', author: '示例博主', url: U('xhs/nine'), publishedAt: at(-6, '18:00'), importedAt: at(-2, '21:40'), topic: '资料整理',
      body: { state: '完整', blocks: [
        { t: 'gallery', style: 'xhs', imgs: Array.from({ length: 9 }, (_, i) => img(`f11-${i + 1}`, i === 5 ? `第 ${i + 1} 张（长图）` : `第 ${i + 1} 张`, 1080, i === 5 ? 4200 : 1440, 330 + i * 9)) },
        { t: 'p', text: '资料夹分三类：正在用的、以后可能用的、只是留个纪念的。第六张是长图，把每一类的例子都列出来了。' },
      ] },
      replies: { scope: '本次取得 1 条评论', items: [{ id: 's1', who: '示例网友C', text: '长图太有用了，收藏。' }] },
      summary: ['资料夹分三类：正在用的、以后可能用的、只是留个纪念的。'] }),
    base({ id: 'f12', platform: 'x', title: 'Sample · A video-only bookmark', author: '@sample_video', url: U('x/video-only'), publishedAt: at(-3, '12:00'), importedAt: at(-2, '21:00'), topic: '未归类',
      body: { state: '仅元信息', blocks: [] }, video: { mode: 'link-only', note: '视频原链接，未取得视频文字；当前页不能播放或定位' }, tracks: [] }),
    base({ id: 'f13', platform: 'xhs', title: '示例·还没空看的一篇', author: '示例博主', url: U('xhs/later'), importedAt: at(-2, '21:40'), topic: '未归类', status: '以后读',
      body: { state: '完整', blocks: [{ t: 'p', text: '这是一条被放进「以后读」的样例：没有读过、没有批注、也没有日期。' }] }, summary: ['这是一条被放进「以后读」的样例：没有读过、没有批注、也没有日期。'],
      history: [sys(-2, '21:40', '导入'), { at: at(-1, '08:00'), by: '我', text: '以后读' }] }),
    base({ id: 'f14', platform: 'xhh', title: '示例·已经回收的一篇', url: U('xhh/trashed'), importedAt: at(-6, '21:00'), topic: '游戏', trashed: at(-1, '09:00'),
      body: { state: '完整', blocks: [{ t: 'p', text: '回收站里的原始材料样例。再次导入时不会被当作新收藏加回来。' }] } }),
    base({ id: 'f15', platform: 'bili', title: '示例·字幕处理中', author: '示例UP主', url: U('bili/asr-running'), importedAt: at(0, '08:40'), folders: ['示例·工具资料'], topic: '工具与工作流',
      body: { state: '完整', intro: '简介（原文）：正在转写的一期。', blocks: [] }, video: { mode: 'locatable', duration: 900 },
      tracks: [{ id: 't15', kind: '机器转写', lang: '中文', state: '处理中', cues: [], note: '正在转写：已处理 6 / 15 分钟音频' }] }),
  ];
  /* DEMO-23：超过首屏数量的同一筛选结果 */
  for (let i = 1; i <= 48; i++) list.push(base({ id: `fb${String(i).padStart(2, '0')}`, platform: 'x', title: `示例·批量材料 ${String(i).padStart(2, '0')}`, author: '@sample_bulk', url: U(`x/bulk-${i}`), importedAt: at(-9, `${String(8 + (i % 12)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`), topic: '批量样例',
    body: { state: i % 7 === 0 ? '部分' : '完整', blocks: [{ t: 'p', text: `批量样例第 ${i} 条，用来演示全选覆盖未显示的结果。${i % 5 === 0 ? '这条含关键词：桌面。' : ''}` }] }, demoFail: i === 3 || i === 17,
    summary: [`批量样例第 ${i} 条，用来演示全选覆盖未显示的结果。`] }));
  return list;
}

export function demoRecs(): Rec[] {
  return [
    { id: 'r01', itemId: 'f01', kind: 'ref', note: '以后整理资料目录时参考四个步骤。', at: at(-3, '20:40'), basisVersion: 1, status: '已归位', location: '系统/收藏/资料/示例·整理桌面资料的四个步骤.md',
      myNotes: '', rounds: [], placed: { topic: '资料整理', path: '知识库/主题/资料整理/可调用材料/示例·整理桌面资料的四个步骤.md', from: '系统/收藏/资料/', at: at(-1, '21:00') },
      outputs: [], sharedAttachment: true, history: [{ at: at(-3, '20:40'), by: '我', text: '直接入库' }, { at: at(-1, '21:00'), by: '我', text: '主题归位：资料整理 · 可调用材料' }] },
    { id: 'r02', itemId: 'f01', kind: 'digest', note: '我还没想清楚资料和个人观点的边界，周末对照自己的笔记看看。', at: at(-2, '22:00'), basisVersion: 1, status: 'AI 待审', location: '系统/收藏/自己处理材料/示例·整理桌面资料的四个步骤.md',
      myNotes: '资料是别人的话 + 我为什么留；观点是我自己的判断，要单独写。',
      rounds: [
        { n: 1, goal: '帮我分清资料和观点', refs: ['示例笔记·资料与观点'], basis: 'note:v0', at: at(-2, '22:10'), state: 'ok', result: '（AI 整理 · 样例 · 第 1 轮）按你的批注：资料 = 原文 + 来源 + 用途；观点 = 你自己的判断。建议观点单独起稿。', seen: at(-2, '22:20'), comment: '第二点再具体一点' },
        { n: 2, goal: '结合我的加工笔记再整理一次', refs: ['示例笔记·资料与观点', '示例笔记·周复盘模板'], basis: 'note:v1', at: at(-1, '22:30'), state: 'ok', result: '（AI 整理 · 样例 · 第 2 轮）你的加工笔记已经把边界说清楚：「别人的话 + 我为什么留」是资料；判断要写进个人知识稿。可以在周复盘里列出本周新增的判断。' },
      ],
      draft: { text: '我的判断：资料只负责「以后找得到」，观点要我自己写，而且要能说出依据。', confirmedAt: at(-1, '23:00'), path: '知识库/我的知识稿/资料和观点的边界.md' },
      outputs: [], sharedAttachment: true, history: [{ at: at(-2, '22:00'), by: '我', text: '我自己处理' }, { at: at(-2, '22:10'), by: 'AI', text: '第 1 轮整理（你发起）' }, { at: at(-1, '22:30'), by: 'AI', text: '第 2 轮整理（你发起）' }, { at: at(-1, '23:00'), by: '我', text: '确认我的知识稿' }] },
    { id: 'r03', itemId: 'f10', kind: 'ref', note: '以后布置书桌时参考抽屉分区。', at: at(-2, '22:10'), basisVersion: 1, status: '待加工', location: '系统/收藏/资料/示例·桌搭整理全记录.md', myNotes: '', rounds: [], outputs: [], trashed: at(-1, '10:00'),
      history: [{ at: at(-2, '22:10'), by: '我', text: '直接入库' }, { at: at(-1, '10:00'), by: '我', text: '回收' }] },
  ];
}

export function demoTasks(): Task[] {
  const T = (o: Partial<Task> & Pick<Task, 'id' | 'kind' | 'platform' | 'label' | 'stage' | 'state'>): Task => ({ startedAt: at(0, '08:30'), updatedAt: at(0, '08:52'), ...o });
  return [
    T({ id: 'tk1', kind: '收藏列表', platform: 'yt', label: 'YouTube · 稍后观看 核对', stage: '读取列表（没有总数，已读到 37 条）', done: 37, state: 'running', cancellable: true, ticks: 9999 }),
    T({ id: 'tk2', kind: '正文', platform: 'xhh', label: '小黑盒 · 补正文 3 条', stage: '等待前一个任务', state: 'waiting' }),
    T({ id: 'tk3', kind: '图片', platform: 'xhh', itemId: 'f10', label: '补图：示例·桌搭整理全记录', stage: '下载图片', done: 1, total: 3, state: 'running', ticks: 9999 }),
    T({ id: 'tk4', kind: '字幕', platform: 'bili', itemId: 'f15', label: '转写：示例·字幕处理中', stage: '机器转写（6 / 15 分钟）', done: 6, total: 15, state: 'running', cancellable: true, ticks: 9999 }),
    T({ id: 'tk5', kind: '翻译', platform: 'x', itemId: 'f09', label: '双语：Sample · Three photos…', stage: '1 段回复翻译失败', state: 'failed', reason: '翻译服务超时（样例）', effect: 'tr-retry', arg: 'f09' }),
    T({ id: 'tk6', kind: '收藏列表', platform: 'xhs', label: '小红书 · 收藏标签 核对', stage: '停在第 2 页', state: 'blocked', reason: '平台要求本人验证（样例）：需要你在原站完成验证后再继续' }),
    T({ id: 'tk7', kind: '字幕', platform: 'bili', itemId: 'f08', label: '转写：示例·转写失败的一期', stage: '转写失败', state: 'failed', reason: '转写服务返回错误（样例）', effect: 'asr-retry', arg: 'f08' }),
    T({ id: 'tk8', kind: '阅读概要', platform: 'web', itemId: 'f01', label: 'AI 优化摘要：示例·整理桌面资料…', stage: '完成', state: 'done', startedAt: at(-1, '20:00'), updatedAt: at(-1, '20:01') }),
    T({ id: 'tk9', kind: '按批注整理', platform: 'web', recId: 'r02', label: '按批注整理：自己处理材料 r02 第 2 轮', stage: '完成', state: 'done', startedAt: at(-1, '22:29'), updatedAt: at(-1, '22:30') }),
    T({ id: 'tk10', kind: '收藏列表', platform: 'bili', label: 'B站 · 示例·工具资料 / 示例·课程 核对', stage: '完成（已确认到末尾）', state: 'done', done: 6, startedAt: at(-1, '22:00'), updatedAt: at(-1, '22:06') }),
  ];
}

export function demoData(): FavData {
  return {
    items: demoItems(), recs: demoRecs(), tasks: demoTasks(),
    accounts: { bili: '已登录', yt: '已保存未核验', douyin: '未接入', x: '已登录', xhh: '已过期', xhs: '需本人验证', reddit: '已保存未核验', web: '已登录' },
    folders: [{ id: 'bf1', name: '示例·工具资料', count: 3 }, { id: 'bf2', name: '示例·课程', count: 2 }, { id: 'bf3', name: '示例·稍后再看', count: 4 }],
    lastRun: { bili: { at: at(-1, '22:06'), scope: ['示例·工具资料', '示例·课程'] }, xhs: { at: at(0, '08:40'), scope: ['收藏标签「示例」'], stopAt: '第 2 页（平台验证）' } },
    imports: [], purged: [{ url: U('xhh/purged'), title: '示例·已永久删除的帖子', at: at(-4, '10:00') }],
    drafts: {
      'raw:f02:ref': { text: '以后讲整理节奏时引用 00:08 那句', at: at(-1, '23:10') },
      'raw:f09:digest': { text: 'Tags never told me what I understood — 这句想想', at: at(-1, '23:12') },
      'rec:r01': { text: '（未保存的加工草稿）目录按「用途」分，而不是按平台分？', at: at(-1, '23:20') },
    },
    demo: { feed: 'live', ai: 'ok' },
    locations: { raw: '系统/收藏/原始材料/<平台>/', ref: '系统/收藏/资料/', digest: '系统/收藏/自己处理材料/', topic: '知识库/主题/<主题>/', attach: '<材料同名>.assets/', trash: '系统/收藏/回收站/', knowledge: '知识库/我的知识稿/' },
    bilingual: false,
  };
}
