/**
 * 「quick-edit」卡的私有数据（只有这张卡读写）。钉住的文件内容（真实接入后就是 Vault 里的文件本身）。
 * 前端阶段：样例 + localStorage['pkd.v5.card.quick-edit.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { at, nowIso } from '../../data/time';

export const files = (): Record<string, { text: string; mtime: ISOString }> => ({
  '系统/随手记/今日速记.md': { text: '- 合成速记：整理示例图纸\n- 确认示例作品的提交格式', mtime: at(0, '08:30') },
  '示例工程/示例仪表盘/当前交接.md': { text: '# 当前交接\n\n- v2 前端完成\n- v3：业务对象关系', mtime: at(0, '09:20') },
});
type ISOString = string;

export const S = cardStore('quick-edit', () => ({ files: files() }));

export function saveFile(path: string, text: string) {
  return S.write('file', `保存 ${path.split('/').pop()}`, () => { S.d.files[path] = { text, mtime: nowIso() }; return { path }; });
}
