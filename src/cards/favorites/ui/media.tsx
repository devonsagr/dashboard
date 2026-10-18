import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ImageOff, RotateCw, X } from 'lucide-react';
import type { Img } from '../model';
import { retryImage } from '../store';

/** 合成图片：用 SVG 画一块带标签的色块（演示用，不是任何真实图片） */
export function svgOf(i: Img) {
  const stripes = i.h > i.w * 2 ? Array.from({ length: Math.floor(i.h / 600) }, (_, k) => `<rect x="60" y="${300 + k * 600}" width="${i.w - 120}" height="380" rx="24" fill="hsl(${i.hue} 30% 92%)"/><text x="${i.w / 2}" y="${520 + k * 600}" font-size="64" text-anchor="middle" fill="hsl(${i.hue} 25% 45%)">长图第 ${k + 1} 段</text>`).join('') : '';
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${i.w} ${i.h}" width="${i.w}" height="${i.h}"><rect width="100%" height="100%" fill="hsl(${i.hue} 32% 84%)"/><circle cx="${i.w * 0.78}" cy="${Math.min(i.h * 0.25, 300)}" r="${Math.min(i.w, i.h) * 0.12}" fill="hsl(${i.hue} 40% 74%)"/>${stripes}<text x="50%" y="${Math.min(i.h / 2, 520)}" font-family="sans-serif" font-size="${Math.max(36, i.w / 22)}" text-anchor="middle" fill="hsl(${i.hue} 25% 35%)">${i.label} · 合成样例</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}
export function Missing({ img, itemId }: { img: Img; itemId: string }) {
  return (
    <div className="fav-missing" style={{ aspectRatio: `${img.w} / ${Math.min(img.h, img.w * 1.4)}` }}>
      <ImageOff size={18} /><b>{img.label}：未取得</b><span className="small">{img.missing}</span>
      <button className="btn sm" onClick={() => retryImage(itemId, img.id)}><RotateCw size={12} />重试这张</button>
    </div>
  );
}
/** 缩略图：可以裁切；点开进页内查看器（不下载） */
export function Thumb({ img, itemId, onOpen, crop = true, className = '' }: { img: Img; itemId: string; onOpen: () => void; crop?: boolean; className?: string }) {
  if (img.missing) return <Missing img={img} itemId={itemId} />;
  return (
    <button className={`fav-thumb ${crop ? 'crop' : ''} ${className}`} onClick={onOpen} aria-label={`查看 ${img.label}`}>
      <img src={svgOf(img)} alt={img.alt ?? img.label} style={crop ? undefined : { aspectRatio: `${img.w} / ${img.h}` }} />
      {img.h > img.w * 2 && <span className="fav-long">长图</span>}
    </button>
  );
}
/** 页内查看器：完整原图（不裁切）、前后切换、Esc 关闭、焦点回到原处 */
export function Viewer({ imgs, index, onClose }: { imgs: Img[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const back = useRef<Element | null>(document.activeElement);
  const box = useRef<HTMLDivElement>(null);
  const ok = imgs.filter((x) => !x.missing);
  const cur = ok[Math.min(i, ok.length - 1)];
  useEffect(() => {
    box.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, ok.length - 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0)); };
    window.addEventListener('keydown', k, true);
    const el = back.current;
    return () => { window.removeEventListener('keydown', k, true); (el as HTMLElement | null)?.focus?.(); };
  }, [ok.length, onClose]);
  if (!cur) return null;
  return createPortal(
    <div className="fav-viewer" role="dialog" aria-modal="true" aria-label="查看图片" tabIndex={-1} ref={box} onClick={onClose}>
      <div className="fav-viewer-top" onClick={(e) => e.stopPropagation()}>
        <span>{cur.label} · {i + 1} / {ok.length}{ok.length < imgs.length && <span className="faint">（另有 {imgs.length - ok.length} 张未取得）</span>}</span>
        <span className="faint small">{cur.w}×{cur.h} · 合成样例 · 原图不裁切</span>
        <button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={18} /></button>
      </div>
      <div className="fav-viewer-img" onClick={(e) => e.stopPropagation()}><img src={svgOf(cur)} alt={cur.alt ?? cur.label} /></div>
      {ok.length > 1 && <>
        <button className="fav-viewer-nav l" disabled={i === 0} onClick={(e) => { e.stopPropagation(); setI(i - 1); }} aria-label="上一张"><ChevronLeft /></button>
        <button className="fav-viewer-nav r" disabled={i >= ok.length - 1} onClick={(e) => { e.stopPropagation(); setI(i + 1); }} aria-label="下一张"><ChevronRight /></button>
      </>}
    </div>, document.body);
}
/** 按语义排版的图集：顶部图集（紧凑等节奏）、X 多图（按张数）、小红书（逐张 + 位置） */
export function Gallery({ imgs, style, itemId }: { imgs: Img[]; style: 'top' | 'grid' | 'xhs'; itemId: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [pos, setPos] = useState(0);
  const okIdx = (k: number) => imgs.slice(0, k).filter((x) => !x.missing).length;
  let body: ReactNode;
  if (style === 'xhs') {
    const cur = imgs[pos];
    body = (
      <div className="fav-xhs">
        <div className="fav-xhs-main"><Thumb img={cur} itemId={itemId} crop={false} onOpen={() => setOpen(okIdx(pos))} className="xhs" />
          <span className="fav-xhs-pos">{pos + 1} / {imgs.length}</span>
          <button className="fav-xhs-nav l" disabled={pos === 0} onClick={() => setPos(pos - 1)} aria-label="上一张"><ChevronLeft size={18} /></button>
          <button className="fav-xhs-nav r" disabled={pos === imgs.length - 1} onClick={() => setPos(pos + 1)} aria-label="下一张"><ChevronRight size={18} /></button>
        </div>
        <div className="fav-xhs-strip">{imgs.map((im, k) => <button key={im.id} className={k === pos ? 'on' : ''} onClick={() => setPos(k)} aria-label={`第 ${k + 1} 张`}><img src={svgOf(im)} alt="" /></button>)}</div>
      </div>
    );
  } else {
    body = <div className={`fav-gal ${style} n${Math.min(imgs.length, 4)}`}>{imgs.map((im, k) => <Thumb key={im.id} img={im} itemId={itemId} onOpen={() => setOpen(okIdx(k))} />)}</div>;
  }
  return <>{style === 'top' && <div className="small faint fav-cap">顶部图集 · {imgs.length} 张</div>}{body}{open !== null && <Viewer imgs={imgs} index={open} onClose={() => setOpen(null)} />}</>;
}
export function Inline({ img, itemId }: { img: Img; itemId: string }) {
  const [open, setOpen] = useState(false);
  return <figure className="fav-inline"><Thumb img={img} itemId={itemId} crop={false} onOpen={() => setOpen(true)} />{!img.missing && <figcaption className="small faint">{img.label}</figcaption>}{open && <Viewer imgs={[img]} index={0} onClose={() => setOpen(false)} />}</figure>;
}
