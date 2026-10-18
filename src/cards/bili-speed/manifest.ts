import { Gauge } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** B站倍速：本轮不迁移；说明原工具入口 */
export default defineCard({
  id: 'bili-speed', name: 'B站倍速', icon: Gauge, category: '身体与工具', status: '未接入', folder: 'src/cards/bili-speed',
  desc: '本轮不迁移；说明原工具入口',
  w: 3, h: 3, minW: 2, minH: 2,
  data: { sources: ['C16'], storage: ['原浏览器扩展 + 本地桥（不在仪表盘里）'], refresh: '不读取' },
  hasPage: true,
  load: () => import('./index'),
});
