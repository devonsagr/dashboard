import { Globe } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 网页：嵌一个网页或本机小工具 */
export default defineCard({
  id: 'embed', name: '网页', icon: Globe, category: '轻量', status: '不读数据', folder: 'src/cards/embed', light: true,
  desc: '嵌一个网页或本机小工具',
  w: 6, h: 8, minW: 3, minH: 4,
  data: { sources: [], storage: ['不存储：直接加载网址'], refresh: '打开时' },
  hasPage: false,
  defaults: { url: '' }, props: [{ key: 'url', label: '网址', type: 'text', placeholder: 'https:// 或 http://127.0.0.1:端口' }],
  load: () => import('./index'),
});
