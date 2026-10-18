import { Route, Routes } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import SourcesPage, { SourceHealthCard, DiagnosticsCard, SourceDetail, DiagnosticsPage } from './Sources';

export default defineImpl({
  Card: (p) => (p.view === 'diagnostics' ? <DiagnosticsCard /> : <SourceHealthCard />),
  Page: () => <Routes><Route index element={<SourcesPage />} /><Route path="diagnostics" element={<DiagnosticsPage />} /><Route path=":id" element={<SourceDetail />} /></Routes>,
  Crumb: ({ seg: [a] }) => <>{a === 'diagnostics' ? '数据诊断' : a}</>,
});
