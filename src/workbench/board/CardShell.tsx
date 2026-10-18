import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, GripVertical, Info, Lock, LockOpen, Maximize2, Palette, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CardModule } from '../cards/protocol';
import { pageOf, viewDef } from '../cards/registry';
import { Slot } from '../cards/host';
import type { BoardMode, CardInst } from './store';
import { boardStore } from './store';
import { TINTS, tintColor } from './tints';
import { useOverlay } from '../app/overlay';
import { CardInfo } from './CardInfo';

/**
 * 统一卡片外壳。所有卡片同一套：头部、折叠、属性（背面）、放大、整理控件。
 * - 平时：悬停才出现 ⓘ 属性 / 折叠 / 放大
 * - 整理模式：再多出 锁定 / 颜色 / 移除；锁定的卡不能移除
 */
export function CardShell({ m, inst, boardId, mode, edit, dragging, index = 0, onRemove, children }: {
  m: CardModule; inst: CardInst; boardId: string; mode: BoardMode; edit: boolean; dragging?: boolean; index?: number;
  onRemove: () => void; children: ReactNode;
}) {
  const [info, setInfo] = useState(false);
  const [paint, setPaint] = useState(false);
  const { open } = useOverlay();
  const route = pageOf(m, inst.props);
  const props = { ...m.defaults, ...inst.props };
  const v = viewDef(m, props);
  const name = v && m.views![0].id !== v.id ? v.name : m.name;
  const sticky = m.id === 'sticky';
  const tint = inst.tint ?? (sticky ? 'lemon' : '');
  const tilt = sticky && mode === 'collage' ? ((inst.id.charCodeAt(inst.id.length - 1) % 5) - 2) * 0.6 : 0;
  const Icon = m.icon;
  const patch = (p: Partial<CardInst>) => boardStore.patchCard(boardId, inst.id, p);
  return (
    <article className={`card ${m.light ? 'light' : ''} ${sticky ? 'sticky' : ''} ${tint ? 'tinted' : ''} ${edit ? 'edit' : ''} ${dragging ? 'lift' : ''} ${inst.locked ? 'is-locked' : ''} ${mode}`}
      data-kind={m.id} data-view={v?.id}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms`, ...(tint ? { ['--tint' as string]: tintColor(tint) } : {}), ...(tilt ? { rotate: `${tilt}deg` } : {}) }}>
      <header className="card-head" onDoubleClick={() => !edit && patch({ collapsed: !inst.collapsed })}>
        {edit && !inst.locked ? <GripVertical size={14} className="card-grip" /> : <Icon size={14} className="card-icon" />}
        <span className="card-title">{info ? `${name} · 属性` : <Slot m={m} pick={(i) => i.Title} props={props} fallback={name} />}</span>
        {!info && !inst.collapsed && <span className="card-meta"><Slot m={m} pick={(i) => i.Meta} props={props} /></span>}
        {inst.locked && !edit && <Lock size={11} className="faint" style={{ flexShrink: 0 }} />}
        <span className={`card-tools ${edit ? 'show' : ''}`} data-nodrag>
          {edit && <button className={`icon-btn xs ${inst.locked ? 'on' : ''}`} title={inst.locked ? '解锁' : mode === 'collage' ? '固定：钉到最顶层（后固定的叠在先固定的上面），位置大小不能动' : '固定：位置大小不能动，不能移除'} onClick={() => boardStore.setLocked(boardId, inst.id, !inst.locked)}>{inst.locked ? <Lock size={13} /> : <LockOpen size={13} />}</button>}
          {edit && <button className={`icon-btn xs ${paint ? 'on' : ''}`} title="卡片颜色" onClick={() => setPaint(!paint)}><Palette size={13} /></button>}
          <button className={`icon-btn xs ${info ? 'on' : ''}`} title="属性：数据从哪来、存在哪" onClick={() => { setInfo(!info); if (inst.collapsed) patch({ collapsed: false }); }}><Info size={13} /></button>
          <button className="icon-btn xs" title={inst.collapsed ? '展开' : '折叠'} onClick={() => patch({ collapsed: !inst.collapsed })}><motion.span animate={{ rotate: inst.collapsed ? -90 : 0 }} style={{ display: 'inline-flex' }}><ChevronDown size={14} /></motion.span></button>
          {!edit && route && <Link to={route} className="icon-btn xs" title="放大成完整页面" onClick={(e) => { e.preventDefault(); open({ kind: 'path', to: route }, e.currentTarget); }}><Maximize2 size={12.5} /></Link>}
          {edit && !inst.locked && <button className="icon-btn xs" title="从画板移除（可撤销；内容不会删）" onClick={onRemove}><X size={14} /></button>}
        </span>
      </header>
      <AnimatePresence initial={false}>
        {paint && edit && (
          <motion.div className="tint-strip" data-nodrag initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <TintPicker value={tint} onChange={(t) => patch({ tint: t })} />
          </motion.div>
        )}
      </AnimatePresence>
      {!inst.collapsed && (
        <div className={`card-body ${info ? 'info' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={info ? 'i' : 'f'} className="card-face" initial={{ opacity: 0, filter: 'blur(2px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
              {info ? <CardInfo m={m} inst={inst} boardId={boardId} mode={mode} /> : children}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </article>
  );
}

export function TintPicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <span className="swatches">
      {TINTS.map((t) => (
        <button key={t.id || 'none'} className={`sw ${value === t.id ? 'on' : ''} ${t.id ? '' : 'none'}`} style={{ background: t.color }} title={t.name} aria-label={t.name} onClick={() => onChange(t.id)} />
      ))}
    </span>
  );
}
