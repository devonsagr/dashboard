import { ExternalLink, FileText } from 'lucide-react';
import type { Ref } from '../data/types';
import { full } from '../data/time';
import { host } from '../data/host';

/** 浏览器示例路径只展示；宿主模式打开已有 Vault 文件。 */
export function RefPath({ path, anchor }: { path: string; anchor?: string }) {
  const text = path + (anchor && !path.includes('#') ? (anchor.startsWith('#') || anchor.startsWith('^') ? (anchor.startsWith('^') ? '#' + anchor : anchor) : '#' + anchor) : '');
  return host ? <button className="ref-path mono link" title="在 Obsidian 打开原文" onClick={(e) => { e.stopPropagation(); void host!.open(text).catch((error) => window.dispatchEvent(new CustomEvent('dashboard-save-error', { detail: error.message }))); }}><FileText size={11} />{text}</button>
    : <span className="ref-path mono" title="示例路径（仅展示）"><FileText size={11} />{text}</span>;
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
