import { StickyNote } from 'lucide-react';
import { defineImpl } from '../../workbench/cards/protocol';
import { Sticky } from './Sticky';
import { notes, useNotes } from './store';

/** 卡片库里：移除过的便签（文字还在），可以放回 */
function Orphans({ add, usedProps }: { add: (p: Record<string, string>) => void; usedProps: Record<string, string>[] }) {
  useNotes((c) => c.notes);
  const list = notes.orphanNotes(usedProps.map((p) => p.noteId).filter(Boolean));
  if (!list.length) return null;
  return (
    <div className="orphans">
      <span className="small muted"><StickyNote size={12} /> 移除过的便签（文字还在）：</span>
      {list.map((n) => <button key={n.id} className="btn xs" onClick={() => add({ noteId: n.id })}>{n.text.split('\n')[0].slice(0, 14) || '便签'} · 放回</button>)}
    </div>
  );
}
export default defineImpl({ Card: Sticky, LibraryExtra: Orphans });
