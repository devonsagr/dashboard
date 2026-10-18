import { Coins } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** AI 成本：订阅与按量账单，USD / CNY 分开合计；未记录 ≠ 免费 */
export default defineCard({
  id: 'cost', name: 'AI 成本', icon: Coins, category: '身体与工具', status: '样例', folder: 'src/cards/cost',
  desc: '订阅与按量账单，USD / CNY 分开合计；未记录 ≠ 免费',
  w: 3, h: 3, minW: 3, minH: 2,
  data: { sources: ['P11'], storage: ['示例数据/成本/订阅.md', '账单导入：示例数据/成本/（建议，待确认）'], refresh: '文件变化时' },
  hasPage: true,
  aliases: { 'ai-cost': {} },
  load: () => import('./index'),
});
