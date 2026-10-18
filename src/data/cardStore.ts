import { useSyncExternalStore } from 'react';
import { write as sharedWrite, touch } from './store';
import { today } from './time';

/**
 * 卡片私有数据。每张卡自己的东西（QQ 群列表、节点延迟、便签文字……）放在自己文件夹的 store.ts 里：
 *
 *   const s = cardStore('qq', () => ({ groups: sampleGroups(), runs: [] }));
 *   s.use((d) => d.groups)            订阅读取
 *   s.write('qq', '收集', () => {…})  写入（走统一写入语义：回执、失败 / 未知 / 冲突，见 ./store.ts write）
 *
 * 前端阶段存 localStorage['pkd.v5.card.<id>.v1']；样例按天重新生成（和共享样例一致）。
 * 接入后端时，每张卡只换自己的 store.ts，别的卡不受影响。
 */
type Opt = Parameters<typeof sharedWrite>[3];
interface Reg { id: string; reset: () => void }
const ALL: Reg[] = [];
const CONTENT: Reg[] = [];

/**
 * o.content = true：这是「我的内容」（便签文字、打卡），不是样例——
 * 存在 pkd.v5.content.<id>.v1，不按天重置，「重置样例数据」也不动它。
 */
export function cardStore<T extends object>(id: string, init: () => T, o: { daily?: boolean; content?: boolean } = {}) {
  const daily = o.daily ?? !o.content;
  const KEY = o.content ? `pkd.v5.content.${id}.v1` : `pkd.v5.card.${id}.v1`;
  const read = (): T => {
    try { const s = localStorage.getItem(KEY); if (s) { const j = JSON.parse(s); if (!daily || j.__for === today()) { delete j.__for; return j; } } } catch { /* ignore */ }
    return init();
  };
  let d: T = read();
  let v = 0;
  const ls = new Set<() => void>();
  const sub = (f: () => void) => { ls.add(f); return () => { ls.delete(f); }; };
  const emit = () => { v++; try { localStorage.setItem(KEY, JSON.stringify({ ...d, __for: today() })); } catch { /* quota */ } ls.forEach((f) => f()); };
  /** 自己的订阅者 + 共享订阅者（useData 里顺带读了私有数据的组件也会刷新） */
  const emitAll = () => { emit(); touch(); };
  const s = {
    get d() { return d; },
    use<R>(sel: (d: T) => R): R { useSyncExternalStore(sub, () => v); return sel(d); },
    emit: emitAll,
    reset() { d = init(); emitAll(); },
    /** 写入：apply 只在成功时执行（和共享对象的 write 同一套回执与模拟） */
    write(op: string, label: string, apply: () => { path?: string; targetId?: string; detail?: string } | void, opt?: Opt) {
      return sharedWrite(op, label, () => { const r = apply(); emit(); return r; }, opt);
    },
  };
  if (!o.content) ALL.push({ id, reset: s.reset });
  else CONTENT.push({ id, reset: s.reset });
  return s;
}
/** 顶栏「重置样例数据」：所有卡的私有样例一起恢复 */
export function resetCardStores() {
  Object.keys(localStorage).filter((k) => k.startsWith('pkd.v5.card.')).forEach((k) => localStorage.removeItem(k));   // 还没加载的卡
  ALL.forEach((r) => r.reset());
}
/** 设置页「重置便签与打卡」：清掉所有卡的「我的内容」 */
export function resetCardContent() {
  Object.keys(localStorage).filter((k) => k.startsWith('pkd.v5.content.')).forEach((k) => localStorage.removeItem(k));
  CONTENT.forEach((r) => r.reset());
}
