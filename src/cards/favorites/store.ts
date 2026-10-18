import { flowPath, resolveRoute } from '../../data/settings';
import { store, type Material } from '../../data';
import { cardStore } from '../../data/cardStore';
import { at, nowIso } from '../../data/time';
import type { Hist } from '../../data/types';
import { demoData } from './fixtures';
import { PF } from './platforms';
import { REC_NAME, type FavData, type FavItem, type ImportRow, type Nature, type Platform, type Rec, type RecKind, type Task, type TaskKind, type Track } from './model';

/**
 * 收藏的私有数据（前端阶段：localStorage['pkd.v5.card.favorites.v1']，样例按天重新生成）。
 * 接入后端时只换这个文件里的实现；界面只调用这里导出的函数。
 * 跨卡只走两条公开通道：store.upsertProjection（把条目投影给宿主）和宿主已有的去向函数（行动 / 待采纳 / 项目）。
 */
const PLAT_OF: Record<string, Platform> = { x: 'x', bili: 'bili', xhh: 'xhh', reddit: 'reddit', yt: 'yt' };
/** 宿主共享样例里 home = favorites 的材料：同一来源，不复制第二份 */
function sharedItems(): FavItem[] {
  return store.db.materials.filter((m) => m.home?.card === 'favorites').map((m) => ({
    id: m.home!.id, platform: PLAT_OF[m.platform ?? ''] ?? 'web', nature: '收藏' as Nature, title: m.title, author: m.author, url: m.ref.url ?? '',
    publishedAt: m.contentAt, importedAt: m.receivedAt, topic: '工具与工作流', folders: m.channel.includes('·') ? [m.channel.split('·')[1].trim()] : undefined,
    body: { state: m.gaps?.length ? '仅元信息' as const : '完整' as const, blocks: m.text.split(/\n+/).filter(Boolean).map((t) => ({ t: 'p' as const, text: t })) },
    video: m.media?.some((x) => x.kind === '视频') ? { mode: 'link-only' as const, note: '宿主共享样例：只有原链接' } : undefined,
    summary: m.gaps?.length ? undefined : [m.text.split(/\n+/)[0]],
    status: (m.outputs.length || m.archived ? '已分流' : '待处理') as FavItem['status'], read: m.read,
    version: 1, versions: [{ v: 1, at: m.receivedAt, note: '首次取得' }], shared: true,
    history: [{ at: m.receivedAt, by: '系统' as const, text: '宿主共享样例（收件里也能看到同一条）' }],
  }));
}
export function basisOf(r: Rec, it?: FavItem) { return `${r.note}|${r.myNotes}|v${it?.version ?? r.basisVersion}`; }
function init(): FavData {
  const d = demoData();
  d.items = [...sharedItems(), ...d.items];
  const r02 = d.recs.find((r) => r.id === 'r02')!; r02.rounds[1].basis = basisOf(r02, d.items.find((i) => i.id === 'f01'));
  return d;
}
export const S = cardStore<FavData>('favorites', init);

const H = (by: Hist['by'], text: string): Hist => ({ at: nowIso(), by, text });
let seq = 0;
const nid = (p: string) => `${p}${Date.now().toString(36).slice(-4)}${(seq++).toString(36)}`;
export const item = (id?: string) => S.d.items.find((i) => i.id === id);
export const rec = (id?: string) => S.d.recs.find((r) => r.id === id);
export const recsOf = (itemId: string) => S.d.recs.filter((r) => r.itemId === itemId);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ───────── 读取 / 推导 ───────── */
export const textOf = (it: FavItem) => [it.title, it.body.intro, ...it.body.blocks.map((b) => (b.t === 'p' ? b.text : '')), ...(it.replies?.items.map((r) => r.text) ?? []), ...(it.tracks?.flatMap((t) => t.cues.map((c) => c.text)) ?? [])].filter(Boolean).join('\n');
export const missingImgs = (it: FavItem) => it.body.blocks.flatMap((b) => (b.t === 'img' ? [b.img] : b.t === 'gallery' ? b.imgs : [])).concat(it.replies?.items.flatMap((r) => r.imgs ?? []) ?? []).filter((i) => i.missing);
export const trackIssue = (it: FavItem) => it.tracks?.find((t) => t.state !== '完整');
export const activeTask = (itemId: string) => S.d.tasks.find((t) => t.itemId === itemId && ['waiting', 'running', 'blocked'].includes(t.state));
/** 一条材料同时成立的多项事实（不只留一个最高优先级标签） */
export function facts(it: FavItem): { label: string; tone: string }[] {
  const f: { label: string; tone: string }[] = [];
  f.push({ label: it.nature, tone: it.nature === '收藏' ? 'neutral' : 'info' });
  f.push({ label: `正文${it.body.state}`, tone: it.body.state === '完整' ? 'ok' : it.body.state === '部分' ? 'warn' : 'faint' });
  const mi = missingImgs(it).length; if (mi) f.push({ label: `缺图 ${mi}`, tone: 'warn' });
  const ti = trackIssue(it); if (ti) f.push({ label: `字幕${ti.state}`, tone: ti.state === '处理中' ? 'info' : ti.state === '部分' ? 'warn' : 'bad' });
  else if (it.tracks?.length) f.push({ label: '字幕完整', tone: 'ok' });
  if (it.video?.mode === 'link-only') f.push({ label: '仅视频原链接', tone: 'faint' });
  if (it.replies) f.push({ label: '回复部分取得', tone: 'faint' });
  if (it.read) f.push({ label: '已读', tone: 'neutral' });
  if (it.version > 1) f.push({ label: `v${it.version}`, tone: 'accent' });
  if (it.manual) f.push({ label: `人工补充（${it.manual.kind}）`, tone: 'info' });
  const n = recsOf(it.id).filter((r) => !r.trashed); if (n.length) f.push({ label: n.map((r) => REC_NAME[r.kind]).join(' + '), tone: 'accent' });
  if (activeTask(it.id)) f.push({ label: '任务进行中', tone: 'info' });
  return f;
}

/* ───────── 筛选 ───────── */
export type Layer = 'raw' | RecKind;
export interface Filter { layer: Layer; platform: Platform | ''; nature: Nature | ''; status: string; topic: string; gap: string; q: string }
export const RAW_STATUS = ['待处理', '以后读', '已分流', '全部', '回收站'] as const;
export const REC_STATUS = ['全部', '待加工', '以后读', 'AI 待审', '已归位', '回收站'] as const;
const hit = (s: string, q: string) => !q || s.toLowerCase().includes(q.toLowerCase());
export function rawMatch(it: FavItem, f: Filter, ignore?: 'status') {
  if (ignore !== 'status') { if (f.status === '回收站' ? !it.trashed : it.trashed || (f.status !== '全部' && it.status !== f.status)) return false; }
  else if (it.trashed) return false;
  if (f.platform && it.platform !== f.platform) return false;
  if (f.nature && it.nature !== f.nature) return false;
  if (f.topic && it.topic !== f.topic) return false;
  if (f.gap === '部分' && it.body.state !== '部分') return false;
  if (f.gap === '仅元信息' && !['仅元信息', '未取得'].includes(it.body.state)) return false;
  if (f.gap === '缺图' && !missingImgs(it).length) return false;
  if (f.gap === '字幕问题' && !trackIssue(it)) return false;
  return hit(textOf(it), f.q);
}
export function recMatch(r: Rec, f: Filter, ignore?: 'status') {
  if (r.kind !== f.layer) return false;
  const it = item(r.itemId);
  if (ignore !== 'status') { if (f.status === '回收站' ? !r.trashed : r.trashed || (f.status !== '全部' && r.status !== f.status)) return false; }
  else if (r.trashed) return false;
  if (f.platform && it?.platform !== f.platform) return false;
  if (f.topic && it?.topic !== f.topic) return false;
  return hit(`${it ? textOf(it) : ''}\n${r.note}\n${r.myNotes}`, f.q);
}
export const sortItems = (a: FavItem, b: FavItem) => b.importedAt.localeCompare(a.importedAt);

/* ───────── 草稿（按对象隔离：raw:<id>:ref / raw:<id>:digest / rec:<id>） ───────── */
export function setDraft(key: string, text: string, loc?: string) {
  if (!text && !loc) delete S.d.drafts[key]; else S.d.drafts[key] = { text, loc, at: nowIso() };
  S.emit();
}

/* ───────── 原始材料：处理状态（不产生外部产物） ───────── */
export const setLater = (id: string, on: boolean) => S.write('fav-later', on ? '以后读' : '继续处理', () => {
  const it = item(id)!; it.status = on ? '以后读' : '待处理'; it.history.push(H('我', on ? '以后读' : '继续处理'));
}, { noConflict: true, targetId: id });
export const markRead = (id: string, on: boolean) => S.write('fav-read', on ? '标记已读' : '取消已读', () => { const it = item(id)!; it.read = on ? nowIso() : undefined; it.history.push(H('我', on ? '标记已读' : '取消已读')); }, { noConflict: true });
export const setTopic = (id: string, topic: string) => S.write('fav-topic', `主题改为「${topic}」`, () => { const it = item(id)!; it.topic = topic; it.history.push(H('我', `主题：${topic}（手动调整）`)); }, { noConflict: true });
export const TOPICS = ['资料整理', '工具与工作流', '设计', '游戏', '批量样例', '未归类'];

/** 演示：来源出了新版本（DEMO-19：已有预览随之失效） */
export function bumpVersion(id: string) {
  const it = item(id)!; it.version += 1; it.versions.push({ v: it.version, at: nowIso(), note: '作者修改了正文（样例）：已保留旧版本' });
  const p = it.body.blocks.find((b) => b.t === 'p'); if (p && p.t === 'p') p.text += '（作者补充：新版本里多了这一句。）';
  it.history.push(H('系统', `取得新版本 v${it.version}`)); S.emit();
}

/* ───────── 第一层保存（直接入库 / 我自己处理）：不经过 AI ───────── */
/** 默认位置：A 直接入库按「设置 › 落点规则」（平台 × 类型 × 主题）；B 按「设置 › 流程去向 › 我自己处理」 */
export const facetOfItem = (it: FavItem) => ({ platform: PF[it.platform].name, type: it.video || it.tracks?.length ? '视频' : '图文', topic: it.topic, title: it.title });
export const defaultLoc = (kind: RecKind, it: FavItem) => (kind === 'ref' ? resolveRoute(facetOfItem(it)).path : flowPath('self', facetOfItem(it)));
/** 交给 AI 按备注初处理：备注必填；结果是待审的建议，不自动分流 */
export function preProcess(id: string, intent: string) {
  const it = item(id)!;
  if (S.d.demo.ai === 'unconfigured') { it.pre = { state: 'unconfigured', intent, at: nowIso(), error: '模型还没配置（未接入）：没有发出。可以不经 AI 直接选' }; S.emit(); return; }
  it.pre = { state: 'running', intent, at: nowIso() }; it.history.push(H('我', `交给 AI 按备注初处理：${intent.slice(0, 20)}`));
  addTask({ kind: '按备注初处理', platform: it.platform, itemId: id, label: `按备注初处理：${it.title}`, stage: '按备注读已取得的文字', state: 'running', ticks: 2, effect: 'pre', arg: id });
}
export function saveRecord(itemId: string, kind: RecKind, note: string, loc: string) {
  const it = item(itemId)!;
  const dup = S.d.recs.find((r) => r.itemId === itemId && r.kind === kind && !r.trashed && r.note === note && r.basisVersion === it.version);
  return S.write('fav-save', dup ? `已有相同的${REC_NAME[kind]}（未重复创建）` : `${REC_NAME[kind]}：${it.title}`, () => {
    if (dup) return { targetId: dup.id, path: dup.location, detail: `同来源、同版本、同批注的${REC_NAME[kind]}已经存在（${dup.id}），没有重复创建` };
    const r: Rec = { id: nid('r'), itemId, kind, note, at: nowIso(), basisVersion: it.version, status: '待加工', location: loc, myNotes: '', rounds: [], outputs: [], history: [H('我', REC_NAME[kind])] };
    S.d.recs.unshift(r); it.status = '已分流'; it.history.push(H('我', `${REC_NAME[kind]}（${r.id}）`));
    return { targetId: r.id, path: loc, detail: `已保存为${REC_NAME[kind]}（${r.id}）。没有发给 AI，也不代表已理解` };
  }, { path: loc });
}

/* ───────── 第一层：个人加工、AI 整理、审查 ───────── */
export const saveMyNotes = (id: string, text: string) => S.write('fav-notes', '保存加工笔记', () => { const r = rec(id)!; r.myNotes = text; r.history.push(H('我', '保存加工笔记')); return { path: r.location }; });
export const saveNote = (id: string, text: string) => S.write('fav-note', '修改这份批注', () => { const r = rec(id)!; r.note = text; r.history.push(H('我', '修改批注（旧 AI 结果会标为过期）')); return { path: r.location }; });
export const REF_NOTES = ['示例笔记·资料与观点', '示例笔记·周复盘模板', '示例笔记·书桌布置', '示例笔记·视频笔记写法', '示例笔记·工具清单', '示例笔记·读书方法'];
export function startRound(id: string, goal: string, refs: string[]) {
  const r = rec(id)!; const it = item(r.itemId);
  if (S.d.demo.ai === 'unconfigured') { r.rounds.push({ n: r.rounds.length + 1, goal, refs, basis: basisOf(r, it), at: nowIso(), state: 'unconfigured', error: '模型还没配置（未接入）：没有发出' }); S.emit(); return; }
  const n = r.rounds.length + 1;
  r.rounds.push({ n, goal, refs, basis: basisOf(r, it), at: nowIso(), state: 'running' }); r.history.push(H('我', `发起第 ${n} 轮整理`));
  addTask({ kind: '按批注整理', platform: it?.platform ?? 'web', recId: id, itemId: r.itemId, label: `按批注整理：${REC_NAME[r.kind]} ${r.id} 第 ${n} 轮`, stage: '整理中（没有进度数）', state: 'running', ticks: 3, effect: 'round', arg: `${id}:${n}` });
}
export const reviewRound = (id: string, n: number, p: { seen?: boolean; accepted?: boolean; comment?: string }) => {
  const r = rec(id)!; const x = r.rounds.find((y) => y.n === n)!;
  if (p.seen) x.seen = nowIso(); if (p.accepted) { x.accepted = nowIso(); x.seen ??= nowIso(); } if (p.comment !== undefined) x.comment = p.comment;
  if (r.status === 'AI 待审' && p.accepted) r.status = '待加工';
  r.history.push(H('我', p.accepted ? `接受第 ${n} 轮结果（不等于已消化）` : p.seen ? `看过第 ${n} 轮结果` : `第 ${n} 轮审查意见`)); S.emit();
};
export const setRecStatus = (id: string, status: Rec['status']) => S.write('fav-rec', status, () => { const r = rec(id)!; r.status = status; r.history.push(H('我', status)); }, { noConflict: true });
export const placePath = (r: Rec, topic: string) => `${S.d.locations.topic.replace('<主题>', topic)}${r.kind === 'ref' ? '可调用材料' : '待消化材料'}/${item(r.itemId)?.title}.md`;
export const place = (id: string, topic: string) => S.write('fav-place', `主题归位：${topic}`, () => {
  const r = rec(id)!; const path = placePath(r, topic);
  r.placed = { topic, path, from: r.location, at: nowIso() }; r.location = path; r.status = '已归位'; r.history.push(H('我', `主题归位：${topic}`));
  return { path, detail: `已归位到「${topic}」（仍是材料，不代表已掌握）` };
}, { path: placePath(rec(id)!, topic) });
export const confirmDraft = (id: string, text: string) => S.write('fav-draft', '确认我的知识稿', () => {
  const r = rec(id)!; const path = `${S.d.locations.knowledge}${item(r.itemId)?.title}.md`;
  r.draft = { text, confirmedAt: nowIso(), path }; r.history.push(H('我', '确认我的知识稿')); return { path };
});

/* ───────── 去向：走宿主已有的行动 / 待采纳 / 项目（先投影，再调用宿主函数） ───────── */
function project(it: FavItem, r?: Rec): string {
  const m: Material = {
    id: it.id, kind: 'collect', home: { card: 'favorites', id: it.id }, sourceId: { bili: 'P02', x: 'P01', xhh: 'P03', yt: 'P04', reddit: 'P04' }[it.platform as string] ?? 'P07',
    platform: it.platform, channel: `${PF[it.platform].name} · ${it.nature}`, title: it.title, text: textOf(it).slice(0, 600), author: it.author,
    contentAt: it.publishedAt, receivedAt: it.importedAt, ref: { source: 'favorites', label: `收藏${r ? ` · ${REC_NAME[r.kind]}` : ''}`, path: r?.location, url: it.url, at: it.importedAt },
    ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [], history: [H('系统', '由「收藏」卡投影：正文与批注在收藏里')],
  };
  return store.upsertProjection(m);
}
export type Dest = { kind: 'action'; title: string; date?: string } | { kind: 'attach'; actionId: string } | { kind: 'approval'; title: string } | { kind: 'project'; projectId: string; as: '参考' | '已确认需求' };
export async function send(recId: string, d: Dest) {
  const r = rec(recId)!; const it = item(r.itemId)!; const mid = project(it, r);
  const rc = d.kind === 'action' ? await store.materialToAction(mid, d.title, d.date) : d.kind === 'attach' ? await store.attachToAction(mid, d.actionId)
    : d.kind === 'approval' ? await store.pushApproval([mid], d.title, '收藏') : await store.linkProject(mid, d.projectId, d.as);
  if (rc.status === 'ok') {
    const label = d.kind === 'action' ? `行动：${d.title}` : d.kind === 'attach' ? `挂到行动 ${d.actionId}` : d.kind === 'approval' ? `待采纳：${d.title}` : `项目${d.as}：${store.proj(d.projectId)?.name}`;
    r.outputs.push({ kind: d.kind, id: d.kind === 'project' ? d.projectId : d.kind === 'attach' ? d.actionId : rc.targetId ?? '', label, at: nowIso() });
    r.history.push(H('我', label)); S.emit();
  }
  return rc;
}

/* ───────── 批量（一次确认，逐条结果） ───────── */
export interface BatchRow { id: string; title: string; ok: boolean; result: string }
export async function batch(op: '以后读' | '继续处理' | '回收' | '恢复' | '永久删除' | '重试', ids: string[], layer: Layer): Promise<BatchRow[]> {
  await sleep(500);
  const rows: BatchRow[] = [];
  for (const id of ids) {
    if (layer === 'raw') {
      const it = item(id); if (!it) { rows.push({ id, title: id, ok: false, result: '已经不存在（可能刚被删除）' }); continue; }
      const R = (ok: boolean, result: string) => rows.push({ id, title: it.title, ok, result });
      if (op === '以后读' || op === '继续处理') { const to = op === '以后读' ? '以后读' : '待处理'; if (it.status === to) R(true, '本来就是这样，未变化'); else { it.status = to; it.history.push(H('我', op)); R(true, op === '以后读' ? '已放入以后读' : '回到待处理'); } }
      else if (op === '回收') { if (it.demoFail) R(false, '没有回收：文件被占用（样例）'); else { it.trashed = nowIso(); it.history.push(H('我', '回收')); R(true, `已回收（它的 ${recsOf(id).length} 份分流记录不受影响）`); } }
      else if (op === '恢复') { it.trashed = undefined; it.history.push(H('我', '恢复')); R(true, '已恢复到原来的位置和状态'); }
      else if (op === '永久删除') { if (it.demoFail) R(false, '正文已删除，附件清理待核对（样例）'); else { S.d.items = S.d.items.filter((x) => x.id !== id); S.d.purged.unshift({ url: it.url, title: it.title, at: nowIso() }); R(true, `已永久删除；以后核对会跳过它${recsOf(id).length ? '（分流记录仍保留）' : ''}`); } }
      else if (op === '重试') {
        if (it.trashed) R(true, '跳过：在回收站');
        else if (activeTask(id)) R(true, '已有任务，未重复创建');
        else if (it.body.state === '完整' && !missingImgs(it).length && !trackIssue(it)) R(true, '已经完整，跳过');
        else if (it.demoFail) R(false, '失败：平台限流（样例），稍后再试');
        else { addTask({ kind: missingImgs(it).length && it.body.state === '完整' ? '图片' : trackIssue(it) ? '字幕' : '正文', platform: it.platform, itemId: id, label: `重试：${it.title}`, stage: '排队中', state: 'waiting', ticks: 4, effect: 'noop' }); R(true, '新接受（排队，不等于已取得）'); }
      }
    } else {
      const r = rec(id); if (!r) { rows.push({ id, title: id, ok: false, result: '已经不存在' }); continue; }
      const title = `${REC_NAME[r.kind]} · ${item(r.itemId)?.title ?? r.itemId}`; const R = (ok: boolean, result: string) => rows.push({ id, title, ok, result });
      const sib = S.d.recs.find((x) => x.itemId === r.itemId && x.id !== r.id);
      if (op === '以后读') { r.status = '以后读'; R(true, '已放入以后读'); }
      else if (op === '继续处理') { r.status = '待加工'; R(true, '回到待加工'); }
      else if (op === '回收') { r.trashed = nowIso(); r.history.push(H('我', '回收')); R(true, `已回收这一份${sib ? `；同源的${REC_NAME[sib.kind]}不受影响` : ''}；原始材料不受影响`); }
      else if (op === '恢复') { r.trashed = undefined; r.history.push(H('我', '恢复')); R(true, '已恢复到原来的位置'); }
      else if (op === '永久删除') { S.d.recs = S.d.recs.filter((x) => x.id !== id); R(true, r.sharedAttachment && sib ? `已删除这份记录；图片附件仍被同源${REC_NAME[sib.kind]}使用，已保留` : '已删除这份记录（原始材料仍在）'); }
      else R(false, '不适用：分流记录不能当作重新采集一个来源');
    }
  }
  S.emit();
  return rows;
}

/* ───────── 任务（顶栏窗口） ───────── */
export function addTask(t: Omit<Task, 'id' | 'startedAt' | 'updatedAt'>) { const x: Task = { ...t, id: nid('tk'), startedAt: nowIso(), updatedAt: nowIso() }; S.d.tasks.unshift(x); S.emit(); return x; }
export function retryTask(id: string) {
  const t = S.d.tasks.find((x) => x.id === id)!;
  const n = addTask({ kind: t.kind, platform: t.platform, itemId: t.itemId, recId: t.recId, label: t.label.replace(/^(重试：)?/, '重试：'), stage: '重新开始', state: 'running', ticks: 3, effect: t.effect, arg: t.arg, retryOf: t.id });
  t.retriedBy = n.id; S.emit();
}
export function cancelTask(id: string) { const t = S.d.tasks.find((x) => x.id === id)!; t.state = 'cancelled'; t.stage = '你取消了'; t.updatedAt = nowIso(); S.emit(); }
export const setDemo = (p: Partial<FavData['demo']>) => { Object.assign(S.d.demo, p); if (p.feed === 'offline') S.d.demo.snapshotAt = nowIso(); S.emit(); };
export function startAiSummary(id: string) {
  const it = item(id)!;
  if (S.d.demo.ai === 'unconfigured') { it.ai = { state: 'unconfigured', error: '模型还没配置（未接入），没有发出；本机摘要仍可用' }; S.emit(); return; }
  it.ai = { state: 'running', at: nowIso() };
  addTask({ kind: '阅读概要', platform: it.platform, itemId: id, label: `AI 优化摘要：${it.title}`, stage: '概括已取得文字', state: 'running', ticks: 2, effect: 'ai-sum', arg: id });
}
export function retryTranslate(id: string) { addTask({ kind: '翻译', platform: item(id)!.platform, itemId: id, label: `重试译文：${item(id)!.title}`, stage: '翻译失败的段落', state: 'running', ticks: 2, effect: 'tr-retry', arg: id }); }
export function retryImage(itemId: string, imgId: string) { addTask({ kind: '图片', platform: item(itemId)!.platform, itemId, label: `补图：${item(itemId)!.title}`, stage: '重新下载 1 张', state: 'running', ticks: 2, effect: 'img-retry', arg: `${itemId}:${imgId}` }); }
export function retryAsr(itemId: string) { const tr = item(itemId)!.tracks?.find((t) => t.retryable); if (tr) { tr.state = '处理中'; tr.note = '重新转写中'; } addTask({ kind: '字幕', platform: item(itemId)!.platform, itemId, label: `重新转写：${item(itemId)!.title}`, stage: '机器转写', state: 'running', ticks: 4, effect: 'asr-retry', arg: itemId }); }

const TR_FIX: Record<string, string> = { x2: '只看主题。标签从没告诉我自己理解了什么。', 'f04:2': '第二，写一句你为什么留它。' };
const EFFECTS: Record<string, (arg: string, t: Task) => void> = {
  noop: () => {},
  'ai-sum': (id, t) => { const it = item(id); if (!it) return; if (S.d.demo.ai === 'failed') { it.ai = { state: 'failed', error: '模型返回错误（样例）；本机摘要仍可用' }; t.state = 'failed'; t.reason = '模型返回错误（样例）'; } else it.ai = { state: 'ok', text: it.aiSample ?? '（AI 概括 · 样例）', at: nowIso(), basisVersion: it.version }; },
  'tr-retry': (id) => { const it = item(id); if (!it) return; it.body.blocks.forEach((b) => { if (b.t === 'p' && b.trState === 'failed') { b.trState = 'ok'; b.tr = b.trRetry ?? '（重试后的译文 · 样例）'; } }); it.replies?.items.forEach((r) => { if (r.trState === 'failed') { r.trState = 'ok'; r.tr = TR_FIX[r.id] ?? '（重试后的译文 · 样例）'; } }); it.tracks?.forEach((tr) => tr.cues.forEach((c, i) => { if (!c.tr && TR_FIX[`${id}:${i}`]) c.tr = TR_FIX[`${id}:${i}`]; })); },
  'img-retry': (arg) => { const [id, imgId] = arg.split(':'); const it = item(id); if (!it) return; const all = it.body.blocks.flatMap((b) => (b.t === 'img' ? [b.img] : b.t === 'gallery' ? b.imgs : [])).concat(it.replies?.items.flatMap((r) => r.imgs ?? []) ?? []); const im = all.find((x) => x.id === imgId); if (im) { if (im.retryOk) im.missing = undefined; else im.missing = `重试仍失败：${im.missing?.replace(/^重试仍失败：/, '')}`; } },
  'asr-retry': (id) => { const tr = item(id)?.tracks?.find((x) => x.retryable); if (tr) { tr.state = '部分'; tr.note = '重试后取得前 30 秒（样例）；其余部分仍待转写，需核查'; tr.cues = [{ s: 0, e: 12, text: '（机器转写 · 样例）这一期先讲为什么要转写。' }, { s: 12, e: 30, text: '（机器转写 · 样例）后面的部分还没有转完。' }]; tr.model = '示例转写模型'; tr.at = nowIso(); } },
  pre: (id, t) => { const it = item(id); if (!it?.pre) return; if (S.d.demo.ai === 'failed') { it.pre = { ...it.pre, state: 'failed', error: '模型返回错误（样例）' }; t.state = 'failed'; t.reason = '模型返回错误（样例）'; return; }
    const ref = /查|资料|以后用|参考|备用|入库/.test(it.pre.intent);
    it.pre = { ...it.pre, state: 'ok', at: nowIso(), text: `（AI 初处理 · 样例）按你的备注「${it.pre.intent.slice(0, 24)}」：已取得的文字里相关的有 3 处${it.body.state !== '完整' ? `；正文${it.body.state}，可能漏掉` : ''}。`, points: ['（样例）和备注直接相关的一句原话', '（样例）原文给出的具体做法 / 参数', '（样例）一个你可能还不知道的概念'], suggest: ref ? 'ref' : 'digest' };
    it.history.push(H('AI', '按备注初处理完成，等你选')); },
  round: (arg, t) => { const [id, n] = arg.split(':'); const r = rec(id); const x = r?.rounds.find((y) => y.n === +n); if (!r || !x) return; if (S.d.demo.ai === 'failed') { x.state = 'failed'; x.error = '模型返回错误（样例）'; t.state = 'failed'; t.reason = '模型返回错误（样例）'; return; } x.state = 'ok'; x.result = `（AI 整理 · 样例 · 第 ${n} 轮）依据：这份批注「${r.note.slice(0, 24)}…」${x.refs.length ? `与参考笔记 ${x.refs.join('、')}` : ''}。本轮目标：${x.goal || '（未填）'}。这是待审结果，不代表你已理解。`; r.status = 'AI 待审'; },
  body: (id) => { const it = item(id); if (!it) return; it.body = { state: '部分', blocks: [{ t: 'p', text: '（样例）这里是演示用的取得结果。真实正文要等后端接入后实际读取，本段不是该链接的内容。' }] }; it.summary = undefined; },
  import: (runId) => finishImport(runId),
};
/* 计时器：推进样例任务（只有 ticks 有限的任务会结束） */
setInterval(() => {
  let ch = false;
  for (const t of S.d.tasks) {
    if (t.state === 'waiting' && t.ticks !== undefined && t.ticks < 9999) { t.state = 'running'; t.stage = t.stage === '排队中' ? '处理中' : t.stage; ch = true; continue; }
    if (t.state !== 'running' || t.ticks === undefined || t.ticks >= 9999) continue;
    t.ticks -= 1; t.updatedAt = nowIso(); ch = true;
    if (t.ticks <= 0) { t.state = 'done'; t.stage = '完成'; EFFECTS[t.effect ?? 'noop']?.(t.arg ?? '', t); if ((t.state as Task['state']) === 'failed') t.stage = '失败'; }
  }
  if (ch) S.emit();
}, 1000);

/* ───────── 导入 ───────── */
export function canStart(p: Platform, scope: string[], tagOk: boolean): string | undefined {
  const a = S.d.accounts[p];
  if (a === '未接入') return '这个平台还没接入：可以看能力与限制，但不能开始';
  if (a === '未登录' || a === '已过期') return '需要先登录（登录状态已保存也要核验后才能读取）';
  if (a === '需本人验证') return '平台要求你本人在原站完成验证；关闭窗口不等于验证完成';
  if (a === '无法连接') return '现在连不上平台，稍后再试';
  if (p === 'bili' && !scope.length) return '先选至少一个收藏夹';
  if (p === 'douyin' && !tagOk) return '先确认收藏标签';
  return undefined;
}
export function startImport(p: Platform, scope: string[], mode: '最新核对' | '续读', fill: boolean) {
  const id = nid('run');
  S.d.imports.unshift({ id, platform: p, at: nowIso(), scope, mode, fill, rows: [], reachedEnd: false, note: '进行中' });
  addTask({ kind: '收藏列表', platform: p, label: `${PF[p].name} · ${scope.join(' / ') || PF[p].scope} ${mode}`, stage: mode === '续读' ? `从上次断点继续（${S.d.lastRun[p]?.stopAt ?? '未知'}）` : '从最新收藏开始核对', state: 'running', ticks: 4, effect: 'import', arg: id, cancellable: true });
  return id;
}
function newItem(p: Platform, title: string, o: Partial<FavItem> = {}): FavItem {
  return { id: nid('f'), platform: p, nature: '收藏', title, url: `https://example.com/demo/${p}/${nid('n')}`, importedAt: nowIso(), topic: '未归类', body: { state: '未取得', blocks: [] }, status: '待处理', version: 1, versions: [{ v: 1, at: nowIso(), note: '进入待取得内容' }], history: [H('系统', '核对收藏：新增，等待取得内容')], ...o };
}
function finishImport(runId: string) {
  const run = S.d.imports.find((r) => r.id === runId); if (!run) return;
  const p = run.platform; const rows: ImportRow[] = [];
  const ni = newItem(p, `示例·${PF[p].name}新收藏的一条`, p === 'bili' ? { folders: [run.scope[0]], tracks: [{ id: nid('t'), kind: '平台字幕', lang: '中文', state: '处理中', cues: [], note: '等待取得字幕' }], video: { mode: 'locatable', duration: 300 } } : {});
  if (run.mode === '最新核对') { S.d.items.unshift(ni); rows.push({ title: ni.title, result: '新增', why: '进入待取得内容：正文 / 图片 / 字幕各自待取得', itemId: ni.id }); }
  if (p === 'bili' && run.scope.includes('示例·工具资料') && run.scope.includes('示例·课程')) { const f2 = item('f02'); if (f2) { f2.folders = Array.from(new Set([...(f2.folders ?? []), '示例·工具资料', '示例·课程'])); rows.push({ title: f2.title, result: '重复', why: '同一视频在「示例·工具资料」「示例·课程」两个夹：仍是一条原始材料，两个出处都记下', itemId: f2.id }); } }
  S.d.items.filter((i) => i.platform === p && !i.trashed && i.id !== ni.id && i.id !== 'f02').slice(0, 2).forEach((i) => rows.push({ title: i.title, result: '重复', why: '已有来源（按来源认定，不看标题）；旧记录和批注保留', itemId: i.id }));
  S.d.items.filter((i) => i.platform === p && i.trashed).forEach((i) => rows.push({ title: i.title, result: '跳过', why: '在回收站：不自动恢复', itemId: i.id }));
  S.d.purged.filter((x) => x.url.includes(`/${p}/`)).forEach((x) => rows.push({ title: x.title, result: '跳过', why: '已永久删除：只有你明确「重新收集」才会回来', recollect: true }));
  if (run.fill) S.d.items.filter((i) => i.platform === p && !i.trashed && (i.body.state !== '完整' || trackIssue(i))).forEach((i) => rows.push({ title: i.title, result: '待补', why: '补齐本次清单里的未完成项（已排队；完整的和已删除的跳过）', itemId: i.id }));
  if (p === 'bili') rows.push({ title: '示例·分P 合集', result: '失败', why: '分P 视频只取到第 1P 的标题（样例）；可以单独重试' });
  run.rows = rows; run.reachedEnd = p === 'bili' && run.mode === '最新核对';
  run.note = run.mode === '续读' ? `继续了上次的范围（${S.d.lastRun[p]?.stopAt ?? '断点未知'}）；没有检查这之后新增的顶部收藏` : run.reachedEnd ? '已确认读到所选范围的末尾' : '没有确认到末尾：不能说已读取全部收藏';
  S.d.lastRun[p] = { at: nowIso(), scope: run.scope, stopAt: run.reachedEnd ? undefined : '第 3 页（样例）' };
}
export function recollect(url: string) {
  const x = S.d.purged.find((y) => y.url === url); if (!x) return;
  S.d.purged = S.d.purged.filter((y) => y.url !== url);
  const p = (Object.keys(PF) as Platform[]).find((k) => url.includes(`/${k}/`)) ?? 'web';
  const it = newItem(p, x.title, { url, history: [H('我', '你明确要求重新收集（之前永久删除过）')] }); S.d.items.unshift(it); S.emit(); return it.id;
}
const norm = (u: string) => u.trim().replace(/[?#].*$/, '').replace(/\/+$/, '').replace('://www.', '://').replace('/demo/s/desk', '/demo/article/desk-steps');
export function addLink(url: string, title: string, type: string, isFav: boolean): { existing?: string; created?: string; retry?: boolean } {
  const ex = S.d.items.find((i) => norm(i.url) === norm(url));
  if (ex) return { existing: ex.id, retry: ex.body.state !== '完整' };
  const p = (['bili', 'yt', 'douyin', 'x', 'xhh', 'xhs', 'reddit'] as Platform[]).find((k) => url.includes(`/${k}/`) || url.includes(k)) ?? 'web';
  const it = newItem(p, title || `（未取得标题）${url.replace(/^https?:\/\//, '').slice(0, 40)}`, { url, nature: isFav ? '收藏' : '非收藏链接', history: [H('我', `你粘贴了链接（${isFav ? '你声明是收藏' : '非收藏'}，类型：${type}）`)] });
  S.d.items.unshift(it);
  addTask({ kind: '正文', platform: p, itemId: it.id, label: `取得正文：${it.title}`, stage: '读取链接', state: 'running', ticks: 3, effect: 'body', arg: it.id });
  return { created: it.id };
}
export function retryBody(id: string) { const it = item(id)!; if (activeTask(id)) return false; addTask({ kind: '正文', platform: it.platform, itemId: id, label: `重试取得：${it.title}`, stage: '读取链接', state: 'running', ticks: 3, effect: 'body', arg: id }); return true; }
export const parseCues = (text: string) => {
  const cues: Track['cues'] = []; const toS = (m: string, s: string) => +m * 60 + +s;
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^(\d{1,2}):(\d{2})(?:\s*[-–]\s*(\d{1,2}):(\d{2}))?\s+(.+)$/); if (!m) return null;
    cues.push({ s: toS(m[1], m[2]), e: m[3] ? toS(m[3], m[4]) : toS(m[1], m[2]) + 5, text: m[5] });
  }
  return cues.length ? cues : null;
};
export const addManual = (itemId: string, text: string, declared: string, kind: '正文' | '字幕') => S.write('fav-manual', `人工补充${kind}`, () => {
  const it = item(itemId)!;
  it.version += 1; it.versions.push({ v: it.version, at: nowIso(), note: `人工补充${kind}（来源：${declared || '未声明'}）` });
  it.manual = { declared: declared || '未声明', at: nowIso(), kind };
  if (kind === '字幕') (it.tracks ??= []).push({ id: nid('t'), kind: '人工提供', lang: '中文', state: '完整', cues: parseCues(text)!, declared: declared || '未声明', at: nowIso() });
  else { it.body = { ...it.body, state: it.body.state === '完整' ? '完整' : '部分', blocks: [...it.body.blocks, ...text.split(/\n+/).filter(Boolean).map((t) => ({ t: 'p' as const, text: t }))] }; }
  it.history.push(H('我', `人工补充${kind}：${declared || '来源未声明'}（不冒充自动取得）`));
}, { targetId: itemId });
export const DEMO_FILES = [
  { name: '示例清单-有效.json', rows: [['https://example.com/demo/x/list-1', '新增'], ['https://example.com/demo/x/tidy-desk', '重复'], ['https://example.com/demo/web/list-3', '新增']] },
  { name: '示例清单-部分无效.json', rows: [['https://example.com/demo/web/list-4', '新增'], ['not-a-url', '无效：不是链接'], ['', '无效：空行'], ['https://example.com/demo/xhh/purged', '跳过：已永久删除']] },
  { name: '示例清单-格式错误.txt', rows: [] },
] as const;
export function importFile(name: string) {
  const f = DEMO_FILES.find((x) => x.name === name)!;
  if (!f.rows.length) return { error: '格式不符：第 1 行不是链接或 JSON 数组（样例）。没有导入任何条目。', rows: [] as { url: string; result: string; itemId?: string }[] };
  const rows = f.rows.map(([url, r]) => {
    if (r === '新增') { const res = addLink(url, '', '清单', false); return { url, result: res.existing ? '重复（已存在）' : '新增（非收藏，待取得内容）', itemId: res.existing ?? res.created }; }
    if (r === '重复') return { url, result: '重复：已有来源', itemId: S.d.items.find((i) => norm(i.url) === norm(url))?.id };
    return { url, result: r };
  });
  return { rows };
}
export const resetFav = () => { S.reset(); };
