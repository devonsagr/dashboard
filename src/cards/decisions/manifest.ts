import { Scale } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 待我决策：验收 / 选择 / 操作 / 补充 / 个人；回应可带说明，写回请求文件 */
export default defineCard({
  id: 'decisions', name: '待我决策', icon: Scale, category: '今天', status: '样例', folder: 'src/cards/decisions',
  desc: '验收、选方案、需要我动手的事；过期的单独标出',
  w: 4, h: 8, minW: 3, minH: 4,
  data: { sources: ['C02'], storage: ['系统/需要我/<id>.md'], refresh: '半自动：项目交接投影 + 手动「刷新项目监控」', writes: '回应（类型 + 说明 + 时间）写回请求文件，等待投递给项目' },
  hasPage: true,
  carries: ['待我决策'],
  load: () => import('./index'),
});
