/**
 * 「usage」卡的私有数据（只有这张卡读写）。电脑前台时长快照。
 * 前端阶段：样例 + localStorage['pkd.v5.card.usage.v1']；接入后端时只替换这个文件。
 */
import { cardStore } from '../../data/cardStore';
import { at } from '../../data/time';
import type { ISO } from '../../data/types';

export interface UsageState {
  online: boolean; asOf?: ISO; coverage: string; basis: string;
  apps: { name: string; min: number }[]; sites: { domain: string; min: number }[]; idleMin?: number; gaps: string[];
}

export const usage = (): UsageState => ({
  online: true, asOf: at(0, '09:40'), basis: '前台窗口时长；空闲 5 分钟以上不计', coverage: '本机 Windows + Chrome 扩展；手机与平板不在统计内',
  apps: [{ name: 'VS Code', min: 74 }, { name: 'Chrome', min: 63 }, { name: 'Obsidian', min: 33 }, { name: 'QQ', min: 12 }, { name: '其他', min: 10 }],
  sites: [{ domain: 'video.example.com', min: 41 }, { domain: 'notes.example.com', min: 22 }], idleMin: 38,
  gaps: ['08:10–08:40 扩展未上报（浏览器刚启动）'],
});

export const S = cardStore('usage', () => ({ usage: usage() }));
