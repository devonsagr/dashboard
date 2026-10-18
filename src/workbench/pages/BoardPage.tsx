import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Download, LayoutGrid, Plus, RotateCcw, Upload, Shapes, LayoutTemplate } from 'lucide-react';
import { Grid } from '../board/Grid';
import { Collage } from '../board/Collage';
import { CardShell } from '../board/CardShell';
import { boardStore, PRESETS, setLastBoard, useBoards, type BoardMode, type CardInst } from '../board/store';
import { mod, sizeOf, viewOf } from '../cards/registry';
import { CardBody } from '../cards/host';
import { store, useData } from '../../data';
import { today } from '../../data/time';
import { useOverlay } from '../app/overlay';
import { usePrefs } from '../app/prefs';
import { CardCatalog } from './AllCards';
import { SampleMark } from '../../ui/ui';
import { host } from '../../data/host';

/**
 * 画板页。第一块画板顶部有问候 + 今天的三个数；其他画板只有一行名字和说明，把空间留给卡片。
 * 整理模式：拍快照 → 拖动 / 改大小 / 锁定 / 换颜色 / 添加 / 移除 → 完成（保存）或取消（恢复快照）。
 */
export default function BoardPage() {
  const { boardId } = useParams();
  const boards = useBoards();
  const board = boards.find((b) => b.id === boardId) ?? boards[0];
  const first = board.id === boards[0]?.id;
  const [edit, setEdit] = useState(false);
  const { toast, library, setLibrary } = useOverlay();
  const { userName } = usePrefs();
  const fileRef = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const t = today();
  const acts = useData(() => store.liveActions().filter((a) => !a.done && a.date && a.date <= t).length);
  const decs = useData(() => store.openDecisions().length);
  const appr = useData(() => store.pendingApprovals().length);
  const fresh = useData((db) => db.materials.filter((m) => !m.read && !m.archived).length);
  useEffect(() => { setLastBoard(board.id); setEdit(false); }, [board.id]);

  const startEdit = () => { boardStore.begin(board.id); setEdit(true); };
  const finish = () => { boardStore.done(board.id); setEdit(false); setLibrary(false); toast('布局已保存'); };
  const cancel = () => { boardStore.cancel(board.id); setEdit(false); setLibrary(false); toast('已撤回这次整理'); };
  const setMode = (m: BoardMode) => {
    const w = wrap.current?.getBoundingClientRect().width ?? 1200;
    boardStore.setMode(board.id, m, (w - 11 * 12) / 12);
  };
  const remove = (cardId: string) => {
    const it = boardStore.removeCard(board.id, cardId);
    if (it) toast(`已移除「${mod(it.kind)?.name ?? it.kind}」${it.kind === 'sticky' ? '（便签文字还在，可以从卡片库找回）' : ''}`, { label: '撤销', run: () => boardStore.restoreCard(board.id, it) });
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(boardStore.get(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dashboard-layout.json'; a.click();
  };
  const importJson = (f: File) => f.text().then((s) => { try { const j = JSON.parse(s); if (!Array.isArray(j)) throw 0; boardStore.replaceAll(j); toast('已导入布局'); } catch { toast('文件不是有效的布局 JSON', undefined, 'bad'); } });

  const render = (c: CardInst, { dragging, index }: { dragging: boolean; index: number }) => {
    const m = mod(c.kind);
    if (!m) return <article className="card"><div className="card-head"><span className="card-title">未知卡片 {c.kind}</span></div><div className="card-body small muted">这张卡的文件夹不在了（src/cards/{c.kind}）。可以在整理模式里移除。</div></article>;
    const props = { ...m.defaults, ...c.props };
    return (
      <CardShell m={m} inst={c} boardId={board.id} mode={board.mode} edit={edit} dragging={dragging} index={index} onRemove={() => remove(c.id)}>
        <CardBody m={m}>{(impl) => <impl.Card inst={{ ...c, props }} view={viewOf(m, props)} edit={edit} setProps={(p) => boardStore.patchProps(board.id, c.id, p)} />}</CardBody>
      </CardShell>
    );
  };
  const minSize = (k: string, props?: Record<string, string>) => { const m = mod(k); if (!m) return { w: 2, h: 2 }; const z = sizeOf(m, viewOf(m, props)); return { w: z.minW, h: z.minH }; };
  const desc = PRESETS.find((p) => p.id === board.preset)?.desc;

  return (
    <div className="page wide board-page" ref={wrap}>
      <header className={`board-head ${first ? '' : 'slim'}`}>
        {first ? (
          <div>
            <motion.h1 className="greet" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}>{greeting()}，{userName}</motion.h1>
            <motion.p className="sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
              今天有 <b>{acts}</b> 件事要做，<b>{decs}</b> 个请求在等你回应，{host ? <><b>{fresh}</b> 条已收录材料。</> : <><b>{appr}</b> 条建议待采纳，<b>{fresh}</b> 条材料还没读。</>}<SampleMark />
            </motion.p>
          </div>
        ) : (
          <div className="row" style={{ gap: 10, minWidth: 0 }}><h2 className="board-name">{board.name}</h2>{desc && <span className="muted small ellipsis">{desc}</span>}</div>
        )}
        {!edit && <button className="btn sm btn-ghost" onClick={startEdit}><LayoutTemplate size={14} />整理</button>}
      </header>

      <AnimatePresence>
        {edit && (
          <motion.div className="edit-bar" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}>
            <div className="edit-bar-in">
              <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                <div className="seg">
                  {([['grid', '规整', LayoutGrid], ['collage', '拼贴', Shapes]] as const).map(([m, l, I]) => (
                    <button key={m} className={board.mode === m ? 'on' : ''} onClick={() => setMode(m)}>{board.mode === m && <motion.i layoutId="mode-seg" className="seg-bg" />}<span className="row" style={{ gap: 5 }}><I size={13} />{l}</span></button>
                  ))}
                </div>
                <span className="small muted">{board.mode === 'grid' ? '拖动移动 · 右下角改大小 · 互不遮挡，自动排紧' : '随便贴，可以叠 · 点一下或拖动就到最上面 · 锁定后位置和层级都固定'}</span>
              </div>
              <span className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => setLibrary(true)}><Plus size={13} />添加卡片</button>
                {board.preset && <button className="btn sm btn-ghost" title="恢复成预设的样子（内容不受影响）" onClick={() => boardStore.reset(board.id)}><RotateCcw size={13} />恢复预设</button>}
                <button className="btn sm btn-ghost" onClick={exportJson} title="导出所有画板布局"><Download size={13} /></button>
                <button className="btn sm btn-ghost" onClick={() => fileRef.current?.click()} title="导入布局"><Upload size={13} /></button>
                <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
                <span className="vsep" />
                <button className="btn sm btn-ghost" onClick={cancel}>取消</button>
                <button className="btn sm btn-primary" onClick={finish}><Check size={13} />完成整理</button>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {board.cards.length === 0 ? (
        <div className="board-empty"><div><h3>「{board.name}」还是空的</h3><p className="muted small">从卡片库挑几张放上来。{board.mode === 'collage' ? '这是拼贴画板，可以随便叠。' : ''}</p></div><button className="btn btn-primary" onClick={() => { if (!edit) startEdit(); setLibrary(true); }}><Plus size={14} />添加卡片</button></div>
      ) : board.mode === 'grid' ? (
        <Grid key={board.id} cards={board.cards} edit={edit} onChange={(c) => boardStore.setCards(board.id, c)} minSize={minSize} render={render} />
      ) : (
        <div className="collage-scroll">
          <Collage key={board.id} cards={board.cards} edit={edit} onChange={(id, c) => boardStore.patchCard(board.id, id, { c })} onFront={(id) => boardStore.bringToFront(board.id, id)} minSize={minSize} render={render} />
        </div>
      )}

      <AnimatePresence>
        {library && (
          <>
            <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLibrary(false)} />
            <motion.div className="modal lib-modal" initial={{ opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}>
              <CardCatalog boardId={board.id} onAdded={(n) => toast(`已添加「${n}」`)} onClose={() => setLibrary(false)} compact />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function greeting() {
  const h = +new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Hong_Kong' });
  return h < 5 ? '夜深了' : h < 11 ? '早上好' : h < 13 ? '中午好' : h < 18 ? '下午好' : '晚上好';
}
