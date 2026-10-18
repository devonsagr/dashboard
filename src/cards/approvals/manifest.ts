import { Inbox } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 待采纳：别人提的候选。采纳了才变成行动（行动归「今日行动」卡） */
export default defineCard({
  id: 'approvals', name: '待采纳', icon: Inbox, category: '今天', status: '样例', folder: 'src/cards/approvals',
  desc: 'AI / 项目 / 我推送过来的候选：采纳了才变成行动，可写不采纳原因',
  w: 4, h: 8, minW: 3, minH: 4,
  data: { sources: ['C01', 'C14'], storage: ['系统/行动/待采纳/（建议，待确认）'], refresh: '推送或 AI 整理后', writes: '采纳（新建行动，去重）/ 不采纳（原因）/ 稍后 / 撤回' },
  hasPage: true,
  carries: ['今日安排（待采纳部分）'],
  load: () => import('./index'),
});
