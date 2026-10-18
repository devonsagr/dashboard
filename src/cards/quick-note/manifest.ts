import { PenLine } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 随手记：原话保存，带类型；不会自动变成任务。存进去的每一条都是一条「材料」（共享对象），也会出现在收件里 */
export default defineCard({
  id: 'quick-note', name: '随手记', icon: PenLine, category: '输入', status: '样例', folder: 'src/cards/quick-note',
  desc: '原话保存，带类型；不会自动变成任务',
  w: 3, h: 5, minW: 3, minH: 3,
  data: { sources: ['C08'], storage: ['系统/随手记/随手记收件箱.md（追加，带 ^块 ID）'], refresh: '写入即保存', writes: '追加一条原话（不 trim、不改写）' },
  hasPage: true,
  carries: ['随手记'],
  load: () => import('./index'),
});
