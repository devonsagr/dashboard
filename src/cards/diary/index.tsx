import { Route, Routes } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import DiaryPage, { DiaryToday } from './Diary';
export default defineImpl({
  Card: DiaryToday,
  Page: () => <Routes><Route index element={<DiaryPage />} /><Route path=":date" element={<DiaryPage />} /></Routes>,
  Crumb: ({ seg: [d] }) => <>{d}</>,
});
