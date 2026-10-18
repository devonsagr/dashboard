import { Newspaper } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 日报：今天各来源实际贡献了什么、该关注什么、新内容推荐、AI 建议、主体更新候选；可以定稿 */
export default defineCard({
  id: 'daily', name: '日报', icon: Newspaper, category: '今天', status: '样例', folder: 'src/cards/daily',
  desc: '今天（按 04:00 切换）各来源贡献了什么、该关注什么；推荐与 AI 建议分开标',
  w: 6, h: 9, minW: 4, minH: 5,
  views: [
    { id: 'brief', name: '简报', desc: '覆盖 + 今天该关注 + 流程待办' },
    { id: 'discover', name: '新内容推荐', desc: 'GitHub 热门、周报、关注作者', w: 4, h: 7, minW: 3, minH: 4 },
  ],
  data: { sources: ['C15', 'P06', 'C08', 'C11', 'C13', 'C18', 'C19', 'C02', 'C03', 'C21'], storage: ['定稿：设置 › 流程去向 › 日报（默认 系统/日报/{日期}.md，建议，待确认）'], refresh: '打开时汇总；定稿后不再变，之后进来的单独提示', writes: '定稿、推荐收进收件 / 看过、AI 建议推到待采纳' },
  hasPage: true, pageFor: (p) => (p.view === 'discover' ? '?t=discover' : ''),
  load: () => import('./index'),
});
