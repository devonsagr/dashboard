import { Route, Routes } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { TodayQueue, todayMeta } from './cards';
import { Agenda } from './Agenda';
import TodayPage from './TodayPage';
import ActionPage from './ActionPage';

function ActionCrumb({ id }: { id: string }) { return <>{useData(() => store.act(id)?.title) ?? '行动'}</>; }

export default defineImpl({
  Card: (p) => (p.view === 'timeline' ? <Agenda /> : <TodayQueue {...p} />),
  Meta: ({ props }) => { const m = useData(() => todayMeta()); return props.view === 'timeline' ? null : <>{m}</>; },
  Page: () => (
    <Routes>
      <Route index element={<TodayPage />} />
      <Route path="a/:id" element={<ActionPage />} />
      <Route path=":tab" element={<TodayPage />} />
    </Routes>
  ),
  Crumb: ({ seg: [a, b] }) => (a === 'a' ? <ActionCrumb id={b} /> : <>{a === 'timeline' ? '今天的时间线' : a}</>),
});
