import type { CardProps } from '../../workbench/cards/protocol';
import { useData, store } from '../../data';
import { ApprovalRow } from '../../ui/objects';
import { Empty, MoreLink, PageHeader, SampleMark, Section } from '../../ui/ui';

/** 待采纳：AI / 项目 / 我推送过来的候选，采纳后才变成行动 */
export function Approvals({ inst }: CardProps) {
  const list = useData(() => store.pendingApprovals());
  const groups = [...new Set(list.map((a) => a.group))];
  if (!list.length) return <Empty title="没有待采纳的建议" hint="材料推送或 AI 整理后会出现在这里" />;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {groups.map((g) => (
        <div key={g}>
          <div className="mini-head">{g}<span className="count">{list.filter((a) => a.group === g).length}</span></div>
          {list.filter((a) => a.group === g).slice(0, inst.h > 8 ? 6 : 3).map((a) => <ApprovalRow key={a.id} ap={a} compact />)}
        </div>
      ))}
      <MoreLink to="/c/approvals">全部待采纳</MoreLink>
    </div>
  );
}

/** 待采纳（完整页）：按来源分组；已处理的都可以撤回 */
export function ApprovalsPage() {
  return (
    <div className="page">
      <PageHeader title="待采纳" sub={<>AI、项目或我自己推送过来的候选。采纳了才变成行动（不会重复创建）；不采纳可以写原因。<SampleMark /></>} />
      <ApprovalsTab />
    </div>
  );
}

function ApprovalsTab() {
  const all = useData((db) => db.approvals);
  const pending = all.filter((a) => a.state === 'pending');
  const groups = [...new Set(pending.map((a) => a.group))];
  const decided = all.filter((a) => a.state !== 'pending').sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''));
  return (
    <div className="stack">
      {!pending.length && <Empty title="没有待采纳的建议" />}
      {groups.map((g) => <Section key={g} title={g} count={pending.filter((a) => a.group === g).length} desc="按来源分组">{pending.filter((a) => a.group === g).map((a) => <ApprovalRow key={a.id} ap={a} />)}</Section>)}
      <Section title="已处理" count={decided.length} desc="采纳 / 不采纳 / 稍后；都可以撤回">{decided.length ? decided.map((a) => <ApprovalRow key={a.id} ap={a} />) : <Empty title="还没有处理过" />}</Section>
    </div>
  );
}
