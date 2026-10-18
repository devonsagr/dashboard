import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData, type DiaryFile } from '../../data';
import { addDays, md, relDay, relTime, today, weekday, diaryDir } from '../../data/time';
import { Empty, PageHeader, SampleMark, Section, Tag } from '../../ui/ui';
import { RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';

const ST = { exists: ['有', 'ok'], missing: ['还没有', 'faint'], empty: ['空文件', 'warn'], failed: ['读不出来', 'bad'] } as const;
const SHORT = { 用户原文: '原话', 生活日记整理版: '生活整理', AI项目日志: 'AI 项目日志' } as const;

/** 今日日记卡：三份文件的状态 + 原话开头 */
export function DiaryToday({ inst }: CardProps) {
  const t = today();
  const day = useData((db) => db.diary.find((d) => d.date === t));
  const { open } = useOverlay();
  const files: DiaryFile[] = day?.files ?? (['用户原文', '生活日记整理版', 'AI项目日志'] as const).map((k) => ({ kind: k, path: `${diaryDir(t)}/${t}_${k}.md`, state: 'missing' as const }));
  const raw = files[0];
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="diary-files">
        {files.map((f) => <button key={f.kind} className="diary-file" onClick={(e) => open({ kind: 'path', to: `/c/diary/${t}?f=${encodeURIComponent(f.kind)}` }, e.currentTarget)}><span className="small">{SHORT[f.kind]}</span><Tag tone={ST[f.state][1]}>{ST[f.state][0]}</Tag></button>)}
      </div>
      {raw.state === 'exists' && raw.text ? <p className="diary-ex">{raw.text.slice(0, inst.h > 7 ? 220 : 110)}{raw.text.length > 110 ? '…' : ''}</p> : <Empty title="今天的原话还没写" hint="写下来以后，整理版和项目日志由整理流程生成" />}
      {raw.mtime && <span className="small faint">原话 {relTime(raw.mtime)} 改过</span>}
    </div>
  );
}

/** 日记（完整页）：一天三份文件，各自的状态；可以直接改，保存有冲突检测 */
export default function DiaryPage() {
  const { date = today() } = useParams();
  const nav = useNavigate();
  useEffect(() => { store.ensureDiaryDay(date); }, [date]);
  const day = useData((db) => db.diary.find((d) => d.date === date));
  const days = useData((db) => db.diary.map((d) => d.date).sort().reverse());
  const [q] = useSearchParams();
  const [kind, setKind] = useState<string>(q.get('f') ?? '用户原文');
  const go = (d: string) => nav(`/c/diary/${d}`);
  return (
    <div className="page">
      <PageHeader title={`日记 · ${md(date)} ${weekday(date)}`} sub={<>每天三份文件：你的原话、生活整理版、AI 项目日志。整理版和日志由整理流程生成，你随时可以改。<SampleMark /></>}
        actions={<div className="row" style={{ gap: 4 }}><button className="icon-btn" onClick={() => go(addDays(date, -1))} aria-label="前一天"><ChevronLeft size={15} /></button><input className="input sm" type="date" value={date} onChange={(e) => e.target.value && go(e.target.value)} /><button className="icon-btn" onClick={() => go(addDays(date, 1))} aria-label="后一天"><ChevronRight size={15} /></button>{date !== today() && <button className="btn sm btn-ghost" onClick={() => go(today())}>今天</button>}</div>} />
      <div className="small muted"><RefPath path={diaryDir(date) + '/'} /></div>
      {day ? (
        <div className="detail-grid">
          <div className="stack">
            <div className="filter-bar">{day.files.map((f) => <button key={f.kind} className={`pill ${kind === f.kind ? 'on' : ''}`} onClick={() => setKind(f.kind)}>{SHORT[f.kind]}<Tag tone={ST[f.state][1]}>{ST[f.state][0]}</Tag></button>)}</div>
            {day.files.filter((f) => f.kind === kind).map((f) => <FileEditor key={date + f.kind} date={date} f={f} />)}
          </div>
          <Section title="其他日期" desc="有记录的日子">
            {days.map((d) => { const x = store.db.diary.find((y) => y.date === d)!; return (
              <button key={d} className={`mini-row ${d === date ? 'on' : ''}`} onClick={() => go(d)}><span>{md(d)} {weekday(d)}</span><span className="small faint">{relDay(d)}</span><span style={{ marginLeft: 'auto' }} className="row">{x.files.map((f) => <i key={f.kind} className={`hdot tone-${ST[f.state][1]}`} title={`${SHORT[f.kind]}：${ST[f.state][0]}`} />)}</span></button>
            ); })}
          </Section>
        </div>
      ) : <Empty title="正在准备这一天" />}
    </div>
  );
}

function FileEditor({ date, f }: { date: string; f: DiaryFile }) {
  const [v, setV] = useState(f.text ?? '');
  const w = useWrite();
  const dirty = v !== (f.text ?? '');
  const save = () => w.run(() => store.saveDiary(date, f.kind, v));
  return (
    <Section title={f.kind} desc={<RefPath path={f.path} />}>
      {f.state === 'failed' && <div className="note-box warn small">{f.error}。下面是空白，保存会覆盖原文件——建议先在 Obsidian 里修好。</div>}
      {f.state === 'missing' && <div className="note-box small">这份文件还不存在。写点什么并保存，就会新建（样例）。</div>}
      {f.state === 'empty' && <div className="note-box small">文件存在，但是空的。</div>}
      <textarea className="input diary-edit" rows={14} value={v} onChange={(e) => setV(e.target.value)} placeholder={f.kind === '用户原文' ? '今天想说的话，原样记下…' : '由整理流程生成；也可以手动写'} aria-label={f.kind} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn sm btn-primary" disabled={!dirty || w.busy} onClick={save}>{w.busy ? '保存中…' : '保存'}</button>
        {dirty && <span className="small muted">有未保存的修改</span>}
        {f.mtime && <span className="small faint">文件 {relTime(f.mtime)} 改过</span>}
      </div>
      <WriteNote w={w} onReload={() => { setV(f.text ?? ''); w.reset(); }} onOverwrite={() => { store.setSim({ write: 'ok' }); save(); }} />
    </Section>
  );
}
