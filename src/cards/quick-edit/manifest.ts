import { FilePen } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 快捷编辑：钉住一个 MD 文件，直接在这里改 */
export default defineCard({
  id: 'quick-edit', name: '快捷编辑', icon: FilePen, category: '轻量', status: '样例', folder: 'src/cards/quick-edit', light: true,
  desc: '钉住一个 MD 文件，直接在这里改',
  w: 4, h: 6, minW: 3, minH: 4,
  data: { sources: ['V16'], storage: ['所选文件本身（Vault 内）'], refresh: '打开时读取；文件被别处改过时提示冲突', writes: '所选 MD 文件（整篇覆盖，带冲突检测）' },
  hasPage: false,
  defaults: { file: '系统/随手记/今日速记.md' }, props: [{ key: 'file', label: '文件', type: 'text', placeholder: 'Vault 内相对路径' }],
  load: () => import('./index'),
});
