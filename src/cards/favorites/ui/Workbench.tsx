import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Link2, ListChecks, Search, Settings2, Trash2 } from 'lucide-react';
import { Empty, Tag } from '../../../ui/ui';
import { relTime } from '../../../data/time';
import { REC_NAME, type FavItem, type Rec } from '../model';
import { S, RAW_STATUS, REC_STATUS, TOPICS, batch, item, rawMatch, rec, recMatch, sortItems, textOf, type BatchRow, type Filter, type Layer } from '../store';
import { PF, PLATFORMS } from '../platforms';
import { Facts, Plat, SampleBadge } from './common';
import { Reader } from './Reader';
import { RecordView } from './RecordView';

/** 工作台的界面状态：离开再回来能回到原来的层级、筛选、选中和滚动位置 */
interface UiState { f: Filter; cur: Partial<Record<Layer, string>>; scroll: number; limit: number }
const DEF: UiState = { f: { layer: 'raw', platform: '', nature: '', status: '待处理', topic: '', gap: '', q: '' }, cur: {}, scroll: 0, limit: 40 };
let UI: UiState = (() => { try { return { ...DEF, ...JSON.parse(sessionStorage.getItem('pkd.v5.fav.ui') ?? '{}') }; } catch { return DEF; } })();
const saveUi = () => { try { sessionStorage.setItem('pkd.v5.fav.ui', JSON.stringify(UI)); } catch { /* ignore */ } };

const LAYERS: { k: Layer; l: string }[] = [{ k: 'raw', l: '原始材料' }, { k: 'ref', l: '入库资料' }, { k: 'digest', l: '自己处理材料' }];
const OPS: Record<string, ('以后读' | '继续处理' | '回收' | '恢复' | '永久删除' | '重试')[]> = { raw: ['以后读', '继续处理', '回收', '重试'], rawTrash: ['恢复', '永久删除'], rec: ['以后读', '继续处理', '回收', '重试'], recTrash: ['恢复', '永久删除'] };

export function Workbench({ openId, openRec }: { openId?: string; openRec?: string }) {
  const nav = useNavigate();
  const d = S.use((x) => x);
  const [, force] = useState(0);
  const [f, setF0] = useState<Filter>(UI.f);
  const [sel, setSel] = useState<string[]>([]);
  const [selAll, setSelAll] = useState(false);
  const [rows, setRows] = useState<{ op: string; rows: BatchRow[] } | null>(null);
  const [confirmOp, setConfirmOp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState('');
  const [more, setMore] = useState(!!(f.nature || f.topic || f.gap));
  const listRef = useRef<HTMLDivElement>(null);

  // 路由打开某一条 → 切到对应层并选中
  useEffect(() => {
    if (openId && item(openId)) { UI.cur.raw = openId; if (f.layer !== 'raw') setF({ ...f, layer: 'raw', status: '全部' }); }
    if (openRec && rec(openRec)) { const r = rec(openRec)!; UI.cur[r.kind] = openRec; if (f.layer !== r.kind) setF({ ...f, layer: r.kind, status: '全部' }); }
    saveUi(); force((n) => n + 1);
  }, [openId, openRec]);   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (listRef.current) listRef.current.scrollTop = UI.scroll; }, []);

  /** 改任何筛选都清空旧选择（避免隐形跨范围操作） */
  function setF(n: Filter) { setF0(n); UI.f = n; UI.limit = 40; saveUi(); setSel([]); setSelAll(false); setRows(null); setConfirmOp(null); }
  const raw = f.layer === 'raw';
  const list: (FavItem | Rec)[] = useMemo(() => (raw ? d.items.filter((it) => rawMatch(it, f)).sort(sortItems) : d.recs.filter((r) => recMatch(r, f)).sort((a, b) => b.at.localeCompare(a.at))), [d, f, raw]);
  const ids = list.map((x) => x.id);
  const curId = UI.cur[f.layer];
  const cur = curId ? (raw ? item(curId) : rec(curId)) : undefined;
  const curInList = !!curId && ids.includes(curId);
  const shown = list.slice(0, UI.limit);
  const trash = f.status === '回收站';
  const ops = OPS[(raw ? 'raw' : 'rec') + (trash ? 'Trash' : '')];
  const countFor = (s: string) => (raw ? d.items.filter((it) => rawMatch(it, { ...f, status: s })).length : d.recs.filter((r) => recMatch(r, { ...f, status: s })).length);
  const acct = f.platform ? d.accounts[f.platform] : undefined;

  const open = (id: string) => { UI.cur[f.layer] = id; saveUi(); setBanner(''); nav(raw ? `/c/favorites/i/${id}` : `/c/favorites/r/${id}`); };
  /** 处理完当前条：按操作前的列表顺序接续下一条；没有就前一条；都没有显示空态。不跳去别的库 */
  const doneFor = (layer: Layer, id: string, before: string[]) => (why: string) => {
    if (UI.cur[layer] !== id) return;                       // 期间你已打开别的条目：只更新结果，不抢回
    const still = (x: string) => (layer === 'raw' ? (() => { const it = item(x); return !!it && rawMatch(it, UI.f); })() : (() => { const r = rec(x); return !!r && recMatch(r, UI.f); })());
    if (still(id)) { setBanner(why); return; }
    const i = before.indexOf(id);
    const next = before.slice(i + 1).find(still) ?? before.slice(0, Math.max(i, 0)).reverse().find(still);
    UI.cur[layer] = next; saveUi(); setBanner(`${why}${next ? ' · 已接到下一条' : ''}`);
    nav(next ? (layer === 'raw' ? `/c/favorites/i/${next}` : `/c/favorites/r/${next}`) : '/c/favorites', { replace: true });
  };
  async function run(op: (typeof ops)[number]) {
    if (op === '永久删除' && confirmOp !== op) { setConfirmOp(op); return; }
    setConfirmOp(null); setBusy(true);
    const res = await batch(op, sel, f.layer); setBusy(false);
    setRows({ op, rows: res }); const failed = res.filter((r) => !r.ok).map((r) => r.id);
    setSel(failed); setSelAll(false);                       // 失败项保留选择
  }
  const toggle = (id: string) => { setSelAll(false); setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]); };
  const reading = !!cur && (openId || openRec);
  return (
    <div className={`fav fav-wb ${reading ? 'reading' : ''}`}>
      <div className="fav-top">
        <div className="seg" role="tablist" aria-label="材料层级">{LAYERS.map((l) => <button key={l.k} role="tab" aria-selected={f.layer === l.k} className={f.layer === l.k ? 'on' : ''} onClick={() => setF({ ...f, layer: l.k, status: l.k === 'raw' ? '待处理' : '全部' })}><span>{l.l}</span></button>)}</div>
        <select className="input fav-sel" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value as Filter['platform'] })} aria-label="平台">
          <option value="">全部平台</option>{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}{p.compat ? '（兼容）' : ''} · {d.accounts[p.id]}</option>)}
        </select>
        <label className="search-inline fav-q"><Search size={13} /><input placeholder="搜正文、字幕、回复、批注" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="关键词" /></label>
        <button className={`btn sm btn-ghost ${more ? 'on' : ''}`} onClick={() => setMore(!more)} aria-expanded={more}>更多筛选{(f.nature || f.topic || f.gap) ? ' ·' : ''}</button>
        <span style={{ flex: 1 }} />
        <SampleBadge />
        <Link className="btn sm" to="/c/favorites/import"><Download size={13} />导入收藏</Link>
        <Link className="btn sm" to="/c/favorites/import?tab=link"><Link2 size={13} />粘贴链接</Link>
        <Link className="icon-btn" to="/c/favorites/trash" title="回收站" aria-label="回收站"><Trash2 size={15} /></Link>
        <Link className="icon-btn" to="/c/favorites/settings" title="位置与设置" aria-label="位置与设置"><Settings2 size={15} /></Link>
      </div>
      <div className="fav-filters">
        {(raw ? RAW_STATUS : REC_STATUS).map((s) => <button key={s} className={`pill ${f.status === s ? 'on' : ''}`} onClick={() => setF({ ...f, status: s })}>{s}<span className="count">{countFor(s)}</span></button>)}
      </div>
      {more && (
        <div className="fav-filters">
          {raw && <select className="input fav-sel" value={f.nature} onChange={(e) => setF({ ...f, nature: e.target.value as Filter['nature'] })} aria-label="来源性质"><option value="">收藏 / 非收藏 / 人工</option><option>收藏</option><option>非收藏链接</option><option>人工补充</option></select>}
          <select className="input fav-sel" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} aria-label="主题"><option value="">全部主题</option>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
          {raw && <select className="input fav-sel" value={f.gap} onChange={(e) => setF({ ...f, gap: e.target.value })} aria-label="收集状态"><option value="">全部收集状态</option><option>部分</option><option>仅元信息</option><option>缺图</option><option>字幕问题</option></select>}
          <button className="btn sm btn-ghost" onClick={() => setF({ ...f, nature: '', topic: '', gap: '' })}>清除</button>
        </div>
      )}

      <div className="fav-split">
        <div className="fav-listcol">
          <div className="fav-selbar">
            {sel.length ? <>
              <b>已选 {sel.length} 条</b><span className="small muted">{selAll ? `当前筛选结果全部（含未显示的 ${Math.max(0, sel.length - shown.length)} 条）；新到的不会加入` : '手动选择'}</span>
              <button className="btn sm btn-ghost" onClick={() => { setSel([]); setSelAll(false); }}>取消选择</button>
            </> : <><span className="small muted">{list.length} 条{raw ? '原始来源' : `份${REC_NAME[f.layer as 'ref']}`}{f.q ? `（含关键词「${f.q}」）` : ''}</span>{list.length > 0 && <button className="btn sm btn-ghost" onClick={() => { setSel(ids); setSelAll(true); setRows(null); }}><ListChecks size={13} />全选筛选结果（{list.length}）</button>}</>}
            <button className="btn sm btn-ghost" title="演示 DEMO-23" onClick={() => { const n = S.d.items.find((x) => x.id === 'fb01'); if (n) { S.d.items.unshift({ ...n, id: `fb-new${Date.now() % 1000}`, title: `示例·刚到的一条（${new Date().toLocaleTimeString('zh-CN', { hour12: false })}）`, importedAt: new Date().toISOString() }); S.emit(); } }}>模拟：新到一条</button>
          </div>
          {sel.length > 0 && (
            <div className="fav-ops">
              {ops.map((op) => { const no = op === '重试' && !raw ? '分流记录不能当作重新采集一个来源' : undefined; return <button key={op} className={`btn sm ${op === '永久删除' ? 'danger' : ''}`} disabled={busy || !!no} title={no} onClick={() => run(op)}>{op}</button>; })}
              {!raw && <span className="small faint">重试不适用于分流记录</span>}
              {confirmOp && <div className="fav-confirm" role="alertdialog"><b>永久删除 {sel.length} 条{raw ? '原始材料' : '分流记录'}？</b><span className="small">{raw ? '只删原始材料本身；它的分流记录不受影响；以后核对会跳过，除非你明确「重新收集」。' : '只删这些记录；原始材料和同源另一份记录不受影响。'}不能恢复。</span><button className="btn sm danger" onClick={() => run('永久删除')}>确认永久删除</button><button className="btn sm btn-ghost" onClick={() => setConfirmOp(null)}>取消</button></div>}
            </div>
          )}
          {rows && (
            <div className="fav-results" role="status">
              <div className="row"><b>{rows.op}：{rows.rows.filter((r) => r.ok).length} 条完成，{rows.rows.filter((r) => !r.ok).length} 条没完成</b>{rows.rows.some((r) => !r.ok) && <span className="small muted">没完成的仍保持选中</span>}<button className="btn sm btn-ghost" onClick={() => setRows(null)}>收起</button></div>
              <div className="fav-results-list">{rows.rows.map((r) => <div key={r.id} className={r.ok ? '' : 'bad'}><span className="ellipsis">{r.title}</span><span>{r.result}</span></div>)}</div>
            </div>
          )}
          {acct && ['未接入', '需本人验证', '已过期', '无法连接', '未登录'].includes(acct) && <div className="fav-note-line warn">{PF[f.platform as 'bili'].name}：{acct}。这里的数量只是本地已有的，平台上实际有多少未知。<Link className="link" to={`/c/favorites/import/${f.platform}`}>去处理</Link></div>}
          <div className="fav-list" ref={listRef} onScroll={(e) => { UI.scroll = e.currentTarget.scrollTop; saveUi(); }}>
            {!list.length && <Empty title={f.q ? '没有匹配的材料' : trash ? '回收站是空的' : raw && f.status === '待处理' ? '没有待处理的材料' : '这里还没有'} hint={f.q ? '搜索覆盖已取得的正文、字幕、回复和批注；没取得的内容搜不到' : undefined} />}
            {shown.map((x) => raw ? <RawRow key={x.id} it={x as FavItem} on={x.id === curId} checked={sel.includes(x.id)} onCheck={() => toggle(x.id)} onOpen={() => open(x.id)} /> : <RecRow key={x.id} r={x as Rec} on={x.id === curId} checked={sel.includes(x.id)} onCheck={() => toggle(x.id)} onOpen={() => open(x.id)} />)}
            {list.length > shown.length && <button className="btn sm fav-more" onClick={() => { UI.limit += 40; saveUi(); force((n) => n + 1); }}>再显示 {Math.min(40, list.length - shown.length)} 条（共 {list.length} 条）</button>}
          </div>
        </div>
        <div className="fav-pane">
          {reading && <button className="btn sm btn-ghost fav-back" onClick={() => nav('/c/favorites')}><ArrowLeft size={13} />列表</button>}
          {banner && <div className="fav-banner" role="status">{banner}<button className="link" onClick={() => setBanner('')}>知道了</button></div>}
          {cur && !curInList && <div className="fav-note-line small">这条不在当前筛选里（{raw ? (cur as FavItem).status : (cur as Rec).status}）；列表没有为它改变。</div>}
          {cur ? (raw ? <Reader key={cur.id} it={cur as FavItem} onDone={doneFor('raw', cur.id, ids)} /> : <RecordView key={cur.id} r={cur as Rec} onDone={doneFor(f.layer, cur.id, ids)} />)
            : <Empty title={list.length ? '从左边选一条开始读' : '当前范围已经处理完了'} hint={list.length ? '打开不会自动标已读' : '可以换个筛选，或者导入新的收藏'} />}
        </div>
      </div>
    </div>
  );
}

function RawRow({ it, on, checked, onCheck, onOpen }: { it: FavItem; on: boolean; checked: boolean; onCheck: () => void; onOpen: () => void }) {
  const pre = textOf(it).split('\n').slice(1).join(' ').slice(0, 70);
  return (
    <div className={`fav-row ${on ? 'on' : ''} ${checked ? 'sel' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onCheck} aria-label={`选择 ${it.title}`} />
      <button className="fav-row-main" onClick={onOpen}>
        <span className="fav-row-title">{it.title}</span>
        {pre && <span className="fav-row-pre">{pre}</span>}
        <span className="fav-row-meta"><Plat p={it.platform} /><Facts it={it} max={3} /><span className="faint small">{relTime(it.importedAt)}</span></span>
      </button>
    </div>
  );
}
function RecRow({ r, on, checked, onCheck, onOpen }: { r: Rec; on: boolean; checked: boolean; onCheck: () => void; onOpen: () => void }) {
  const it = item(r.itemId);
  return (
    <div className={`fav-row ${on ? 'on' : ''} ${checked ? 'sel' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onCheck} aria-label={`选择 ${it?.title}`} />
      <button className="fav-row-main" onClick={onOpen}>
        <span className="fav-row-title">{it?.title ?? '（原始材料已删除）'}</span>
        <span className="fav-row-pre">批注：{r.note}</span>
        <span className="fav-row-meta">{it && <Plat p={it.platform} />}<Tag>{r.status}</Tag>{r.rounds.some((x) => x.state === 'ok' && !x.seen) && <Tag tone="ai">AI 待审</Tag>}{r.draft && <Tag tone="ok">有知识稿</Tag>}<span className="faint small">{relTime(r.at)}</span></span>
      </button>
    </div>
  );
}
