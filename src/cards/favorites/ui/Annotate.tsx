import { useEffect, useRef, useState } from 'react';
import { Archive, BookOpen, Clock, Eye, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWrite, WriteNote } from '../../../ui/write';
import { FlowSteps } from '../../../ui/flow';
import { REC_NAME, type FavItem, type RecKind } from '../model';
import { S, bumpVersion, defaultLoc, missingImgs, preProcess, recsOf, saveRecord, setDraft, setLater } from '../store';
import { DemoPath } from './common';

/**
 * 统一流程在收藏里的样子（和收件一致，见 ui/flow.tsx）：
 *   ① 备注（为什么收它 / 想拿它做什么）→ ② 交给 AI 按备注过一遍（可跳过）→ ③ 我选：A 直接入库 / B 我自己处理 → 预览 → 确认保存
 *   以后读（悬置）随时可放，不需要备注。
 * - 备注一份（raw:<id>:note），A / B 各自的保存位置草稿（raw:<id>:ref / raw:<id>:digest）
 * - 改备注、位置或原文版本 → 旧预览失效
 * - 成功只清理那次确认对应的草稿；失败 / 未知 / 冲突保留草稿
 */
export function Annotate({ it, onDone }: { it: FavItem; onDone: (why: string) => void }) {
  const drafts = S.use((d) => d.drafts);
  const [kind, setKind] = useState<RecKind | null>(null);
  const [prev, setPrev] = useState<Record<string, string>>({});
  const [check, setCheck] = useState('');
  const w = useWrite(); const wl = useWrite();
  const alive = useRef(true); useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => { setKind(null); w.reset(); setCheck(''); }, [it.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const nk = `raw:${it.id}:note`;
  const text = drafts[nk]?.text ?? '';
  const key = kind ? `raw:${it.id}:${kind}` : '';
  const loc = (kind && drafts[key]?.loc) || (kind ? defaultLoc(kind, it) : '');
  const snap = JSON.stringify({ text, loc, v: it.version });
  const pv = key ? prev[key] : undefined; const stale = !!pv && pv !== snap;
  const later = async () => { const r = await wl.run(() => setLater(it.id, it.status !== '以后读')); if (r.status === 'ok' && alive.current) onDone(it.status === '以后读' ? '已放入以后读' : '已拿出来继续处理'); };
  const confirm = async () => {
    if (!kind) return; const k = key, sent = text, kd = kind;
    const r = await w.run(() => saveRecord(it.id, kd, sent, loc));
    if (r.status === 'ok') {
      if ((S.d.drafts[nk]?.text ?? '') === sent) setDraft(nk, '');     // 提交后又改过的新内容不清
      setDraft(k, '');
      setPrev((p) => { const n = { ...p }; delete n[k]; return n; });
      if (alive.current) onDone(r.detail ?? '已保存');
    }
  };
  const verify = () => { const found = S.d.recs.find((r) => r.itemId === it.id && r.kind === kind && r.note === text); setCheck(found ? `核对结果：已经保存过（${found.id}），不用再发` : '核对结果：没有保存。草稿还在，可以再确认一次'); };
  const existing = recsOf(it.id).filter((r) => !r.trashed);
  const pre = it.pre;
  const step = existing.length ? 4 : pre?.state === 'ok' ? 3 : text.trim() ? 2 : 1;
  return (
    <div className="fav-annot">
      <FlowSteps at={step} held={it.status === '以后读'} />
      <label className="small muted" htmlFor={`note-${it.id}`}>① 备注：为什么收它、想拿它做什么（AI 按这个处理，不猜）</label>
      <textarea id={`note-${it.id}`} className="input fav-ta" rows={3} placeholder="例：以后做主页时参考它的布局 / 第二段没看懂，想弄明白" value={text} onChange={(e) => setDraft(nk, e.target.value)} />
      <div className="fav-annot-bar">
        <button className="btn sm btn-primary" disabled={!text.trim() || pre?.state === 'running'} title={text.trim() ? '' : '先写备注'} onClick={() => preProcess(it.id, text)}><Send size={13} />{pre && pre.state !== 'running' ? '按新备注再过一遍' : '交给 AI 按备注过一遍'}</button>
        <button className="btn sm" onClick={later} disabled={wl.busy}><Clock size={13} />{it.status === '以后读' ? '从以后读拿出' : '以后读'}</button>
        <span className="small faint">{existing.length ? `已有：${existing.map((r) => REC_NAME[r.kind]).join('、')}` : '以后读不需要写备注'}</span>
        <WriteNote w={wl} compact />
      </div>
      {pre && <div className={pre.state === 'ok' ? 'ai-box' : 'fav-note-line warn'}>
        {pre.state === 'running' ? '② AI 正在按备注过一遍…（见任务窗）' : pre.state === 'ok' ? <>
          {pre.intent !== text && <div className="fav-note-line warn">备注改过了：这份结果按旧备注「{pre.intent}」做的</div>}
          <div>{pre.text}</div><ul className="ul small">{pre.points?.map((p) => <li key={p}>{p}</li>)}</ul>
          <div className="small muted">AI 建议：{pre.suggest === 'ref' ? 'A 直接入库' : 'B 我自己处理'}（只是建议，你来选）</div></> : pre.error}
      </div>}
      <div className="fav-annot-bar">
        <span className="small muted">③ 我选</span>
        {(['ref', 'digest'] as RecKind[]).map((k) => (
          <button key={k} className={`btn sm ${kind === k ? 'btn-primary' : ''} ${pre?.suggest === k ? 'suggested' : ''}`} onClick={() => { setKind(kind === k ? null : k); w.reset(); setCheck(''); }} aria-expanded={kind === k}>
            {k === 'ref' ? <Archive size={13} /> : <BookOpen size={13} />}{k === 'ref' ? 'A 直接入库' : 'B 我自己处理'}
          </button>
        ))}
      </div>
      {kind && (
        <div className="fav-annot-body">
          <details className="fav-loc"><summary className="small muted">{kind === 'ref' ? '入库位置（按落点规则）' : '自己处理放在'} <DemoPath path={loc} planned /></summary>
            <input className="input" value={loc} onChange={(e) => setDraft(key, '', e.target.value)} aria-label="保存位置" />
            <div className="small faint">{kind === 'ref' ? <>平台 × 类型 × 主题决定，<Link className="link" to="/settings#routes">改规则</Link></> : <><Link className="link" to="/settings#flow">改默认位置</Link></>}</div>
          </details>
          {!pv && <div className="row"><button className="btn sm btn-primary" disabled={!text.trim()} onClick={() => setPrev((p) => ({ ...p, [key]: snap }))}><Eye size={13} />预览</button><span className="small faint">{text.trim() ? '先预览，再确认保存' : '先写一句备注'}</span></div>}
          {pv && (
            <div className={`fav-preview ${stale ? 'stale' : ''}`}>
              {stale ? <div className="fav-note-line warn">预览已失效：备注、保存位置或原文版本改了。请重新预览，旧预览不能确认。</div> : <div className="small muted">预览：确认后才会保存</div>}
              <dl className="fav-dl">
                <dt>记录</dt><dd>新建一份{REC_NAME[kind]}{existing.some((r) => r.kind === kind) && <span className="faint">（同源已有一份{REC_NAME[kind]}；备注相同会复用，不同就新建）</span>}</dd>
                <dt>备注</dt><dd className="pre">{JSON.parse(pv).text}</dd>
                <dt>原文</dt><dd>v{it.version} · 正文{it.body.state}{it.tracks?.length ? ` · 字幕 ${it.tracks.map((t) => `${t.kind}${t.state}`).join('、')}` : ''}{missingImgs(it).length ? ` · 缺图 ${missingImgs(it).length} 张（仍标缺）` : ''}</dd>
                <dt>附件</dt><dd>{it.body.blocks.flatMap((b) => (b.t === 'img' ? [b.img] : b.t === 'gallery' ? b.imgs : [])).filter((x) => !x.missing).length} 张图片随这份材料一起保存</dd>
                {pre?.state === 'ok' && <><dt>AI 初处理</dt><dd>{kind === 'digest' ? '要点一起放过去，你在那里逐条划掉' : '作为附注写入（标注样例）'}</dd></>}
                <dt>到哪里</dt><dd><DemoPath path={JSON.parse(pv).loc} planned /></dd>
                <dt>之后</dt><dd>原始材料进入「已分流」；同源另一份记录不受影响；不标「已理解」</dd>
              </dl>
              <div className="row wrap">
                <button className="btn sm btn-primary" disabled={stale || w.busy} onClick={confirm}>{w.busy ? '确认中…' : '确认保存'}</button>
                {stale ? <button className="btn sm" onClick={() => setPrev((p) => ({ ...p, [key]: snap }))}>重新预览</button> : <button className="btn sm btn-ghost" onClick={() => setPrev((p) => { const n = { ...p }; delete n[key]; return n; })}>返回修改</button>}
                <button className="btn sm btn-ghost" title="演示 DEMO-19" onClick={() => bumpVersion(it.id)}>模拟：来源出了新版本</button>
              </div>
              <WriteNote w={w} onReload={verify} />
              {check && <div className="small fav-msg" role="status">{check}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
