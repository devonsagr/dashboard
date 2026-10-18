import { BarChart3 } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 复盘：由行动和日记按真实日期计算；未知天单独标出。两个视图：本周 / 月历 */
export default defineCard({
  id: 'review', name: '复盘', icon: BarChart3, category: '今天', status: '样例', folder: 'src/cards/review',
  desc: '近 7 天排期与完成、本月每天的完成度；未知天不算 0',
  w: 5, h: 5, minW: 3, minH: 3,
  views: [
    { id: 'week', name: '本周', desc: '近 7 天排期与完成' },
    { id: 'month', name: '月历', desc: '本月每天的完成度；无法确认的日子画虚线', w: 3, h: 6, minW: 3, minH: 5 },
  ],
  data: { sources: ['C09', 'C01', 'C11'], storage: ['不单独存储：由 系统/行动/ 和 示例数据/日记/ 计算', '我的复盘：系统/复盘/（建议，待确认）'], refresh: '行动变化时', writes: '我的复盘文字' },
  hasPage: true, pageFor: (p) => (p.view === 'month' ? 'month' : 'week'),
  aliases: { 'review-week': { view: 'week' }, 'calendar-mini': { view: 'month' } },
  carries: ['本周复盘'],
  load: () => import('./index'),
});
