import { Flag } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 倒计时：离某件事还有几天 */
export default defineCard({
  id: 'countdown', name: '倒计时', icon: Flag, category: '轻量', status: '不读数据', folder: 'src/cards/countdown', light: true,
  desc: '离某件事还有几天',
  w: 3, h: 3, minW: 2, minH: 3,
  data: { sources: [], storage: ['画板布局 › 这张卡的设置'], refresh: '每天' },
  hasPage: false,
  defaults: { title: '示例作品评审', date: '' }, props: [{ key: 'title', label: '事件', type: 'text' }, { key: 'date', label: '日期', type: 'date' }],
  load: () => import('./index'),
});
