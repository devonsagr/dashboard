import type { CardProps } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { DecisionRow } from '../../ui/objects';
import { Empty, MoreLink } from '../../ui/ui';

/** 待我决策：只列「当前有效、等我回应」的请求；过期 / 被取代的单独计数，不混进来 */
export function Decisions({ inst }: CardProps) {
  const open = useData(() => store.openDecisions());
  const other = useData((db) => ({ later: db.decisions.filter((d) => d.status === 'later').length, stale: db.decisions.filter((d) => d.status === 'open' && d.freshness !== 'current').length }));
  return (
    <div className="stack" style={{ gap: 4 }}>
      {open.length ? open.slice(0, inst.h > 8 ? 8 : 5).map((d) => <DecisionRow key={d.id} d={d} compact={inst.w < 4} />) : <Empty title="没有等你回应的请求" />}
      {(other.later > 0 || other.stale > 0) && <div className="small muted" style={{ padding: '2px 8px' }}>另有 {other.later} 条稍后、{other.stale} 条可能过期或已被取代</div>}
      <MoreLink to="/c/decisions" />
    </div>
  );
}
