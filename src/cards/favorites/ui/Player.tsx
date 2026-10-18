import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Pause, Play } from 'lucide-react';
import type { FavItem } from '../model';
import { fmtT } from './common';

/** 每条材料的播放位置单独记住（切双语 / 看任务 / 收到摘要都不会让它从头播） */
const POS = new Map<string, number>();
export interface PlayerApi { t: number; playing: boolean; seek: (s: number) => void; can: boolean }
export function usePlayer(it: FavItem): PlayerApi & { setPlaying: (b: boolean) => void } {
  const [t, setT] = useState(() => POS.get(it.id) ?? 0);
  const [playing, setPlaying] = useState(false);
  const dur = it.video?.duration ?? 0;
  const ref = useRef(t); ref.current = t;
  useEffect(() => { setT(POS.get(it.id) ?? 0); setPlaying(false); }, [it.id]);
  useEffect(() => { if (!playing) return; const h = setInterval(() => setT((x) => { const n = Math.min(x + 1, dur); POS.set(it.id, n); if (n >= dur) setPlaying(false); return n; }), 1000); return () => clearInterval(h); }, [playing, dur, it.id]);
  return { t, playing, setPlaying, can: it.video?.mode === 'locatable', seek: (s) => { setT(s); POS.set(it.id, s); } };
}
export function Player({ it, p }: { it: FavItem; p: ReturnType<typeof usePlayer> }) {
  const v = it.video; if (!v) return null;
  if (v.mode !== 'locatable') return (
    <div className="fav-player off">
      <div><b>{v.mode === 'link-only' ? '视频原链接，未取得视频文字' : '当前页不能播放'}</b><div className="small muted">{v.note}</div></div>
      <a className="btn sm" href={it.url} target="_blank" rel="noreferrer"><ExternalLink size={12} />回原站（演示地址）</a>
    </div>
  );
  const dur = v.duration ?? 0;
  return (
    <div className="fav-player">
      <div className="fav-screen"><span>合成样例播放器 · 不播放真实视频</span><b className="mono">{fmtT(p.t)} / {fmtT(dur)}</b></div>
      <div className="fav-ctrl">
        <button className="icon-btn" onClick={() => p.setPlaying(!p.playing)} aria-label={p.playing ? '暂停' : '播放'}>{p.playing ? <Pause size={15} /> : <Play size={15} />}</button>
        <input type="range" min={0} max={dur} value={p.t} onChange={(e) => p.seek(+e.target.value)} aria-label="播放位置" />
        <a className="btn sm btn-ghost" href={it.url} target="_blank" rel="noreferrer"><ExternalLink size={12} />原站</a>
      </div>
    </div>
  );
}
