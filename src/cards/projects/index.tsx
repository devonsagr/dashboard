import { Route, Routes } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { ProjectsRoom, ProjectSingle } from './cards';
import ProjectsPage from './ProjectsPage';

const TAB: Record<string, string> = { follow: '跟进', work: '工作项', eng: '工程', handoff: '交接', links: '关联' };
function ProjCrumb({ id, tab }: { id: string; tab?: string }) { const n = useData(() => store.proj(id)?.name) ?? id; return <>{n}{tab ? ' · ' + (TAB[tab] ?? tab) : ''}</>; }
export default defineImpl({
  Card: (p) => (p.view === 'single' ? <ProjectSingle {...p} /> : <ProjectsRoom {...p} />),
  Title: ({ props }) => { const n = useData(() => store.proj(props.projectId)?.name); return <>{props.view === 'single' ? n ?? '单个项目' : '项目'}</>; },
  Meta: ({ props }) => { const n = useData((db) => db.projects.filter((p) => p.status !== '已归档').length); return props.view === 'single' ? null : <>{n}</>; },
  Page: () => <Routes><Route index element={<ProjectsPage />} /><Route path=":id" element={<ProjectsPage />} /><Route path=":id/:tab" element={<ProjectsPage />} /></Routes>,
  Crumb: ({ seg: [id, tab] }) => <ProjCrumb id={id} tab={tab} />,
});
