import { FileText } from 'lucide-react';
import { relTime } from '../../data/time';
import { Empty } from '../../ui/ui';
import { S } from './store';
import type { CardProps } from '../../workbench/cards/protocol';
import { host } from '../../data/host';
import { useData } from '../../data';
import { useOverlay } from '../../workbench/app/overlay';

/* 最近编辑 */
export function RecentDocs({ inst }: CardProps) {
  const { toast } = useOverlay();
  const open = (path: string) => { if (host) void host.open(path).catch((e) => toast(e.message, undefined, 'bad')); };
  const f = inst.props.folder ?? '';
  const demo = S.use((d) => d.recentDocs);
  const live = useData((db) => db.recentDocs);
  const docs = (host ? live : demo).filter((d) => !f || d.path.startsWith(f)).sort((a, b) => b.at.localeCompare(a.at));
  if (!docs.length) return <Empty title="这个文件夹最近没有改动" />;
  return (
    <div className="list">
      {docs.map((d) => {
        const parts = d.path.split('/'), name = parts.pop()!.replace(/\.md$/, '');
        return (
          <div key={d.path} className="doc-row" title={d.path} role={host ? 'button' : undefined} tabIndex={host ? 0 : undefined} onClick={() => open(d.path)} onKeyDown={(e) => { if (e.key === 'Enter') open(d.path); }} data-nodrag>
            <FileText size={14} className="faint" />
            <span className="doc-main"><span className="ellipsis">{name}</span>{inst.w >= 4 && <span className="doc-path ellipsis">{parts.join(' / ')}</span>}</span>
            <span className="mono faint">{relTime(d.at)}</span>
          </div>
        );
      })}
    </div>
  );
}
