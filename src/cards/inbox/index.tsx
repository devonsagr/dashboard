import { Route, Routes } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { InboxStream, ToDigest, FlowLanes, unreadMeta, digestList } from './cards';
import InboxPage, { FlowPage } from './InboxPage';
import MaterialPage from './MaterialPage';
import BatchesPage from './BatchesPage';

function MatCrumb({ id }: { id: string }) { return <>{useData(() => store.mat(id)?.title) ?? id}</>; }
function Meta({ props }: { props: Record<string, string> }) {
  const u = useData(() => unreadMeta()); const d = useData((db) => digestList(db.materials).length);
  return props.view === 'flow' ? null : <>{props.view === 'digest' ? d : u}</>;
}
export default defineImpl({
  Card: (p) => (p.view === 'digest' ? <ToDigest {...p} /> : p.view === 'flow' ? <FlowLanes {...p} /> : <InboxStream {...p} />),
  Meta,
  Page: () => (
    <Routes>
      <Route index element={<InboxPage />} />
      <Route path="m/:id" element={<MaterialPage />} />
      <Route path="batches" element={<BatchesPage />} />
      <Route path="batches/:id" element={<BatchesPage />} />
      <Route path="flow" element={<FlowPage />} />
    </Routes>
  ),
  Crumb: ({ seg: [a, b] }) => (a === 'm' ? <MatCrumb id={b} /> : <>{a === 'batches' ? (b ? `批次 ${b}` : '处理批次') : a === 'flow' ? '流转' : a}</>),
});
