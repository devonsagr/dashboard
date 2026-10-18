import { Route, Routes } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import ReviewPage, { ReviewWeek } from './Review';
import { CalendarMini } from './CalendarMini';

export default defineImpl({
  Card: (p) => (p.view === 'month' ? <CalendarMini /> : <ReviewWeek {...p} />),
  Page: () => <Routes><Route index element={<ReviewPage />} /><Route path=":range" element={<ReviewPage />} /></Routes>,
  Crumb: ({ seg: [r] }) => <>{({ day: '日', week: '近 7 天', month: '近 30 天' } as Record<string, string>)[r] ?? r}</>,
});
