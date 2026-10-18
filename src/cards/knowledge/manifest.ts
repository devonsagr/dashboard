import { Network } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 知识：景观（理解程度）、问题、知识库。三个视图，一个完整页 */
export default defineCard({
  id: 'knowledge', name: '知识', icon: Network, category: '知识', status: '样例', folder: 'src/cards/knowledge',
  desc: '我懂了多少（颜色 = 自己标的理解程度）、还没想通的问题、入库后的整理稿',
  w: 7, h: 9, minW: 4, minH: 5,
  views: [
    { id: 'landscape', name: '景观', desc: '节点 + 理解程度' },
    { id: 'questions', name: '问题', desc: '还没想通的问题，可以写回答', w: 5, h: 9, minW: 3, minH: 4 },
    { id: 'library', name: '知识库', desc: '入库后的整理稿', w: 5, h: 8, minW: 3, minH: 4 },
  ],
  data: { sources: ['C12', 'C08', 'V11'], storage: ['系统/知识景观/如何用好AI.md', '系统/知识景观/节点/*.md', '系统/知识景观/问题.md', '知识库/收集整理/<来源>/<范围>/*.md'], refresh: '文件变化时', writes: '理解程度、节点正文、新问题、回答' },
  hasPage: true, pageFor: (p) => (p.view === 'landscape' ? '' : p.view),
  aliases: { 'knowledge-landscape': { view: 'landscape' }, questions: { view: 'questions' }, library: { view: 'library' } },
  carries: ['知识景观'],
  load: () => import('./index'),
});
