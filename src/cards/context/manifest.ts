import { UserRound } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 主体上下文：AI 了解我的 8 份文档在哪、截至什么时候；更新队列分短期 / 候选 / 长期，确认要求不同 */
export default defineCard({
  id: 'context', name: '主体上下文', icon: UserRound, category: '知识', status: '样例', folder: 'src/cards/context',
  desc: '8 份主体文档的路径与截至时间；AI 想写进去的东西先排队，长期画像只有我确认才改',
  w: 5, h: 8, minW: 3, minH: 4,
  views: [
    { id: 'queue', name: '更新队列', desc: '待确认的主体更新' },
    { id: 'docs', name: '文档', desc: '8 份文档：路径与截至时间', w: 4, h: 8 },
  ],
  data: { sources: ['V04', 'C11', 'C08', 'C15', 'C18'], storage: ['路径在 设置 › 主体文档路径（现在都未设置；建议目录 示例数据/主体上下文/，待确认）', '更新队列：系统/主体/更新队列.md（建议，待确认）'], refresh: '日报汇总时生成候选；我确认时写入', writes: '接受 / 不接受 / 撤回主体更新、主体文档路径' },
  hasPage: true, pageFor: (p) => (p.view === 'docs' ? '?t=docs' : ''),
  load: () => import('./index'),
});
