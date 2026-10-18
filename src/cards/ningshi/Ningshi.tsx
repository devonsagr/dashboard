import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, PlugZap, Square } from 'lucide-react';
import { store, useData } from '../../data';
import { full, md, relTime } from '../../data/time';
import { RefPath } from '../../ui/refs';
import { Empty, KV, Kpi, PageHeader, SampleMark, Section, Spark, Tag } from '../../ui/ui';
import { useWrite, WriteNote } from '../../ui/write';
import { S, ningshiCmd, ningshiReconnect } from './store';

/**
 * 专注计时（本机专注服务）。前端只显示服务报告的状态，不自己计时：
 *  - 服务离线：显示「离线 · 最后在线 xx」，场次数据是那一刻的快照，不再走动；
 *  - 发出命令后进入「等待服务确认」，确认前按钮不可重复点；失败 / 不确定走统一写入回执。
 */
const STATE = { running: ['进行中', 'ok'], paused: ['已暂停', 'warn'], stopped: ['已结束', 'faint'] } as const;
const mm = (s?: number) => (s == null ? '未知' : `${Math.floor(s / 60)} 分钟`);

function Status() {
  const n = useData((db) => S.d.ningshi);
  return n.online ? <Tag tone="ok">在线</Tag> : <Tag tone="bad" title={n.lastSeen ? full(n.lastSeen) : undefined}>离线 · 最后在线 {relTime(n.lastSeen)}</Tag>;
}

function Controls({ big }: { big?: boolean }) {
  const n = useData((db) => S.d.ningshi);
  const [goal, setGoal] = useState('');
  const w = useWrite();
  const s = n.session;
  const live = s && s.state !== 'stopped';
  const busy = w.busy || !!n.pending;
  const send = (c: '开始' | '暂停' | '继续' | '停止') => w.run(() => ningshiCmd(c, goal)).then((r) => { if (r.status === 'ok' && c === '开始') setGoal(''); });
  return (
    <div className="stack" style={{ gap: 6 }} data-nodrag>
      {!n.online && (
        <div className="note-box warn small">专注计时服务离线，下面是最后一次读到的快照。命令会尝试唤起服务，可能失败。
          <button className="btn xs" style={{ marginLeft: 6 }} disabled={busy} onClick={() => w.run(() => ningshiReconnect())}><PlugZap size={11} />重新连接</button>
        </div>
      )}
      {!live ? (
        <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); send('开始'); }}>
          <input className="input sm" style={{ flex: 1 }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="这一场要做什么" aria-label="专注目标" disabled={busy} />
          <button className={`btn ${big ? '' : 'sm'} btn-primary`} disabled={busy}><Play size={13} />开始</button>
        </form>
      ) : (
        <div className="row" style={{ gap: 6 }}>
          {s!.state === 'running' ? <button className="btn sm" disabled={busy} onClick={() => send('暂停')}><Pause size={13} />暂停</button> : <button className="btn sm btn-primary" disabled={busy} onClick={() => send('继续')}><Play size={13} />继续</button>}
          <button className="btn sm btn-ghost" disabled={busy} onClick={() => send('停止')}><Square size={12} />结束</button>
        </div>
      )}
      {n.pending && <div className="small muted row" style={{ gap: 6 }}><Spark spinning size={12} />已发出「{n.pending.cmd}」，等待专注计时服务确认…</div>}
      <WriteNote w={w} compact={!big} />
    </div>
  );
}

export function FocusCard() {
  const n = useData((db) => S.d.ningshi);
  const s = n.session;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row between"><Status /><SampleMark /></div>
      {s ? (
        <div className="focus-now">
          <div className="small muted ellipsis">{s.goal}</div>
          <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
            <b className="serif focus-num">{Math.floor(s.focusSec / 60)}</b><span className="muted small">分钟专注</span>
            <Tag tone={STATE[s.state][1]}>{STATE[s.state][0]}</Tag>
          </div>
          <div className="small faint">离开 {mm(s.awaySec)} · 监督 {s.supervise} · 数据截至 {relTime(s.tick)}</div>
        </div>
      ) : <Empty title="还没有场次" />}
      <Controls />
    </div>
  );
}

export default function NingshiPage() {
  const n = useData((db) => S.d.ningshi);
  const s = n.session;
  return (
    <div className="page">
      <PageHeader title="专注计时" sub={<>本机专注服务的状态与控制。计时、走神判断都在服务里，前端只显示它报告的结果。<SampleMark /></>} actions={<Status />} />
      <div className="grid2">
        <Section title="当前场次" desc={s ? `开始于 ${full(s.startedAt)}` : undefined}>
          {s ? (
            <div className="kpis">
              <Kpi value={Math.floor(s.focusSec / 60)} unit="分" label="专注" />
              <Kpi value={Math.floor(s.awaySec / 60)} unit="分" label="离开" />
              <Kpi value={STATE[s.state][0]} label="状态" />
              <Kpi value={s.supervise} label="监督" />
            </div>
          ) : <Empty title="没有进行中的场次" />}
          {s && <KV rows={[['目标', s.goal], ['前台窗口', s.window ?? '未知'], ['数据截至', full(s.tick)], ['今日累计', n.todayFocusSec == null ? <span className="muted">未知（服务离线，今天还没有读到）</span> : mm(n.todayFocusSec)]]} />}
          <div style={{ padding: '6px 8px 10px' }}><Controls big /></div>
        </Section>
        <Section title="数据从哪来">
          <KV rows={[['服务', '本机 loopback API + SQLite（C05）'], ['状态投影', <RefPath path={n.projectionPath} />], ['最后在线', n.lastSeen ? full(n.lastSeen) : '未知'], ['离线时', '显示最后快照，不推算、不归零']]} />
          <div className="note-box small" style={{ margin: '4px 8px 10px' }}>命令（开始 / 暂停 / 继续 / 结束）发给本机服务，服务确认后才更新界面。服务没回应 = 「不确定」，可以重新读取或再发一次。</div>
        </Section>
      </div>
      <Section title="最近场次" count={n.history.length}>
        {n.history.length ? (
          <table className="table">
            <thead><tr><th>日期</th><th>目标</th><th>专注</th><th>走神纠错</th></tr></thead>
            <tbody>{n.history.map((h) => <tr key={h.id}><td className="mono">{md(h.date)}</td><td>{h.goal}</td><td className="mono">{h.focusMin} 分钟</td><td className="mono">{h.distractions} 次</td></tr>)}</tbody>
          </table>
        ) : <Empty title="还没有历史场次" />}
      </Section>
      <div className="small faint" style={{ marginTop: 8 }}>需要更完整的统计？<Link className="link" to="/c/review/week">看复盘</Link></div>
    </div>
  );
}
