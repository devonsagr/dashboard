/**
 * 共享业务入口：浏览器使用合成示例，Obsidian 使用注入的 Vault 宿主。
 *
 * 前端只通过这里读写业务对象。Codex 接入时实现同名函数（读写 Markdown / 本机服务），
 * 页面与卡片不用改。写入一律是异步的，返回 Receipt：
 *   ok        已写入（带路径）
 *   failed    没写入（输入保留，可原样重试）
 *   unknown   发出了但不知道结果（不在本地假装成功，提示重新读取）
 *   conflict  文件在别处被改过（保留草稿，让用户选）
 * 顶栏「样例」菜单可以切换模拟结果，用来检验每种状态的界面。
 */
import * as S from './sample';
import type {
  Action, ActionSection, Approval, Decision, DecisionResponse, Hist, Material, MaterialMain, Receipt, CaptureType, Source,
} from './types';
import { addDays, nowIso, today, dayKey } from './time';
import { flowPath, resolveRoute } from './settings';
import { host, hostSnapshot } from './host';

const KEY = 'pkd.v5.sample.v5';
const SIM_KEY = 'pkd.v5.sim.v1';

function fresh() {
  if (hostSnapshot) return { generatedFor: today(), ...hostSnapshot, approvals: [] as Approval[], receipts: [] as Receipt[],
    sources: [['C01', '行动'], ['C02', '待我决策'], ['C03', '项目'], ['C08', '随手记'], ['C11', '日记'], ['C13', '已有收集材料']].map(([id, name]): Source => ({
      id, name, group: '仪表盘' as const, mode: '手动' as const, health: 'ok' as const, provides: name,
      via: '当前 Vault 的既有文件', feedsFlow: id === 'C08' || id === 'C13',
    })),
  };
  return {
    generatedFor: today(),
    sources: S.sources(), materials: S.materials(), approvals: S.approvals(), actions: S.actions(), decisions: S.decisions(), projects: S.projects(),
    diary: S.diary(), library: S.library(), receipts: S.receipts(), recentDocs: [] as { path: string; at: string }[],
  };
}
export type DB = ReturnType<typeof fresh>;

function load(): DB {
  if (host) return fresh();
  try {
    const s = localStorage.getItem(KEY);
    if (s) { const d = JSON.parse(s) as DB; if (d.generatedFor === today()) return d; }
  } catch { /* ignore */ }
  return fresh();
}
export let db: DB = load();
let version = 0;
const ls = new Set<() => void>();
export const subscribe = (f: () => void) => { ls.add(f); return () => { ls.delete(f); }; };
export const getVersion = () => version;
function emit() { version++; if (!host) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* quota */ } } ls.forEach((l) => l()); }
export function resetSample() { db = fresh(); emit(); }
/** 让别的 store（卡片私有数据）在写入后也触发共享订阅者刷新 */
export const touch = () => emit();

/* ───────── 模拟写入结果 ───────── */
export type SimWrite = 'ok' | 'failed' | 'unknown' | 'conflict';
export interface Sim { write: SimWrite; offline: boolean }
let sim: Sim = (() => { try { return { write: 'ok', offline: false, ...JSON.parse(localStorage.getItem(SIM_KEY) ?? '{}') }; } catch { return { write: 'ok', offline: false }; } })();
export const getSim = () => sim;
export function setSim(p: Partial<Sim>) { sim = { ...sim, ...p }; localStorage.setItem(SIM_KEY, JSON.stringify(sim)); emit(); }

let rid = 0;
export const nid = (p: string) => `${p}${Date.now().toString(36).slice(-5)}${(rid++).toString(36)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ERR: Record<Exclude<SimWrite, 'ok'>, string> = {
  failed: '写入失败：文件被占用（样例模拟）',
  unknown: '已发出，但没有收到结果；可能写入了，也可能没有',
  conflict: '文件在别处被改过（例如在 Obsidian 里编辑），为避免覆盖没有写入',
};
interface Opt { path?: string; runtime?: boolean; targetId?: string; noConflict?: boolean }
/**
 * 所有写入的统一入口。apply 只在成功时执行；失败 / 未知 / 冲突时不改本地数据。
 */
export async function write(op: string, label: string, apply: () => { path?: string; targetId?: string; detail?: string } | void, o: Opt = {}): Promise<Receipt> {
  if (host) return { id: nid('rc'), op, label, at: nowIso(), status: 'failed', error: '这一项尚未接入 Vault，可先打开原文处理' };
  await sleep(420 + Math.random() * 260);
  let status: Receipt['status'] = sim.write === 'conflict' && o.noConflict ? 'failed' : sim.write;
  let error = status === 'ok' ? undefined : ERR[status as Exclude<SimWrite, 'ok'>];
  if (o.runtime && sim.offline) { status = 'failed'; error = '本机服务离线：命令没有送达'; }
  let res: ReturnType<typeof apply> = undefined;
  if (status === 'ok') res = apply();
  const r: Receipt = { id: nid('rc'), op, label, at: nowIso(), status, path: res?.path ?? o.path, targetId: res?.targetId ?? o.targetId, detail: res?.detail, error };
  db.receipts = [r, ...db.receipts].slice(0, 120);
  emit();
  return r;
}
export const H = (by: Hist['by'], text: string): Hist => ({ at: nowIso(), by, text });
export async function refreshVault() {
  if (!host) return;
  const snapshot = await host.load(); Object.assign(db, snapshot); emit();
}
async function vaultWrite(op: string, label: string, data: Record<string, unknown>): Promise<Receipt> {
  let result: { targetId?: string; path?: string; detail?: string };
  try { result = await host!.execute(op, data); }
  catch (error) {
    const r: Receipt = { id: nid('rc'), op, label, at: nowIso(), status: (error as { code?: string }).code === 'conflict' ? 'conflict' : 'failed', error: error instanceof Error ? error.message : String(error) };
    db.receipts.unshift(r); emit(); return r;
  }
  const r: Receipt = { id: nid('rc'), op, label, at: nowIso(), status: 'ok', ...result };
  try { await refreshVault(); } catch { r.detail = '文件已写入，界面读取失败，请刷新'; }
  db.receipts.unshift(r); emit(); return r;
}

/* ───────── 读取 / 推导 ───────── */
export const mat = (id?: string) => db.materials.find((m) => m.id === id);
export const act = (id?: string) => db.actions.find((a) => a.id === id);
export const dec = (id?: string) => db.decisions.find((d) => d.id === id);
export const proj = (id?: string) => db.projects.find((p) => p.id === id);
export const appr = (id?: string) => db.approvals.find((a) => a.id === id);
export const src = (id?: string) => db.sources.find((s) => s.id === id);

/** 材料主状态：由多项事实推导（优先级从高到低），不是单值字段 */
export function mainState(m: Material): MaterialMain {
  if (m.archived) return '已归档';
  if (m.later) return '以后读';
  if (m.outputs.some((o) => o.kind === 'action' || o.kind === 'knowledge')) return '已落地';
  if (m.outputs.some((o) => o.kind === 'approval' && appr(o.id)?.state === 'pending')) return '已推送';
  if (m.digested) return '已消化';
  if (m.route?.kind === '自己处理') return '自己处理中';
  if (m.ai.state === 'result') return '待我选';
  if (m.ai.state === 'sent') return 'AI 处理中';
  if (m.note?.text) return '已写备注';
  if (m.read) return '已读';
  return '新收到';
}
/** 「待消化」的口径：没归档、没确认消化 */
export const undigested = (m: Material) => !m.archived && !m.digested;

export function sectionOf(a: Action): ActionSection {
  if (a.deleted) return 'deleted';
  if (a.archived) return 'archived';
  if (a.done) return 'done';
  if (!a.date) return 'undated';
  const T = today();
  return a.date < T ? 'overdue' : a.date === T ? 'today' : 'later';
}
export const liveActions = () => db.actions.filter((a) => !a.deleted && !a.archived);
export const openDecisions = () => db.decisions.filter((d) => d.status === 'open' && d.freshness === 'current');
export const pendingApprovals = () => db.approvals.filter((a) => a.state === 'pending');

/* ───────── 随手记 ───────── */
export function capture(text: string, type: CaptureType) {
  if (host) return vaultWrite('capture', '保存随手记', { text, type });
  const id = nid('m');
  return write('capture', `随手记：${text.trim().split('\n')[0].slice(0, 30)}`, () => {
    const now = nowIso();
    db.materials = [{
      id, kind: 'capture', sourceId: 'C08', channel: '随手记', captureType: type, title: text.trim().split('\n')[0].slice(0, 40) || '（空白）', text,
      contentAt: now, receivedAt: now, ref: { source: 'C08', label: '随手记收件箱', path: '系统/随手记/随手记收件箱.md', anchor: `^${id}`, at: now },
      ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [], history: [H('我', `随手记保存（类型：${type}）`)],
    }, ...db.materials];
    return { path: `系统/随手记/随手记收件箱.md#^${id}`, targetId: id };
  }, { noConflict: true });
}

/* ───────── 材料事实 ───────── */
/**
 * 卡片把自己的条目以「投影」交给宿主：收件、行动、待采纳、项目引用同一来源，点开回到卡片（home）。
 * 已存在就只更新标题和原文摘录，不复制第二份正文。本地操作，不算写入。
 */
export function upsertProjection(m: Material) {
  const e = mat(m.id);
  if (e) { e.title = m.title; if (!e.text) e.text = m.text; } else db.materials = [m, ...db.materials];
  emit(); return m.id;
}
export const patchMat = (id: string, f: (m: Material) => void) => { const m = mat(id); if (m) f(m); };
export const markRead = (id: string, on = true) => write('read', on ? '标记已读' : '取消已读', () => patchMat(id, (m) => { m.read = on ? nowIso() : undefined; m.history.push(H('我', on ? '标记已读' : '取消已读')); }), { targetId: id, noConflict: true });
export const saveNote = (id: string, text: string) => write('note', '保存备注', () => { patchMat(id, (m) => { m.note = { text, at: nowIso() }; m.history.push(H('我', '保存备注')); }); return { path: mat(id)?.ref.path }; }, { targetId: id });
export const confirmDigest = (id: string, note: string) => write('digest', '确认已消化', () => patchMat(id, (m) => { m.digested = { at: nowIso(), note }; if (note) m.note = { text: note, at: nowIso() }; m.history.push(H('我', '确认已消化')); }), { targetId: id });
export const undoDigest = (id: string) => write('digest', '撤回已消化', () => patchMat(id, (m) => { m.digested = undefined; m.history.push(H('我', '撤回「已消化」')); }), { targetId: id });
/** 以后读（悬置）：任何阶段都能放进去，也能随时拿出来；不设到期日 */
export const setLater = (id: string, on: boolean) => write('later', on ? '放进以后读' : '从以后读拿出', () => { patchMat(id, (m) => { m.later = on ? nowIso() : undefined; m.history.push(H('我', on ? '放进以后读' : '从以后读拿出')); }); return { path: flowPath('later') }; }, { targetId: id, noConflict: true });
export const archiveMat = (id: string, on = true) => write('archive', on ? '归档材料' : '取消归档', () => patchMat(id, (m) => { m.archived = on ? nowIso() : undefined; m.history.push(H('我', on ? '归档（只标记，不删除）' : '取消归档')); }), { targetId: id, noConflict: true });
/* ───────── 统一流程：备注 → AI 初处理 → 我选（A 直接入库 / B 我自己处理）；以后读随时 ───────── */
const KIND_TYPE: Record<Material['kind'], string> = { capture: '想法', collect: '图文', qq: '消息', diary: '想法', clip: '长文', project: '项目', health: '想法', handwrite: '图文' };
/** 材料的 平台 × 类型 × 主题（落点规则的输入） */
export function facetOf(m: Material) {
  const platform = m.platform ?? (m.kind === 'qq' ? (m.channel.startsWith('微信') ? '微信' : 'QQ') : m.kind === 'capture' ? '随手记' : m.kind === 'diary' ? '日记' : m.kind === 'clip' ? '网页' : m.channel.split(' ')[0]);
  const type = m.media?.some((x) => x.kind === '视频') ? '视频' : KIND_TYPE[m.kind];
  return { platform, type, topic: m.topic ?? '未归类', title: m.title, date: dayKey(m.contentAt ?? m.receivedAt) };
}
/** 交给 AI：按备注初处理。备注是必需的——AI 不猜你为什么收它 */
export function sendToAI(id: string) {
  const m0 = mat(id)!;
  return write('ai-pre', `交给 AI 按备注初处理：${m0.title.slice(0, 20)}`, () => {
    patchMat(id, (m) => { m.ai = { state: 'sent', at: nowIso(), intent: m.note?.text }; m.history.push(H('我', `交给 AI（备注：${(m.note?.text ?? '').slice(0, 30)}）`)); });
    setTimeout(() => finishPre(id), 1800);
    return { path: flowPath('pre', facetOf(m0)) };
  }, { runtime: true, targetId: id });
}
function finishPre(id: string) {
  const m = mat(id); if (!m || m.ai.state !== 'sent') return;
  if (m.gaps?.length) { m.ai = { ...m.ai, state: 'failed', at: nowIso(), error: '原文不完整，AI 没法按备注处理（见缺口）' }; m.history.push(H('AI', '初处理失败：原文不完整')); emit(); return; }
  const intent = m.ai.intent ?? '';
  const ref = /查|资料|以后用|参考|备用|入库/.test(intent);
  m.ai = {
    ...m.ai, state: 'result', at: nowIso(),
    summary: `（样例）按你的备注「${intent.slice(0, 24)}」：原文里和这件事直接相关的有 3 处。`,
    points: [`（样例）和「${intent.slice(0, 12)}」直接相关的一句原话`, '（样例）原文给出的一个具体做法 / 时间 / 数字', '（样例）你可能还不知道的一个概念（可以展开查）'],
    suggest: ref ? '入库' : '自己处理', confidence: '中',
    suggestion: ref ? '备注说是留着以后用 → 建议直接入库' : '备注里有想弄懂的东西 → 建议自己处理',
  };
  m.history.push(H('AI', '初处理完成，等你选'));
  emit();
}
/** A 直接入库：原文 + 备注 + 标签 + 来源，按落点规则算路径（可以改）。重复入库不新建 */
export function toKnowledge(id: string, pathOverride?: string) {
  const m = mat(id)!;
  const exist = m.outputs.find((o) => o.kind === 'knowledge');
  const f = facetOf(m); const r = resolveRoute(f); const path = pathOverride || r.path;
  return write('knowledge', exist ? '已入库（未重复创建）' : '直接入库', () => {
    if (exist) return { path: exist.path, detail: '这条材料已经入库过，没有重复创建' };
    const lid = nid('l');
    const tags = [f.platform, f.type, f.topic].map((x) => `#${x.replace(/\s/g, '')}`).join(' ');
    db.library = [{ id: lid, title: m.title, path, source: f.platform, scope: f.topic, at: nowIso(), text: `${tags}\n来源：${m.ref.url ?? m.ref.path ?? m.ref.label}\n\n` + (m.note?.text ? `## 备注\n${m.note.text}\n\n` : '') + (m.ai.summary ? `## AI 初处理（样例）\n${m.ai.summary}\n\n` : '') + `## 原文\n${m.text}`, materialId: id }, ...db.library];
    m.outputs.push({ kind: 'knowledge', id: lid, label: m.title, at: nowIso(), path });
    m.route = { kind: '入库', at: nowIso(), path, rule: r.rule && !pathOverride ? r.rule.id : undefined };
    m.later = undefined;
    m.history.push(H('我', `直接入库：${path}`));
    return { path, targetId: lid };
  }, { targetId: id });
}
/** B 我自己处理：原文 + AI 按备注整理的要点放到「我自己处理」；我逐条划掉，全部划完 = 已消化 */
export const selfProcess = (id: string) => write('self', '我自己处理', () => {
  const m = mat(id)!; const path = flowPath('self', facetOf(m));
  m.route = { kind: '自己处理', at: nowIso(), path, crossed: [] }; m.later = undefined;
  m.history.push(H('我', `我自己处理：${path}`));
  return { path };
}, { targetId: id });
export const crossPoint = (id: string, i: number) => write('cross', '划掉一条', () => {
  const m = mat(id)!; if (!m.route) return;
  const c = new Set(m.route.crossed ?? []); c.has(i) ? c.delete(i) : c.add(i); m.route.crossed = [...c];
  return { path: m.route.path };
}, { targetId: id, noConflict: true });
export const unroute = (id: string) => write('route', '撤回选择', () => { patchMat(id, (m) => { m.route = undefined; m.history.push(H('我', '撤回选择（入库文件不删，只是不再算这条的去向）')); }); }, { targetId: id, noConflict: true });
export const linkProject = (id: string, projectId: string, as: '参考' | '已确认需求') => write('link', `关联项目（${as}）`, () => patchMat(id, (m) => {
  m.projectLinks = [...m.projectLinks.filter((l) => l.projectId !== projectId), { projectId, as, at: nowIso() }];
  m.history.push(H('我', `关联「${proj(projectId)?.name}」作为${as}`));
}), { targetId: id });
export const unlinkProject = (id: string, projectId: string) => write('link', '取消关联', () => patchMat(id, (m) => { m.projectLinks = m.projectLinks.filter((l) => l.projectId !== projectId); m.history.push(H('我', `取消关联「${proj(projectId)?.name}」`)); }), { targetId: id });

/** 材料 → 行动（用户明确操作）。同一材料已有未删除的行动时不重复创建（S02） */
export function materialToAction(id: string, title: string, date?: string) {
  const m = mat(id)!;
  if (host) return vaultWrite('action-new', `转为行动：${title}`, { title, date: date || today(), priority: '中', body: `来源：${m.ref.url || m.ref.path || m.ref.label}\n\n${m.text}`, source: m.ref.path ? `[[${m.ref.path}]]` : undefined });
  const exist = m.outputs.find((o) => o.kind === 'action' && act(o.id) && !act(o.id)!.deleted);
  return write('to-action', exist ? '已有行动（未重复创建）' : `转为行动：${title}`, () => {
    if (exist) return { targetId: exist.id, path: act(exist.id)!.path, detail: '这条材料已经有行动了，没有重复创建' };
    const a = newAction({ title, date, materialIds: [id], refs: [{ ...m.ref }], history: [H('我', `由材料「${m.title}」转为行动`)] });
    m.outputs.push({ kind: 'action', id: a.id, label: title, at: nowIso(), path: a.path }); m.history.push(H('我', `转为行动 ${a.id}`));
    return { targetId: a.id, path: a.path };
  });
}
/** 挂到已有行动（另一条材料支持同一件事，不新建） */
export const attachToAction = (id: string, actionId: string) => write('attach', '挂到已有行动', () => {
  const m = mat(id)!, a = act(actionId)!;
  if (!a.materialIds.includes(id)) { a.materialIds.push(id); a.refs.push({ ...m.ref }); a.history.push(H('我', `挂上支持材料「${m.title}」`)); }
  if (!m.outputs.some((o) => o.id === actionId)) m.outputs.push({ kind: 'action', id: actionId, label: a.title, at: nowIso(), path: a.path });
  return { targetId: actionId, path: a.path };
});
/** 推送到今日待采纳（只新增待采纳；同材料同标题去重） */
export function pushApproval(materialIds: string[], title: string, group: string, by: Approval['by'] = '我') {
  const dup = db.approvals.find((a) => a.title === title && a.materialIds.join() === materialIds.join() && a.state !== 'rejected');
  return write('push', dup ? '已在待采纳（未重复推送）' : `推送：${title}`, () => {
    if (dup) return { targetId: dup.id, detail: '同一条已经推送过' };
    const id = nid('ap'); const m0 = mat(materialIds[0]);
    db.approvals = [{ id, title, group, sourceId: m0?.sourceId ?? 'C08', by, createdAt: nowIso(), materialIds, refs: materialIds.map((x) => ({ ...mat(x)!.ref, label: mat(x)!.title })), state: 'pending' }, ...db.approvals];
    materialIds.forEach((x) => patchMat(x, (m) => { m.outputs.push({ kind: 'approval', id, label: `待采纳：${title}`, at: nowIso() }); m.history.push(H('我', `推送到今日待采纳（${id}）`)); }));
    return { targetId: id };
  });
}

/* ───────── 待采纳 ───────── */
export function decideApproval(id: string, state: 'adopted' | 'rejected' | 'later' | 'pending', reason?: string, date?: string) {
  const ap = appr(id)!;
  const label = { adopted: '采纳', rejected: '不采纳', later: '稍后', pending: '撤回到待采纳' }[state];
  return write('approval', `${label}：${ap.title}`, () => {
    ap.state = state; ap.decidedAt = nowIso(); ap.reason = reason || ap.reason;
    if (state === 'adopted') {
      const exist = act(ap.actionId) ?? db.actions.find((a) => a.approvalId === id && !a.deleted);
      if (exist) { exist.deleted = undefined; ap.actionId = exist.id; return { targetId: exist.id, path: exist.path, detail: '已有对应行动，没有重复创建' }; }
      const a = newAction({ title: ap.title, body: ap.body, date: date ?? ap.suggestDate ?? today(), approvalId: id, projectId: ap.projectId, decisionId: ap.decisionId, materialIds: [...ap.materialIds], refs: ap.refs.map((r) => ({ ...r })), history: [H('我', `采纳待采纳 ${id} 创建`)] });
      ap.actionId = a.id;
      ap.materialIds.forEach((x) => patchMat(x, (m) => { m.outputs.push({ kind: 'action', id: a.id, label: a.title, at: nowIso(), path: a.path }); m.history.push(H('我', `采纳 → 行动 ${a.id}`)); }));
      return { targetId: a.id, path: a.path };
    }
    ap.materialIds.forEach((x) => patchMat(x, (m) => m.history.push(H('我', `${label}「${ap.title}」${reason ? '：' + reason : ''}`))));
  });
}

/* ───────── 行动 ───────── */
function newAction(p: Partial<Action> & { title: string }): Action {
  const id = nid('a');
  const a: Action = { id, priority: '中', order: Math.max(0, ...db.actions.map((x) => x.order)) + 1, createdAt: nowIso(), path: `系统/行动/${id}.md`, refs: [], materialIds: [], history: [H('我', '创建')], ...p };
  db.actions = [...db.actions, a];
  return a;
}
export const createAction = (p: Partial<Action> & { title: string }) => host ? vaultWrite('action-new', `新建行动：${p.title}`, { ...p }) : write('action-new', `新建行动：${p.title}`, () => { const a = newAction(p); return { targetId: a.id, path: a.path }; });
export const updateAction = (id: string, patch: Partial<Action>, what = '编辑') => host ? vaultWrite('done' in patch ? 'action-toggle' : patch.deleted ? 'action-delete' : 'archived' in patch ? patch.archived ? 'action-archive' : 'action-unarchive' : 'action-edit', `${what}：${act(id)?.title}`, { id, patch }) : write('action-edit', `${what}：${act(id)?.title}`, () => {
  const a = act(id)!; Object.assign(a, patch); a.history.push(H('我', what)); return { path: a.path, targetId: id };
}, { targetId: id });
export const toggleDone = (id: string) => { const a = act(id)!; return updateAction(id, { done: a.done ? undefined : nowIso() }, a.done ? '恢复未完成' : '完成'); };
export const archiveAction = (id: string, on = true) => updateAction(id, { archived: on ? nowIso() : undefined }, on ? '归档' : '取消归档');
export const deleteAction = (id: string, on = true) => updateAction(id, { deleted: on ? nowIso() : undefined }, on ? '删除（可恢复）' : '恢复');
export const reorder = (ids: string[]) => host ? vaultWrite('action-reorder', '调整顺序', { ids }) : write('reorder', '调整顺序', () => { ids.forEach((id, i) => { const a = act(id); if (a) a.order = i; }); }, { noConflict: true });
export const createProject = (name: string, purpose: string) => vaultWrite('project-new', '新建项目', { name, purpose });

/* ───────── 待我决策 ───────── */
export function respond(id: string, r: Omit<DecisionResponse, 'at'>) {
  if (host) return vaultWrite('respond', '保存回应', { id, response: r });
  const d = dec(id)!;
  return write('respond', `回应「${d.title}」：${r.kind}`, () => {
    const resp: DecisionResponse = { ...r, at: nowIso(), verify: r.kind === '已操作' ? '待核实' : '用户已反馈' };
    d.response = resp; d.responses = [...d.responses, resp];
    d.status = r.kind === '稍后' ? 'later' : r.kind === '不适用' ? 'dismissed' : 'resolved';
    if (r.kind === '稍后') d.laterUntil = addDays(today(), 1);
    d.after = r.kind === '稍后' ? undefined : r.kind === '不适用' ? { waitingOn: '项目', note: '项目收到「不适用」，需要撤回或改写这条请求' }
      : r.kind === '已操作' ? { waitingOn: '项目', note: '项目核实你的操作是否生效' }
        : r.kind === '需修改' ? { waitingOn: 'AI', note: '项目按你的意见修改后重新提请求' }
          : { waitingOn: 'AI', note: '项目按你的回答继续' };
    d.history.push(H('我', `${r.kind}${r.text ? '：' + r.text : ''}`));
    const p = proj(d.projectId); if (p) p.refreshes.unshift({ kind: '投递', at: nowIso(), status: 'pending', note: `「${d.title}」的回应等待投递给项目` });
    return { path: d.path, targetId: id };
  });
}
export const reopen = (id: string) => host ? vaultWrite('reopen', '重新打开请求', { id }) : write('reopen', '重新打开请求', () => { const d = dec(id)!; d.status = 'open'; d.after = undefined; d.history.push(H('我', '重新打开')); return { path: d.path }; });
export const scheduleCheck = (id: string) => {
  const d = dec(id)!;
  const exist = d.actionIds.map(act).find((a) => a && !a.deleted);
  if (host) return vaultWrite('check-action', '安排验收行动', { id });
  return write('check-action', exist ? '已有验收行动（未重复创建）' : '安排验收行动', () => {
    if (exist) return { targetId: exist.id, path: exist.path };
    const a = newAction({ title: `验收：${d.title.replace(/[？?]$/, '')}`, date: today(), kind: '验收行动', decisionId: id, projectId: d.projectId, workItemId: d.workItemId, body: '完成这条行动只代表看过了；验收结论回到「待我决策」给出。', refs: [{ source: 'C02', label: `请求 ${id}`, path: d.path }] });
    d.actionIds.push(a.id); d.history.push(H('我', `安排验收行动 ${a.id}`));
    return { targetId: a.id, path: a.path };
  });
};


/* ───────── 日记（有冲突语义；复盘也读它，所以是共享对象） ───────── */
export function saveDiary(date: string, kind: string, text: string, mtime?: string) {
  if (host) return vaultWrite('diary', '保存日记', { date, kind, text, mtime });
  const day = db.diary.find((d) => d.date === date)!; const f = day.files.find((x) => x.kind === kind)!;
  return write('diary', `保存 ${f.path.split('/').pop()}`, () => { f.text = text; f.state = text ? 'exists' : 'empty'; f.mtime = nowIso(); f.error = undefined; return { path: f.path }; });
}
export const ensureDiaryDay = async (date: string, refresh = false) => {
  if (!refresh && db.diary.some((d) => d.date === date)) return db.diary.find((d) => d.date === date);
  if (host) { const day = await host.diary(date); db.diary = [...db.diary.filter((d) => d.date !== date), day]; emit(); return day; }
  const dir = `示例数据/日记/${date.slice(0, 7)}/${+date.slice(8, 10) <= 15 ? '上半月' : '下半月'}/${date}`;
  db.diary.push({ date, files: (['用户原文', '生活日记整理版', 'AI项目日志'] as const).map((k) => ({ kind: k, path: `${dir}/${date}_${k}.md`, state: 'missing' as const })) });
  emit(); return db.diary.find((d) => d.date === date);
};
