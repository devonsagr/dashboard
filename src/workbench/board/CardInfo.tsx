import { Link } from 'react-router-dom';
import type { CardModule } from '../cards/protocol';
import { viewOf } from '../cards/registry';
import type { BoardMode, CardInst } from './store';
import { boardStore } from './store';
import { useData } from '../../data';
import { HealthChip, Tag } from '../../ui/ui';
import { RefPath } from '../../ui/refs';
import { relTime } from '../../data/time';
import { TintPicker } from './CardShell';

const STATUS_TONE = { 样例: 'warn', 未接入: 'faint', 本地: 'info', 不读数据: 'neutral' } as const;
const STATUS_TEXT = {
  样例: '这张卡现在显示的是样例数据，接入后才是真实情况',
  未接入: '数据源还没接入，卡片只显示说明，不编数字',
  本地: '只用浏览器本地存储（挂进 Obsidian 后由插件决定落点）',
  不读数据: '不读任何外部数据',
} as const;

/** 卡片背面：这张卡是什么、数据从哪来、存在哪、怎么更新、会写回什么、实例设置、外观 */
export function CardInfo({ m: def, inst, boardId, mode }: { m: CardModule; inst: CardInst; boardId: string; mode: BoardMode }) {
  const props = { ...def.defaults, ...inst.props };
  const set = (k: string, v: string) => boardStore.patchProps(boardId, inst.id, { [k]: v });
  const sources = useData((db) => def.data.sources.map((id) => db.sources.find((s) => s.id === id) ?? { id, name: id, health: 'unconfigured' as const, mode: '未知' as const, lastReadAt: undefined }));
  const isPath = (s: string) => /^[0-9A-Za-z_\u4e00-\u9fa5]+[^\s]*\//.test(s) && !s.includes('localStorage') && !s.includes('://') && !s.startsWith('本机') && !s.startsWith('建议');
  const view = viewOf(def, props);
  const fields = (def.props ?? []).filter((f) => !f.when || f.when === view);
  return (
    <div className="card-info" data-nodrag>
      <p className="muted small" style={{ margin: 0 }}>{def.desc}</p>
      <div className="row small" style={{ gap: 6 }}><Tag tone={STATUS_TONE[def.status]}>{def.status}</Tag><span className="muted">{STATUS_TEXT[def.status]}</span></div>
      {def.views && def.views.length > 1 && (
        <div className="info-sec"><div className="info-k">视图</div>
          <div className="seg wrap" role="radiogroup" aria-label="视图">{def.views.map((v) => <button key={v.id} role="radio" aria-checked={view === v.id} className={view === v.id ? 'on' : ''} title={v.desc} onClick={() => set('view', v.id)}><span>{v.name}</span></button>)}</div>
          <div className="small faint">同一张卡的不同样子；数据和完整页都是这一张卡的</div>
        </div>
      )}
      {fields.length > 0 && (
        <div className="info-sec"><div className="info-k">设置</div>
          {fields.map((f) => {
            const opts = typeof f.options === 'function' ? f.options() : f.options;
            return (
              <label key={f.key} className="info-field"><span>{f.label}</span>
                {f.type === 'select' ? <select className="input" value={props[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>{opts!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  : <input className="input" type={f.type === 'date' ? 'date' : 'text'} placeholder={f.placeholder} value={props[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />}
              </label>
            );
          })}
        </div>
      )}
      <div className="info-sec"><div className="info-k">颜色</div><TintPicker value={inst.tint ?? (def.id === 'sticky' ? 'lemon' : '')} onChange={(t) => boardStore.patchCard(boardId, inst.id, { tint: t })} /></div>
      <div className="info-sec"><div className="info-k">数据来源</div>
        {sources.length === 0 ? <div className="small muted">不读外部数据</div> : sources.map((s) => (
          <Link key={s.id} to={`/c/sources/${s.id}`} className="info-src">
            <span className="mono faint">{s.id}</span><span className="ellipsis" style={{ flex: 1 }}>{s.name}</span>
            <Tag>{s.mode}</Tag><HealthChip h={s.health} />
          </Link>
        ))}
        {sources[0]?.lastReadAt && <div className="small faint">最后读取 {relTime(sources[0].lastReadAt)} · 点来源看接入设置</div>}
      </div>
      <div className="info-sec"><div className="info-k">数据在哪</div>
        {def.data.storage.map((s) => <div key={s} className="small info-path">{isPath(s) ? <RefPath path={s} /> : <span className="mono">{s}</span>}</div>)}
      </div>
      <dl className="kv small">
        <dt>更新</dt><dd>{def.data.refresh}</dd>
        <dt>写回</dt><dd>{def.data.writes ?? '只读，不写回'}</dd>
        {def.data.content && <><dt>我的内容</dt><dd>{def.data.content}</dd></>}
        <dt>布局</dt><dd className="mono">{mode === 'grid' ? `规整 · ${inst.w}×${inst.h} @ ${inst.x},${inst.y}` : `拼贴 · 层 ${inst.c?.z} · ${inst.c?.w}×${inst.c?.h}px`}{inst.locked ? ' · 已锁定' : ''}</dd>
        <dt>代码</dt><dd className="mono">{def.folder}/{view ? ` · 视图 ${view}` : ''}</dd>
      </dl>
    </div>
  );
}
