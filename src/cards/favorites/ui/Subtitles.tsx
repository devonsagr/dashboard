import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCw, Search } from 'lucide-react';
import type { FavItem, Track } from '../model';
import { Tag } from '../../../ui/ui';
import { full } from '../../../data/time';
import { retryAsr, retryTranslate } from '../store';
import { fmtT } from './common';
import type { usePlayer } from './Player';

const STATE_TONE: Record<string, string> = { 完整: 'ok', 部分: 'warn', 处理中: 'info', 暂无字幕: 'faint', 音频受限: 'bad', 无语音: 'neutral', 失败: 'bad' };
const SCROLL = new Map<string, number>();

/** 连续字幕：一个滚动区域从第一句到最后一句；全文搜索跳到真实片段；跟随播放 / 自己阅读 */
export function Subtitles({ it, tr, p, bilingual }: { it: FavItem; tr: Track; p: ReturnType<typeof usePlayer>; bilingual: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [follow, setFollow] = useState(false);
  const [msg, setMsg] = useState('');
  const hits = useMemo(() => (q ? tr.cues.map((c, i) => (c.text.includes(q) || (c.tr ?? '').toLowerCase().includes(q.toLowerCase()) ? i : -1)).filter((i) => i >= 0) : []), [q, tr.cues]);
  const active = tr.cues.findIndex((c) => p.t >= c.s && p.t < c.e);
  const key = `${it.id}:${tr.id}`;
  useEffect(() => { const el = box.current; if (el) el.scrollTop = SCROLL.get(key) ?? 0; }, [key]);
  const go = (i: number) => { const el = box.current?.querySelector<HTMLElement>(`[data-i="${i}"]`); if (el && box.current) box.current.scrollTop = el.offsetTop - box.current.clientHeight / 3; };
  useEffect(() => { if (hits.length) go(hits[Math.min(hi, hits.length - 1)]); }, [hi, hits]);
  useEffect(() => { if (follow && p.playing && active >= 0) go(active); }, [active, follow, p.playing]);
  const click = (i: number) => {
    const c = tr.cues[i];
    if (p.can) { p.seek(c.s); setMsg(`已定位到 ${fmtT(c.s)}（没有自动开始播放）`); }
    else setMsg(`这个播放器不支持定位：可以回原站手动到 ${fmtT(c.s)}`);
  };
  const missTr = bilingual ? tr.cues.filter((c) => !c.tr).length : 0;
  return (
    <div className="fav-subs">
      <div className="fav-subs-head">
        <b>字幕</b><Tag tone="neutral">{tr.kind}</Tag><Tag tone={STATE_TONE[tr.state]}>{tr.state}</Tag>
        <span className="small muted">{tr.lang} · {tr.cues.length ? `${tr.cues.length} 段 · ${fmtT(tr.cues[0].s)}–${fmtT(tr.cues[tr.cues.length - 1].e)}` : '没有片段'}{tr.model ? ` · ${tr.model}` : ''}{tr.declared ? ` · 你声明的来源：${tr.declared}` : ''} · 取得 {tr.at ? full(tr.at) : '时间未知'}</span>
      </div>
      {tr.note && <div className={`fav-note-line ${tr.state === '完整' ? '' : 'warn'}`}>{tr.note}{tr.kind === '机器转写' && tr.cues.length > 0 && '（机器转写不是平台字幕）'}{tr.retryable && tr.state === '失败' && <button className="btn sm" onClick={() => retryAsr(it.id)}><RotateCw size={12} />重新转写</button>}</div>}
      {tr.cues.length > 0 && <>
        <div className="fav-subs-tools">
          <label className="search-inline"><Search size={13} /><input placeholder="搜索全部字幕" value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} aria-label="搜索字幕" /></label>
          {q && <span className="small muted">{hits.length ? `${Math.min(hi, hits.length - 1) + 1} / ${hits.length}` : '没有命中'}</span>}
          {hits.length > 1 && <><button className="icon-btn" onClick={() => setHi((hi - 1 + hits.length) % hits.length)} aria-label="上一个"><ChevronUp size={14} /></button><button className="icon-btn" onClick={() => setHi((hi + 1) % hits.length)} aria-label="下一个"><ChevronDown size={14} /></button></>}
          <span style={{ flex: 1 }} />
          {p.can ? <button className={`btn sm ${follow ? 'btn-primary' : ''}`} onClick={() => setFollow(!follow)}>{follow ? '跟随播放中' : '自己阅读'}</button> : <span className="small faint">不能定位：点字幕只给时间</span>}
          <button className="btn sm btn-ghost" onClick={() => go(0)}>回到第一句</button><button className="btn sm btn-ghost" onClick={() => go(tr.cues.length - 1)}>到最后一句</button>
        </div>
        {missTr > 0 && <div className="fav-note-line warn">{missTr} 段译文失败，原文照常显示 <button className="btn sm" onClick={() => retryTranslate(it.id)}><RotateCw size={12} />重试译文</button></div>}
        {msg && <div className="small muted fav-msg" role="status">{msg}</div>}
        <div className="fav-subs-list" ref={box} onWheel={() => follow && setFollow(false)} onTouchMove={() => follow && setFollow(false)} onScroll={(e) => SCROLL.set(key, e.currentTarget.scrollTop)} tabIndex={0} aria-label="字幕全文">
          {tr.cues.map((c, i) => (
            <div key={i} data-i={i} className={`fav-cue ${i === active ? 'now' : ''} ${hits.includes(i) ? 'hit' : ''} ${hits[hi] === i ? 'cur' : ''}`} onClick={() => click(i)}>
              <span className="mono fav-ts">{fmtT(c.s)}–{fmtT(c.e)}</span>
              <span><span>{c.text}</span>{bilingual && (c.tr ? <span className="fav-tr">{c.tr}</span> : <span className="fav-tr bad">译文失败</span>)}</span>
            </div>
          ))}
          <div className="fav-end small faint">— 字幕到此结束（共 {tr.cues.length} 段） —</div>
        </div>
        {follow === false && p.playing && p.can && <div className="small faint">你在自己阅读，播放不会抢走滚动。<button className="link" onClick={() => setFollow(true)}>恢复跟随</button></div>}
      </>}
    </div>
  );
}
