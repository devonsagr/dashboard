import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Eye, RotateCw, Sparkles } from 'lucide-react';
import { useData } from '../../../data';
import { full } from '../../../data/time';
import { History, Tag } from '../../../ui/ui';
import { useWrite, WriteNote } from '../../../ui/write';
import { REC_NAME, type Rec } from '../model';
import { S, REF_NOTES, TOPICS, basisOf, batch, confirmDraft, item, place, placePath, reviewRound, saveMyNotes, saveNote, send, setDraft, setRecStatus, startRound, type Dest } from '../store';
import { BackToSource, DemoPath, SampleBadge } from './common';

/** 第一层记录（S8–S10）：这份批注、自己加工、AI 辅助整理与审查、主题归位、知识稿、其他去向 */
export function RecordView({ r, onDone }: { r: Rec; onDone: (why: string) => void }) {
  const it = item(r.itemId);
  const sib = S.use((d) => d.recs.filter((x) => x.itemId === r.itemId && x.id !== r.id));
  const drafts = S.use((d) => d.drafts);
  const cur = basisOf(r, it);
  const [note, setNote] = useState(r.note); const wn = useWrite();
  const myKey = `rec:${r.id}`; const my = drafts[myKey]?.text ?? r.myNotes; const wm = useWrite();
  const [trashRes, setTrashRes] = useState('');
  return (
    <article className="fav-reader">
      <header className="fav-r-head">
        <div className="row wrap small"><Tag tone="accent">{REC_NAME[r.kind]}</Tag>{r.trashed ? <Tag tone="faint">已回收</Tag> : <Tag>{r.status}</Tag>}<SampleBadge /><span className="faint">{r.id} · 保存于 {full(r.at)}</span></div>
        <h2 className="fav-title">{it?.title ?? '（原始材料已删除）'}</h2>
        <BackToSource it={it} />
        {sib.map((s) => <Link key={s.id} className="link small" to={`/c/favorites/r/${s.id}`}>同源另一份：{REC_NAME[s.kind]}（{s.trashed ? '已回收' : s.status}）→</Link>)}
        <div className="small muted">位置 <DemoPath path={r.location} />{r.placed && <span>（归位前：<DemoPath path={r.placed.from} />）</span>}</div>
        {it && it.version !== r.basisVersion && <div className="fav-note-line warn">原文已有新版本 v{it.version}；这份记录依据 v{r.basisVersion}，批注没有套到新原文上。</div>}
        <div className="row wrap">
          {r.trashed ? <button className="btn sm" onClick={async () => setTrashRes((await batch('恢复', [r.id], r.kind))[0].result)}>恢复</button> : <>
            <button className="btn sm btn-ghost" onClick={() => setRecStatus(r.id, r.status === '以后读' ? '待加工' : '以后读')}>{r.status === '以后读' ? '继续加工' : '以后读'}</button>
            <button className="btn sm btn-ghost" onClick={async () => { const x = (await batch('回收', [r.id], r.kind))[0]; setTrashRes(x.result); if (x.ok) onDone(x.result); }}>回收这一份</button></>}
          {trashRes && <span className="small muted" role="status">{trashRes}</span>}
        </div>
      </header>

      <section className="fav-box">
        <div className="fav-sum-head"><b>这份批注</b><span className="small faint">只属于这份{REC_NAME[r.kind]}；改了以后旧的 AI 结果会标为过期</span></div>
        <textarea className="input fav-ta" rows={2} value={note} onChange={(e) => setNote(e.target.value)} aria-label="这份批注" />
        {note !== r.note && <div className="row"><button className="btn sm btn-primary" disabled={wn.busy} onClick={() => wn.run(() => saveNote(r.id, note))}>保存批注</button><button className="btn sm btn-ghost" onClick={() => setNote(r.note)}>撤销修改</button></div>}
        <WriteNote w={wn} compact />
      </section>

      <section className="fav-box">
        <div className="fav-sum-head"><b>自己加工</b><span className="small faint">随时可写，不需要 AI；保存加工笔记不会自动变成知识稿</span></div>
        <textarea className="input fav-ta" rows={3} placeholder="写点自己的整理…" value={my} onChange={(e) => setDraft(myKey, e.target.value)} aria-label="加工笔记" />
        {my !== r.myNotes && <div className="row"><span className="small faint">草稿（未保存）</span><button className="btn sm btn-primary" disabled={wm.busy} onClick={async () => { const sent = my; const x = await wm.run(() => saveMyNotes(r.id, sent)); if (x.status === 'ok' && (S.d.drafts[myKey]?.text ?? '') === sent) setDraft(myKey, ''); }}>保存加工笔记</button></div>}
        <WriteNote w={wm} compact />
      </section>

      <AiRounds r={r} cur={cur} />
      <Placement r={r} />
      <Draft r={r} />
      <Destinations r={r} />

      <details className="fav-src">
        <summary className="small muted">交接说明与历史</summary>
        <Handoff r={r} />
        <History items={[...r.history].reverse()} />
      </details>
    </article>
  );
}

function AiRounds({ r, cur }: { r: Rec; cur: string }) {
  const ai = S.use((d) => d.demo.ai);
  const [goal, setGoal] = useState(''); const [refs, setRefs] = useState<string[]>([]);
  const [comment, setComment] = useState<Record<number, string>>({});
  const running = r.rounds.some((x) => x.state === 'running');
  return (
    <section className="fav-box">
      <div className="fav-sum-head"><b>AI 辅助整理</b><span className="small faint">可选。按这份批注整理，和阅读页的「AI 优化摘要」是两件事</span></div>
      <div className="fav-ai-form">
        <input className="input" placeholder="本轮想让它帮什么（可不填）" value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="本轮目标" />
        <div className="small muted">参考笔记（你选，最多 5 篇；只读你选的，不会读遍知识库；样例按全文）</div>
        <div className="pill-row">{REF_NOTES.map((n) => <button key={n} className={`pill ${refs.includes(n) ? 'on' : ''}`} disabled={!refs.includes(n) && refs.length >= 5} onClick={() => setRefs(refs.includes(n) ? refs.filter((x) => x !== n) : [...refs, n])}>{n}</button>)}</div>
        <div className="small faint">本轮会发送：这份批注、{r.myNotes ? '你的加工笔记、' : ''}{refs.length ? `${refs.length} 篇参考笔记、` : ''}原文 v{item(r.itemId)?.version}。不会带阅读摘要或另一份记录的批注。</div>
        <div className="row"><button className="btn sm" disabled={running} onClick={() => { startRound(r.id, goal, refs); setGoal(''); }}><Sparkles size={12} />发起整理</button>{ai !== 'ok' && <span className="small faint">样例：AI 设为「{ai === 'failed' ? '会失败' : '未配置'}」</span>}</div>
      </div>
      {[...r.rounds].reverse().map((x) => (
        <div key={x.n} className={`fav-round ${x.basis !== cur ? 'stale' : ''}`}>
          <div className="row wrap small"><b>第 {x.n} 轮</b><span className="faint">{full(x.at)}</span>
            {x.state === 'running' && <Tag tone="info">整理中</Tag>}{x.state === 'failed' && <Tag tone="bad">失败</Tag>}{x.state === 'unconfigured' && <Tag tone="faint">未接入</Tag>}
            {x.state === 'ok' && (x.accepted ? <Tag tone="ok">你接受了本轮</Tag> : x.seen ? <Tag>看过</Tag> : <Tag tone="ai">待审</Tag>)}
            {x.basis !== cur ? <Tag tone="warn">依据已变：不是针对最新批注 / 加工 / 原文</Tag> : x.state === 'ok' && <Tag tone="ok">基于当前内容</Tag>}
          </div>
          <div className="small muted">目标：{x.goal || '（未填）'} · 参考：{x.refs.join('、') || '无'}</div>
          {x.result && <div className="fav-ai-box"><span className="ai-tag">AI 整理</span> {x.result}</div>}
          {x.error && <div className="fav-note-line warn">{x.error}</div>}
          {x.state === 'ok' && (
            <div className="row wrap">
              {!x.seen && <button className="btn sm btn-ghost" onClick={() => reviewRound(r.id, x.n, { seen: true })}>看过</button>}
              {!x.accepted && <button className="btn sm btn-ghost" onClick={() => reviewRound(r.id, x.n, { accepted: true })}>接受本轮</button>}
              <input className="input fav-inline-in" placeholder="审查意见" value={comment[x.n] ?? x.comment ?? ''} onChange={(e) => setComment({ ...comment, [x.n]: e.target.value })} aria-label={`第 ${x.n} 轮审查意见`} />
              <button className="btn sm" disabled={running} onClick={() => { const c = comment[x.n] ?? x.comment ?? ''; reviewRound(r.id, x.n, { comment: c }); startRound(r.id, c ? `按意见再整理：${c}` : '再整理一次', x.refs); }}><RotateCw size={12} />按意见再整理</button>
            </div>
          )}
          {x.state === 'failed' && <button className="btn sm" onClick={() => startRound(r.id, x.goal, x.refs)}><RotateCw size={12} />重试</button>}
        </div>
      ))}
      {r.rounds.some((x) => x.accepted) && <div className="small faint">看过 ≠ 认可；接受一轮结果 ≠ 已消化这条材料。</div>}
    </section>
  );
}

function Placement({ r }: { r: Rec }) {
  const [topic, setTopic] = useState(item(r.itemId)?.topic && item(r.itemId)!.topic !== '未归类' ? item(r.itemId)!.topic : TOPICS[0]);
  const [pv, setPv] = useState(''); const w = useWrite();
  const it = item(r.itemId); const snap = `${topic}|${r.location}`;
  return (
    <section className="fav-box">
      <div className="fav-sum-head"><b>主题归位</b><span className="small faint">放进主题目录的{r.kind === 'ref' ? '「可调用材料」' : '「待消化材料」'}区；仍然是材料，不代表已掌握</span></div>
      {r.placed && <div className="small">已归位：「{r.placed.topic}」 <DemoPath path={r.placed.path} /> · {full(r.placed.at)}</div>}
      <div className="row wrap"><select className="input fav-sel" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="主题">{TOPICS.filter((t) => t !== '未归类').map((t) => <option key={t}>{t}</option>)}</select>
        <button className="btn sm" onClick={() => { setPv(snap); w.reset(); }}><Eye size={12} />预览归位</button></div>
      {pv && (
        <div className={`fav-preview ${pv !== snap ? 'stale' : ''}`}>
          {pv !== snap && <div className="fav-note-line warn">预览已失效：主题或位置改了，请重新预览</div>}
          <dl className="fav-dl">
            <dt>内容</dt><dd>这份{REC_NAME[r.kind]}：批注「{r.note}」+ 原文 v{r.basisVersion}{r.myNotes ? ' + 你的加工笔记' : ''}</dd>
            <dt>附件</dt><dd>属于这条材料的图片一起移动，链接随之更新</dd>
            <dt>从</dt><dd><DemoPath path={r.location} /></dd>
            <dt>到</dt><dd><DemoPath path={placePath(r, pv.split('|')[0])} planned /></dd>
            <dt>回链</dt><dd>保留到原始材料「{it?.title}」与这份记录</dd>
          </dl>
          <div className="row"><button className="btn sm btn-primary" disabled={pv !== snap || w.busy} onClick={async () => { const x = await w.run(() => place(r.id, topic)); if (x.status === 'ok') setPv(''); }}>确认归位</button><button className="btn sm btn-ghost" onClick={() => setPv('')}>取消</button></div>
          <WriteNote w={w} onReload={() => setPv('')} />
        </div>
      )}
      {!pv && w.status === 'ok' && <WriteNote w={w} />}
    </section>
  );
}

function Draft({ r }: { r: Rec }) {
  const [on, setOn] = useState(false); const [text, setText] = useState(''); const [pv, setPv] = useState(''); const w = useWrite();
  return (
    <section className="fav-box">
      <div className="fav-sum-head"><b>我的知识稿</b><span className="small faint">只有你明确起稿、自己写并确认，才算个人内容；不会用批注、原文或 AI 结果自动填</span></div>
      {r.draft && <div className="fav-draft"><div className="pre">{r.draft.text}</div><div className="small muted">已确认 · {full(r.draft.confirmedAt)} · <DemoPath path={r.draft.path} /></div></div>}
      {!on ? <button className="btn sm" onClick={() => setOn(true)}>{r.draft ? '再写一版' : '明确起稿'}</button> : (
        <>
          <textarea className="input fav-ta" rows={4} placeholder="写下你自己的判断…" value={text} onChange={(e) => setText(e.target.value)} aria-label="知识稿正文" />
          {!pv ? <div className="row"><button className="btn sm btn-primary" disabled={!text.trim()} onClick={() => setPv(text)}>预览</button><button className="btn sm btn-ghost" onClick={() => setOn(false)}>收起（草稿保留）</button></div> : (
            <div className={`fav-preview ${pv !== text ? 'stale' : ''}`}>
              {pv !== text ? <div className="fav-note-line warn">预览已失效：正文改了，请重新预览</div> : <div className="small muted">将保存到 <DemoPath path={`${S.d.locations.knowledge}${item(r.itemId)?.title}.md`} planned /></div>}
              <div className="row"><button className="btn sm btn-primary" disabled={pv !== text || w.busy} onClick={async () => { const x = await w.run(() => confirmDraft(r.id, text)); if (x.status === 'ok') { setOn(false); setText(''); setPv(''); } }}>确认保存知识稿</button><button className="btn sm btn-ghost" onClick={() => setPv(pv !== text ? text : '')}>{pv !== text ? '重新预览' : '返回修改'}</button></div>
            </div>
          )}
          <WriteNote w={w} />
        </>
      )}
    </section>
  );
}

const OUT_LINK: Record<string, (id: string) => string> = { action: (id) => `/c/today/a/${id}`, attach: (id) => `/c/today/a/${id}`, approval: () => '/c/approvals', project: (id) => `/c/projects/${id}` };
function Destinations({ r }: { r: Rec }) {
  const it = item(r.itemId);
  const actions = useData((db) => db.actions.filter((a) => !a.deleted && !a.done).slice(0, 12));
  const projects = useData((db) => db.projects);
  const [kind, setKind] = useState<Dest['kind'] | ''>('');
  const [title, setTitle] = useState(it?.title ?? ''); const [aid, setAid] = useState(''); const [pid, setPid] = useState(''); const [as, setAs] = useState<'参考' | '已确认需求'>('参考');
  const [pv, setPv] = useState(''); const w = useWrite();
  const dest: Dest | null = kind === 'action' ? { kind, title } : kind === 'attach' && aid ? { kind, actionId: aid } : kind === 'approval' ? { kind, title } : kind === 'project' && pid ? { kind, projectId: pid, as } : null;
  const snap = JSON.stringify(dest);
  const impact = kind === 'action' ? '在今日 / 行动里新建一条行动（不自动完成；同一材料已有行动时不重复建）' : kind === 'attach' ? '只给已有行动加一条支持材料，不新建任务' : kind === 'approval' ? '只是一条建议，采纳后才成为行动' : kind === 'project' ? (as === '参考' ? '作为项目参考，不是已确认需求' : '作为已确认需求（你明确选择的）') : '';
  return (
    <section className="fav-box">
      <div className="fav-sum-head"><b>其他去向</b><span className="small faint">用宿主已有的行动、待采纳、项目；先看清再确认</span></div>
      <div className="pill-row">{([['action', '转为行动'], ['attach', '挂到已有行动'], ['approval', '送到待采纳'], ['project', '关联项目']] as const).map(([k, l]) => <button key={k} className={`pill ${kind === k ? 'on' : ''}`} onClick={() => { setKind(kind === k ? '' : k); setPv(''); w.reset(); }}>{l}</button>)}</div>
      {kind && (
        <div className="fav-ai-form">
          {(kind === 'action' || kind === 'approval') && <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="标题" />}
          {kind === 'attach' && <select className="input" value={aid} onChange={(e) => setAid(e.target.value)} aria-label="已有行动"><option value="">选一条已有行动…</option>{actions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>}
          {kind === 'project' && <div className="row wrap"><select className="input fav-sel" value={pid} onChange={(e) => setPid(e.target.value)} aria-label="项目"><option value="">选项目…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <div className="seg">{(['参考', '已确认需求'] as const).map((x) => <button key={x} className={as === x ? 'on' : ''} onClick={() => setAs(x)}><span>{x}</span></button>)}</div></div>}
          <div className="row"><button className="btn sm" disabled={!dest} onClick={() => setPv(snap)}><Eye size={12} />预览</button></div>
          {pv && (
            <div className={`fav-preview ${pv !== snap ? 'stale' : ''}`}>
              {pv !== snap && <div className="fav-note-line warn">预览已失效：内容或目标改了</div>}
              <dl className="fav-dl"><dt>标题</dt><dd>{kind === 'attach' ? actions.find((a) => a.id === aid)?.title : kind === 'project' ? projects.find((p) => p.id === pid)?.name : title}</dd>
                <dt>正文</dt><dd>这份{REC_NAME[r.kind]}的批注：「{r.note}」</dd><dt>来源</dt><dd>回链到收藏：{it?.title}（{r.id}）</dd><dt>影响</dt><dd>{impact}</dd></dl>
              <div className="row"><button className="btn sm btn-primary" disabled={pv !== snap || w.busy || !dest} onClick={async () => { const x = await w.run(() => send(r.id, dest!)); if (x.status === 'ok') setPv(''); }}>确认</button><button className="btn sm btn-ghost" onClick={() => setPv('')}>取消</button></div>
            </div>
          )}
          <WriteNote w={w} />
        </div>
      )}
      {r.outputs.length > 0 && <div className="fav-outs">{r.outputs.map((o, i) => <Link key={i} className="fav-rec-link" to={OUT_LINK[o.kind](o.id)}><Tag tone="accent">{{ action: '行动', attach: '已有行动', approval: '待采纳', project: '项目' }[o.kind]}</Tag><span className="ellipsis">{o.label}</span><span className="small faint">{full(o.at)}</span></Link>)}</div>}
      {r.placed && <div className="small muted">产物：主题材料「{r.placed.topic}」{r.draft ? ' · 我的知识稿 1 份' : ''}</div>}
    </section>
  );
}

function Handoff({ r }: { r: Rec }) {
  const it = item(r.itemId);
  const text = `【整理背景（样例）】\n材料：${it?.title}（${it?.url}）\n路线：${REC_NAME[r.kind]}\n批注：${r.note}\n原文版本：v${r.basisVersion}\n边界：这是材料，不代表已理解；不包含账号或本机私密信息。`;
  const [ok, setOk] = useState(false);
  return <div className="fav-handoff"><pre>{text}</pre><button className="btn sm" onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setOk(true); }}><Copy size={12} />{ok ? '已复制' : '复制'}</button></div>;
}
