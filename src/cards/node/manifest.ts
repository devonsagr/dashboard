import { Activity } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 节点监控：各节点延迟曲线；空洞 = 没采到；采样、手动切换、自动路由 */
export default defineCard({
  id: 'node', name: '节点监控', icon: Activity, category: '身体与工具', status: '样例', folder: 'src/cards/node',
  desc: '各节点延迟曲线；空洞 = 没采到；采样、手动切换、自动路由',
  w: 5, h: 5, minW: 3, minH: 3,
  data: { sources: ['C07'], storage: ['本机监控脚本（loopback API + SQLite）'], refresh: '每 30 分钟一轮；可立即采样', writes: '向脚本发命令：采样控制、切换节点、自动路由开关' },
  hasPage: true,
  aliases: { 'node-monitor': {} }, carries: ['节点监控'],
  load: () => import('./index'),
});
