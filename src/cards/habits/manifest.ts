import { CheckSquare } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 打卡：按真实日期打卡，可以补昨天 */
export default defineCard({
  id: 'habits', name: '打卡', icon: CheckSquare, category: '轻量', status: '本地', folder: 'src/cards/habits', light: true,
  desc: '按真实日期打卡，可以补昨天',
  w: 3, h: 5, minW: 3, minH: 3,
  data: { sources: [], storage: ['浏览器 localStorage › pkd.v5.content.habits.v1'], refresh: '点击即保存', writes: '当天打卡记录', content: '建议落盘：系统/打卡/YYYY-MM.md（建议，待确认）' },
  hasPage: false,
  load: () => import('./index'),
});
