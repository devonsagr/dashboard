import { useState } from 'react';
import { Download, RefreshCw, Clock, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData, type Material } from '../../data';
import { dayKey, full, relTime, whyToday, workday } from '../../data/time';
import { useSettings, type MsgGroup } from '../../data/settings';
import { GroupSettings } from '../../ui/settings';
import { MaterialRow } from '../../ui/objects';
import { AiTag, Empty, PageHeader, SampleMark, Section, Tabs, Tag } from '../../ui/ui';
import { RefPath } from '../../ui/refs';
import { useWrite, WriteNote } from '../../ui/write';
import { useOverlay } from '../../workbench/app/overlay';
import { S, collectQQ, markSeen } from './store';

const IMP_RANK = { 重要: 0, 一般: 1, 无所谓: 2 } as const;
/** 今日关注：「关注」模式的群里，按日切换算属于今天（或今天才取得的昨天消息）的 */
function useFocus() {
  const groups = useSettings((s) => s.groups);
  const mats = useData((db) => db.materials.filter((m) => m.kind === 'qq' && !m.archived));
  const W = workday();
  const g = (m: Material) => groups.find((x) => x.id === m.group);
  const today = mats.filter((m) => dayKey(m.receivedAt) === W || dayKey(m.contentAt) === W);
  const focus = today.filter((m) => g(m)?.mode === '关注').sort((a, b) => IMP_RANK[g(a)!.importance] - IMP_RANK[g(b)!.importance] || (b.contentAt ?? '').localeCompare(a.contentAt ?? ''));
  const quiet = groups.filter((x) => x.mode !== '关注').map((x) => ({ g: x, n: today.filter((m) => m.group === x.id).length })).filter((x) => x.n);
  return { focus, quiet, g };
}
function FocusList({ compact }: { compact?: boolean }) {
  const { focus, quiet, g } = useFocus();
  const { open } = useOverlay();
  return <div className="stack" style={{ gap: 2 }}>
    {focus.length ? focus.map((m) => <button key={m.id} className="focus-row" data-nodrag style={{ textAlign: 'left' }} onClick={(e) => open({ kind: 'material', id: m.id }, e.currentTarget)}>
      <Tag tone={g(m)?.importance === '重要' ? 'accent' : 'neutral'}>{g(m)?.name}</Tag><span className="ellipsis" style={{ flex: 1 }}>{m.title}</span>{!compact && <span className="why">{whyToday(m.contentAt, m.receivedAt)}</span>}
    </button>) : <Empty title="今天关注的群没有新消息" />}
    {quiet.length > 0 && <div className="small faint" style={{ paddingTop: 4 }}>没推给你：{quiet.map((x) => `${x.g.name} ${x.n} 条（${x.g.mode}）`).join('、')}</div>}
  </div>;
}
function StudyList({ compact }: { compact?: boolean }) {
  const study = S.use((d) => d.study); const seen = S.use((d) => d.seen);
  const groups = useSettings((s) => s.groups);
  const { open } = useOverlay(); const w = useWrite();
  const list = study.filter((t) => groups.find((x) => x.id === t.groupId)?.mode === '钻研');
  if (!list.length) return <Empty title="没有「钻研」模式的群" hint="在设置 › 消息分组里把群设成钻研" />;
  return <div className="stack" style={{ gap: 2 }}>
    {list.map((t) => <div key={t.id} className="queue-item" data-nodrag>
      <div className="row" style={{ gap: 6 }}><b className="ellipsis">{t.topic}</b><Tag tone={t.known === '没有' ? 'accent' : 'warn'}>知识库{t.known}</Tag>{seen.includes(t.id) && <Tag tone="faint">看过</Tag>}</div>
      {!compact && <><div className="small">{t.gist} <AiTag /></div><div className="small muted">为什么挑出来：{t.why} · 来自 {groups.find((x) => x.id === t.groupId)?.name}</div>
        <div className="row wrap" style={{ gap: 6 }}>
          {t.materialIds.map((id) => <button key={id} className="btn xs" onClick={(e) => open({ kind: 'material', id }, e.currentTarget)}>看原消息</button>)}
          <button className="btn xs" onClick={() => w.run(() => store.setLater(t.materialIds[0], true))}><Clock size={11} />以后读</button>
          {!seen.includes(t.id) && <button className="btn xs btn-ghost" onClick={() => w.run(() => markSeen(t.id))}><Check size={11} />看过了</button>}
        </div></>}
    </div>)}
    <WriteNote w={w} compact />
    <div className="small faint">（样例）真实由 AI 对照你的知识库判断「知识以外」</div>
  </div>;
}

/** 收集：QQ 白名单群点一下才读；微信采集方式待定 */
function GroupPicker({ compact }: { compact?: boolean }) {
  const gs = useData(() => S.d.qqGroups);
  const conf = useSettings((s) => s.groups);
  const [sel, setSel] = useState<string[]>(gs.filter((g) => g.whitelisted).map((g) => g.id));
  const w = useWrite();
  const c = (id: string): MsgGroup | undefined => conf.find((x) => x.id === id);
  return (
    <div className="stack" style={{ gap: 4 }}>
      {gs.map((g) => (
        <label key={g.id} className={`qq-group ${g.whitelisted ? '' : 'off'}`} data-nodrag>
          <input type="checkbox" disabled={!g.whitelisted} checked={sel.includes(g.id)} onChange={(e) => setSel(e.target.checked ? [...sel, g.id] : sel.filter((x) => x !== g.id))} />
          <span className="ellipsis">{g.name}</span>
          {c(g.id) && <span className="small faint">{c(g.id)!.importance} · {c(g.id)!.mode}</span>}
          {!compact && <span className="small muted ellipsis">{g.coverage}</span>}
          <span className="mono faint small" style={{ marginLeft: 'auto' }}>{g.whitelisted ? (g.lastCollected ? relTime(g.lastCollected) : '从未') : '不在白名单'}</span>
        </label>
      ))}
      {conf.filter((x) => x.platform === '微信').map((x) => <div key={x.id} className="qq-group off"><Tag>微信</Tag><span className="ellipsis">{x.name}</span><span className="small faint" style={{ marginLeft: 'auto' }}>采集方式待定 · 现为样例导出</span></div>)}
      <div className="row" style={{ gap: 6 }} data-nodrag>
        <button className="btn sm btn-primary" disabled={!sel.length || w.busy} onClick={() => w.run(() => collectQQ(sel, '开始收集'))}><Download size={13} />收集所选 QQ 群</button>
        <button className="btn sm btn-ghost" disabled={!sel.length || w.busy} onClick={() => w.run(() => collectQQ(sel, '读取存档'))}><RefreshCw size={13} />只读存档</button>
      </div>
      <WriteNote w={w} compact={compact} />
    </div>
  );
}
export function QQCard({ inst, view: v }: CardProps) {
  return v === 'study' ? <StudyList compact={inst.w < 5} /> : v === 'collect' ? <GroupPicker compact /> : <FocusList compact={inst.w < 5} />;
}

type T = 'focus' | 'study' | 'all' | 'collect';
export default function QQPage() {
  const runs = useData(() => S.d.qqRuns);
  const gs = useData(() => S.d.qqGroups);
  const mats = useData((db) => db.materials.filter((m) => m.kind === 'qq'));
  const [t, setT] = useState<T>('focus');
  return (
    <div className="page">
      <PageHeader title="群消息" sub={<>QQ 与微信的群，按群分重要程度。两种用法：<b>关注</b>（今天必须知道的，例如示例活动群）和<b>钻研</b>（从讨论里挑出我知识以外的话题）；其余只存档。一天从 {useSettings((s) => s.cutoff)} 算起。<SampleMark /></>} />
      <Tabs id="qq" value={t} onChange={setT} items={[{ key: 'focus', label: '今日关注' }, { key: 'study', label: '钻研' }, { key: 'all', label: '全部消息', count: mats.length }, { key: 'collect', label: '收集与分组' }]} />
      {t === 'focus' && <Section title="今日关注" desc={`关注模式的群里属于今天（${workday()}）的消息；「昨天的消息今天取得」会标出来`}><FocusList /></Section>}
      {t === 'study' && <Section title="钻研" desc="钻研模式的群：挑出知识库里还没有的话题。看原消息、放以后读，或在材料里写备注交给 AI"><StudyList /></Section>}
      {t === 'all' && <Section title="收集到的消息" count={mats.length} desc="每条消息都是一份材料，走统一流程（备注 → AI → 入库 / 自己处理）">{mats.length ? mats.map((m) => <MaterialRow key={m.id} m={m} />) : <Empty title="还没有" />}</Section>}
      {t === 'collect' && <div className="detail-grid">
        <div className="stack">
          <Section title="分组" desc="改完点保存；和设置页是同一份"><GroupSettings /></Section>
          <Section title="运行记录" count={runs.length}>
            {runs.map((r) => (
              <div key={r.id} className="qq-run">
                <div className="row" style={{ gap: 6 }}><b className="mono small">{r.id}</b><span className="small">{r.mode}</span><span className="mono faint small" style={{ marginLeft: 'auto' }}>{full(r.at)}</span></div>
                {r.groups.map((g) => <div key={g.groupId} className="row small" style={{ gap: 6 }}><Tag tone={g.status === 'ok' ? 'ok' : g.status === 'failed' ? 'bad' : 'ai'}>{g.status === 'ok' ? '成功' : g.status === 'failed' ? '失败' : '进行中'}</Tag>{gs.find((x) => x.id === g.groupId)?.name}{g.count !== undefined && <span className="muted">{g.count} 条</span>}{g.error && <span className="tone-bad-text">{g.error}</span>}{g.batchPath && <RefPath path={g.batchPath} />}</div>)}
              </div>
            ))}
          </Section>
        </div>
        <Section title="收集" desc={<>QQ：本机临时启动只读 NapCat，读完就关；不监听、不采私聊、不发消息。<Link className="link" to="/settings#groups">设置</Link></>}><GroupPicker /></Section>
      </div>}
    </div>
  );
}
