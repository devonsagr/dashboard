import { useData } from '../../data';
import { full, md, relTime, today, weekday } from '../../data/time';
import { RefLine } from '../../ui/refs';
import { Bars, Empty, Kpi, Line, PageHeader, SampleMark, Section, SourceChip, Tag } from '../../ui/ui';
import { S, type HealthDay } from './store';

/**
 * 健康：示例手环 → Health Sync → CSV（H02–H05），饮食来自日常健康记录（H07）。
 * 规则：没同步到的天显示「未知」（灰虚线柱），不按 0 画；饮食热量是 AI 估计，必须标出；外卖订单 ≠ 吃了。
 */
const sleep = (m?: number) => (m == null ? undefined : Math.round((m / 60) * 10) / 10);
const val = (v?: number | string, u = '') => (v == null ? '未知' : `${v}${u}`);

export function HealthCard() {
  const h = useData((db) => S.d.health);
  const d = h[h.length - 1], y = h[h.length - 2];
  const shown = d.steps == null && y ? y : d;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between small"><span className="muted">{shown === d ? '今天' : `今天还没同步 · 显示${md(y.date)}`}</span><SampleMark /></div>
      <div className="mini-kpis">
        <div><b className="serif">{shown.steps?.toLocaleString() ?? '—'}</b><span className="small muted">步</span></div>
        <div><b className="serif">{sleep(shown.sleepMin) ?? '—'}</b><span className="small muted">h 睡眠</span></div>
        <div><b className="serif">{shown.restingHr ?? '—'}</b><span className="small muted">静息心率</span></div>
      </div>
      <Bars h={46} data={h.map((x) => ({ k: x.date, v: x.steps, unknown: x.steps == null, title: x.steps == null ? `${md(x.date)} 未同步` : `${md(x.date)} ${x.steps} 步` }))} label={(k) => weekday(k).slice(1)} accent={(k) => k === today()} />
      <div className="small faint">同步于 {relTime([...h].reverse().find((x) => x.syncedAt)?.syncedAt)}</div>
    </div>
  );
}

export default function HealthPage() {
  const h = useData((db) => S.d.health);
  const d = h[h.length - 1];
  const bars = (f: (x: HealthDay) => number | undefined, unit: string) => h.map((x) => ({ k: x.date, v: f(x), unknown: f(x) == null, title: f(x) == null ? `${md(x.date)} 未知（没同步到）` : `${md(x.date)} ${f(x)}${unit}` }));
  const wd = (k: string) => weekday(k).slice(1);
  return (
    <div className="page">
      <PageHeader title="健康" sub={<>设备数据经 Health Sync 同步（每天早上同步前一天），可能缺天；缺的就显示「未知」，不补、不按 0 算。<SampleMark /></>} actions={<span className="row" style={{ gap: 6 }}><SourceChip id="H02" /><SourceChip id="H07" /></span>} />
      {d.gaps.map((g) => <div key={g} className="note-box warn small">{g}</div>)}
      <Section title="今天">
        <div className="kpis"><Kpi value={val(d.steps?.toLocaleString())} label="步数" /><Kpi value={val(sleep(d.sleepMin), ' h')} label="睡眠" /><Kpi value={val(d.restingHr, ' bpm')} label="静息心率" /><Kpi value={val(d.spo2, '%')} label="血氧" /></div>
      </Section>
      <div className="grid2">
        <Section title="步数" desc="灰虚线 = 那天没同步到"><div style={{ padding: '6px 8px' }}><Bars data={bars((x) => x.steps, ' 步')} h={130} label={wd} accent={(k) => k === today()} /></div></Section>
        <Section title="睡眠" desc="小时"><div style={{ padding: '6px 8px' }}><Bars data={bars((x) => sleep(x.sleepMin), ' h')} h={130} label={wd} accent={(k) => k === today()} /></div></Section>
        <Section title="静息心率" desc="空点 = 未知"><div style={{ padding: '10px 8px' }}><Line data={h.map((x) => x.restingHr ?? null)} h={80} /></div></Section>
        <Section title="血氧" desc="空点 = 未知"><div style={{ padding: '10px 8px' }}><Line data={h.map((x) => x.spo2 ?? null)} h={80} /></div></Section>
      </div>
      <Section title="同步情况" desc="设备记录时间和同步到 Drive 的时间是两回事">
        <table className="table">
          <thead><tr><th>日期</th><th>设备记录</th><th>同步</th><th>缺口</th></tr></thead>
          <tbody>{h.slice().reverse().map((x) => <tr key={x.date}><td className="mono">{md(x.date)} {weekday(x.date)}</td><td className="mono small">{x.deviceAt ? full(x.deviceAt) : <span className="muted">未知</span>}</td><td className="mono small">{x.syncedAt ? full(x.syncedAt) : <Tag tone="warn">未同步</Tag>}</td><td className="small muted">{x.gaps.join('；') || '—'}</td></tr>)}</tbody>
        </table>
      </Section>
      <Section title="饮食" desc="热量是 AI 根据照片 / 描述估计的；外卖订单只说明下过单">
        {h.some((x) => x.meals.length || x.orders.length) ? (
          <div className="stack" style={{ gap: 0 }}>
            {h.slice().reverse().filter((x) => x.meals.length || x.orders.length).map((x) => (
              <div key={x.date} className="meal-day">
                <div className="mini-head">{md(x.date)} {weekday(x.date)}</div>
                {x.meals.map((m, i) => <div key={i} className="item-row"><div className="item-main"><div>{m.label}</div><RefLine r={m.ref} time={false} /></div><span className="mono small">{m.kcal != null ? `约 ${m.kcal} kcal` : '热量未知'}</span>{m.estimate && <Tag tone="ai">AI 估计</Tag>}</div>)}
                {x.orders.map((o, i) => <div key={'o' + i} className="item-row"><div className="item-main"><div>{o.label}</div><div className="small faint">外卖订单 · {full(o.at)}</div></div><Tag tone="faint">订单 ≠ 已吃</Tag></div>)}
              </div>
            ))}
          </div>
        ) : <Empty title="这 7 天没有饮食记录" />}
        <div className="small faint" style={{ padding: '4px 8px 10px' }}>没有记录的天 = 没记，不代表没吃。</div>
      </Section>
    </div>
  );
}
