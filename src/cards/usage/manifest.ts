import { Monitor } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 电脑使用：今天程序与网站的前台时长；缺口单独列出 */
export default defineCard({
  id: 'usage', name: '电脑使用', icon: Monitor, category: '身体与工具', status: '样例', folder: 'src/cards/usage',
  desc: '今天程序与网站的前台时长；缺口单独列出',
  w: 4, h: 5, minW: 3, minH: 3,
  data: { sources: ['C06', 'P07'], storage: ['本机使用时长服务（Windows 程序 + Chrome 扩展心跳）'], refresh: '服务在线时每 10 分钟' },
  hasPage: true,
  carries: ['电脑使用'],
  load: () => import('./index'),
});
