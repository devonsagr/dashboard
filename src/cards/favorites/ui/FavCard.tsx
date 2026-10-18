import { Link } from 'react-router-dom';
import type { CardProps } from '../../../workbench/cards/protocol';
import { S } from '../store';
import { PF } from '../platforms';
import { Plat } from './common';

/** 画板紧凑卡（S1）：一眼知道收藏需要我做什么；不塞登录、字幕、长批注 */
export function FavCard({ inst }: CardProps) {
  const d = S.use((x) => x);
  const unknown = d.demo.feed === 'unknown';
  const live = d.items.filter((i) => !i.trashed);
  const pending = live.filter((i) => i.status === '待处理').length;
  const later = live.filter((i) => i.status === '以后读').length;
  const running = d.tasks.filter((t) => t.state === 'running' || t.state === 'waiting').length;
  const verify = (Object.keys(d.accounts) as (keyof typeof d.accounts)[]).filter((k) => d.accounts[k] === '需本人验证' || d.accounts[k] === '已过期');
  const recent = live.filter((i) => i.status === '待处理' && !i.id.startsWith('fb')).sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, inst.h >= 6 ? 4 : 2);
  const K = ({ n, l, to }: { n: number | string; l: string; to: string }) => <Link to={to} className="fav-k"><b>{n}</b><span>{l}</span></Link>;
  return (
    <div className="fav fav-card">
      <div className="fav-kpis">
        <K n={pending} l="待处理" to="/c/favorites" />
        <K n={later} l="以后读" to="/c/favorites" />
        <K n={unknown ? '?' : running} l={unknown ? '任务未知' : '任务进行中'} to="/c/favorites/tasks" />
        <K n={verify.length} l="需验证 / 过期" to={`/c/favorites/import/${verify[0] ?? 'bili'}`} />
      </div>
      {d.demo.feed === 'offline' && <div className="small faint">任务连接断开，数字截至上次</div>}
      {inst.h >= 4 && <div className="fav-recent">{recent.map((i) => <Link key={i.id} to={`/c/favorites/i/${i.id}`} className="fav-recent-row"><Plat p={i.platform} /><span className="ellipsis">{i.title}</span></Link>)}</div>}
      {inst.h >= 5 && verify.length > 0 && <div className="small muted">{verify.map((k) => `${PF[k].name}：${d.accounts[k]}`).join(' · ')}</div>}
    </div>
  );
}
