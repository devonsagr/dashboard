import { FileText } from 'lucide-react';
import { relTime } from '../../data/time';
import { Empty } from '../../ui/ui';
import { S } from './store';
import type { CardProps } from '../../workbench/cards/protocol';

/* 最近编辑 */
export function RecentDocs({ inst }: CardProps) {
  const f = inst.props.folder ?? '';
  const docs = S.use((d) => d.recentDocs.filter((d) => !f || d.path.startsWith(f)).sort((a, b) => b.at.localeCompare(a.at)));
  if (!docs.length) return <Empty title="这个文件夹最近没有改动" />;
  return (
    <div className="list">
      {docs.map((d) => {
        const parts = d.path.split('/'), name = parts.pop()!.replace(/\.md$/, '');
        return (
          <div key={d.path} className="doc-row" title={`${d.path}（示例路径，仅展示）`} data-nodrag>
            <FileText size={14} className="faint" />
            <span className="doc-main"><span className="ellipsis">{name}</span>{inst.w >= 4 && <span className="doc-path ellipsis">{parts.join(' / ')}</span>}</span>
            <span className="mono faint">{relTime(d.at)}</span>
          </div>
        );
      })}
    </div>
  );
}
