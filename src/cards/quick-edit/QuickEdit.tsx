import { useEffect, useState } from 'react';
import { store } from '../../data';
import { RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { S, saveFile } from './store';
import type { CardProps } from '../../workbench/cards/protocol';

/* 快捷编辑：钉住一个 MD；保存走写入语义（失败保留、冲突让你选） */
export function QuickEdit({ inst }: CardProps) {
  const file = inst.props.file || '系统/随手记/今日速记.md';
  const f = S.use((d) => d.files[file]);
  const [base, setBase] = useState(f?.mtime);
  const [v, setV] = useState(f?.text ?? '');
  const w = useWrite();
  const dirty = v !== (f?.text ?? '');
  useEffect(() => { if (!dirty) { setV(f?.text ?? ''); setBase(f?.mtime); } }, [f?.mtime]); // eslint-disable-line
  const save = () => w.run(() => saveFile(file, v)).then((r) => r.status === 'ok' && setBase(S.d.files[file]?.mtime));
  return (
    <div className="qedit">
      {!f && <div className="small muted">文件还不存在；保存后会新建（样例）。</div>}
      <textarea data-nodrag value={v} onChange={(e) => { setV(e.target.value); if (w.status !== 'pending') w.reset(); }} spellCheck={false} aria-label={file} />
      <div className="row between small" data-nodrag>
        <RefPath path={file} />
        <button className={`btn xs ${dirty ? 'btn-primary' : 'btn-ghost'}`} disabled={!dirty || w.busy} onClick={save}>{w.busy ? '保存中…' : dirty ? '保存' : '已保存'}</button>
      </div>
      <WriteNote w={w} compact onReload={() => { setV(f?.text ?? ''); w.reset(); setBase(f?.mtime); }} onOverwrite={() => { store.setSim({ write: 'ok' }); save(); }} />
      {base && <span className="sr-only">{base}</span>}
    </div>
  );
}
