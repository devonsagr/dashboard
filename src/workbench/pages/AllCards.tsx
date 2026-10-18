import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Maximize2, Plus, Search, X, Check } from 'lucide-react';
import { CATEGORIES, MODULES, pageOf, sizeOf } from '../cards/registry';
import { Slot } from '../cards/host';
import { boardStore, getLastBoard, useBoards } from '../board/store';
import { useOverlay } from '../app/overlay';
import { PageHeader, Tag } from '../../ui/ui';
import type { CardModule } from '../cards/protocol';

const STATUS_TONE: Record<CardModule['status'], string> = { 样例: 'accent', 未接入: 'warn', 本地: 'info', 不读数据: 'faint' };

/**
 * 「全部卡片」：唯一的汇总入口。一张卡 = 一个文件夹 src/cards/<id>/。
 * 每张卡：读什么数据、是不是样例、有哪些视图、能不能打开完整页、放到哪块画板。
 * 整理模式里的「添加卡片」也是它（compact 版）。
 */
export function CardCatalog({ boardId, onAdded, onClose, compact }: { boardId: string; onAdded?: (n: string) => void; onClose?: () => void; compact?: boolean }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('全部');
  const boards = useBoards();
  const [target, setTarget] = useState(boardId);
  const [added, setAdded] = useState<string | null>(null);
  const { open } = useOverlay();
  const board = boards.find((b) => b.id === target) ?? boards[0];
  const match = (c: CardModule) => (c.id + c.name + c.desc + c.data.sources.join(' ') + (c.views ?? []).map((v) => v.name).join(' ')).toLowerCase().includes(q.toLowerCase());
  const list = useMemo(() => MODULES.filter((c) => (cat === '全部' || c.category === cat) && match(c)), [q, cat]); // eslint-disable-line
  const groups = CATEGORIES.filter((c) => MODULES.some((x) => x.category === c)).map((c) => ({ k: c, n: MODULES.filter((x) => x.category === c).length }));
  const add = (d: CardModule, view?: string, props?: Record<string, string>) => {
    const z = sizeOf(d, view);
    const vName = view ? d.views?.find((v) => v.id === view)?.name : undefined;
    boardStore.addCard(target, d.id, z.w, z.h, { ...d.defaults, ...(view ? { view } : {}), ...props });
    onAdded?.(vName && vName !== d.views?.[0]?.name ? `${d.name} · ${vName}` : d.name); setAdded(d.id + (view ?? '')); setTimeout(() => setAdded(null), 1200);
  };
  return (
    <div className={`catalog ${compact ? 'compact' : ''}`}>
      <div className="catalog-top">
        <div className="search-box"><Search size={14} /><input autoFocus={compact} placeholder="搜索卡片、视图、数据源编号…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {!compact && <label className="row small muted" style={{ gap: 6 }}>放到<select className="input sm" style={{ width: 150 }} value={target} onChange={(e) => setTarget(e.target.value)}>{boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
        {onClose && <button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={16} /></button>}
      </div>
      <div className="filter-bar">
        <button className={`pill ${cat === '全部' ? 'on' : ''}`} onClick={() => setCat('全部')}>全部<span className="count">{MODULES.length}</span></button>
        {groups.map((g) => <button key={g.k} className={`pill ${cat === g.k ? 'on' : ''}`} onClick={() => setCat(g.k)}>{g.k}<span className="count">{g.n}</span></button>)}
      </div>
      <div className="catalog-grid">
        {list.map((d, i) => {
          const n = board.cards.filter((c) => c.kind === d.id).length;
          const route = pageOf(d, d.defaults);
          const used = boards.flatMap((b) => b.cards.filter((c) => c.kind === d.id).map((c) => c.props ?? {}));
          return (
            <motion.div key={d.id} className="cat-card" data-card={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 16) * 0.015 }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="lib-icon"><d.icon size={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>{d.name}<Tag tone={STATUS_TONE[d.status]}>{d.status}</Tag></div>
                  <div className="small muted ellipsis" title={d.desc}>{d.desc}</div>
                </div>
              </div>
              <div className="cat-src">
                {d.data.sources.length ? d.data.sources.slice(0, 5).map((s) => <span key={s} className="mono">{s}</span>) : <span className="faint small">不读外部数据</span>}
                <span className="faint small mono" style={{ marginLeft: 'auto' }} title={d.folder}>cards/{d.id}</span>
              </div>
              {d.views && d.views.length > 1 ? (
                <div className="cat-views">
                  <span className="small faint">视图</span>
                  {d.views.map((v) => <button key={v.id} className="btn xs" title={v.desc ?? `放「${v.name}」视图`} onClick={() => add(d, v.id)}>{added === d.id + v.id ? <Check size={12} /> : <Plus size={12} />}{v.name}</button>)}
                </div>
              ) : null}
              {d.libraryExtra && <Slot m={d} pick={(x) => x.LibraryExtra} add={(p: Record<string, string>) => add(d, undefined, p)} usedProps={used} />}
              <div className="row" style={{ gap: 6 }}>
                {!(d.views && d.views.length > 1) && <button className="btn sm" onClick={() => add(d)}>{added === d.id ? <Check size={13} /> : <Plus size={13} />}放到{compact ? '画板' : `「${board.name}」`}</button>}
                {route && !compact && <button className="btn sm btn-ghost" onClick={(e) => open({ kind: 'path', to: route }, e.currentTarget)}><Maximize2 size={12} />打开</button>}
                {n > 0 && <span className="small faint" style={{ marginLeft: 'auto' }}>已放 {n}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function AllCards() {
  const { toast } = useOverlay();
  return (
    <div className="page wide">
      <PageHeader title="全部卡片" sub="一张卡片就是一个独立的功能：自己的画板样子、自己的完整页、自己的数据。同一件事的不同样子是这张卡的「视图」。新卡片只要在 src/cards/ 加一个文件夹并登记，就会出现在这里。" />
      <CardCatalog boardId={getLastBoard()} onAdded={(n) => toast(`已添加「${n}」`)} />
    </div>
  );
}
