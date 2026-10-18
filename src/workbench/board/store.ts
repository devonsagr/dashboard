import { host, preferences } from '../../data/host';
import { useSyncExternalStore } from 'react';
import { resolveKind } from '../cards/registry';

/**
 * 画板布局 = 纯界面偏好。只存在 localStorage['pkd.v5.boards.v5']，可导出 / 导入 JSON。
 * 布局里只有「哪张卡、放在哪、多大、什么颜色、锁没锁」，没有任何业务内容：
 * 便签文字、打卡记录在各自卡片的 store（pkd.v5.content.<卡片>.v1），行动等在数据层。
 * kind = 卡片 id（src/cards/<id>）；同一张卡的不同样子用 props.view 区分。
 * 所以移除卡片、取消整理、恢复预设都不会丢内容（R08 / S24）。
 *
 * 两种布局：
 *  - grid    规整：12 列网格，互不遮挡，自动压实
 *  - collage 拼贴：自由像素坐标，允许遮挡；点一下未锁定的卡就把它放到最上面
 * 同一张卡同时保存两套坐标（x/y/w/h 是网格，c 是拼贴），切换模式不丢布局。
 */
export type BoardMode = 'grid' | 'collage';
export type BoardIcon = 'sun' | 'folder' | 'inbox' | 'book' | 'heart' | 'shapes' | 'grid' | 'star';
export interface CollagePos { x: number; y: number; w: number; h: number; z: number }
export interface CardInst {
  id: string; kind: string;
  x: number; y: number; w: number; h: number;   // 规整布局（网格单位）
  c?: CollagePos;                               // 拼贴布局（像素）
  props?: Record<string, string>;               // 实例设置（卡片「属性」面里改）
  tint?: string;                                // 卡片底色（见 tints.ts）；空 = 默认
  collapsed?: boolean;                          // 折叠成只剩标题
  locked?: boolean;                             // 锁定：位置、大小、层级都固定，不能移除
}
export interface Board { id: string; name: string; icon?: BoardIcon; mode: BoardMode; preset?: string; cards: CardInst[] }

const KEY = 'pkd.v5.boards.v5';
const OLD_KEYS = ['pkd.v5.boards.v4'];
let uid = 0;
export const nid = (k: string) => `${k}-${Date.now().toString(36)}${(uid++).toString(36)}`;
/** 重排层级：未锁定的按给定顺序在下，锁定的按原有先后在上 */
function restack(boardId: string, freeOrder: CardInst[], topId?: string) {
  const b = boards.find((x) => x.id === boardId); if (!b) return;
  // 已锁定的按原层级叠；刚锁定的那张（topId）放在所有已锁定的之上
  const locked = b.cards.filter((x) => x.c && x.locked).sort((a, z) => (+(a.id === topId) - +(z.id === topId)) || a.c!.z - z.c!.z);
  const z = new Map([...freeOrder.filter((x) => !x.locked), ...locked].map((x, k) => [x.id, k + 1]));
  mapBoard(boardId, (bb) => ({ ...bb, cards: bb.cards.map((x) => (x.c && z.has(x.id) ? { ...x, c: { ...x.c, z: z.get(x.id)! } } : x)) }));
}
const c = (kind: string, x: number, y: number, w: number, h: number, props?: Record<string, string>, extra?: Partial<CardInst>): CardInst => ({ id: `${kind}${props?.view ? '.' + props.view : ''}-${x}-${y}`, kind, x, y, w, h, props, ...extra });
const p = (kind: string, cx: number, cy: number, cw: number, ch: number, z: number, props?: Record<string, string>, extra?: Partial<CardInst>): CardInst =>
  ({ id: `${kind}-c${cx}-${cy}`, kind, x: 0, y: 0, w: 3, h: 4, c: { x: cx, y: cy, w: cw, h: ch, z }, props, ...extra });

/** 预设 = 一组卡片 + 布局方式 + 图标。默认画板就是这些预设；新建画板也可以从预设开始 */
export const PRESETS: { id: string; name: string; icon: BoardIcon; desc: string; mode: BoardMode; cards: CardInst[] }[] = [
  {
    id: 'today', name: '今日', icon: 'sun', desc: '早上打开先看这里：日报、今天做什么、谁在等我', mode: 'grid', cards: [
      c('daily', 0, 0, 6, 9), c('today', 6, 0, 3, 9), c('approvals', 9, 0, 3, 9),
      c('decisions', 0, 9, 4, 8), c('qq', 4, 9, 4, 8, { view: 'focus' }), c('diary', 8, 9, 4, 8),
      c('quick-note', 0, 17, 3, 5), c('review', 3, 17, 5, 5), c('habits', 8, 17, 4, 5),
    ],
  },
  {
    id: 'projects', name: '项目', icon: 'folder', desc: '推进项目：状态、请求、工作项', mode: 'grid', cards: [
      c('projects', 0, 0, 8, 9), c('decisions', 8, 0, 4, 9),
      c('projects', 0, 9, 4, 9, { view: 'single', projectId: 'p01' }), c('projects', 4, 9, 4, 9, { view: 'single', projectId: 'p04' }), c('recent-docs', 8, 9, 4, 9),
    ],
  },
  {
    id: 'inputs', name: '输入', icon: 'inbox', desc: '材料从哪来、处理到哪了', mode: 'grid', cards: [
      c('inbox', 0, 0, 6, 10), c('inbox', 6, 0, 3, 10, { view: 'digest' }), c('quick-note', 9, 0, 3, 5), c('sources', 9, 5, 3, 5),
      c('favorites', 0, 10, 4, 8), c('qq', 4, 10, 4, 8, { view: 'study' }), c('inbox', 8, 10, 4, 8, { view: 'flow' }),
    ],
  },
  {
    id: 'knowledge', name: '知识', icon: 'book', desc: '懂了多少、还在想什么', mode: 'grid', cards: [
      c('knowledge', 0, 0, 7, 9), c('knowledge', 7, 0, 5, 9, { view: 'questions' }), c('knowledge', 0, 9, 5, 8, { view: 'library' }), c('diary', 5, 9, 7, 8),
      c('context', 0, 17, 6, 8), c('daily', 6, 17, 6, 8, { view: 'discover' }),
    ],
  },
  {
    id: 'body', name: '身体与工具', icon: 'heart', desc: '健康、专注、本机工具与诊断', mode: 'grid', cards: [
      c('health', 0, 0, 4, 6), c('ningshi', 4, 0, 3, 6), c('node', 7, 0, 5, 6),
      c('usage', 0, 6, 4, 6), c('cost', 4, 6, 3, 6), c('sources', 7, 6, 5, 6, { view: 'diagnostics' }),
      c('sources', 0, 12, 8, 4), c('bili-speed', 8, 12, 4, 4),
    ],
  },
  {
    id: 'desk', name: '书桌', icon: 'star', desc: '月历、正在改的文件、拖了很久的事', mode: 'grid', cards: [
      c('review', 0, 0, 3, 6, { view: 'month' }), c('today', 3, 0, 3, 6, { view: 'timeline' }), c('quick-edit', 6, 0, 6, 9),
      c('overdue', 0, 6, 3, 4), c('countdown', 3, 6, 3, 3, { title: '期末考试', date: '' }),
      c('quick-note', 0, 10, 3, 5), c('habits', 3, 9, 3, 6), c('recent-docs', 6, 9, 6, 6),
    ],
  },
  {
    id: 'collage', name: '拼贴', icon: 'shapes', desc: '像冰箱贴一样随便贴', mode: 'collage', cards: [
      p('sticky', 24, 16, 260, 210, 1, { noteId: 'n1' }, { tint: 'lemon' }),
      p('clock', 300, 8, 280, 170, 2),
      p('today', 210, 150, 420, 400, 3),
      p('countdown', 610, 40, 250, 170, 4),
      p('sticky', 660, 230, 230, 200, 5, { noteId: 'n2' }, { locked: true, tint: 'rose' }),
      p('recent-docs', 880, 20, 320, 380, 2, undefined, { tint: 'sky' }),
      p('habits', 40, 300, 280, 240, 6, undefined, { tint: 'sage' }),
      p('decisions', 600, 450, 380, 300, 1, undefined, { collapsed: true }),
    ],
  },
];
const fromPreset = (id: string, name?: string, newId?: string): Board => {
  const pr = PRESETS.find((x) => x.id === id)!;
  const cards = host && id === 'today' ? [
    c('today', 0, 0, 6, 9), c('diary', 6, 0, 3, 9), c('quick-note', 9, 0, 3, 9),
    c('projects', 0, 9, 6, 8), c('decisions', 6, 9, 3, 8), c('inbox', 9, 9, 3, 8),
  ] : pr.cards;
  return { id: newId ?? pr.id, name: name ?? pr.name, icon: pr.icon, mode: pr.mode, preset: pr.id, cards: structuredClone(cards) };
};
export const DEFAULT_BOARDS: Board[] = PRESETS.map((x) => fromPreset(x.id));

/** 旧布局（v4 及以前：today-queue、agenda、collect…）→ 新卡片 id + 视图 */
export function migrate(list: Board[]): Board[] {
  return list.map((b) => ({ ...b, cards: b.cards.map((x) => { const r = resolveKind(x.kind); return r.id === x.kind ? x : { ...x, kind: r.id, props: { ...r.props, ...x.props } }; }) }));
}
function load(): Board[] {
  try {
    const s = preferences.getItem(KEY); if (s) return migrate(JSON.parse(s));
    for (const k of OLD_KEYS) { const o = preferences.getItem(k); if (o) { const m = migrate(JSON.parse(o)); preferences.setItem(KEY, JSON.stringify(m)); return m; } }
  } catch { /* ignore */ }
  return structuredClone(DEFAULT_BOARDS);
}
/** 旧布局里锁定的卡可能被压在下面：统一成「未锁定在下、锁定在上」，各层内保持原先后 */
const normZ = (b: Board): Board => {
  const has = b.cards.filter((x) => x.c); if (!has.some((x) => x.locked)) return b;
  const order = [...has.filter((x) => !x.locked), ...has.filter((x) => x.locked)].sort((a, z) => (+!!a.locked - +!!z.locked) || a.c!.z - z.c!.z);
  const z = new Map(order.map((x, k) => [x.id, k + 1]));
  return { ...b, cards: b.cards.map((x) => (x.c ? { ...x, c: { ...x.c, z: z.get(x.id)! } } : x)) };
};
let boards: Board[] = load().map(normZ);
const ls = new Set<() => void>();
const snapshots = new Map<string, Board>();
function commit(next: Board[]) { boards = next; preferences.setItem(KEY, JSON.stringify(boards)); ls.forEach((l) => l()); }
const mapBoard = (id: string, f: (b: Board) => Board) => commit(boards.map((b) => (b.id === id ? f(b) : b)));

export function useBoards(): Board[] {
  return useSyncExternalStore((f) => { ls.add(f); return () => ls.delete(f); }, () => boards);
}
let lastBoard = sessionStorage.getItem('pkd.v5.lastBoard') ?? 'today';
export const getLastBoard = () => (boards.some((b) => b.id === lastBoard) ? lastBoard : boards[0]?.id);
export const setLastBoard = (id: string) => { lastBoard = id; sessionStorage.setItem('pkd.v5.lastBoard', id); };
export const boardPath = (id: string) => (id === boards[0]?.id ? '/' : `/b/${id}`);

export const boardStore = {
  get: () => boards,
  setCards(id: string, cards: CardInst[]) { mapBoard(id, (b) => ({ ...b, cards })); },
  patchCard(id: string, cardId: string, patch: Partial<CardInst>) { mapBoard(id, (b) => ({ ...b, cards: b.cards.map((x) => (x.id === cardId ? { ...x, ...patch } : x)) })); },
  patchProps(id: string, cardId: string, props: Record<string, string>) { mapBoard(id, (b) => ({ ...b, cards: b.cards.map((x) => (x.id === cardId ? { ...x, props: { ...x.props, ...props } } : x)) })); },
  addCard(id: string, kind: string, w: number, h: number, props?: Record<string, string>, tint?: string) {
    const b = boards.find((x) => x.id === id); if (!b) return;
    const spot = findSpot(b.cards, w, h, 12);
    const zMax = Math.max(0, ...b.cards.map((x) => x.c?.z ?? 0));
    const n = b.cards.length;
    const inst: CardInst = { id: nid(kind), kind, ...spot, w, h, props, tint, c: { x: 40 + (n % 6) * 28, y: 40 + (n % 6) * 28, w: w * 92, h: h * 52, z: zMax + 1 } };
    mapBoard(id, (x) => ({ ...x, cards: [...x.cards, inst] }));
    return inst.id;
  },
  removeCard(id: string, cardId: string): CardInst | undefined {
    const b = boards.find((x) => x.id === id); const it = b?.cards.find((x) => x.id === cardId);
    if (!it || it.locked) return;
    mapBoard(id, (x) => ({ ...x, cards: x.cards.filter((c) => c.id !== cardId) }));
    return it;
  },
  restoreCard(id: string, card: CardInst) { mapBoard(id, (b) => ({ ...b, cards: [...b.cards, card] })); },
  /**
   * 拼贴层级规则（两层）：
   *   上层 = 锁定的卡，按「锁定的先后」叠：先锁的在下，后锁的在上；
   *   下层 = 未锁定的卡，按下哪张哪张到未锁定里的最上面。
   * 所以锁定一张卡 = 把它钉到最顶层（不是钉在锁定时碰巧的上下关系）。
   */
  bringToFront(id: string, cardId: string) {
    const b = boards.find((x) => x.id === id); const t = b?.cards.find((x) => x.id === cardId);
    if (!b || !t || t.locked || !t.c) return;
    const free = b.cards.filter((x) => x.c && !x.locked).sort((a, z) => a.c!.z - z.c!.z);
    if (free[free.length - 1]?.id === cardId) return;
    restack(id, [...free.filter((x) => x.id !== cardId), t]);
  },
  /** 锁定 / 解锁。锁定时放到最顶层（在所有已锁定的卡之上）；解锁时回到未锁定那层的最上面 */
  setLocked(id: string, cardId: string, locked: boolean) {
    const b = boards.find((x) => x.id === id); const t = b?.cards.find((x) => x.id === cardId);
    if (!b || !t) return;
    mapBoard(id, (bb) => ({ ...bb, cards: bb.cards.map((x) => (x.id === cardId ? { ...x, locked } : x)) }));
    if (!t.c) return;
    const nb = boards.find((x) => x.id === id)!;
    const free = nb.cards.filter((x) => x.c && !x.locked && x.id !== cardId).sort((a, z) => a.c!.z - z.c!.z);
    restack(id, locked ? free : [...free, nb.cards.find((x) => x.id === cardId)!], locked ? cardId : undefined);
  },
  setMode(id: string, mode: BoardMode, colW: number) {
    mapBoard(id, (b) => ({
      ...b, mode,
      cards: mode === 'collage' ? b.cards.map((x, i) => x.c ? x : ({ ...x, c: { x: Math.round(x.x * (colW + 12)), y: x.y * 56, w: Math.round(x.w * colW + (x.w - 1) * 12), h: x.h * 44 + (x.h - 1) * 12, z: i + 1 } })) : b.cards,
    }));
  },
  addBoard(name: string, mode: BoardMode, preset?: string, icon?: BoardIcon) {
    const id = nid('board');
    const b: Board = preset ? fromPreset(preset, name, id) : { id, name, mode, icon: icon ?? (mode === 'collage' ? 'shapes' : 'grid'), cards: [] };
    commit([...boards, b]); return id;
  },
  patchBoard(id: string, patch: Partial<Board>) { mapBoard(id, (b) => ({ ...b, ...patch })); },
  moveBoard(id: string, dir: -1 | 1) { const i = boards.findIndex((b) => b.id === id), j = i + dir; if (i < 0 || j < 0 || j >= boards.length) return; const n = [...boards]; [n[i], n[j]] = [n[j], n[i]]; commit(n); },
  removeBoard(id: string) { if (boards.length > 1) commit(boards.filter((b) => b.id !== id)); },
  reset(id: string) { const b = boards.find((x) => x.id === id); if (b?.preset) mapBoard(id, (x) => ({ ...fromPreset(b.preset!, x.name, x.id), icon: x.icon })); },
  resetAll() { commit(structuredClone(DEFAULT_BOARDS)); },
  /** 整理模式：进入时拍快照，「取消」恢复，「完成整理」丢弃快照 */
  begin(id: string) { const b = boards.find((x) => x.id === id); if (b) snapshots.set(id, structuredClone(b)); },
  cancel(id: string) { const s = snapshots.get(id); if (s) mapBoard(id, () => s); snapshots.delete(id); },
  done(id: string) { snapshots.delete(id); },
  replaceAll(next: Board[]) { commit(migrate(next)); },
};

/* ───────── 规整布局算法（碰撞下推 + 垂直压实） ───────── */
type R = { id: string; x: number; y: number; w: number; h: number };
export const collides = (a: R, b: R) => a.id !== b.id && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function compact<T extends R>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: T[] = [];
  for (const it of sorted) {
    const n = { ...it, y: 0 };
    while (placed.some((p) => collides(n, p))) n.y++;
    placed.push(n);
  }
  return placed;
}
export function moveTo<T extends R>(items: T[], moving: R, cols: number): T[] {
  const m = { ...moving, x: Math.max(0, Math.min(cols - moving.w, moving.x)), y: Math.max(0, moving.y) };
  const others = items.filter((i) => i.id !== m.id).sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: R[] = [m];
  const out: T[] = [];
  for (const o of others) { const n = { ...o }; while (placed.some((p) => collides(n, p))) n.y++; placed.push(n); out.push(n); }
  const self = items.find((i) => i.id === m.id)!;
  return compact([...out, { ...self, ...m }]);
}
export function findSpot(items: R[], w: number, h: number, cols: number) {
  for (let y = 0; y < 400; y++) for (let x = 0; x <= cols - w; x++) {
    if (!items.some((i) => collides({ id: '_', x, y, w, h }, i))) return { x, y };
  }
  return { x: 0, y: 999 };
}
