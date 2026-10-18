import { useEffect, useState } from 'react';
import { notes as content, useNotes as useContent } from './store';
import type { CardProps } from '../../workbench/cards/protocol';

/* 便签：文字存在 content.notes[noteId]，不在布局里 */
export function Sticky({ inst, setProps }: CardProps) {
  const id = inst.props.noteId || inst.id;
  const note = useContent((c) => c.notes[id]);
  const [v, setV] = useState(note?.text ?? '');
  useEffect(() => { if (!inst.props.noteId) setProps({ noteId: id }); }, []); // eslint-disable-line
  useEffect(() => { const t = setTimeout(() => v !== (note?.text ?? '') && content.saveNote(id, v), 350); return () => clearTimeout(t); }, [v]); // eslint-disable-line
  return <textarea className="sticky-text" data-nodrag value={v} onChange={(e) => setV(e.target.value)} placeholder="写点什么…" aria-label="便签内容" />;
}
