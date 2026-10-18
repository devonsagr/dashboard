import { FileClock } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 最近编辑：最近改过的 Markdown，点一下在 Obsidian 打开 */
export default defineCard({
  id: 'recent-docs', name: '最近编辑', icon: FileClock, category: '轻量', status: '样例', folder: 'src/cards/recent-docs', light: true,
  desc: '最近改过的 Markdown，点一下在 Obsidian 打开',
  w: 4, h: 7, minW: 3, minH: 4,
  data: { sources: ['V01', 'V02', 'C08'], storage: ['不存储：读取 Vault 文件修改时间'], refresh: '打开时 + 文件变化时' },
  hasPage: false,
  props: [{ key: 'folder', label: '只看文件夹', type: 'select', options: ['', '示例数据/日记', '示例工程', '系统', '示例数据/资料', '示例数据/生活'].map((v) => ({ value: v, label: v || '全部' })) }],
  load: () => import('./index'),
});
