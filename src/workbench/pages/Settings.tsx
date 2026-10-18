import { motion } from 'motion/react';
import { setPrefs, usePrefs, PALETTES, ACCENTS, PREFS_KEY, type Prefs } from '../app/prefs';
import { PageHeader, Section, Tag } from '../../ui/ui';
import { RefPath } from '../../ui/refs';
import { boardStore } from '../board/store';
import { resetCardContent, resetCardStores } from '../../data/cardStore';
import { store, useData, useSim } from '../../data';
import { full } from '../../data/time';
import { useOverlay } from '../app/overlay';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FlowSettings, GroupSettings, RouteRules, SubjectPaths } from '../../ui/settings';
import { resetSettings } from '../../data/settings';

function Seg<K extends string>({ id, value, items, onChange }: { id: string; value: K; items: [K, string][]; onChange: (k: K) => void }) {
  return <div className="seg">{items.map(([k, l]) => <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{value === k && <motion.i layoutId={`set-${id}`} className="seg-bg" />}<span>{l}</span></button>)}</div>;
}
const ST_TONE = { ok: 'ok', failed: 'bad', unknown: 'warn', conflict: 'warn' } as const;
const ST_LABEL = { ok: '成功', failed: '失败', unknown: '不确定', conflict: '冲突' } as const;

/** 设置：界面偏好、画板、样例与模拟、存储位置、写入回执 */
export default function Settings() {
  const p = usePrefs();
  const sim = useSim();
  const { toast } = useOverlay();
  const receipts = useData((db) => db.receipts);
  const loc = useLocation();
  useEffect(() => { if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ block: 'start' }), 60); }, [loc.hash]);
  const row = (label: string, desc: string, ctl: React.ReactNode) => <div className="set-row"><div><div>{label}</div><div className="small muted">{desc}</div></div>{ctl}</div>;
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <PageHeader title="设置" sub="上半部分是流程设置（东西写到哪、一天从几点算起），所有卡片共用；下半部分是界面偏好，只存在本机浏览器。" />
      <Section title="时间口径与流程去向" id="flow" desc="初处理、自己处理、以后读、日报的结果写到哪">
        <FlowSettings />
      </Section>
      <Section title="知识库落点规则" id="routes" desc="平台 × 类型 × 主题 → 路径。「直接入库」按这里算">
        <RouteRules />
      </Section>
      <Section title="主体文档路径" id="subject" desc="AI 了解你、继续做事时先读的 8 份文档">
        <SubjectPaths />
      </Section>
      <Section title="消息分组" id="groups" desc="QQ / 微信群：重要程度与模式（关注 / 钻研 / 只存档）">
        <GroupSettings />
      </Section>
      <Section title="外观">
        {row('主题', '浅色是默认', <Seg id="t" value={p.theme} items={[['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']]} onChange={(theme) => setPrefs({ theme })} />)}
        {row('底色', '「跟随 Obsidian」直接读取 Obsidian 当前主题变量', <div className="seg">{PALETTES.map((x) => <button key={x.id} className={p.palette === x.id ? 'on' : ''} onClick={() => setPrefs({ palette: x.id })}>{p.palette === x.id && <motion.i layoutId="set-pal" className="seg-bg" />}<span>{x.name}</span></button>)}</div>)}
        {row('强调色', '按钮、选中态、进度条', <div className="swatches">{ACCENTS.map((a) => <button key={a.id} title={a.name} className={`sw round ${p.accent === a.id ? 'on' : ''}`} style={{ background: a.color }} onClick={() => setPrefs({ accent: a.id })} />)}</div>)}
        {row('密度', '列表行距', <Seg id="d" value={p.density} items={[['comfortable', '舒适'], ['compact', '紧凑']]} onChange={(density) => setPrefs({ density })} />)}
        {row('动效', '关闭后只保留必要的过渡', <Seg id="m" value={p.motion} items={[['on', '开'], ['off', '关']]} onChange={(motion) => setPrefs({ motion })} />)}
        {row('称呼', '第一块画板的问候用', <input className="input sm" style={{ width: 180 }} value={p.userName} onChange={(e) => setPrefs({ userName: e.target.value } as Partial<Prefs>)} />)}
      </Section>
      <Section title="画板">
        {row('画板导航', '顶栏里把画板展开成标签，或收成一个下拉菜单', <Seg id="nav" value={p.boardNav} items={[['tabs', '标签'], ['menu', '菜单']]} onChange={(boardNav) => setPrefs({ boardNav })} />)}
        {row('标签显示图标', '每块画板可以在「⋯ 管理」里换图标', <Seg id="ic" value={p.boardIcons ? 'y' : 'n'} items={[['y', '显示'], ['n', '不显示']]} onChange={(v) => setPrefs({ boardIcons: v === 'y' })} />)}
        {row('恢复所有默认画板', '只覆盖布局；便签文字、打卡、业务数据都不受影响', <button className="btn sm" onClick={() => { if (confirm('恢复所有默认画板？你调整过的布局会被覆盖。')) { boardStore.resetAll(); toast('已恢复默认画板'); } }}>恢复</button>)}
      </Section>
      <Section title="样例数据" desc="本轮前端没有接后端：所有业务数据都是样例，按今天的日期生成（相对日期）。">
        {row('模拟写入结果', '检验每种写入状态的界面：失败保留输入、不确定提示重新读取、冲突保留草稿', <Seg id="sim" value={sim.write} items={[['ok', '成功'], ['failed', '失败'], ['unknown', '不确定'], ['conflict', '冲突']]} onChange={(write) => store.setSim({ write })} />)}
        {row('本机服务离线', '专注计时、节点监控、浏览器采集、AI 批次等本机命令会送不达', <Seg id="off" value={sim.offline ? 'y' : 'n'} items={[['n', '在线'], ['y', '离线']]} onChange={(v) => store.setSim({ offline: v === 'y' })} />)}
        {row('重置样例数据', '回到初始样例；画板布局不受影响', <button className="btn sm" onClick={() => { store.resetSample(); resetCardStores(); toast('样例数据已重置（共享对象 + 每张卡的私有样例）'); }}>重置</button>)}
        {row('流程设置恢复默认', '落点规则、主体路径、消息分组、日切换回到初始值（不动业务数据）', <button className="btn sm" onClick={() => { if (confirm('流程设置恢复默认？')) { resetSettings(); toast('流程设置已恢复默认'); } }}>恢复</button>)}
        {row('重置便签与打卡', '轻量卡的本地内容', <button className="btn sm" onClick={() => { resetCardContent(); toast('便签与打卡已重置'); }}>重置</button>)}
      </Section>
      <Section title="本地存储位置" desc="前端阶段全部在浏览器里；挂进 Obsidian 后建议迁到 Vault 内（路径为建议，待确认，见 docs/架构/05-路径与落点.md）">
        <div className="list" style={{ padding: '0 8px 8px' }}>
          {[['pkd.v5.boards.v5', 'localStorage', '画板列表、图标、每张卡的位置 / 层级 / 锁定 / 折叠 / 颜色 / 设置', '系统/界面/画板.json（建议）'],
            [PREFS_KEY, 'localStorage', '明暗、底色、强调色、密度、动效、称呼、画板导航', '系统/界面/偏好.json（建议）'],
            ['pkd.v5.content.<卡片>.v1', 'localStorage', '卡片里「我的内容」：便签文字（按 noteId）、打卡项目与每天的勾选', '系统/界面/便签.json、系统/打卡/YYYY-MM.md（建议）'],
            ['pkd.v5.card.<卡片>.v1', 'localStorage', '每张卡的私有样例数据（QQ 群、节点、收藏……）', '接入后由各卡自己的数据端口决定'],
            ['pkd.v5.settings.v1', 'localStorage', '流程设置：日切换、流程去向、落点规则、主体文档路径、消息分组（我的设置，不按天重置）', '系统/仪表盘/设置.md（建议）'],
            ['pkd.v5.sample.v5', 'localStorage', '共享对象的样例（材料、行动、请求、项目……）（接入后不再使用）', '— 真实数据在 Vault 各自的位置'],
            ['pkd.v5.sim.v1', 'localStorage', '样例模拟开关', '—'],
            ['pkd.v5.lastBoard', 'sessionStorage', '上次停留的画板（关闭即清）', '—']].map(([k, w, d, t]) => (
            <div key={k} className="set-row"><div><div className="mono small">{k}</div><div className="small muted">{d}</div></div><div className="small faint" style={{ textAlign: 'right' }}>{w}<br /><span className="mono">{t}</span></div></div>))}
        </div>
      </Section>
      <Section title="写入回执" id="receipts" count={receipts.length} desc="每一次写入的结果。真实接入后由后端返回；这里是样例。">
        <div className="list receipts">
          {receipts.slice(0, 40).map((r) => (
            <div key={r.id} className="receipt-row">
              <Tag tone={ST_TONE[r.status]}>{ST_LABEL[r.status]}</Tag>
              <div className="item-main"><div className="ellipsis">{r.label}</div><div className="item-meta">{r.path && <RefPath path={r.path} />}{r.error && <span className="small tone-bad-text">{r.error}</span>}{r.detail && <span className="small muted">{r.detail}</span>}</div></div>
              <span className="mono faint small">{full(r.at)}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
