import { useState } from 'react';
import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData, type Material } from '../../data';
import { relTime } from '../../data/time';
import { MaterialRow } from '../../ui/objects';
import { Empty, MoreLink } from '../../ui/ui';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';

/** 收件流：所有来源的新材料，未读在前 */
export function InboxStream({ inst }: CardProps) {
  const list = useData((db) => db.materials.filter((m) => !m.archived && !m.later).sort((a, b) => Number(!!a.read) - Number(!!b.read) || b.receivedAt.localeCompare(a.receivedAt)));
  if (!list.length) return <Empty title="收件箱是空的" />;
  return <div className="stack" style={{ gap: 2 }}>{list.slice(0, inst.h > 9 ? 9 : 6).map((m) => <MaterialRow key={m.id} m={m} compact={inst.w < 6} />)}<MoreLink to="/c/inbox" /></div>;
}
export const unreadMeta = () => `${store.db.materials.filter((m) => !m.read && !m.archived).length} 未读`;

/** 我自己处理（B 路线）：选了自己处理、还没处理完的 */
export const digestList = (ms: Material[]) => ms.filter((m) => store.undigested(m) && m.route?.kind === '自己处理');
export function ToDigest({ inst }: CardProps) {
  const list = useData((db) => digestList(db.materials));
  if (!list.length) return <Empty title="没有要自己处理的材料" hint="在材料里选「B 我自己处理」会出现在这里" />;
  return <div className="stack" style={{ gap: 2 }}>{list.slice(0, inst.h > 8 ? 7 : 4).map((m) => <MaterialRow key={m.id} m={m} compact />)}<MoreLink to="/c/inbox?f=digest" /></div>;
}

/** 流转：收到 → 写备注 → AI 初处理 → 我选（A 入库 / B 自己处理）→ 去向；以后读单独一栏 */
export const LANES = [
  { k: '收到', states: ['新收到', '已读'], d: '还没写备注' },
  { k: '写了备注', states: ['已写备注'], d: '意图写了，还没交给 AI' },
  { k: 'AI 初处理', states: ['AI 处理中', '待我选'], d: 'AI 按备注过一遍，等我选' },
  { k: '我自己处理', states: ['自己处理中', '已消化'], d: 'B：读原文、划掉要点' },
  { k: '去向', states: ['已落地', '已推送'], d: 'A 入库，或成为行动 / 项目' },
  { k: '以后读', states: ['以后读'], d: '悬置，随时拿出来' },
] as const;
export function FlowLanes({ inst }: CardProps) {
  const ms = useData((db) => db.materials.filter((m) => !m.archived));
  const { open } = useOverlay();
  return (
    <div className="lanes">
      {LANES.map((l) => {
        const items = ms.filter((m) => (l.states as readonly string[]).includes(store.mainState(m)));
        return (
          <div key={l.k} className="lane">
            <div className="lane-head"><span>{l.k}</span><span className="count">{items.length}</span></div>
            <div className="lane-body">
              {items.slice(0, inst.h > 6 ? 4 : 2).map((m) => <button key={m.id} className="lane-item" onClick={(e) => open({ kind: 'material', id: m.id }, e.currentTarget)}><span className="lane-title">{m.title}</span></button>)}
              {!items.length && <span className="lane-empty faint small">—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
