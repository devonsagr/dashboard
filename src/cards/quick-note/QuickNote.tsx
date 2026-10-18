import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData, type CaptureType } from '../../data';
import { relTime } from '../../data/time';
import { useWrite, WriteNote } from '../../ui/write';
import { CAPTURE_TYPES } from '../../workbench/app/QuickCapture';
import { useOverlay } from '../../workbench/app/overlay';

/** 随手记卡：原样保存（不 trim），成功才清空；最近几条在下面 */
export function QuickNote({ inst }: CardProps) {
  const [v, setV] = useState('');
  const [kind, setKind] = useState<CaptureType>('想法');
  const w = useWrite();
  const { open } = useOverlay();
  const recent = useData((db) => db.materials.filter((m) => m.kind === 'capture').slice(0, inst.h > 6 ? 4 : 2));
  const save = () => { if (!v.trim() || w.busy) return; w.run(() => store.capture(v, kind)).then((r) => r.status === 'ok' && setV('')); };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="composer small-composer" data-nodrag>
        <textarea rows={inst.h > 5 ? 3 : 2} value={v} onChange={(e) => setV(e.target.value)} placeholder="原话保存，不会自动变成任务" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }} aria-label="随手记" />
        <div className="composer-bar">
          <span className="composer-kinds">{CAPTURE_TYPES.slice(0, inst.w > 3 ? 5 : 3).map((k) => <button key={k} className={`pill xs ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</span>
          <button className={`send ${v.trim() ? 'on' : ''}`} onClick={save} disabled={w.busy} aria-label="保存"><ArrowUp size={14} strokeWidth={2.4} /></button>
        </div>
      </div>
      <WriteNote w={w} compact ok="已存入随手记" />
      {recent.map((m) => <button key={m.id} className="mini-row" onClick={(e) => open({ kind: 'material', id: m.id }, e.currentTarget)}><span className="ellipsis">{m.title}</span><span className="mono faint small">{relTime(m.receivedAt)}</span></button>)}
    </div>
  );
}
