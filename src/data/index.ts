import { useSyncExternalStore } from 'react';
import * as store from './store';

/**
 * 数据入口。页面与卡片只用：
 *   useData((db) => …)   订阅读取（任何写入成功后自动刷新）
 *   store.xxx(...)        发起写入，返回 Promise<Receipt>；配合 ui/write.tsx 的 useWrite 显示状态
 * 接入真实后端：替换 ./store 的实现（保持函数签名），详见 docs/架构/04-接入层与 DataPort.md
 */
export { store };
export type { DB } from './store';
export function useData<T>(select: (db: store.DB) => T): T {
  useSyncExternalStore(store.subscribe, store.getVersion);
  return select(store.db);
}
export const useSim = () => { useSyncExternalStore(store.subscribe, store.getVersion); return store.getSim(); };
export * from './types';
export * as time from './time';
