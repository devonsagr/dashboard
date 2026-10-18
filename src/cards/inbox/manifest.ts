import { Inbox } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 收件：所有来源的材料。三个视图：收件流 / 待消化 / 流转；完整页还有材料详情与处理批次 */
export default defineCard({
  id: 'inbox', name: '收件', icon: Inbox, category: '输入', status: '样例', folder: 'src/cards/inbox',
  desc: '所有来源的新材料：写备注 → AI 按备注初处理 → 直接入库 / 我自己处理；以后读',
  w: 6, h: 9, minW: 4, minH: 4,
  views: [
    { id: 'stream', name: '收件流', desc: '未读在前' },
    { id: 'digest', name: '我自己处理', desc: '选了自己处理、还没划完的', w: 3, h: 8, minW: 3, minH: 4 },
    { id: 'flow', name: '流转', desc: '收到 → 备注 → AI → 我选 → 去向', w: 8, h: 7, minW: 6, minH: 4 },
  ],
  data: { sources: ['C08', 'C13', 'C15', 'C11', 'V11', 'P01', 'P02', 'C14'], storage: ['系统/随手记/', '系统/信息接入/QQ/', '示例数据/日记/', '示例数据/剪藏/', '系统/收集处理/批次/（处理批次）', '系统/收集处理/材料状态.md（建议，待确认）'], refresh: '各源自己的节奏（见「接入源」卡）', writes: '已读、备注、交给 AI、直接入库（按落点规则）、我自己处理（划掉要点）、以后读、归档、推送、转行动、处理批次' },
  hasPage: true, pageFor: (p) => (p.view === 'flow' ? 'flow' : p.view === 'digest' ? '?f=digest' : ''),
  aliases: { 'inbox-stream': { view: 'stream' }, 'to-digest': { view: 'digest' }, 'flow-lanes': { view: 'flow' } },
  load: () => import('./index'),
});
