import { Route, Routes } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import KnowledgePage, { LandscapeCard, QuestionsCard, LibraryCard } from './Knowledge';
import { S } from './store';

function NodeCrumb({ id }: { id: string }) { return <>{S.use((d) => d.knodes.find((n) => n.id === id)?.title) ?? id}</>; }
export default defineImpl({
  Card: (p) => (p.view === 'questions' ? <QuestionsCard {...p} /> : p.view === 'library' ? <LibraryCard {...p} /> : <LandscapeCard {...p} />),
  Meta: ({ props }) => { const n = S.use((d) => d.questions.filter((q) => q.status === 'open').length); return props.view === 'questions' ? <>{n}</> : null; },
  Page: () => <Routes><Route index element={<KnowledgePage />} /><Route path="n/:id" element={<KnowledgePage />} /><Route path=":tab" element={<KnowledgePage />} /></Routes>,
  Crumb: ({ seg: [a, b] }) => (a === 'n' ? <NodeCrumb id={b} /> : <>{({ questions: '问题', library: '知识库' } as Record<string, string>)[a] ?? a}</>),
});
