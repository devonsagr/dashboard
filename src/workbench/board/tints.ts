/**
 * 卡片底色：默认 + 9 种柔和色。只是外观偏好，存在布局里（CardInst.tint）。
 * 实际颜色由 CSS 用 color-mix 和当前底色混合，深色模式下自动变暗（styles/board.css › .card.tinted）。
 */
export const TINTS: { id: string; name: string; color: string }[] = [
  { id: '', name: '默认', color: 'var(--surface)' },
  { id: 'lemon', name: '柠檬', color: '#f3e3a1' },
  { id: 'sand', name: '沙', color: '#e6d6b8' },
  { id: 'clay', name: '陶', color: '#ebc2ad' },
  { id: 'rose', name: '蔷薇', color: '#efc4cc' },
  { id: 'plum', name: '梅', color: '#d8c8e8' },
  { id: 'sky', name: '天', color: '#c3d8ee' },
  { id: 'teal', name: '青', color: '#bde0d8' },
  { id: 'sage', name: '苔', color: '#cfe0bf' },
  { id: 'slate', name: '石', color: '#d2d5dc' },
];
export const tintColor = (id?: string) => TINTS.find((t) => t.id === (id ?? ''))?.color;
