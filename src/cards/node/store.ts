/**
 * 「node」卡的私有数据（只有这张卡读写）。节点延迟与采样状态。
 * 前端阶段：样例 + localStorage['pkd.v5.card.node.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { at, nowIso } from '../../data/time';
import type { ISO } from '../../data/types';

export interface NodeState {
  online: boolean; current?: string; sampling: 'running' | 'paused' | 'stopped' | 'unknown';
  lastComplete?: ISO; inProgress?: { started: ISO; done: number; total: number };
  nodes: { name: string; region: string; latency: (number | null)[]; timeouts: number; last?: number }[];
  range: '1天' | '3天' | '7天'; autoRoute: boolean;
  events: { at: ISO; kind: '切换' | '失败' | '采样' | '设置'; text: string }[];
}

const series = (seed: number, n = 48, spike = -1) => Array.from({ length: n }, (_, i) => (i === spike || i === spike + 1 ? null : 50 + Math.floor(Math.abs(Math.sin((i + seed) * 12.9898) * 43758.5453) % 40) + (seed === 2 && i > 30 ? 60 : 0)));
export const nodeState = (): NodeState => ({
  online: true, current: '示例节点 A2', sampling: 'running', lastComplete: at(0, '09:30'), inProgress: { started: at(0, '10:00'), done: 3, total: 5 },
  nodes: [
    { name: '示例节点 A1', region: 'DEMO-A', latency: series(1, 48, 20), timeouts: 2, last: 71 },
    { name: '示例节点 A2', region: 'DEMO-A', latency: series(3), timeouts: 0, last: 58 },
    { name: '示例节点 B1', region: 'DEMO-B', latency: series(2), timeouts: 1, last: 118 },
    { name: '示例节点 C1', region: 'DEMO-C', latency: series(5, 48, 40), timeouts: 4 },
    { name: '示例节点 D1', region: 'DEMO-D', latency: series(7), timeouts: 0, last: 96 },
  ],
  range: '1天', autoRoute: false,
  events: [
    { at: at(0, '09:30'), kind: '采样', text: '第 48 轮完成：5 个节点，1 个超时（示例节点 C1）' },
    { at: at(-1, '14:12'), kind: '切换', text: '手动切到 示例节点 A2（示例节点 A1 连续 2 次超时）' },
    { at: at(-2, '22:00'), kind: '设置', text: '自动路由：保持关闭' },
    { at: at(-3, '03:10'), kind: '失败', text: '采样中断：监控脚本重启' },
  ],
});

export const S = cardStore('node', () => ({ node: nodeState() }));

export const nodeCmd = (cmd: '开始' | '暂停' | '继续' | '停止' | '立即采样') => S.write('node', `节点监控：${cmd}`, () => {
  const n = S.d.node; n.sampling = cmd === '暂停' ? 'paused' : cmd === '停止' ? 'stopped' : 'running';
  n.events.unshift({ at: nowIso(), kind: cmd === '立即采样' ? '采样' : '设置', text: cmd === '立即采样' ? '手动发起一轮采样' : `采样：${cmd}` });
}, { runtime: true, noConflict: true });
export const setAutoRoute = (on: boolean) => S.write('node', on ? '开启自动路由' : '关闭自动路由', () => { S.d.node.autoRoute = on; S.d.node.events.unshift({ at: nowIso(), kind: '设置', text: `自动路由：${on ? '开启（由你明确开启）' : '关闭'}` }); }, { runtime: true, noConflict: true });
export const switchNode = (name: string) => S.write('node', `切换到 ${name}`, () => { const from = S.d.node.current; S.d.node.current = name; S.d.node.events.unshift({ at: nowIso(), kind: '切换', text: `手动从 ${from} 切到 ${name}` }); }, { runtime: true, noConflict: true });
export const setNodeRange = (range: '1天' | '3天' | '7天') => { S.d.node.range = range; S.emit(); };
