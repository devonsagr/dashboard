import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CornerDownLeft, FileText, Folder, PenLine, Plug, Moon, LayoutGrid, Search, ListChecks, Scale } from 'lucide-react';
import { useOverlay } from './overlay';
import { setPrefs } from './prefs';
import { useData } from '../../data';
import { boardPath, useBoards } from '../board/store';
import { MODULES, pageOf } from '../cards/registry';

interface Cmd { id: string; group: string; label: string; hint?: string; icon: React.ComponentType<{ size?: number }>; run: () => void }

/** Ctrl K：搜索画板、卡片完整页、项目、行动、请求、材料、接入源 */
export function CommandPalette() {
  const { palette, setPalette, setCapture, open } = useOverlay();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const boards = useBoards();
  const db = useData((d) => d);
  useEffect(() => { if (palette) { setQ(''); setSel(0); } }, [palette]);

  const cmds = useMemo<Cmd[]>(() => {
    const go = (to: string) => () => { nav(to); setPalette(false); };
    return [
      { id: 'cap', group: '动作', label: '新随手记', hint: 'Ctrl J', icon: PenLine, run: () => { setPalette(false); setCapture(true); } },
      { id: 'theme', group: '动作', label: '切换明暗主题', icon: Moon, run: () => { setPrefs({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' }); setPalette(false); } },
      ...boards.map((b) => ({ id: 'b' + b.id, group: '画板', label: b.name, hint: `${b.cards.length} 张卡片`, icon: LayoutGrid, run: go(boardPath(b.id)) })),
      { id: 'allcards', group: '页面', label: '全部卡片', hint: '汇总入口', icon: LayoutGrid, run: go('/cards') },
      ...MODULES.filter((c) => c.hasPage).map((c) => ({ id: 'c' + c.id, group: '卡片', label: c.name, hint: c.desc, icon: c.icon, run: go(pageOf(c)!) })),
      ...db.projects.map((p) => ({ id: p.id, group: '项目', label: p.name, hint: `${p.ownership} · ${p.status}`, icon: Folder, run: go(`/c/projects/${p.id}`) })),
      ...db.actions.filter((a) => !a.deleted).map((a) => ({ id: a.id, group: '行动', label: a.title, hint: a.done ? '已完成' : a.date ?? '未排期', icon: ListChecks, run: () => { setPalette(false); open({ kind: 'action', id: a.id }); } })),
      ...db.decisions.map((d) => ({ id: d.id, group: '请求', label: d.title, hint: d.kind, icon: Scale, run: () => { setPalette(false); open({ kind: 'decision', id: d.id }); } })),
      ...db.materials.map((i) => ({ id: i.id, group: '材料', label: i.title, hint: i.channel, icon: FileText, run: () => { setPalette(false); open({ kind: 'material', id: i.id }); } })),
      ...db.sources.map((s) => ({ id: s.id, group: '接入源', label: `${s.id} ${s.name}`, hint: s.mode, icon: Plug, run: go(`/c/sources/${s.id}`) })),
    ];
  }, [boards, nav, setPalette, setCapture, open, db]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    const r = k ? cmds.filter((c) => (c.label + (c.hint ?? '')).toLowerCase().includes(k)) : cmds.filter((c) => ['动作', '画板', '页面', '卡片'].includes(c.group));
    return r.slice(0, 50);
  }, [q, cmds]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(list.length - 1, s + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === 'Enter') list[sel]?.run();
  };
  let lastGroup = '';
  return (
    <AnimatePresence>
      {palette && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPalette(false)} />
          <motion.div className="palette" initial={{ opacity: 0, y: -10, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.99 }} transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}>
            <div className="palette-in"><Search size={16} className="faint" /><input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} placeholder="搜索画板、页面、项目、行动、请求、材料…" /><kbd>esc</kbd></div>
            <div className="palette-list">
              {list.map((c, i) => {
                const head = c.group !== lastGroup ? (lastGroup = c.group) : null;
                return (
                  <div key={c.group + c.id}>
                    {head && <div className="palette-group">{head}</div>}
                    <button className={`palette-item ${i === sel ? 'on' : ''}`} onMouseMove={() => setSel(i)} onClick={c.run}>
                      <c.icon size={15} /><span className="ellipsis">{c.label}</span><span className="faint small ellipsis" style={{ marginLeft: 'auto', maxWidth: '45%' }}>{c.hint}</span>
                      {i === sel && <CornerDownLeft size={13} className="faint" />}
                    </button>
                  </div>
                );
              })}
              {!list.length && <div className="empty"><span className="muted">没有匹配的结果</span></div>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
