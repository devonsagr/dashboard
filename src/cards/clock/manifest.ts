import { Clock3 } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 时间：日期、星期、周次（香港时间） */
export default defineCard({
  id: 'clock', name: '时间', icon: Clock3, category: '轻量', status: '不读数据', folder: 'src/cards/clock', light: true,
  desc: '日期、星期、周次（香港时间）',
  w: 3, h: 3, minW: 2, minH: 2,
  data: { sources: [], storage: ['不存储'], refresh: '每 15 秒' },
  hasPage: false,
  load: () => import('./index'),
});
