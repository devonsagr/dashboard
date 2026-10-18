/**
 * 流程设置的编辑器（共享）：设置页用全套；主体上下文卡、群消息卡各用自己那一块。
 * 编辑的是草稿，点「保存」才写（有回执；失败时草稿保留）。
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import {
  ANY, PLATFORMS, TOPICS, TYPES, SUBJECT_DIR_HINT, newRuleId, resolveRoute, saveSettings, useSettings,
  type GroupMode, type Importance, type MsgGroup, type RouteRule, type Settings, type SubjectDoc,
} from '../data/settings';
import { getCutoff } from '../data/time';
import { Tag } from './ui';
import { useWrite, WriteNote } from './write';

function useDraft<T>(sel: (s: Settings) => T) {
  const cur = useSettings(sel);
  const [d, setD] = useState<T>(() => structuredClone(cur));
  const sCur = JSON.stringify(cur);
  useEffect(() => { setD(structuredClone(cur)); }, [sCur]); // eslint-disable-line react-hooks/exhaustive-deps
  return { d, setD, dirty: JSON.stringify(d) !== sCur, reset: () => setD(structuredClone(cur)) };
}
function SaveBar({ dirty, onSave, onReset, w }: { dirty: boolean; onSave: () => void; onReset: () => void; w: ReturnType<typeof useWrite> }) {
  return <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
    <button className="btn sm btn-primary" disabled={!dirty || w.busy} onClick={onSave}>保存</button>
    {dirty && <button className="btn sm btn-ghost" onClick={onReset}><RotateCcw size={12} />放弃修改</button>}
    {dirty && <span className="small faint">有未保存的修改</span>}
    <WriteNote w={w} compact />
  </div>;
}

/** 时间口径 + 流程去向 */
export function FlowSettings() {
  const { d, setD, dirty, reset } = useDraft((s) => ({ cutoff: s.cutoff, flow: s.flow }));
  const w = useWrite();
  const F: [keyof Settings['flow'], string, string][] = [
    ['pre', 'AI 初处理结果', '交给 AI 后，按备注整理出的东西写到哪'],
    ['self', '我自己处理', '选 B 后：原文 + AI 要点放到哪，我在那里划掉'],
    ['later', '以后读', '悬置的东西列在哪（一个清单文件）'],
    ['daily', '日报', '每天定稿的日报写到哪'],
  ];
  return <div className="stack" style={{ gap: 8 }}>
    <div className="set-row"><div><div>一天从几点开始</div><div className="small muted">在这之前的内容算前一天（现在：{getCutoff()}）。日报、今日关注、日记都按这个口径。</div></div>
      <input className="input sm" type="time" style={{ width: 110 }} value={d.cutoff} onChange={(e) => setD({ ...d, cutoff: e.target.value })} aria-label="日切换时刻" /></div>
    {F.map(([k, l, desc]) => <div key={k} className="set-row"><div><div>{l}</div><div className="small muted">{desc}</div></div>
      <input className="input sm mono" style={{ width: 340 }} value={d.flow[k]} onChange={(e) => setD({ ...d, flow: { ...d.flow, [k]: e.target.value } })} aria-label={l} /></div>)}
    <div className="small faint">可用变量：{'{日期} {标题} {平台} {类型} {主题}'}</div>
    <SaveBar dirty={dirty} w={w} onReset={reset} onSave={() => w.run(() => saveSettings('保存流程去向与日切换', (s) => { s.cutoff = d.cutoff; s.flow = d.flow; }))} />
  </div>;
}

/** 知识库落点规则：平台 × 类型 × 主题 → 路径 */
export function RouteRules() {
  const { d, setD, dirty, reset } = useDraft((s) => s.routes);
  const w = useWrite();
  const [t, setT] = useState({ platform: 'B站', type: '视频', topic: 'AI 工具', title: '示例标题' });
  const hit = resolveRoute(t, d);
  const up = (i: number, p: Partial<RouteRule>) => setD(d.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const sel = (v: string, opts: string[], on: (v: string) => void, label: string) => <select className="input sm" value={v} onChange={(e) => on(e.target.value)} aria-label={label}><option value={ANY}>任意</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
  return <div className="stack" style={{ gap: 8 }}>
    <div className="small muted">「直接入库」按这里决定写到哪。越具体的规则越优先（每匹配一项加一分，「任意」不加分；同分取靠上的）。</div>
    <table className="rule-table">
      <thead><tr><th style={{ width: 110 }}>平台</th><th style={{ width: 90 }}>类型</th><th style={{ width: 100 }}>主题</th><th>路径</th><th style={{ width: 30 }} /></tr></thead>
      <tbody>{d.map((r, i) => <tr key={r.id} className={hit.rule?.id === r.id ? 'hit' : ''}>
        <td>{sel(r.platform, PLATFORMS, (v) => up(i, { platform: v }), '平台')}</td>
        <td>{sel(r.type, TYPES, (v) => up(i, { type: v }), '类型')}</td>
        <td>{sel(r.topic, TOPICS, (v) => up(i, { topic: v }), '主题')}</td>
        <td><input className="input sm mono" value={r.path} onChange={(e) => up(i, { path: e.target.value })} aria-label="路径" /></td>
        <td><button className="btn xs btn-ghost" title="删除这条规则" onClick={() => setD(d.filter((_, j) => j !== i))}><Trash2 size={12} /></button></td>
      </tr>)}</tbody>
    </table>
    <div><button className="btn xs" onClick={() => setD([...d, { id: newRuleId(), platform: ANY, type: ANY, topic: ANY, path: '知识库/{平台}/{标题}.md' }])}><Plus size={12} />加一条规则</button></div>
    <div className="panel stack" style={{ gap: 6 }}>
      <div className="small"><b>试一下</b>（用上面还没保存的规则算）</div>
      <div className="row wrap" style={{ gap: 6 }}>
        <select className="input sm" style={{ width: 110 }} value={t.platform} onChange={(e) => setT({ ...t, platform: e.target.value })} aria-label="试算平台">{PLATFORMS.map((o) => <option key={o}>{o}</option>)}</select>
        <select className="input sm" style={{ width: 90 }} value={t.type} onChange={(e) => setT({ ...t, type: e.target.value })} aria-label="试算类型">{TYPES.map((o) => <option key={o}>{o}</option>)}</select>
        <select className="input sm" style={{ width: 100 }} value={t.topic} onChange={(e) => setT({ ...t, topic: e.target.value })} aria-label="试算主题">{TOPICS.map((o) => <option key={o}>{o}</option>)}</select>
        <input className="input sm" style={{ width: 140 }} value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} aria-label="试算标题" />
      </div>
      <div className="small">→ <b className="mono">{hit.path}</b> {hit.rule ? <span className="muted">（命中高亮的那条）</span> : <Tag tone="warn">没有规则命中</Tag>}</div>
    </div>
    <SaveBar dirty={dirty} w={w} onReset={reset} onSave={() => w.run(() => saveSettings('保存知识库落点规则', (s) => { s.routes = d; }))} />
  </div>;
}

/** 主体文档路径：8 份文档在哪 */
export function SubjectPaths({ compact }: { compact?: boolean }) {
  const { d, setD, dirty, reset } = useDraft((s) => s.subject);
  const w = useWrite();
  const up = (i: number, p: Partial<SubjectDoc>) => setD(d.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const unset = d.filter((x) => !x.path.trim()).length;
  return <div className="stack" style={{ gap: 4 }}>
    <div className="small muted">现在不知道这些文档在哪，所以都空着。填上后 AI 继续做事时会先读它们。{unset ? <Tag tone="warn">{unset} 份未设置</Tag> : <Tag tone="ok">都已设置</Tag>}</div>
    {d.map((x, i) => <div key={x.key} className="doc-row">
      <div><b>{x.name}</b>{!compact && <div className="small faint">{x.duty}</div>}</div>
      <div className="path-in"><input className="input sm mono" style={{ flex: 1 }} value={x.path} placeholder={`例：${SUBJECT_DIR_HINT}${x.name}.md（建议，待确认）`} onChange={(e) => up(i, { path: e.target.value })} aria-label={`${x.name} 路径`} /></div>
    </div>)}
    <div className="row wrap" style={{ gap: 6 }}><button className="btn xs btn-ghost" onClick={() => setD(d.map((x) => (x.path ? x : { ...x, path: `${SUBJECT_DIR_HINT}${x.name}.md` })))}>空着的填入建议路径</button><span className="small faint">建议目录来自接入源 V04（个人 AI 主体），未核验</span></div>
    <SaveBar dirty={dirty} w={w} onReset={reset} onSave={() => w.run(() => saveSettings('保存主体文档路径', (s) => { s.subject = d; }))} />
  </div>;
}

/** 消息分组：重要程度 + 模式 */
export const IMP: Importance[] = ['重要', '一般', '无所谓'];
export const MODES: [GroupMode, string][] = [['关注', '今天必须知道的推给我'], ['钻研', '分析出我知识以外的话题'], ['只存档', '收着，不打扰']];
export function GroupSettings() {
  const { d, setD, dirty, reset } = useDraft((s) => s.groups);
  const w = useWrite();
  const up = (i: number, p: Partial<MsgGroup>) => setD(d.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return <div className="stack" style={{ gap: 4 }}>
    <table className="rule-table">
      <thead><tr><th style={{ width: 52 }}>平台</th><th>群</th><th style={{ width: 96 }}>重要程度</th><th style={{ width: 96 }}>模式</th><th style={{ width: 70 }}>白名单</th></tr></thead>
      <tbody>{d.map((g, i) => <tr key={g.id}>
        <td><Tag>{g.platform}</Tag></td><td>{g.name}</td>
        <td><select className="input sm" value={g.importance} onChange={(e) => up(i, { importance: e.target.value as Importance })} aria-label={`${g.name} 重要程度`}>{IMP.map((x) => <option key={x}>{x}</option>)}</select></td>
        <td><select className="input sm" value={g.mode} onChange={(e) => up(i, { mode: e.target.value as GroupMode })} aria-label={`${g.name} 模式`}>{MODES.map(([x]) => <option key={x}>{x}</option>)}</select></td>
        <td><input type="checkbox" checked={g.whitelisted} onChange={(e) => up(i, { whitelisted: e.target.checked })} aria-label={`${g.name} 白名单`} /></td>
      </tr>)}</tbody>
    </table>
    <div className="small faint">{MODES.map(([k, v]) => `${k}：${v}`).join('；')}。不在白名单的群不读取。</div>
    <SaveBar dirty={dirty} w={w} onReset={reset} onSave={() => w.run(() => saveSettings('保存消息分组', (s) => { s.groups = d; }))} />
  </div>;
}
