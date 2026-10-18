import { ExternalLink, FileText } from 'lucide-react';
import type { Ref } from '../data/types';
import { full } from '../data/time';

/** 前端示例路径只展示；真实文件的打开方式留给后续接入层。 */
export function RefPath({ path, anchor }: { path: string; anchor?: string }) {
  const text = path + (anchor && !path.includes('#') ? (anchor.startsWith('#') || anchor.startsWith('^') ? (anchor.startsWith('^') ? '#' + anchor : anchor) : '#' + anchor) : '');
  return <span className="ref-path mono" title="示例路径（仅展示，未连接文件系统）"><FileText size={11} />{text}</span>;
}
/** 完整来源：标签 + 路径 / 链接 + 时间 */
export function RefLine({ r, time = true }: { r: Ref; time?: boolean }) {
  return (
    <div className="ref-line">
      <span className="ref-label">{r.label}</span>
      {r.path && <RefPath path={r.path} anchor={r.anchor} />}
      {r.url && <a className="ref-path mono" href={r.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink size={11} />{r.url.replace(/^https?:\/\//, '').slice(0, 48)}</a>}
      {time && r.at && <span className="faint mono small">{full(r.at)}</span>}
    </div>
  );
}
