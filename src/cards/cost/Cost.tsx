import { useData } from '../../data';
import { RefLine } from '../../ui/refs';
import { KV, PageHeader, SampleMark, Section, Tag } from '../../ui/ui';
import { S, type CostEntry } from './store';

/**
 * AI 成本。规则：不同币种分开合计，不按汇率混算；没有记录的条目显示「未记录」，不当作 0 / 免费；
 * 订阅是固定价，按量账单是导入值，估算要标出。
 */
const sum = (l: CostEntry[], c: CostEntry['currency']) => l.filter((x) => x.currency === c && x.amount != null).reduce((s, x) => s + x.amount!, 0);
const money = (v: number | undefined, c: CostEntry['currency']) => (v == null ? undefined : `${c === 'USD' ? '$' : '¥'}${v.toFixed(v % 1 ? 2 : 0)}`);
const KIND_TONE = { 订阅: 'neutral', 按量账单: 'info', 估算: 'ai' } as const;

export function CostCard() {
  const l = useData((db) => S.d.costs);
  const miss = l.filter((x) => x.amount == null);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 14, alignItems: 'baseline' }}>
        <span><b className="serif" style={{ fontSize: 22 }}>{money(sum(l, 'USD'), 'USD')}</b> <span className="small muted">USD</span></span>
        <span><b className="serif" style={{ fontSize: 22 }}>{money(sum(l, 'CNY'), 'CNY')}</b> <span className="small muted">CNY</span></span>
      </div>
      <div className="small muted">本月 · 两种币种分开算 <SampleMark /></div>
      {miss.length > 0 && <div className="small tone-warn-text">{miss.map((x) => x.name).join('、')} 未记录（不等于免费）</div>}
    </div>
  );
}

export default function CostPage() {
  const l = useData((db) => S.d.costs);
  return (
    <div className="page">
      <PageHeader title="AI 成本" sub={<>订阅和按量账单，来自手写的成本记录（P11）。不读支付账户，不是实时 Token 账单。<SampleMark /></>} />
      <Section title="本月合计" desc="不同币种不混算">
        <KV rows={[['USD', money(sum(l, 'USD'), 'USD')], ['CNY', money(sum(l, 'CNY'), 'CNY')], ['未记录', l.filter((x) => x.amount == null).map((x) => x.name).join('、') || '无']]} />
      </Section>
      <Section title="明细" count={l.length}>
        <table className="table">
          <thead><tr><th>项目</th><th>类型</th><th>金额</th><th>周期</th><th>依据</th></tr></thead>
          <tbody>{l.map((x) => <tr key={x.id}><td>{x.name}</td><td><Tag tone={KIND_TONE[x.kind]}>{x.kind}</Tag></td><td className="mono">{money(x.amount, x.currency) ?? <Tag tone="warn">未记录</Tag>}</td><td className="small">{x.period}</td><td className="small">{x.ref.path ? <RefLine r={x.ref} time={false} /> : <span className="muted">{x.note ?? '—'}</span>}</td></tr>)}</tbody>
        </table>
      </Section>
    </div>
  );
}
