import { Sparkles } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/**
 * 新卡片模板。复制整个文件夹为 src/cards/<你的 id>/，改 id / name，然后在 src/cards/index.ts 加一行。
 * 规则（详见 docs/前端/04-怎么新增一张卡.md）：
 *  1. manifest.ts 只放描述，不 import 界面；实现放 index.tsx，宿主按需加载；
 *  2. 只属于这张卡的数据放 store.ts（cardStore）；要读别的对象只用共享层 src/data（useData / store.*）；
 *  3. 不 import 别的卡片文件夹里的任何东西；要跳到别的卡，用链接（/c/<id>/…）或 useOverlay().open；
 *  4. 没有数据用 <Empty>，样例用 <SampleMark>；卡片里可点的东西外层加 data-nodrag。
 */
export default defineCard({
  id: '_template', name: '我的卡片', icon: Sparkles, category: '自定义', status: '样例', folder: 'src/cards/_template',
  desc: '模板：复制这个文件夹开始写',
  w: 3, h: 3, minW: 2, minH: 2,
  props: [{ key: 'title', label: '标题', type: 'text' }], defaults: { title: '未命名' },
  data: { sources: [], storage: ['浏览器 localStorage › pkd.v5.card._template.v1'], refresh: '实时' },
  hasPage: true,
  load: () => import('./index'),
});
