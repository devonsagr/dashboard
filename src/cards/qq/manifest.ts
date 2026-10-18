import { MessagesSquare } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 群消息（id 仍是 qq，旧画板不受影响）：QQ + 微信，按群分重要程度；关注 / 钻研 / 只存档 */
export default defineCard({
  id: 'qq', name: '群消息', icon: MessagesSquare, category: '输入', status: '样例', folder: 'src/cards/qq',
  desc: 'QQ 与微信群：今日关注（必须知道的）、钻研（知识以外的话题）；其余只存档',
  w: 4, h: 7, minW: 3, minH: 4,
  views: [
    { id: 'focus', name: '今日关注', desc: '关注模式的群，今天的消息' },
    { id: 'study', name: '钻研', desc: '知识库里还没有的话题', w: 4, h: 8 },
    { id: 'collect', name: '收集', desc: '勾选 QQ 白名单群，点一下收集' },
  ],
  data: { sources: ['C15', 'P06'], storage: ['系统/信息接入/QQ/QQ消息收件箱/批次/<批次>/<群>.md', '系统/信息接入/微信/<群>/（建议，待确认）', '分组设置：系统/仪表盘/设置.md（建议，待确认）'], refresh: 'QQ 只在点击「收集」时；微信采集方式待定', writes: '批次文件（只读群消息，不发消息）、分组设置、钻研话题看过' },
  hasPage: true,
  carries: ['QQ 消息', '微信消息'],
  aliases: { 'qq-focus': { view: 'focus' } },
  load: () => import('./index'),
});
