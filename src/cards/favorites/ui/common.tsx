import { Link } from 'react-router-dom';
import { full, relTime } from '../../../data/time';
import { Tag } from '../../../ui/ui';
import { facts } from '../store';
import { PF } from '../platforms';
import type { FavItem, Platform } from '../model';

export const fmtT = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export function Plat({ p }: { p: Platform }) { return <span className={`fav-plat p-${p}`} title={PF[p].name}>{PF[p].name}</span>; }
export function Facts({ it, max }: { it: FavItem; max?: number }) {
  const f = facts(it); const shown = max ? f.slice(0, max) : f;
  return <span className="fav-facts">{shown.map((x) => <Tag key={x.label} tone={x.tone}>{x.label}</Tag>)}{max && f.length > max && <span className="faint small">+{f.length - max}</span>}</span>;
}
/** 时间要说明各自含义；未知就写未知，不互相代填 */
export function Times({ it }: { it: FavItem }) {
  return (
    <span className="fav-times small muted">
      <span title={full(it.publishedAt)}>发布 {it.publishedAt ? relTime(it.publishedAt) : '未知'}</span>
      <span title={full(it.importedAt)}>进入本工具 {relTime(it.importedAt)}</span>
      {it.read && <span title={full(it.read)}>你标已读 {relTime(it.read)}</span>}
    </span>
  );
}
export function DemoPath({ path, planned }: { path: string; planned?: boolean }) {
  return <code className="fav-path" title="演示路径：不是真实文件，不能打开">{path}{planned ? <span className="faint">（拟）</span> : null}</code>;
}
export const SampleBadge = () => <span className="sample-mark" title="合成样例数据，不代表真实收藏">样例</span>;
export function BackToSource({ it }: { it?: FavItem }) { return it ? <Link className="link small" to={`/c/favorites/i/${it.id}`}>← 原始材料：{it.title}</Link> : <span className="small faint">原始材料已不存在</span>; }
