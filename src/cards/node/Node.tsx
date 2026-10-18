import { Pause, Play, RefreshCw, Square } from 'lucide-react';
import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { full, relTime } from '../../data/time';
import { Empty, Kpi, Line, PageHeader, SampleMark, Section, Seg, Tag } from '../../ui/ui';
import { useWrite, WriteNote } from '../../ui/write';
import { S, nodeCmd, setAutoRoute, setNodeRange, switchNode } from './store';

/**
 * 节点监控（本机监控脚本）。规则：
 *  - 曲线里的空洞 = 那一轮没采到（超时 / 脚本没跑），不连线、不补 0；
 *  - 自动路由默认关闭，只能由你明确打开；切换节点是你发起的命令，会写进事件；
 *  - 「正在采样 3/5」和「最后完成一轮」分开显示，不把进行中的结果当成完成。
 */
type N = ReturnType<typeof useNode>['nodes'][number];
const useNode = () => useData((db) => S.d.node);
const stats = (l: (number | null)[]) => {
  const v = l.filter((x): x is number => x != null).sort((a, b) => a - b);
  if (!v.length) return undefined;
  return { p50: v[Math.floor(v.length / 2)], p95: v[Math.min(v.length - 1, Math.floor(v.length * 0.95))], max: v[v.length - 1], miss: l.length - v.length, n: l.length };
};
const SAMPLING = { running: ['采样中', 'ok'], paused: ['已暂停', 'warn'], stopped: ['已停止', 'faint'], unknown: ['未知', 'faint'] } as const;

function NodeRow({ n, current, big }: { n: N; current?: string; big?: boolean }) {
  const s = stats(n.latency);
  const w = useWrite();
  return (
    <div className={`node-row ${n.name === current ? 'on' : ''}`}>
      <div className="node-name"><b>{n.name}</b>{n.name === current && <Tag tone="accent">当前</Tag>}</div>
      <div className="node-line"><Line data={n.latency} h={big ? 44 : 26} w={big ? 420 : 160} /></div>
      <span className="mono small">{n.last != null ? `${n.last} ms` : <span className="tone-bad-text">超时</span>}</span>
      {big && <span className="mono small muted">{s ? `中位 ${s.p50} · P95 ${s.p95}` : '无数据'}</span>}
      {big && <span className="mono small muted">{s?.miss ? `${s.miss} 个空点` : '—'} · 超时 {n.timeouts}</span>}
      {big && n.name !== current && <button className="btn xs" data-nodrag disabled={w.busy} onClick={() => w.run(() => switchNode(n.name))}>切换到这里</button>}
      {big && <WriteNote w={w} compact />}
    </div>
  );
}

export function NodeCard({ inst }: CardProps) {
  const n = useNode();
  const rows = [...n.nodes].sort((a, b) => Number(b.name === n.current) - Number(a.name === n.current)).slice(0, Math.max(2, inst.h - 2));
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="row between small"><span><Tag tone={SAMPLING[n.sampling][1]}>{SAMPLING[n.sampling][0]}</Tag>{n.inProgress && <span className="muted"> 本轮 {n.inProgress.done}/{n.inProgress.total}</span>}</span><span className="faint">完成于 {relTime(n.lastComplete)}</span></div>
      {rows.map((x) => <NodeRow key={x.name} n={x} current={n.current} />)}
      <div className="small faint">自动路由 {n.autoRoute ? '开' : '关'} · 空洞 = 没采到 <SampleMark /></div>
    </div>
  );
}

export default function NodePage() {
  const n = useNode();
  const w = useWrite();
  const cur = n.nodes.find((x) => x.name === n.current);
  const s = cur && stats(cur.latency);
  const cmd = (c: '开始' | '暂停' | '继续' | '停止' | '立即采样') => w.run(() => nodeCmd(c));
  return (
    <div className="page wide node-page">
      <PageHeader title="节点监控" sub={<>本机监控脚本测到的节点延迟。曲线空洞 = 那一轮没采到，不补 0。<SampleMark /></>}
        actions={<>{n.online ? <Tag tone="ok">脚本在线</Tag> : <Tag tone="bad">脚本离线</Tag>}<Tag tone={SAMPLING[n.sampling][1]}>{SAMPLING[n.sampling][0]}</Tag></>} />
      <Section title={`当前：${n.current ?? '未知'}`} desc={<>最后完成一轮 {full(n.lastComplete)}{n.inProgress && <> · 正在采样 {n.inProgress.done}/{n.inProgress.total}（开始于 {relTime(n.inProgress.started)}，结果未完成不计入）</>}</>}
        right={<div className="row" style={{ gap: 6 }} data-nodrag>
          {n.sampling === 'running' ? <button className="btn sm" disabled={w.busy} onClick={() => cmd('暂停')}><Pause size={13} />暂停采样</button> : <button className="btn sm" disabled={w.busy} onClick={() => cmd(n.sampling === 'paused' ? '继续' : '开始')}><Play size={13} />{n.sampling === 'paused' ? '继续' : '开始'}采样</button>}
          <button className="btn sm btn-ghost" disabled={w.busy} onClick={() => cmd('立即采样')}><RefreshCw size={13} />立即采样</button>
          {n.sampling !== 'stopped' && <button className="btn sm btn-ghost" disabled={w.busy} onClick={() => cmd('停止')}><Square size={12} />停止</button>}
        </div>}>
        <WriteNote w={w} />
        {s ? <div className="kpis"><Kpi value={s.p50} unit="ms" label="中位" /><Kpi value={s.p95} unit="ms" label="P95" /><Kpi value={s.max} unit="ms" label="峰值" /><Kpi value={`${s.n - s.miss}/${s.n}`} label="采到的轮次" hint={s.miss ? `${s.miss} 轮没采到` : undefined} /></div> : <Empty title="当前节点没有数据" />}
      </Section>
      <Section title="所有节点" count={n.nodes.length} right={<Seg id="nrange" value={n.range} onChange={(r) => setNodeRange(r)} items={[{ key: '1天', label: '1 天' }, { key: '3天', label: '3 天' }, { key: '7天', label: '7 天' }]} />}
        desc={n.range === '1天' ? '每 30 分钟一轮，共 48 轮' : `样例只有近 24 小时的点；${n.range}曲线由监控脚本按范围返回（后端接入后生效）`}>
        <div className="stack" style={{ gap: 2 }}>{n.nodes.map((x) => <NodeRow key={x.name} n={x} current={n.current} big />)}</div>
      </Section>
      <div className="grid2">
        <Section title="自动路由" desc="默认关闭。开启后，脚本会在当前节点连续超时时自动切换。">
          <AutoRoute />
        </Section>
        <Section title="事件" count={n.events.length}>
          <div className="stack" style={{ gap: 0 }}>
            {n.events.map((e, i) => <div key={i} className="item-row"><Tag tone={e.kind === '失败' ? 'bad' : e.kind === '切换' ? 'accent' : 'neutral'}>{e.kind}</Tag><div className="item-main">{e.text}</div><span className="mono small faint">{full(e.at)}</span></div>)}
          </div>
        </Section>
      </div>
    </div>
  );
}

function AutoRoute() {
  const on = useData((db) => S.d.node.autoRoute);
  const w = useWrite();
  return (
    <div style={{ padding: '4px 8px 10px' }} className="stack">
      <label className="set-row">
        <div><div>自动路由</div><div className="small muted">{on ? '已开启（由你明确开启）' : '关闭：只记录，不自动切换'}</div></div>
        <button className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label="自动路由" disabled={w.busy} onClick={() => { if (on || confirm('开启后，监控脚本会自动切换出口节点。确定开启？')) w.run(() => setAutoRoute(!on)); }}><i /></button>
      </label>
      <WriteNote w={w} />
    </div>
  );
}
