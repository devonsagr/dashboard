import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Archive, BookPlus, Clock3, Eye, EyeOff, FolderKanban, ImageOff, Link2, ListPlus, Send, Undo2, CheckCheck, RotateCw } from 'lucide-react';
import { store, useData } from '../../data';
import { full, relTime, today } from '../../data/time';
import { MaterialFacts, MAIN_TONE } from '../../ui/objects';
import { AiTag, Chip, Empty, History, KV, PageHeader, Section, SourceChip, Tag, TimeMeta } from '../../ui/ui';
import { RefLine, RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';
import { FlowPanel } from '../../ui/flow';
import { host } from '../../data/host';


/** 材料详情：原文全文 + 精确来源 + 多项事实 + 所有去向操作 */
export default function MaterialPage() {
  const { id } = useParams();
  const m = useData(() => store.mat(id));
  const projects = useData((db) => db.projects);
  const actions = useData(() => store.liveActions().filter((a) => !a.done));
  const { open } = useOverlay();
  const w = useWrite(), wn = useWrite();
  const [note, setNote] = useState(m?.note?.text ?? '');
  const [panel, setPanel] = useState<null | 'action' | 'attach' | 'push' | 'project'>(null);
  const [title, setTitle] = useState(m?.title ?? '');
  const [date, setDate] = useState(today());
  const [pick, setPick] = useState('');
  const [as, setAs] = useState<'参考' | '已确认需求'>('参考');
  useEffect(() => { setNote(m?.note?.text ?? ''); setTitle(m?.title ?? ''); }, [id]); // eslint-disable-line
  if (!m) return <div className="page"><Empty title="找不到这条材料" /></div>;
  const main = store.mainState(m);
  const run = (f: () => Promise<import('../../data').Receipt>) => w.run(f).then((r) => { if (r.status === 'ok') setPanel(null); return r; });
  return (
    <div className="page">
      <PageHeader title={m.title}
        sub={<span className="row" style={{ gap: 6, flexWrap: 'wrap' }}><Chip tone={host ? 'neutral' : MAIN_TONE[main]}>{host ? (m.archived ? '已归档' : '已收录') : main}</Chip><SourceChip id={m.sourceId} label={m.channel} />{m.captureType && <Tag>{m.captureType}</Tag>}{m.author && <span className="small muted">{m.author}</span>}</span>}
        meta={<TimeMeta items={[['内容时间', m.contentAt], ['进入系统', m.receivedAt], ['标记已读', m.read]]} />}
        actions={!host && <>
          <button className="btn sm" onClick={() => w.run(() => store.markRead(m.id, !m.read))}>{m.read ? <><EyeOff size={13} />标为未读</> : <><Eye size={13} />标记已读</>}</button>
          <button className="btn sm btn-ghost" onClick={() => w.run(() => store.archiveMat(m.id, !m.archived))}><Archive size={13} />{m.archived ? '取消归档' : '归档'}</button>
        </>} />
      <WriteNote w={w} />
      {m.home && <div className="sample-explain">这条的主场在「{m.home.card === 'favorites' ? '收藏' : m.home.card}」卡：正文、图片、字幕和批注都在那里（这里是同一来源的投影，不是副本）。<Link className="link" to={`/c/${m.home.card}/i/${m.home.id}`}>在收藏里打开 →</Link></div>}
      <div className="detail-grid">
        <div className="stack">
          <Section title="原文" desc="只读，原样显示（不删空格、不改写）">
            <pre className="raw">{m.text}</pre>
            <RefLine r={m.ref} />
            {m.dupOf && <div className="small muted">和 <button className="link" onClick={() => open({ kind: 'material', id: m.dupOf! })}>{store.mat(m.dupOf)?.title ?? m.dupOf}</button> 重复</div>}
          </Section>
          {m.context?.length ? (
            <Section title="上下文" desc="同一个群里前后的消息；只用于理解，不单独成为材料">
              <div className="qq-ctx">{m.context.map((c, i) => <div key={i} className={`qq-msg ${c.self ? 'self' : ''}`}><span className="small faint">{c.who} · {relTime(c.at)}</span><div>{c.text}</div></div>)}</div>
            </Section>
          ) : null}
          {(m.media?.length || m.gaps?.length) ? (
            <Section title="附件与缺口">
              {m.media?.map((x, i) => <div key={i} className="row media-row" style={{ gap: 6 }}>{x.available ? <Tag tone="ok">{x.kind}</Tag> : <><ImageOff size={13} className="faint" /><Tag tone="warn">{x.kind} · 不可用</Tag></>}<span className="small">{x.label}</span>{x.reason && <span className="small muted">{x.reason}</span>}{x.path && <RefPath path={x.path} />}</div>)}
              {m.gaps?.map((g) => <div key={g} className="note-box warn small">{g}</div>)}
            </Section>
          ) : null}
          {!host && <Section title="处理" desc="备注 → AI 按备注初处理 → 我选：直接入库 / 我自己处理；以后读随时">
            {m.home ? <div className="small muted">这条的流程（备注 → AI → 入库 / 自己处理）在「收藏」卡里走，两边是同一套步骤。<Link className="link" to={`/c/${m.home.card}/i/${m.home.id}`}>去收藏里处理 →</Link></div> : <FlowPanel m={m} />}
          </Section>}
        </div>
        <div className="stack">
          <Section title="其他去向" desc={host ? '从这条材料创建行动，正文保留来源。' : '和上面的选择不冲突：要做的事、要给项目的东西从这里走'}>
            <div className="go-grid">
              <button className="btn sm" onClick={() => setPanel(panel === 'action' ? null : 'action')}><ListPlus size={13} />转为行动</button>
              {!host && <><button className="btn sm" onClick={() => setPanel(panel === 'attach' ? null : 'attach')}><Link2 size={13} />挂到已有行动</button>
              <button className="btn sm" onClick={() => setPanel(panel === 'push' ? null : 'push')}><Send size={13} />推送到待采纳</button>
              <button className="btn sm" onClick={() => setPanel(panel === 'project' ? null : 'project')}><FolderKanban size={13} />关联项目</button></>}
            </div>
            {panel === 'action' && <form className="form panel" onSubmit={(e) => { e.preventDefault(); run(() => store.materialToAction(m.id, title.trim() || m.title, date || undefined)); }}><label>行动标题<input className="input sm" value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>日期<input className="input sm" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button className="btn sm btn-primary">创建行动</button></form>}
            {panel === 'attach' && <form className="form panel" onSubmit={(e) => { e.preventDefault(); if (pick) run(() => store.attachToAction(m.id, pick)); }}><select className="input sm" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">选一条未完成的行动</option>{actions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select><button className="btn sm btn-primary" disabled={!pick}>挂上</button></form>}
            {panel === 'push' && <form className="form panel" onSubmit={(e) => { e.preventDefault(); run(() => store.pushApproval([m.id], title.trim() || m.title, m.channel)); }}><label>候选标题<input className="input sm" value={title} onChange={(e) => setTitle(e.target.value)} /></label><span className="small muted">推送只进「待采纳」，你采纳了才成为行动</span><button className="btn sm btn-primary">推送</button></form>}
            {panel === 'project' && <form className="form panel" onSubmit={(e) => { e.preventDefault(); if (pick) run(() => store.linkProject(m.id, pick, as)); }}><select className="input sm" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">选项目</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><div className="seg">{(['参考', '已确认需求'] as const).map((k) => <button type="button" key={k} className={as === k ? 'on' : ''} onClick={() => setAs(k)}><span>{k}</span></button>)}</div><button className="btn sm btn-primary" disabled={!pick}>关联</button></form>}
          </Section>
          {!host && <><Section title="事实" desc="同时成立的状态"><MaterialFacts m={m} full /><KV rows={[['主状态', main], ['以后读', m.later ? `${full(m.later)} 放入` : '—'], ['选择', m.route ? `${m.route.kind} · ${m.route.path}` : '—'], ['归档', m.archived ? full(m.archived) : '—'], ['批次', m.batchIds.join('、') || '—']]} /></Section>
          <Section title="产出" count={m.outputs.length}>
            {m.outputs.length ? m.outputs.map((o, i) => (
              <button key={i} className="mini-row" onClick={() => open(o.kind === 'action' ? { kind: 'action', id: o.id } : o.kind === 'approval' ? { kind: 'path', to: '/c/approvals' } : o.kind === 'knowledge' ? { kind: 'path', to: '/c/knowledge/library' } : { kind: 'project', id: o.id })}>
                <Tag tone="ok">{{ action: '行动', approval: '待采纳', knowledge: '入库', project: '项目' }[o.kind]}</Tag><span className="ellipsis">{o.label}</span><span className="mono faint small">{relTime(o.at)}</span>
              </button>
            )) : <Empty title="还没有产出" />}
            {m.projectLinks.map((l) => <div key={l.projectId} className="mini-row"><Tag tone="info">{l.as}</Tag><span>{store.proj(l.projectId)?.name}</span></div>)}
          </Section>
          <Section title="历史"><History items={m.history} /></Section></>}
        </div>
      </div>
    </div>
  );
}
