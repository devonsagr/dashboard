/**
 * 卡片注册表：只认识 src/cards/index.ts 里登记的 manifest（不 import 任何实现）。
 * 实现（index.tsx）在第一次用到时才加载（见 ./host.tsx）。
 */
import type { CardCategory, CardModule } from './protocol';
import { MODULES as manifests } from '../../cards';
import { host, connectedCards } from '../../data/host';
export const MODULES: CardModule[] = host ? manifests.map((m) => ({ ...m, status: connectedCards.has(m.id) ? m.status === '不读数据' ? m.status : '本地' : '未接入' })) : manifests;
export const CATEGORIES: CardCategory[] = ['轻量', '今天', '输入', '项目', '知识', '身体与工具', '自定义'];
export const mod = (id?: string) => MODULES.find((m) => m.id === id);

/** 旧 kind → 新卡片 id + 补上的实例设置 */
const ALIAS = new Map<string, { id: string; props: Record<string, string> }>();
MODULES.forEach((m) => Object.entries(m.aliases ?? {}).forEach(([k, props]) => ALIAS.set(k, { id: m.id, props })));
export function resolveKind(kind: string): { id: string; props?: Record<string, string> } {
  if (mod(kind)) return { id: kind };
  return ALIAS.get(kind) ?? { id: kind };
}
export const viewOf = (m: CardModule, props?: Record<string, string>) => props?.view && m.views?.some((v) => v.id === props.view) ? props.view : m.views?.[0]?.id ?? '';
export const viewDef = (m: CardModule, props?: Record<string, string>) => m.views?.find((v) => v.id === viewOf(m, props));
/** 卡片完整页地址：/c/<id>/<sub> */
export const cardPath = (id: string, sub?: string) => `/c/${id}${!sub ? '' : sub.startsWith('?') ? sub : '/' + sub.replace(/^\//, '')}`;
export function pageOf(m: CardModule, props?: Record<string, string>) {
  if (!m.hasPage) return undefined;
  const p = { ...m.defaults, ...props, view: viewOf(m, props) };
  return cardPath(m.id, m.pageFor?.(p));
}
export function sizeOf(m: CardModule, view?: string) {
  const v = m.views?.find((x) => x.id === view);
  return { w: v?.w ?? m.w, h: v?.h ?? m.h, minW: v?.minW ?? m.minW, minH: v?.minH ?? m.minH };
}
