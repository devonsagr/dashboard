/**
 * 「cost」卡的私有数据（只有这张卡读写）。订阅与账单。
 * 前端阶段：样例 + localStorage['pkd.v5.card.cost.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import type { Ref } from '../../data/types';

export interface CostEntry { id: string; name: string; kind: '订阅' | '按量账单' | '估算'; amount?: number; currency: 'CNY' | 'USD'; period: string; ref: Ref; note?: string }

export const costs = (): CostEntry[] => [
  { id: 'c1', name: '示例订阅 A', kind: '订阅', amount: 12, currency: 'USD', period: '每月', ref: { source: 'P11', label: 'AI成本产出记录', path: '示例数据/成本/订阅.md', anchor: '#订阅' } },
  { id: 'c2', name: '示例订阅 B', kind: '订阅', amount: 8, currency: 'USD', period: '每月', ref: { source: 'P11', label: 'AI成本产出记录', path: '示例数据/成本/订阅.md', anchor: '#订阅' } },
  { id: 'c3', name: '示例按量服务', kind: '按量账单', amount: 16.5, currency: 'CNY', period: '本月 1 日至今', ref: { source: 'P11', label: '账单导入', path: '示例数据/成本/demo-service-本月.csv' } },
  { id: 'c4', name: '示例服务用量', kind: '估算', amount: undefined, currency: 'USD', period: '本月', ref: { source: 'P11', label: '未记录' }, note: '没有记录，不等于免费' },
];

export const S = cardStore('cost', () => ({ costs: costs() }));
