import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData, type Project } from '../../data';
import { relTime } from '../../data/time';
import { Chip, Empty, MoreLink, Tag } from '../../ui/ui';
import { useOverlay } from '../../workbench/app/overlay';
import { host } from '../../data/host';

export const STATUS_TONE: Record<Project['status'], string> = { 未开始: 'faint', 准备中: 'neutral', 进行中: 'accent', 等待用户: 'warn', 等待外部: 'warn', 已完成: 'ok', 部分完成: 'info', 受阻: 'bad', 已归档: 'faint' };
export const OWN_TONE: Record<Project['ownership'], string> = { 产品项目: 'accent', 卡片模块: 'info', 独立工具: 'neutral' };

/** 一行项目：状态、下一步由谁做、卡点、数据新旧 */
export function ProjectLine({ p, compact }: { p: Project; compact?: boolean }) {
  const { open } = useOverlay();
  const asks = useData(() => store.openDecisions().filter((d) => d.projectId === p.id).length);
  const old = (Date.now() - new Date(p.asOf).getTime()) / 86400000 > 2;
  return (
    <button className="proj-line" onClick={(e) => open({ kind: 'project', id: p.id }, e.currentTarget)}>
      <div className="proj-line-main">
        <div className="row" style={{ gap: 6, minWidth: 0 }}><span className="ellipsis proj-name">{p.name}</span>{!compact && !host && <Tag tone={OWN_TONE[p.ownership]}>{p.ownership}</Tag>}</div>
        <div className="small muted ellipsis">{p.follow.blocker ? <span className="tone-bad-text">卡在：{p.follow.blocker}</span> : <>下一步{!host && `（${p.follow.owner}）`}：{p.follow.next || '未填写'}</>}</div>
      </div>
      <div className="proj-line-side">
        <Chip tone={STATUS_TONE[p.status]}>{p.status}</Chip>
        <span className="small faint">{asks > 0 && <span className="tone-accent-text">{asks} 请求 · </span>}<span className={old ? 'tone-warn-text' : ''} title="项目信息截至">{relTime(p.asOf)}</span></span>
      </div>
    </button>
  );
}

/** 项目控制室：所有登记的项目（卡片模块挂在所属产品项目下面） */
export function ProjectsRoom({ inst }: CardProps) {
  const ps = useData((db) => db.projects.filter((p) => p.status !== '已归档'));
  const top = ps.filter((p) => !p.parentId);
  return (
    <div className="stack" style={{ gap: 2 }}>
      {top.map((p) => (
        <div key={p.id}>
          <ProjectLine p={p} compact={inst.w < 6} />
          {ps.filter((c) => c.parentId === p.id).map((c) => <div key={c.id} className="proj-child"><ProjectLine p={c} compact /></div>)}
        </div>
      ))}
      {!top.length && <Empty title="还没有登记的项目" />}
      <MoreLink to="/c/projects">全部项目</MoreLink>
    </div>
  );
}

/** 单个项目：钉一个项目在画板上 */
export function ProjectSingle({ inst }: CardProps) {
  const p = useData(() => store.proj(inst.props.projectId));
  const { open } = useOverlay();
  const asks = useData(() => store.openDecisions().filter((d) => d.projectId === p?.id));
  if (!p) return <Empty title="没选项目" hint="在卡片「属性」里选一个项目" />;
  const wi = p.workItems.filter((w) => w.status !== '已完成');
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}><Chip tone={STATUS_TONE[p.status]}>{p.status}</Chip><span className="small muted">{p.stage}</span></div>
      <div className="kv-mini">
        {p.follow.current && <div><span className="faint">正在</span>{p.follow.current}</div>}
        <div><span className="faint">下一步</span>{p.follow.next}<Tag>{p.follow.owner}</Tag></div>
        {p.follow.blocker && <div className="tone-bad-text"><span className="faint">卡点</span>{p.follow.blocker}</div>}
      </div>
      {wi.length > 0 && <div className="stack" style={{ gap: 2 }}><div className="mini-head">工作项</div>{wi.slice(0, 3).map((w) => <button key={w.id} className="mini-row" onClick={(e) => open({ kind: 'project', id: p.id, tab: 'work' }, e.currentTarget)}><span className="ellipsis">{w.title}</span><Tag tone={w.status === '待验收' ? 'accent' : 'neutral'}>{w.status}</Tag></button>)}</div>}
      {asks.length > 0 && <button className="mini-row" onClick={(e) => open({ kind: 'decision', id: asks[0].id }, e.currentTarget)}><span className="ellipsis">请求：{asks[0].title}</span>{asks.length > 1 && <span className="faint small">+{asks.length - 1}</span>}</button>}
      <div className="small faint">工程：{!p.eng.registered ? '未登记工程' : p.eng.reachable === false ? '读不到（显示旧快照）' : `${p.eng.branch ?? '—'} · ${p.eng.dirty ?? 0} 个未提交`} · 截至 {relTime(p.asOf)}</div>
    </div>
  );
}
