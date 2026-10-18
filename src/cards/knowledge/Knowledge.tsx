import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Sparkles, Check } from 'lucide-react';
import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { relTime } from '../../data/time';
import { KnownLegend, KNOWN_LIST, knownColor, Landscape } from './Graph';
import { ActionRow, MaterialRow } from '../../ui/objects';
import { AiTag, Empty, History, MoreLink, PageHeader, SampleMark, Section, Tabs, Tag } from '../../ui/ui';
import { RefLine, RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';
import { S, addQuestion, answerQuestion, saveNodeBody, setKnown, type Known } from './store';

/** 知识景观卡：节点颜色 = 你自己标的理解程度；没标的画空心 */
export function LandscapeCard({ inst }: CardProps) {
  const ns = useData((db) => S.d.knodes);
  const { open } = useOverlay();
  return <div className="stack" style={{ gap: 4 }}><Landscape nodes={ns} height={Math.max(160, inst.h * 44 - 110)} onPick={(n) => open({ kind: 'path', to: `/c/knowledge/n/${n.id}` })} /><KnownLegend /></div>;
}
export function QuestionsCard({ inst }: CardProps) {
  const qs = useData((db) => S.d.questions.filter((q) => q.status === 'open'));
  const { open } = useOverlay();
  return (
    <div className="stack" style={{ gap: 2 }}>
      {qs.length ? qs.slice(0, inst.h > 8 ? 6 : 4).map((q) => <button key={q.id} className="mini-row" onClick={(e) => open({ kind: 'path', to: '/c/knowledge/questions' }, e.currentTarget)}><span className="q-mark">?</span><span className="ellipsis">{q.text}</span></button>) : <Empty title="没有悬着的问题" />}
      <AddQuestion compact />
    </div>
  );
}
export function LibraryCard({ inst }: CardProps) {
  const ls = useData((db) => [...db.library].sort((a, b) => b.at.localeCompare(a.at)));
  const { open } = useOverlay();
  return <div className="stack" style={{ gap: 2 }}>{ls.slice(0, inst.h > 7 ? 6 : 4).map((l) => <button key={l.id} className="mini-row" onClick={(e) => open({ kind: 'path', to: `/c/knowledge/library?d=${l.id}` }, e.currentTarget)}><span className="ellipsis">{l.title}</span><span className="small faint">{l.source}</span><span className="mono faint small">{relTime(l.at)}</span></button>)}<MoreLink to="/c/knowledge/library" /></div>;
}

function AddQuestion({ compact, nodeId }: { compact?: boolean; nodeId?: string }) {
  const [v, setV] = useState('');
  const w = useWrite();
  return (
    <form className="add-row" data-nodrag onSubmit={(e) => { e.preventDefault(); if (v.trim()) w.run(() => addQuestion(v.trim(), nodeId)).then((r) => r.status === 'ok' && setV('')); }}>
      <Plus size={13} className="faint" /><input value={v} onChange={(e) => setV(e.target.value)} placeholder="记一个还没想通的问题…" aria-label="新问题" />
      <WriteNote w={w} compact={compact} ok="已记下" />
    </form>
  );
}

const TABS = [['landscape', '景观'], ['questions', '问题'], ['library', '知识库']] as const;
export default function KnowledgePage() {
  const { tab = 'landscape', id } = useParams();
  const nav = useNavigate();
  if (id) return <NodePage id={id} />;
  return (
    <div className="page">
      <PageHeader title="知识" sub={<>理解程度由你自己标（懂 / 半懂 / 不懂 / 想拓展）；AI 只能建议，不会替你改。<SampleMark /></>} />
      <Tabs id="kn" value={tab as 'landscape'} onChange={(k) => nav(`/c/knowledge/${k}`)} items={TABS.map(([k, l]) => ({ key: k, label: l }))} />
      {tab === 'landscape' && <LandscapeTab />}
      {tab === 'questions' && <QuestionsTab />}
      {tab === 'library' && <LibraryTab />}
    </div>
  );
}

function LandscapeTab() {
  const ns = useData((db) => S.d.knodes);
  const nav = useNavigate();
  const unmarked = ns.filter((n) => !n.known);
  const sugg = ns.filter((n) => n.aiSuggest);
  return (
    <div className="detail-grid">
      <Section title="如何用好 AI" desc={<>点节点看详情 · <RefPath path="系统/知识景观/如何用好AI.md" /></>}><Landscape nodes={ns} height={420} onPick={(n) => nav(`/c/knowledge/n/${n.id}`)} /><KnownLegend /></Section>
      <div className="stack">
        <Section title="还没标的" count={unmarked.length} desc="空心节点；不标就不算">{unmarked.map((n) => <button key={n.id} className="mini-row" onClick={() => nav(`/c/knowledge/n/${n.id}`)}><i className="hdot hollow" /><span>{n.title}</span></button>)}</Section>
        <Section title={<>AI 建议 <AiTag /></>} count={sugg.length} desc="只是建议，接受了才改">{sugg.map((n) => <button key={n.id} className="mini-row" onClick={() => nav(`/c/knowledge/n/${n.id}`)}><span>{n.title}</span><span className="small muted">→ {n.aiSuggest!.known}</span></button>)}</Section>
      </div>
    </div>
  );
}

function QuestionsTab() {
  const qs = useData((db) => S.d.questions);
  return (
    <div className="stack">
      <AddQuestion />
      <Section title="悬着的" count={qs.filter((q) => q.status === 'open').length}>{qs.filter((q) => q.status === 'open').map((q) => <QuestionRow key={q.id} id={q.id} />)}</Section>
      <Section title="答过的" count={qs.filter((q) => q.status === 'answered').length}>{qs.filter((q) => q.status === 'answered').map((q) => <QuestionRow key={q.id} id={q.id} />)}</Section>
    </div>
  );
}
function QuestionRow({ id }: { id: string }) {
  const q = useData((db) => S.d.questions.find((x) => x.id === id))!;
  const node = useData((db) => S.d.knodes.find((n) => n.id === q.nodeId));
  const nav = useNavigate();
  const [v, setV] = useState(q.answer?.text ?? '');
  const [edit, setEdit] = useState(false);
  const w = useWrite();
  return (
    <div className="q-row">
      <div className="row" style={{ gap: 6 }}><span className="q-mark">?</span><b>{q.text}</b>{node && <button className="src-chip" onClick={() => nav(`/c/knowledge/n/${node.id}`)}>{node.title}</button>}</div>
      <RefLine r={q.ref} time={false} />
      {q.answer && !edit && <p className="prose">{q.answer.text} <span className="mono faint small">{relTime(q.answer.at)}</span></p>}
      {(edit || !q.answer) && (edit ? (
        <div className="form"><textarea className="input" rows={3} value={v} onChange={(e) => setV(e.target.value)} placeholder="我现在的理解…" /><div className="row" style={{ gap: 6 }}><button className="btn sm btn-primary" disabled={!v.trim() || w.busy} onClick={() => w.run(() => answerQuestion(q.id, v)).then((r) => r.status === 'ok' && setEdit(false))}>保存回答</button><button className="btn sm btn-ghost" onClick={() => setEdit(false)}>取消</button></div><WriteNote w={w} /></div>
      ) : <button className="link small" onClick={() => setEdit(true)}>写下回答</button>)}
      {q.answer && !edit && <button className="link small" onClick={() => setEdit(true)}>改回答</button>}
    </div>
  );
}

function LibraryTab() {
  const ls = useData((db) => [...db.library].sort((a, b) => b.at.localeCompare(a.at)));
  const [sp] = useSearchParams();
  const [sel, setSel] = useState<string | null>(sp.get('d') ?? ls[0]?.id);
  const d = ls.find((x) => x.id === sel);
  const { open } = useOverlay();
  const groups = [...new Set(ls.map((l) => l.source))];
  return (
    <div className="detail-grid flip">
      <Section title="知识库" count={ls.length} desc="入库后的整理稿：知识库/收集整理/<来源>/<范围>/">
        {groups.map((g) => <div key={g}><div className="mini-head">{g}</div>{ls.filter((l) => l.source === g).map((l) => <button key={l.id} className={`mini-row ${sel === l.id ? 'on' : ''}`} onClick={() => setSel(l.id)}><span className="ellipsis">{l.title}</span><span className="small faint">{l.scope}</span></button>)}</div>)}
      </Section>
      {d ? (
        <Section title={d.title} desc={<RefPath path={d.path} />}>
          <pre className="raw">{d.text}</pre>
          <div className="row" style={{ gap: 6 }}>{d.materialId && <button className="btn sm" onClick={() => open({ kind: 'material', id: d.materialId! })}>原材料</button>}{d.nodeId && <button className="btn sm btn-ghost" onClick={() => open({ kind: 'path', to: `/c/knowledge/n/${d.nodeId}` })}>景观节点</button>}</div>
        </Section>
      ) : <Empty title="选一篇" />}
    </div>
  );
}

function NodePage({ id }: { id: string }) {
  const n = useData((db) => S.d.knodes.find((x) => x.id === id));
  const all = useData((db) => S.d.knodes);
  const mats = useData((db) => db.materials.filter((m) => n?.materialIds.includes(m.id)));
  const acts = useData((db) => db.actions.filter((a) => n?.actionIds.includes(a.id)));
  const qs = useData((db) => S.d.questions.filter((q) => q.nodeId === id));
  const nav = useNavigate();
  const [body, setBody] = useState(n?.body ?? '');
  const w = useWrite(), wb = useWrite();
  if (!n) return <div className="page"><Empty title="找不到这个节点" /></div>;
  const parent = all.find((x) => x.id === n.parent);
  const kids = all.filter((x) => x.parent === n.id);
  return (
    <div className="page">
      <PageHeader title={n.title} sub={<span className="row" style={{ gap: 6 }}>{parent && <button className="link small" onClick={() => nav(`/c/knowledge/n/${parent.id}`)}>↑ {parent.title}</button>}{n.known ? <Tag>{n.known} · {relTime(n.knownAt)}</Tag> : <Tag tone="faint">还没标</Tag>}</span>} />
      <div className="detail-grid">
        <div className="stack">
          <Section title="我理解到哪了" desc="只有你点了才改">
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{KNOWN_LIST.map((k: Known) => <button key={k} className={`btn sm ${n.known === k ? 'btn-primary' : ''}`} onClick={() => w.run(() => setKnown(n.id, k))}><i className="hdot" style={{ background: knownColor(k) }} />{k}</button>)}</div>
            {n.aiSuggest && <div className="ai-box"><AiTag /> 建议标为「{n.aiSuggest.known}」：{n.aiSuggest.why}<button className="btn xs" onClick={() => w.run(() => setKnown(n.id, n.aiSuggest!.known, true))}><Check size={11} />接受</button></div>}
            <WriteNote w={w} />
          </Section>
          <Section title="正文">
            <textarea className="input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="用自己的话写下这个概念…" />
            <button className="btn sm" disabled={body === n.body || wb.busy} onClick={() => wb.run(() => saveNodeBody(n.id, body))}>保存正文</button>
            <WriteNote w={wb} />
          </Section>
          {mats.length > 0 && <Section title="相关材料" count={mats.length}>{mats.map((m) => <MaterialRow key={m.id} m={m} compact />)}</Section>}
          {acts.length > 0 && <Section title="相关行动" count={acts.length}>{acts.map((a) => <ActionRow key={a.id} a={a} showDate />)}</Section>}
          <Section title="问题" count={qs.length}>{qs.map((q) => <QuestionRow key={q.id} id={q.id} />)}<AddQuestion nodeId={n.id} /></Section>
        </div>
        <div className="stack">
          <Section title="笔记" count={n.notes.length}>{n.notes.length ? n.notes.map((r, i) => <RefLine key={i} r={r} time={false} />) : <Empty title="还没有笔记" />}</Section>
          <Section title="关系">{n.relations.map((r) => <button key={r.to} className="mini-row" onClick={() => nav(`/c/knowledge/n/${r.to}`)}><Tag>{r.kind}</Tag>{all.find((x) => x.id === r.to)?.title}</button>)}{kids.map((k) => <button key={k.id} className="mini-row" onClick={() => nav(`/c/knowledge/n/${k.id}`)}><Tag tone="faint">下属</Tag>{k.title}</button>)}{!n.relations.length && !kids.length && <Empty title="没有" />}</Section>
          <Section title={<>说明 <Sparkles size={12} /></>}><p className="small muted">节点颜色只来自你自己的标注。AI 建议需要你点「接受」才生效，并会记录在 <span className="mono">系统/知识景观/如何用好AI.md</span>。</p></Section>
          <History items={[]} />
        </div>
      </div>
    </div>
  );
}
