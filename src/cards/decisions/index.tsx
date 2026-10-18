import { Route, Routes } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { Decisions } from './cards';
import DecisionsPage from './DecisionsPage';

function DecCrumb({ id }: { id: string }) { return <>{useData(() => store.dec(id)?.title) ?? id}</>; }
export default defineImpl({
  Card: Decisions,
  Meta: () => <>{useData(() => store.openDecisions().length)}</>,
  Page: () => <Routes><Route index element={<DecisionsPage />} /><Route path=":id" element={<DecisionsPage />} /></Routes>,
  Crumb: ({ seg: [id] }) => <DecCrumb id={id} />,
});
