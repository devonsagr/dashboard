import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Check, CircleHelp, GitCompareArrows, RotateCw } from 'lucide-react';
import type { Receipt, WriteStatus } from '../data/types';
import { Spark } from './ui';
import { RefPath } from './refs';
import { hm } from '../data/time';

/**
 * 写入状态：pending / ok / failed / unknown / conflict。
 * - run(fn)   发起写入，记住 fn，失败后 retry() 会原样再发一次（同一操作，不是新操作）
 * - 失败时调用方的输入不清空（由调用方根据 status 决定是否清空）
 */
export function useWrite() {
  const [status, setStatus] = useState<WriteStatus>('idle');
  const [receipt, setReceipt] = useState<Receipt>();
  const last = useRef<(() => Promise<Receipt>) | null>(null);
  const run = useCallback(async (fn: () => Promise<Receipt>) => {
    last.current = fn; setStatus('pending'); setReceipt(undefined);
    const r = await fn(); setStatus(r.status); setReceipt(r); return r;
  }, []);
  const retry = useCallback(() => (last.current ? run(last.current) : undefined), [run]);
  const reset = useCallback(() => { setStatus('idle'); setReceipt(undefined); }, []);
  return { status, receipt, run, retry, reset, busy: status === 'pending' };
}
export type Writer = ReturnType<typeof useWrite>;

/** 写入结果的一行说明。ok 时显示路径；失败 / 不确定 / 冲突时说明下一步 */
export function WriteNote({ w, ok, onReload, onOverwrite, compact }: { w: Writer; ok?: string; onReload?: () => void; onOverwrite?: () => void; compact?: boolean }) {
  const r = w.receipt;
  return (
    <AnimatePresence initial={false} mode="wait">
      {w.status !== 'idle' && (
        <motion.div key={w.status} className={`wnote ws-${w.status} ${compact ? 'compact' : ''}`} role="status"
          initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          {w.status === 'pending' && <><Spark spinning size={12} /><span>正在写入…</span></>}
          {w.status === 'ok' && <><Check size={13} /><span>{r?.detail ?? ok ?? '已保存'}{r?.at && <span className="faint mono"> · {hm(r.at)}</span>}</span>{r?.path && !compact && <RefPath path={r.path} />}</>}
          {w.status === 'failed' && <><AlertTriangle size={13} /><span>没有保存：{r?.error}。你的内容还在。</span><button className="btn xs" onClick={w.retry}><RotateCw size={11} />重试</button></>}
          {w.status === 'unknown' && <><CircleHelp size={13} /><span>不确定是否保存：{r?.error}。</span>{onReload && <button className="btn xs" onClick={onReload}>重新读取</button>}<button className="btn xs" onClick={w.retry}><RotateCw size={11} />再发一次</button></>}
          {w.status === 'conflict' && <><GitCompareArrows size={13} /><span>{r?.error}。草稿保留在这里。</span>{onReload && <button className="btn xs" onClick={onReload}>载入对方版本</button>}{onOverwrite && <button className="btn xs" onClick={onOverwrite}>用我的覆盖</button>}</>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
