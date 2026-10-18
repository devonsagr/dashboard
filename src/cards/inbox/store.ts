/**
 * 「inbox」卡的私有数据（只有这张卡读写）。处理批次（材料本身是共享对象）。
 * 前端阶段：样例 + localStorage['pkd.v5.card.inbox.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { at, nowIso } from '../../data/time';
import { H, mat, nid, patchMat, touch } from '../../data/store';
import type { ISO } from '../../data/types';

export interface ProcBatch {
  id: string; source: string; createdAt: ISO; materialIds: string[];
  status: 'draft' | 'confirmed' | 'partial' | 'done'; confirmedAt?: ISO;
  approvalIds: string[]; path: string; note?: string;
}

export const batches = (): ProcBatch[] => [
  { id: 'pb1', source: '信息收集 · X', createdAt: at(-2, '23:00'), materialIds: ['m04', 'm05'], status: 'done', confirmedAt: at(-2, '23:00'), approvalIds: ['ap1'], path: '系统/收集处理/批次/pb1.md' },
  { id: 'pb2', source: '信息收集 · B站', createdAt: at(-2, '23:04'), materialIds: ['m06', 'm07'], status: 'partial', confirmedAt: at(-2, '23:05'), approvalIds: [], path: '系统/收集处理/批次/pb2.md', note: '1 条失败，1 条状态未知' },
  { id: 'pb3', source: '网页剪藏', createdAt: at(0, '08:39'), materialIds: ['m12'], status: 'confirmed', confirmedAt: at(0, '08:40'), approvalIds: [], path: '系统/收集处理/批次/pb3.md' },
  { id: 'pb4', source: '混合 · 待确认', createdAt: at(-1, '22:00'), materialIds: ['m08', 'm10'], status: 'draft', approvalIds: [], path: '系统/收集处理/批次/pb4.md', note: '还没确认，AI 不会处理' },
  { id: 'pb5', source: 'QQ · 示例通知群', createdAt: at(-2, '21:50'), materialIds: ['m09'], status: 'done', confirmedAt: at(-2, '21:50'), approvalIds: ['ap2', 'ap6'], path: '系统/QQ消息收件箱/批次/qq-b07/处理.md' },
];

export const S = cardStore('inbox', () => ({ batches: batches() }), { live: () => ({ batches: [] }) });

export const createBatch = (ids: string[], source: string) => S.write('batch-new', `新建处理批次（${ids.length} 条）`, () => {
  const id = nid('pb');
  S.d.batches = [{ id, source, createdAt: nowIso(), materialIds: ids, status: 'draft', approvalIds: [], path: `系统/收集处理/批次/${id}.md`, note: '还没确认，AI 不会处理' }, ...S.d.batches];
  ids.forEach((x) => patchMat(x, (m) => { m.batchIds.push(id); m.history.push(H('我', `加入处理批次 ${id}`)); }));
  return { targetId: id, path: `系统/收集处理/批次/${id}.md` };
}, { noConflict: true });
/** 确认发送：只有确认后才把材料交给 AI；结果稍后返回（样例里约 2 秒） */
export function confirmBatch(id: string) {
  const b = S.d.batches.find((x) => x.id === id)!;
  return S.write('batch-confirm', `确认发送批次 ${id}`, () => {
    b.status = 'confirmed'; b.confirmedAt = nowIso(); b.note = undefined;
    b.materialIds.forEach((x) => patchMat(x, (m) => { m.ai = { state: 'sent', at: nowIso(), batchId: id }; m.history.push(H('我', `确认发送批次 ${id}`)); }));
    setTimeout(() => finishBatch(id), 2200);
    return { path: b.path };
  }, { runtime: true });
}
function finishBatch(id: string) {
  const b = S.d.batches.find((x) => x.id === id); if (!b) return;
  let fail = 0;
  b.materialIds.forEach((x, i) => patchMat(x, (m) => {
    if (m.ai.state !== 'sent') return;
    if (m.gaps?.length && i === 0) { m.ai = { state: 'failed', at: nowIso(), batchId: id, error: '原文不完整，无法处理（见缺口）' }; fail++; m.history.push(H('AI', '处理失败：原文不完整')); }
    else { const it = m.note?.text; m.ai = { state: 'result', at: nowIso(), batchId: id, intent: it, summary: it ? `（样例）按备注「${it.slice(0, 20)}」整理了 2 处相关内容` : `（样例）没有备注，只做了通用摘要：${m.title.slice(0, 18)}……`, points: ['（样例）相关原话一句', '（样例）一个具体做法'], suggest: it ? '自己处理' : undefined, suggestion: it ? undefined : '先写备注再交给 AI，结果会更对路', confidence: it ? '中' : '低' }; m.history.push(H('AI', `批次 ${id} 返回结果`)); }
  }));
  b.status = fail ? 'partial' : 'done';
  S.emit(); touch();
}
export const retryItem = (batchId: string, mid: string) => S.write('batch-retry', '单条重试', () => {
  patchMat(mid, (m) => { m.ai = { state: 'sent', at: nowIso(), batchId }; m.history.push(H('我', `单条重试（批次 ${batchId}）`)); });
  setTimeout(() => { patchMat(mid, (m) => { m.ai = { state: 'result', at: nowIso(), batchId, summary: `（样例）重试后：${m.title.slice(0, 18)}……的要点`, confidence: '中' }; m.history.push(H('AI', '重试返回结果')); }); const b = S.d.batches.find((x) => x.id === batchId); if (b && b.materialIds.every((x) => mat(x)?.ai.state === 'result')) b.status = 'done'; S.emit(); touch(); }, 1800);
}, { runtime: true });
export const recheckItem = (mid: string) => S.write('ai-recheck', '重新读取 AI 状态', () => patchMat(mid, (m) => { m.ai = { ...m.ai, state: 'failed', error: '重新读取：确认没有处理过（可以重试）' }; m.history.push(H('系统', '重新读取：AI 实际没有处理')); }), { noConflict: true });
