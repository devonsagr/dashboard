/**
 * 「便签」卡的私有数据：便签文字按 noteId 存，和画板布局分开。
 * 移除便签卡、恢复预设、导入别的布局都不会删掉文字；把卡片再放回来（同一个 noteId）内容还在。
 * 前端阶段存 localStorage['pkd.v5.content.sticky.v1']（我的内容，不按天重置）；建议落盘：系统/界面/便签.json（建议，待确认）。
 */
import { cardStore } from '../../data/cardStore';
import { today } from '../../data/time';

export interface Note { id: string; text: string; at: string }
const seed = () => ({
  notes: {
    n1: { id: 'n1', text: '周一前交示例作品初稿\n（样例便签）', at: `${today()}T08:00:00+08:00` },
    n2: { id: 'n2', text: '这张便签被锁定了：\n位置、大小、层级都不会动。', at: `${today()}T08:00:00+08:00` },
  } as Record<string, Note>,
});
export const S = cardStore('sticky', seed, { content: true });
export const useNotes = <T,>(sel: (c: ReturnType<typeof seed>) => T) => S.use(sel);
export const notes = {
  saveNote(id: string, text: string) { S.d.notes = { ...S.d.notes, [id]: { id, text, at: new Date().toISOString() } }; S.emit(); },
  orphanNotes(used: string[]) { return Object.values(S.d.notes).filter((n) => !used.includes(n.id) && n.text.trim()); },
};
