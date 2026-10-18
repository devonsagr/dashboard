import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { useOverlay } from './overlay';
import { store } from '../../data';
import type { CaptureType } from '../../data/types';
import { useWrite, WriteNote } from '../../ui/write';

export const CAPTURE_TYPES: CaptureType[] = ['想法', '问题', '待办线索', '摘录', '原话'];

/**
 * 全局随手记（Ctrl J）。
 * - 原样保存：不 trim、不改写，换行和空格都保留；类型一起保存；
 * - 保存成功才清空并关闭；失败时文字留在框里，可以原样重试（R19）；
 * - 不会自动变成任务：要转行动，到材料详情里明确点「转为行动」。
 */
export function QuickCapture() {
  const { capture, setCapture, toast, open } = useOverlay();
  const [v, setV] = useState('');
  const [kind, setKind] = useState<CaptureType>('想法');
  const w = useWrite();
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (capture) { w.reset(); setTimeout(() => ta.current?.focus(), 30); } }, [capture]); // eslint-disable-line
  const save = async () => {
    if (!v.trim() || w.busy) return;
    const r = await w.run(() => store.capture(v, kind));
    if (r.status === 'ok') { setV(''); setCapture(false); toast(`已存入随手记 · ${kind}`, { label: '查看', run: () => open({ kind: 'material', id: r.targetId! }) }, 'ok'); }
  };
  return (
    <AnimatePresence>
      {capture && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCapture(false)} />
          <motion.div className="capture" initial={{ opacity: 0, y: 16, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}>
            <div className="capture-title"><span className="serif">记下来，之后再决定</span></div>
            <div className="composer">
              <textarea ref={ta} rows={4} value={v} onChange={(e) => setV(e.target.value)} placeholder="原话保存。不会自动变成任务，也不会被 AI 改写。" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }} />
              <div className="composer-bar">
                <span className="composer-kinds">{CAPTURE_TYPES.map((k) => <button key={k} className={`pill ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</span>
                <button className={`send ${v.trim() ? 'on' : ''}`} onClick={save} disabled={w.busy} aria-label="保存"><ArrowUp size={16} strokeWidth={2.4} /></button>
              </div>
            </div>
            <WriteNote w={w} />
            <div className="capture-foot faint small"><span>追加到 系统/随手记/随手记收件箱.md · C08</span><span><kbd>Ctrl</kbd> <kbd>↵</kbd> 保存　<kbd>esc</kbd> 关闭</span></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
