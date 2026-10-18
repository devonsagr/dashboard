import { Cable } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 接入源与诊断：一个说「能不能读到」，一个说「读到后哪里出错」。两个视图，一个完整页 */
export default defineCard({
  id: 'sources', name: '接入源', icon: Cable, category: '身体与工具', status: '样例', folder: 'src/cards/sources',
  desc: '各接入源的健康状态、接入顺序建议；数据诊断视图看解析 / 写入问题',
  w: 4, h: 4, minW: 3, minH: 3,
  views: [
    { id: 'health', name: '健康', desc: '各源健康状态与需要留意的源' },
    { id: 'diagnostics', name: '数据诊断', desc: '未处理的解析 / 写入问题' },
  ],
  data: { sources: ['C10'], storage: ['后端汇总各接入源的状态（不读具体内容）', '后端解析日志（仪表盘运行与 Markdown 解析结果）'], refresh: '打开画板时 / 每次解析后' },
  hasPage: true, pageFor: (p) => (p.view === 'diagnostics' ? 'diagnostics' : ''),
  aliases: { 'source-health': { view: 'health' }, diagnostics: { view: 'diagnostics' } },
  carries: ['数据诊断'],
  load: () => import('./index'),
});
