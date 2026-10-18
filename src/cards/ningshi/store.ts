/**
 * 「ningshi」卡的私有数据（只有这张卡读写）。本机专注计时服务的状态快照。
 * 前端阶段：样例 + localStorage['pkd.v5.card.ningshi.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { addDays, at, nowIso, today } from '../../data/time';
import { nid } from '../../data/store';
import type { Day, ISO } from '../../data/types';

export interface NingshiState {
  online: boolean; lastSeen?: ISO;
  session?: { id: string; goal: string; state: 'running' | 'paused' | 'stopped'; startedAt: ISO; focusSec: number; awaySec: number; supervise: '监督中' | '未开启' | '异常'; window?: string; tick: ISO };
  pending?: { cmd: string; at: ISO };
  todayFocusSec?: number; history: { id: string; goal: string; date: Day; focusMin: number; distractions: number }[];
  projectionPath: string;
}

export const ningshi = (): NingshiState => ({
  online: false, lastSeen: at(-1, '23:02'), projectionPath: '系统/专注计时/专注计时实时状态.md',
  session: { id: 's-1014', goal: '示例练习第 1 章', state: 'stopped', startedAt: at(-1, '21:30'), focusSec: 4980, awaySec: 420, supervise: '未开启', window: '—', tick: at(-1, '23:02') },
  todayFocusSec: undefined,
  history: [{ id: 's-1014', goal: '示例练习第 1 章', date: addDays(today(), -1), focusMin: 83, distractions: 3 }, { id: 's-1013', goal: '画板前端', date: addDays(today(), -2), focusMin: 120, distractions: 5 }, { id: 's-1012', goal: '示例课程复习', date: addDays(today(), -3), focusMin: 45, distractions: 1 }],
});

export const S = cardStore('ningshi', () => ({ ningshi: ningshi() }));

export function ningshiCmd(cmd: '开始' | '暂停' | '继续' | '停止', goal?: string) {
  S.d.ningshi.pending = { cmd, at: nowIso() }; S.emit();
  return S.write('ningshi', `专注计时：${cmd}`, () => {
    const n = S.d.ningshi; n.pending = undefined;
    if (!n.online) { n.online = true; n.lastSeen = nowIso(); }
    if (cmd === '开始') n.session = { id: nid('s'), goal: goal || '未命名场次', state: 'running', startedAt: nowIso(), focusSec: 0, awaySec: 0, supervise: '监督中', window: 'Obsidian', tick: nowIso() };
    else if (n.session) { n.session.state = cmd === '暂停' ? 'paused' : cmd === '继续' ? 'running' : 'stopped'; n.session.tick = nowIso(); if (cmd === '停止') n.session.supervise = '未开启'; }
    return { path: n.projectionPath };
  }, { runtime: true, noConflict: true }).then((r) => { if (r.status !== 'ok') { S.d.ningshi.pending = undefined; S.emit(); } return r; });
}
export const ningshiReconnect = () => S.write('ningshi', '专注计时：重新连接', () => { S.d.ningshi.online = true; S.d.ningshi.lastSeen = nowIso(); }, { runtime: true, noConflict: true });
