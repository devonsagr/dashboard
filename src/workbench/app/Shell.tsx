import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  ChevronDown, ChevronRight, ChevronLeft, LayoutGrid, PenLine, Search, Settings2, Plus, Pencil, Trash2, Check, Shapes, Sun, FolderKanban, Inbox,
  BookOpen, HeartPulse, Star, MoreHorizontal, ArrowLeft, FlaskConical, RotateCcw, Rows3, PanelTop,
} from 'lucide-react';
import { useOverlay } from './overlay';
import { ACCENTS, PALETTES, setPrefs, usePrefs } from './prefs';
import { boardPath, boardStore, getLastBoard, PRESETS, useBoards, type Board, type BoardIcon } from '../board/store';
import { mod, MODULES, cardPath } from '../cards/registry';
import { Slot } from '../cards/host';
import { resetCardStores } from '../../data/cardStore';
import { store, useData, useSim } from '../../data';
import { Mark } from '../../ui/ui';
import { host } from '../../data/host';
import { CommandPalette } from './CommandPalette';
import { QuickCapture } from './QuickCapture';

/**
 * 应用壳：一条顶栏 + 内容区。没有左右侧栏（挂进 Obsidian 后两侧栏归 Obsidian）。
 * 顶栏：Mark ｜ 画板标签（可收成菜单）｜ 搜索 · 随手记 · 全部卡片 · 样例 · 接入源 · 外观
 * 完整页顶部多一条细的面包屑「← 画板 › 卡片 › 子项」。
 */
export const BOARD_ICONS: Record<BoardIcon, typeof Sun> = { sun: Sun, folder: FolderKanban, inbox: Inbox, book: BookOpen, heart: HeartPulse, shapes: Shapes, grid: LayoutGrid, star: Star };
export const BoardGlyph = ({ b, size = 14 }: { b: Board; size?: number }) => { const I = BOARD_ICONS[b.icon ?? (b.mode === 'collage' ? 'shapes' : 'grid')]; return <I size={size} />; };

export default function Shell() {
  const pf = usePrefs();
  return (
    <MotionConfig reducedMotion={pf.motion === 'off' ? 'always' : 'never'}>
      <div className="shell">
        <TopBar />
        <div className="main-scroll" id="main-scroll"><CrumbBar /><RouteFade /></div>
        <ExpandGhost />
        <CommandPalette />
        <QuickCapture />
        <Toasts />
      </div>
    </MotionConfig>
  );
}

function RouteFade() {
  const loc = useLocation();
  const key = loc.pathname.split('/').slice(0, 3).join('/');
  useEffect(() => { document.getElementById('main-scroll')?.scrollTo({ top: 0 }); }, [key]);
  return (
    <motion.div key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: 0.04, ease: [0.2, 0, 0, 1] }}>
      <Outlet />
    </motion.div>
  );
}

/** 卡片放大：从卡片原来的位置长到整个内容区，然后淡出 */
function ExpandGhost() {
  const { origin, clearOrigin } = useOverlay();
  const loc = useLocation();
  const first = useRef(loc.pathname);
  const [shown, setShown] = useState<DOMRect | null>(null);
  useEffect(() => { if (origin && loc.pathname !== first.current) { setShown(origin); clearOrigin(); } first.current = loc.pathname; }, [loc.pathname]); // eslint-disable-line
  const main = document.getElementById('main-scroll')?.getBoundingClientRect();
  return (
    <AnimatePresence>
      {shown && main && (
        <motion.div key="ghost" className="expand-ghost"
          initial={{ left: shown.left, top: shown.top, width: shown.width, height: shown.height, borderRadius: 16, opacity: 1 }}
          animate={{ left: main.left, top: main.top, width: main.width, height: main.height, borderRadius: 0, opacity: [1, 1, 0] }}
          transition={{ duration: 0.42, ease: [0.2, 0, 0, 1], opacity: { times: [0, 0.55, 1], duration: 0.42 } }}
          onAnimationComplete={() => setShown(null)} />
      )}
    </AnimatePresence>
  );
}

const isBoardPath = (p: string) => p === '/' || p.startsWith('/b/');

/** 完整页的面包屑：← 画板 › 卡片（点回这张卡的总页）› 子项（由卡片自己的 Crumb 决定） */
function CrumbBar() {
  const loc = useLocation();
  const boards = useBoards();
  useData((db) => db.receipts.length);   // 子项名字可能随数据变化
  if (isBoardPath(loc.pathname)) return null;
  const b = boards.find((x) => x.id === getLastBoard()) ?? boards[0];
  const [, c, id, ...seg] = loc.pathname.split('/');
  const m = c === 'c' ? mod(id) : undefined;
  const special = loc.pathname.startsWith('/cards') ? '全部卡片' : loc.pathname.startsWith('/settings') ? '设置' : undefined;
  const rest = seg.filter(Boolean);
  return (
    <nav className="crumbbar" aria-label="位置">
      <Link to={boardPath(b.id)} className="crumb-back" title="回到画板（Esc）"><ArrowLeft size={14} /><BoardGlyph b={b} size={13} /><span>{b.name}</span></Link>
      {(m || special) && <ChevronRight size={13} className="faint" />}
      {special && <span className="crumb-link last">{special}</span>}
      {m && <Link to={cardPath(m.id)} className={`crumb-link ${rest.length ? '' : 'last'}`}><m.icon size={13} />{m.name}</Link>}
      {m && rest.length > 0 && <><ChevronRight size={13} className="faint" /><span className="crumb-link last ellipsis"><Slot m={m} pick={(i) => i.Crumb} seg={rest} fallback={rest.join(' / ')} /></span></>}
    </nav>
  );
}

/** 顶栏挂件：manifest.topbar = true 的卡（例如收藏的任务窗口）。每个挂件单独隔离 */
function TopbarSlots() {
  return <>{MODULES.filter((m) => m.topbar).map((m) => <Slot key={m.id} m={m} pick={(i) => i.Topbar} />)}</>;
}

function useClickAway(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const t = setTimeout(() => window.addEventListener('mousedown', f), 0);
    return () => { clearTimeout(t); window.removeEventListener('mousedown', f); };
  }, [open, close]);
  return ref;
}

function Pop({ open, right, children, className = '' }: { open: boolean; right?: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`menu ${right ? 'right' : ''} ${className}`} initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TopBar() {
  const loc = useLocation();
  const { setPalette, setCapture } = useOverlay();
  const pf = usePrefs();
  const ss = useData((db) => db.sources);
  const bad = ss.filter((s) => ['offline', 'stale', 'missing'].includes(s.health)).length;
  return (
    <div className="topbar">
      <div className="top-left">
        <Link to="/" className="brand" title="个人 AI 仪表盘"><Mark size={15} /></Link>
        {pf.boardNav === 'tabs' ? <BoardTabs /> : <BoardMenu />}
      </div>
      <div className="row top-right" style={{ gap: 2 }}>
        <button className="top-search" onClick={() => setPalette(true)}><Search size={13} /><span>搜索</span><kbd>Ctrl K</kbd></button>
        <button className="icon-btn" title="随手记（Ctrl J）" onClick={() => setCapture(true)}><PenLine size={15} /></button>
        <Link to="/cards" className={`icon-btn ${loc.pathname.startsWith('/cards') ? 'on' : ''}`} title="全部卡片"><LayoutGrid size={15} /></Link>
        <TopbarSlots />
        {host ? <VaultPill /> : <SamplePill />}
        {!host && <Link to="/c/sources" className={`src-pill ${bad ? 'warn' : ''}`} title={bad ? `${bad} 个接入源离线 / 陈旧 / 缺文件` : '接入源都正常'}><i className="hdot" />{bad ? bad : ''}</Link>}
        <SettingsMenu />
      </div>
    </div>
  );
}

/* ───────── 画板标签 ───────── */
function useCurrentBoard() {
  const loc = useLocation();
  const boards = useBoards();
  const onBoard = isBoardPath(loc.pathname);
  const id = onBoard ? (loc.pathname.startsWith('/b/') ? loc.pathname.split('/')[2] : boards[0]?.id) : getLastBoard();
  return { boards, onBoard, cur: boards.find((b) => b.id === id) ?? boards[0] };
}

function BoardTabs() {
  const { boards, onBoard, cur } = useCurrentBoard();
  const pf = usePrefs();
  const [manage, setManage] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.querySelector('.btab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [cur.id]);
  return (
    <div className="btabs-wrap">
      <div className="btabs" ref={scroller} role="tablist" aria-label="画板">
        {boards.map((b) => {
          const on = b.id === cur.id;
          return (
            <div key={b.id} className={`btab ${on ? 'on' : ''} ${on && !onBoard ? 'away' : ''}`} role="tab" aria-selected={on}>
              <Link to={boardPath(b.id)} className="btab-main" onContextMenu={(e) => { e.preventDefault(); setManage(b.id); }} title={b.name}>
                {pf.boardIcons && <BoardGlyph b={b} size={13} />}<span>{b.name}</span>
              </Link>
              {on && onBoard && <button className="btab-more" title="管理这块画板" aria-label="管理画板" onClick={() => setManage(manage === b.id ? null : b.id)}><MoreHorizontal size={13} /></button>}
              {on && <motion.i layoutId="btab-line" className="btab-line" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
              {manage === b.id && <BoardManage b={b} close={() => setManage(null)} />}
            </div>
          );
        })}
      </div>
      <NewBoard />
    </div>
  );
}

/** 收起成一个菜单（设置 → 画板导航 = 菜单） */
function BoardMenu() {
  const { boards, onBoard, cur } = useCurrentBoard();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const ref = useClickAway(open, () => setOpen(false));
  return (
    <div className="switcher" ref={ref}>
      <button className={`switcher-btn ${onBoard ? 'cur' : ''}`} onClick={() => (onBoard ? setOpen(!open) : nav(boardPath(cur.id)))}><BoardGlyph b={cur} size={13} /><span>{cur.name}</span></button>
      <button className="icon-btn xs" onClick={() => setOpen(!open)} aria-label="切换画板"><ChevronDown size={13} /></button>
      {onBoard && <span className="switcher" style={{ position: 'relative' }}><button className="icon-btn xs" title="管理这块画板" onClick={() => setManage(!manage)}><MoreHorizontal size={13} /></button>{manage && <BoardManage b={cur} close={() => setManage(false)} />}</span>}
      <Pop open={open}>
        <div className="menu-label">画板</div>
        {boards.map((x) => (
          <button key={x.id} className={`menu-item menu-main ${x.id === cur.id ? 'on' : ''}`} onClick={() => { nav(boardPath(x.id)); setOpen(false); }}>
            <BoardGlyph b={x} size={13} /><span className="ellipsis">{x.name}</span><span className="faint mono" style={{ fontSize: 11, marginLeft: 'auto' }}>{x.cards.length}</span>
          </button>
        ))}
      </Pop>
      <NewBoard />
    </div>
  );
}

function NewBoard() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickAway(open, () => setOpen(false));
  const create = (mode: 'grid' | 'collage', preset?: string) => {
    const pr = PRESETS.find((p) => p.id === preset);
    const id = boardStore.addBoard(pr ? pr.name + ' 副本' : mode === 'grid' ? '新画板' : '新拼贴', mode, preset);
    setOpen(false); nav(`/b/${id}`);
  };
  return (
    <div className="switcher" ref={ref}>
      <button className={`icon-btn xs btab-add ${open ? 'on' : ''}`} title="新建画板" aria-label="新建画板" onClick={() => setOpen(!open)}><Plus size={14} /></button>
      <Pop open={open} className="menu-wide">
        <div className="menu-label">空白画板</div>
        <button className="menu-item menu-main" onClick={() => create('grid')}><LayoutGrid size={13} /><span>规整</span><span className="faint small">网格对齐，互不遮挡</span></button>
        <button className="menu-item menu-main" onClick={() => create('collage')}><Shapes size={13} /><span>拼贴</span><span className="faint small">自由摆放，可以叠</span></button>
        <div className="menu-label">从预设开始</div>
        {PRESETS.map((p) => { const I = BOARD_ICONS[p.icon]; return <button key={p.id} className="menu-item menu-main" onClick={() => create(p.mode, p.id)}><I size={13} /><span>{p.name}</span><span className="faint small ellipsis">{p.desc}</span></button>; })}
      </Pop>
    </div>
  );
}

function BoardManage({ b, close }: { b: Board; close: () => void }) {
  const boards = useBoards();
  const nav = useNavigate();
  const [name, setName] = useState(b.name);
  const ref = useClickAway(true, close);
  const i = boards.findIndex((x) => x.id === b.id);
  return (
    <div ref={ref} className="menu board-manage" onClick={(e) => e.stopPropagation()}>
      <form className="row" style={{ gap: 4, padding: '4px 6px' }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) boardStore.patchBoard(b.id, { name: name.trim() }); close(); }}>
        <input className="input sm" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="画板名称" /><button className="icon-btn xs" title="保存名称"><Check size={13} /></button>
      </form>
      <div className="menu-label">图标</div>
      <div className="row icon-pick">{(Object.keys(BOARD_ICONS) as BoardIcon[]).map((k) => { const I = BOARD_ICONS[k]; return <button key={k} className={`icon-btn xs ${(b.icon ?? '') === k ? 'on' : ''}`} onClick={() => boardStore.patchBoard(b.id, { icon: k })} aria-label={k}><I size={14} /></button>; })}</div>
      <div className="menu-sep" />
      <div className="row" style={{ padding: '2px 6px', gap: 4 }}>
        <button className="btn xs" disabled={i <= 0} onClick={() => boardStore.moveBoard(b.id, -1)}><ChevronLeft size={12} />左移</button>
        <button className="btn xs" disabled={i >= boards.length - 1} onClick={() => boardStore.moveBoard(b.id, 1)}>右移<ChevronRight size={12} /></button>
      </div>
      {b.preset && <button className="menu-item menu-main" onClick={() => { boardStore.reset(b.id); close(); }}><RotateCcw size={13} />恢复成预设的样子</button>}
      {boards.length > 1 && <button className="menu-item menu-main tone-bad-text" onClick={() => { if (confirm(`删除画板「${b.name}」？只删布局，卡片里的内容和数据不受影响。`)) { boardStore.removeBoard(b.id); close(); nav('/'); } }}><Trash2 size={13} />删除画板</button>}
    </div>
  );
}

/* ───────── 样例 ───────── */
function VaultPill() {
  const [busy, setBusy] = useState(false); const { toast } = useOverlay();
  useEffect(() => {
    const failed = (e: Event) => toast((e as CustomEvent).detail);
    window.addEventListener('dashboard-save-error', failed); return () => window.removeEventListener('dashboard-save-error', failed);
  }, [toast]);
  return <button className="sample-pill" disabled={busy} title="重新读取当前 Vault" onClick={async () => {
    setBusy(true); try { await store.refreshVault(); toast('已读取当前 Vault'); } catch (e) { toast(e instanceof Error ? e.message : '读取失败'); } finally { setBusy(false); }
  }}>{busy ? '读取中…' : host!.vaultName}</button>;
}
function SamplePill() {
  const [open, setOpen] = useState(false);
  const sim = useSim();
  const ref = useClickAway(open, () => setOpen(false));
  const odd = sim.write !== 'ok' || sim.offline;
  const W = [['ok', '成功'], ['failed', '失败'], ['unknown', '不确定'], ['conflict', '冲突']] as const;
  return (
    <div className="switcher" ref={ref}>
      <button className={`sample-pill ${odd ? 'odd' : ''}`} onClick={() => setOpen(!open)} title="当前显示的是样例数据">
        <FlaskConical size={12} />样例{odd && <i className="dot" />}
      </button>
      <Pop open={open} right className="menu-wide">
        <div className="sample-explain small">现在看到的全部是<b>样例数据</b>，不是你示例知识库里的真实内容。写入只改浏览器里的样例，不碰任何文件。</div>
        <div className="menu-label">模拟写入结果</div>
        <div className="seg" style={{ margin: '0 6px 6px' }}>
          {W.map(([k, l]) => <button key={k} className={sim.write === k ? 'on' : ''} onClick={() => store.setSim({ write: k })}>{sim.write === k && <motion.i layoutId="sim-w" className="seg-bg" />}<span>{l}</span></button>)}
        </div>
        <label className="menu-item menu-main"><input type="checkbox" checked={sim.offline} onChange={(e) => store.setSim({ offline: e.target.checked })} /><span>本机服务离线</span><span className="faint small">专注计时 / 节点 / 采集命令送不达</span></label>
        <div className="menu-sep" />
        <Link to="/settings#receipts" className="menu-item menu-main" onClick={() => setOpen(false)}><Rows3 size={13} />写入回执</Link>
        <button className="menu-item menu-main" onClick={() => { if (confirm('把样例数据恢复成初始状态？（你在样例里做的改动会丢掉；画板布局不受影响）')) { store.resetSample(); resetCardStores(); setOpen(false); } }}><RotateCcw size={13} />重置样例数据</button>
      </Pop>
    </div>
  );
}

function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const p = usePrefs();
  const ref = useClickAway(open, () => setOpen(false));
  const dark = document.documentElement.dataset.theme === 'dark';
  return (
    <div className="switcher" ref={ref}>
      <button className={`icon-btn ${open ? 'on' : ''}`} title="外观" onClick={() => setOpen(!open)}><Settings2 size={15} /></button>
      <Pop open={open} right>
        <div className="menu-label">明暗</div>
        <div className="seg" style={{ margin: '0 6px 6px' }}>{(['light', 'dark', 'system'] as const).map((t) => <button key={t} className={p.theme === t ? 'on' : ''} onClick={() => setPrefs({ theme: t })}>{p.theme === t && <motion.i layoutId="m-theme" className="seg-bg" />}<span>{{ light: '浅色', dark: '深色', system: '跟随系统' }[t]}</span></button>)}</div>
        <div className="menu-label">底色</div>
        {PALETTES.map((x) => <button key={x.id} className={`menu-item menu-main ${p.palette === x.id ? 'on' : ''}`} onClick={() => setPrefs({ palette: x.id })}><span className="pal" style={{ background: `linear-gradient(90deg, ${x.swatch[0]} 50%, ${x.swatch[1]} 50%)` }} /><span>{x.name}</span><span className="faint small ellipsis">{x.desc}</span></button>)}
        <div className="menu-label">强调色</div>
        <div className="row" style={{ gap: 6, padding: '2px 10px 8px' }}>{ACCENTS.map((a) => <button key={a.id} title={a.name} className={`sw round ${p.accent === a.id ? 'on' : ''}`} style={{ background: a.id === 'graphite' && dark ? '#e5e3da' : a.color }} onClick={() => setPrefs({ accent: a.id })} />)}</div>
        <div className="menu-label">画板导航</div>
        <div className="seg" style={{ margin: '0 6px 6px' }}>{([['tabs', '展开成标签', PanelTop], ['menu', '收成菜单', ChevronDown]] as const).map(([k, l, I]) => <button key={k} className={p.boardNav === k ? 'on' : ''} onClick={() => setPrefs({ boardNav: k })}>{p.boardNav === k && <motion.i layoutId="m-nav" className="seg-bg" />}<span className="row" style={{ gap: 4 }}><I size={12} />{l}</span></button>)}</div>
        <div className="menu-sep" />
        <Link to="/settings" className="menu-item menu-main" onClick={() => setOpen(false)}><Pencil size={13} />全部设置 · 存储位置</Link>
      </Pop>
    </div>
  );
}

function Toasts() {
  const { toasts } = useOverlay();
  return (
    <div className="toasts">
      <AnimatePresence>
        {toasts.map((t) => <motion.div key={t.id} className={`toast ${t.tone ? 'toast-' + t.tone : ''}`} layout initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}>{t.msg}{t.action && <button className="toast-act" onClick={t.action.run}>{t.action.label}</button>}</motion.div>)}
      </AnimatePresence>
    </div>
  );
}
