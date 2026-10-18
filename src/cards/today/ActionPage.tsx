import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Archive, Check, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { store, useData, type Priority } from '../../data';
import { full, relDay } from '../../data/time';
import { MaterialRow, ProjectChip, DecisionRow } from '../../ui/objects';
import { Empty, History, KV, PageHeader, Section, Tag } from '../../ui/ui';
import { RefLine, RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';

/** 行动详情：编辑标题 / 正文 / 日期 / 时间 / 优先级 / 项目；完成、归档、删除都可恢复；来源与历史 */
export default function ActionPage() {
  const { id } = useParams();
  const a = useData(() => store.act(id));
  const projects = useData((db) => db.projects);
  const mats = useData((db) => db.materials.filter((m) => a?.materialIds.includes(m.id)));
  const d = useData(() => store.dec(a?.decisionId));
  const ap = useData(() => store.appr(a?.approvalId));
  const w = useWrite(), w2 = useWrite();
  const [f, setF] = useState(() => ({ title: a?.title ?? '', body: a?.body ?? '', date: a?.date ?? '', time: a?.time ?? '', priority: a?.priority ?? '中', projectId: a?.projectId ?? '' }));
  useEffect(() => { if (a && w.status !== 'failed' && w.status !== 'conflict') setF({ title: a.title, body: a.body ?? '', date: a.date ?? '', time: a.time ?? '', priority: a.priority, projectId: a.projectId ?? '' }); }, [a?.history.length]); // eslint-disable-line
  if (!a) return <div className="page"><Empty title="找不到这条行动" hint="可能已被删除，或者样例数据重置过" /></div>;
  const dirty = f.title !== a.title || f.body !== (a.body ?? '') || f.date !== (a.date ?? '') || f.time !== (a.time ?? '') || f.priority !== a.priority || f.projectId !== (a.projectId ?? '');
  const save = () => w.run(() => store.updateAction(a.id, { title: f.title.trim() || a.title, body: f.body || undefined, date: f.date || undefined, time: f.time || undefined, priority: f.priority as Priority, projectId: f.projectId || undefined }));
  const sec = store.sectionOf(a);
  return (
    <div className="page">
      <PageHeader title={<span className={a.done ? 'strike-on' : ''}>{a.title}</span>}
        sub={<span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{a.kind === '验收行动' && <Tag tone="accent">验收行动</Tag>}<Tag tone={sec === 'overdue' ? 'bad' : sec === 'done' ? 'ok' : 'neutral'}>{{ overdue: '逾期', today: '今天', undated: '未排期', later: '之后', done: '已完成', archived: '已归档', deleted: '已删除' }[sec]}</Tag>{a.date && <span className="muted small">{relDay(a.date)}{a.time ? ' ' + a.time : ''}</span>}<RefPath path={a.path} /></span>}
        actions={<>
          {a.deleted ? <button className="btn sm" onClick={() => w2.run(() => store.deleteAction(a.id, false))}><Undo2 size={13} />恢复</button> : <>
            <button className={`btn sm ${a.done ? '' : 'btn-primary'}`} onClick={() => w2.run(() => store.toggleDone(a.id))}>{a.done ? <><RotateCcw size={13} />恢复未完成</> : <><Check size={13} />完成</>}</button>
            <button className="btn sm btn-ghost" onClick={() => w2.run(() => store.archiveAction(a.id, !a.archived))}><Archive size={13} />{a.archived ? '取消归档' : '归档'}</button>
            <button className="btn sm btn-ghost" onClick={() => w2.run(() => store.deleteAction(a.id))}><Trash2 size={13} />删除</button>
          </>}
        </>} />
      <WriteNote w={w2} />
      {a.kind === '验收行动' && <div className="note-box">完成这条行动只代表「看过了」。验收结论（通过 / 需修改）要回到 <b>待我决策</b> 里给出。</div>}
      <div className="detail-grid">
        <div className="stack">
          <Section title="内容">
            <div className="form">
              <label>标题<input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
              <label>正文<textarea className="input" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="补充说明（可不填）" /></label>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <label>日期<input className="input sm" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
                <label>时间<input className="input sm" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
                <label>优先级<select className="input sm" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>{['高', '中', '低'].map((p) => <option key={p}>{p}</option>)}</select></label>
                <label>项目<select className="input sm" value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}><option value="">不属于项目</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary sm" disabled={!dirty || w.busy} onClick={save}>{w.busy ? '保存中…' : '保存'}</button>
                {dirty && <button className="btn btn-ghost sm" onClick={() => setF({ title: a.title, body: a.body ?? '', date: a.date ?? '', time: a.time ?? '', priority: a.priority, projectId: a.projectId ?? '' })}>放弃修改</button>}
                {!f.date && <span className="small muted">没填日期 = 未排期，不会出现在「今天」</span>}
              </div>
              <WriteNote w={w} onReload={() => { w.reset(); }} onOverwrite={() => { store.setSim({ write: 'ok' }); save(); }} />
            </div>
          </Section>
          {mats.length > 0 && <Section title="支持材料" count={mats.length} desc="这件事从哪些材料来">{mats.map((m) => <MaterialRow key={m.id} m={m} />)}</Section>}
          {d && <Section title="关联请求">{<DecisionRow d={d} />}</Section>}
        </div>
        <div className="stack">
          <Section title="信息"><KV rows={[
            ['创建', full(a.createdAt)], ['项目', a.projectId ? <ProjectChip id={a.projectId} /> : '—'],
            ['来自待采纳', ap ? `${ap.title}（${ap.group}）` : '—'], ['完成', a.done ? full(a.done) : '—'], ['归档', a.archived ? full(a.archived) : '—'], ['删除', a.deleted ? full(a.deleted) : '—'],
          ]} /></Section>
          <Section title="来源" count={a.refs.length}>{a.refs.length ? a.refs.map((r, i) => <RefLine key={i} r={r} />) : <Empty title="手动新建，没有来源" />}</Section>
          <Section title="历史"><History items={a.history} /></Section>
        </div>
      </div>
    </div>
  );
}
