import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData, type Action, type DB } from '../../data';
import { addDays, dateOf, md, today, weekday } from '../../data/time';
import { ActionRow } from '../../ui/objects';
import { Bars, Empty, KV, PageHeader, SampleMark, Section, Seg, Tag } from '../../ui/ui';
import { useWrite, WriteNote } from '../../ui/write';
import { S, saveReflection } from './store';

/**
 * 复盘是衍生视图：不产生新的原始输入，只把行动和日记按真实日期汇总。
 * 定义：某天「排期」= date 是这天的行动（不含已删除）；「完成」= 其中已完成的。未知天（解析失败 / 没有任何记录）不算 0，单独标出。
 */
export interface DayStat { date: string; planned: number; done: number; unknown?: string; diary: boolean; acts: Action[] }
export function dayStats(db: DB, from: string, n: number): DayStat[] {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(from, i);
    const acts = db.actions.filter((a) => a.date === date && !a.deleted);
    const meta = S.d.dayMeta.find((d) => d.date === date && d.status === 'unknown');
    const dd = db.diary.find((d) => d.date === date);
    return { date, planned: acts.length, done: acts.filter((a) => a.done).length, unknown: meta?.reason, diary: !!dd?.files.some((f) => f.state === 'exists'), acts };
  });
}

export function ReviewWeek({ inst }: CardProps) {
  const t = today();
  const st = useData((db) => dayStats(db, addDays(t, -6), 7));
  const known = st.filter((d) => !d.unknown);
  const p = known.reduce((s, d) => s + d.planned, 0), dn = known.reduce((s, d) => s + d.done, 0);
  return (
    <div className="review-mini">
      <div className="review-kpi"><b className="serif">{dn}</b><span className="muted small">/ {p} 件完成</span>{st.some((d) => d.unknown) && <Tag tone="warn">{st.filter((d) => d.unknown).length} 天未知</Tag>}</div>
      <Bars h={Math.max(50, inst.h * 44 - 120)} data={st.map((d) => ({ k: d.date, v: d.unknown ? undefined : d.done, v2: d.unknown ? undefined : d.planned, unknown: !!d.unknown, title: d.unknown ? `${md(d.date)} 未知：${d.unknown}` : `${md(d.date)} 完成 ${d.done}/${d.planned}` }))} label={(k) => weekday(k).slice(1)} accent={(k) => k === t} />
    </div>
  );
}

type R = 'day' | 'week' | 'month';
export default function ReviewPage() {
  const { range = 'week' } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const t = today();
  const d = sp.get('d') ?? t;
  const n = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  const from = range === 'day' ? d : addDays(t, -(n - 1));
  const st = useData((db) => dayStats(db, from, n));
  const known = st.filter((x) => !x.unknown);
  const p = known.reduce((s, x) => s + x.planned, 0), dn = known.reduce((s, x) => s + x.done, 0);
  const key = range === 'day' ? `日/${d}` : range === 'week' ? `周/${addDays(t, -6)}_${t}` : `月/${t.slice(0, 7)}`;
  return (
    <div className="page">
      <PageHeader title="复盘" sub={<>按真实日期（香港时间）汇总行动和日记。是衍生视图，不是新的输入。<SampleMark /></>}
        actions={<Seg id="rv" value={range as R} onChange={(k) => nav(`/c/review/${k}`)} items={[{ key: 'day', label: '日' }, { key: 'week', label: '近 7 天' }, { key: 'month', label: '近 30 天' }]} />} />
      <div className="note-box small">计算方法：<b>排期</b> = 日期是那天的行动（已删除不算）；<b>完成</b> = 其中已勾掉的。灰色虚线柱 = <b>未知</b>（那天数据解析失败或没有任何记录），不按 0 算，也不进总数。</div>
      {range !== 'day' && (
        <Section title={`完成 ${dn} / 排期 ${p}`} desc={`${md(from)} – ${md(t)} · ${known.length} 天可用，${st.length - known.length} 天未知 · 点柱子看那一天`}>
          <div onClick={(e) => { const i = [...(e.currentTarget.querySelectorAll('.bar-col'))].indexOf((e.target as HTMLElement).closest('.bar-col')!); if (i >= 0) { nav(`/c/review/day?d=${st[i].date}`); } }}>
            <Bars h={160} data={st.map((x) => ({ k: x.date, v: x.unknown ? undefined : x.done, v2: x.unknown ? undefined : x.planned, unknown: !!x.unknown, title: x.unknown ? `${md(x.date)} 未知：${x.unknown}` : `${md(x.date)} ${weekday(x.date)} 完成 ${x.done}/${x.planned}` }))} label={(k) => (n > 7 ? String(+k.slice(8)) : weekday(k).slice(1))} accent={(k) => k === t} />
          </div>
          {st.filter((x) => x.unknown).map((x) => <div key={x.date} className="small tone-warn-text">{md(x.date)} 未知：{x.unknown}</div>)}
          <KV rows={[['写了日记的天数', `${st.filter((x) => x.diary).length} / ${st.length}`], ['有排期的天数', `${known.filter((x) => x.planned).length}`]]} />
        </Section>
      )}
      {range === 'day' && <DayView st={st[0]} setDay={(x) => setSp({ d: x })} />}
      <Reflection k={key} />
    </div>
  );
}

function DayView({ st, setDay }: { st: DayStat; setDay: (d: string) => void }) {
  const done = useData((db) => db.actions.filter((a) => a.done && dateOf(a.done) === st.date && a.date !== st.date));
  return (
    <Section title={`${md(st.date)} ${weekday(st.date)}`} right={<div className="row" style={{ gap: 4 }}><button className="btn xs" onClick={() => setDay(addDays(st.date, -1))}>前一天</button><input className="input sm" type="date" value={st.date} onChange={(e) => e.target.value && setDay(e.target.value)} /><button className="btn xs" onClick={() => setDay(addDays(st.date, 1))}>后一天</button></div>}>
      {st.unknown && <div className="note-box warn small">这天的数据不可信：{st.unknown}</div>}
      <KV rows={[['排期', st.unknown ? '未知' : st.planned], ['完成', st.unknown ? '未知' : st.done], ['日记', st.diary ? '有' : '没有']]} />
      {st.acts.length ? st.acts.map((a) => <ActionRow key={a.id} a={a} />) : <Empty title="这天没有排期的行动" />}
      {done.length > 0 && <><div className="mini-head">这天顺手完成的其他事</div>{done.map((a) => <ActionRow key={a.id} a={a} showDate />)}</>}
    </Section>
  );
}

function Reflection({ k }: { k: string }) {
  const r = useData((db) => S.d.reflections.find((x) => x.key === k));
  const [v, setV] = useState(r?.text ?? '');
  const w = useWrite();
  return (
    <Section title="我的复盘" desc={`写给自己的几句话 · 保存到 系统/复盘/${k}.md（建议，待确认）`}>
      <textarea key={k} className="input" rows={4} value={v} onChange={(e) => setV(e.target.value)} placeholder="这段时间哪里顺、哪里卡？" />
      <button className="btn sm" disabled={w.busy || v === (r?.text ?? '')} onClick={() => w.run(() => saveReflection(k, v))}>保存</button>
      <WriteNote w={w} />
    </Section>
  );
}
