import { FolderKanban } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';
import { store } from '../../data';

/** 项目：所有项目的控制室；「单个项目」视图把一个项目钉在画板上 */
export default defineCard({
  id: 'projects', name: '项目', icon: FolderKanban, category: '项目', status: '样例', folder: 'src/cards/projects',
  desc: '项目状态、下一步由谁做、卡点、数据新旧；也可以只钉一个项目',
  w: 8, h: 9, minW: 4, minH: 4,
  views: [
    { id: 'room', name: '控制室', desc: '所有项目' },
    { id: 'single', name: '单个项目', desc: '钉住一个项目', w: 4, h: 9, minW: 3, minH: 5 },
  ],
  props: [{ key: 'projectId', label: '项目', type: 'select', when: 'single', options: () => store.db.projects.map((p) => ({ value: p.id, label: p.name })) }],
  defaults: { projectId: 'p01' },
  data: { sources: ['C03', 'C04', 'V02'], storage: ['系统/项目/<项目>.md（投影）', '各项目 docs/project/（权威）', '未配置（示例） 工程服务'], refresh: '半自动：普通读取随时；AI 语义刷新手动触发', writes: '只读（回应走「待我决策」）' },
  hasPage: true, pageFor: (p) => (p.view === 'single' ? p.projectId : ''),
  aliases: { 'projects-room': { view: 'room' }, 'project-single': { view: 'single' } },
  carries: ['项目雷达', '工程总览'],
  load: () => import('./index'),
});
