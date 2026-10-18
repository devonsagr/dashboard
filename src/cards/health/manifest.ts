import { HeartPulse } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 健康：步数、睡眠、心率、血氧与饮食；缺天显示未知 */
export default defineCard({
  id: 'health', name: '健康', icon: HeartPulse, category: '身体与工具', status: '样例', folder: 'src/cards/health',
  desc: '步数、睡眠、心率、血氧与饮食；缺天显示未知',
  w: 4, h: 4, minW: 3, minH: 3,
  data: { sources: ['H02', 'H03', 'H04', 'H05', 'H07'], storage: ['Health Sync 导出的 CSV（Drive 同步目录，路径待确认）', '示例数据/健康/日常/'], refresh: '每天早上同步前一天' },
  hasPage: true,
  aliases: { 'health-today': {} },
  load: () => import('./index'),
});
