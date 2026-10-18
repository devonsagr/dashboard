import { StickyNote } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 便签：随手贴一张；文字和布局分开存，移除卡片不会丢 */
export default defineCard({
  id: 'sticky', name: '便签', icon: StickyNote, category: '轻量', status: '本地', folder: 'src/cards/sticky', light: true,
  desc: '随手贴一张；文字和布局分开存，移除卡片不会丢',
  w: 3, h: 4, minW: 2, minH: 3,
  data: { sources: [], storage: ['浏览器 localStorage › pkd.v5.content.sticky.v1'], refresh: '输入即保存', content: '便签文字按 noteId 存，与布局分开；建议落盘：系统/界面/便签.json（建议，待确认）' },
  hasPage: false,
  libraryExtra: true,
  load: () => import('./index'),
});
