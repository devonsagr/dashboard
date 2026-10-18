import { AlarmClock } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 拖了很久：逾期最久的行动。也是「怎么自己加一张卡」的最小示例（只读共享对象 actions） */
export default defineCard({
  id: 'overdue', name: '拖了很久', icon: AlarmClock, category: '自定义', status: '样例', folder: 'src/cards/overdue',
  desc: '逾期最久的行动（自定义卡片示例）',
  w: 3, h: 4, minW: 2, minH: 2,
  props: [{ key: 'minDays', label: '逾期至少', type: 'select', options: [{ value: '1', label: '1 天' }, { value: '3', label: '3 天' }, { value: '7', label: '7 天' }] }], defaults: { minDays: '1' },
  data: { sources: ['C01'], storage: ['只读：系统/行动/'], refresh: '行动变化时' },
  hasPage: false,
  aliases: { 'custom-overdue': {} },
  load: () => import('./index'),
});
