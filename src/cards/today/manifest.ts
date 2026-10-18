import { ListChecks } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 今日行动：我决定要做的事。两个视图：列表（逾期 + 今天）/ 日程（今天定了时间的） */
export default defineCard({
  id: 'today', name: '今日行动', icon: ListChecks, category: '今天', status: '样例', folder: 'src/cards/today',
  desc: '逾期和今天的事，勾掉有删除线；底部直接新建。日程视图只看定了时间的',
  w: 5, h: 8, minW: 3, minH: 4,
  views: [
    { id: 'list', name: '列表', desc: '逾期 + 今天，可以直接新建' },
    { id: 'timeline', name: '日程', desc: '今天定了时间的行动；课程会议待日历接入', w: 3, h: 7, minW: 3, minH: 4 },
  ],
  data: { sources: ['C01', 'P10'], storage: ['系统/行动/<id>.md（一条行动一个文件）', '日历 P10：未接入，不显示假课表'], refresh: '文件变化时自动', writes: '新建 / 完成 / 恢复（写回行动文件）' },
  hasPage: true, pageFor: (p) => (p.view === 'timeline' ? 'timeline' : ''),
  aliases: { 'today-queue': { view: 'list' }, agenda: { view: 'timeline' } },
  carries: ['今日安排'],
  load: () => import('./index'),
});
