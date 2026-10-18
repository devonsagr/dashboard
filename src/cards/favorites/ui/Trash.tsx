import { useState } from 'react';
import { Link } from 'react-router-dom';
import { full } from '../../../data/time';
import { Empty, PageHeader, Seg } from '../../../ui/ui';
import { REC_NAME } from '../model';
import { S, batch, item, type BatchRow, type Layer } from '../store';
import { SampleBadge } from './common';

/** 回收站（S12）：原始材料、入库资料、自己处理材料各自的范围；永久删除先说清影响，批量只确认一次 */
export function TrashPage() {
  const d = S.use((x) => x);
  const [layer, setLayer] = useState<Layer>('raw');
  const [sel, setSel] = useState<string[]>([]);
  const [ask, setAsk] = useState(false);
  const [rows, setRows] = useState<BatchRow[] | null>(null);
  const list = layer === 'raw' ? d.items.filter((i) => i.trashed).map((i) => ({ id: i.id, title: i.title, at: i.trashed!, sub: `原始材料 · 分流记录 ${d.recs.filter((r) => r.itemId === i.id).length} 份（不受影响）` }))
    : d.recs.filter((r) => r.kind === layer && r.trashed).map((r) => ({ id: r.id, title: item(r.itemId)?.title ?? r.itemId, at: r.trashed!, sub: `${REC_NAME[r.kind]} · 批注：${r.note}` }));
  const go = async (op: '恢复' | '永久删除') => { setAsk(false); const res = await batch(op, sel, layer); setRows(res); setSel(res.filter((r) => !r.ok).map((r) => r.id)); };
  return (
    <div className="page fav">
      <PageHeader title={<>回收站 <SampleBadge /></>} sub="回收原始材料不会删它的分流记录；回收一份记录不会删原始材料或同源另一份。移除画板卡片和这里无关。" />
      <Seg id="fav-trash" items={[{ key: 'raw', label: '原始材料' }, { key: 'ref', label: '入库资料' }, { key: 'digest', label: '自己处理材料' }]} value={layer} onChange={(k) => { setLayer(k); setSel([]); setRows(null); }} />
      <div className="fav-ops">
        <button className="btn sm btn-ghost" onClick={() => setSel(list.map((x) => x.id))} disabled={!list.length}>全选（{list.length}）</button>
        <button className="btn sm" disabled={!sel.length} onClick={() => go('恢复')}>恢复 {sel.length || ''}</button>
        <button className="btn sm danger" disabled={!sel.length} onClick={() => setAsk(true)}>永久删除 {sel.length || ''}</button>
      </div>
      {ask && <div className="fav-confirm" role="alertdialog"><b>永久删除 {sel.length} 条？</b><span className="small">{layer === 'raw' ? '只删原始材料；分流记录保留；以后核对会跳过，除非你明确「重新收集」。' : '只删这些记录；原始材料保留；仍被同源记录使用的图片附件会保留。'}不能恢复。</span><button className="btn sm danger" onClick={() => go('永久删除')}>确认</button><button className="btn sm btn-ghost" onClick={() => setAsk(false)}>取消</button></div>}
      {rows && <div className="fav-results" role="status">{rows.map((r) => <div key={r.id} className={r.ok ? '' : 'bad'}><span className="ellipsis">{r.title}</span><span>{r.result}</span></div>)}</div>}
      {!list.length ? <Empty title="这里是空的" /> : list.map((x) => (
        <div key={x.id} className="fav-row"><input type="checkbox" checked={sel.includes(x.id)} onChange={() => setSel(sel.includes(x.id) ? sel.filter((y) => y !== x.id) : [...sel, x.id])} aria-label={`选择 ${x.title}`} />
          <Link className="fav-row-main" to={layer === 'raw' ? `/c/favorites/i/${x.id}` : `/c/favorites/r/${x.id}`}><span className="fav-row-title">{x.title}</span><span className="fav-row-pre">{x.sub}</span><span className="small faint">回收于 {full(x.at)}</span></Link></div>
      ))}
      {layer === 'raw' && d.purged.length > 0 && <div className="small muted fav-pad">已永久删除（以后核对会跳过）：{d.purged.map((p) => p.title).join('、')}</div>}
    </div>
  );
}
