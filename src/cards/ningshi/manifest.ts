import { Timer } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 专注计时：当前专注场次、离线状态、发命令（开始 / 暂停 / 结束） */
export default defineCard({
  id: 'ningshi', name: '专注计时', icon: Timer, category: '身体与工具', status: '样例', folder: 'src/cards/ningshi',
  desc: '当前专注场次、离线状态、发命令（开始 / 暂停 / 结束）',
  w: 4, h: 5, minW: 3, minH: 4,
  data: { sources: ['C05'], storage: ['本机专注计时服务（loopback API + SQLite）', '状态投影：系统/专注计时/专注计时实时状态.md'], refresh: '服务在线时定时读取；离线显示最后快照', writes: '向本机服务发命令（不写 Markdown）' },
  hasPage: true,
  aliases: { focus: {} }, carries: ['专注计时'],
  load: () => import('./index'),
});
