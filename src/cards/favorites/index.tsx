import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { defineImpl } from '../../workbench/cards/protocol';
import { S, item, rec } from './store';
import { REC_NAME } from './model';
import { FavCard } from './ui/FavCard';
import { Workbench } from './ui/Workbench';
import { ImportPage } from './ui/Import';
import { TaskButton, TasksPage } from './ui/Tasks';
import { TrashPage } from './ui/Trash';
import { SettingsPage } from './ui/Settings';
import './fav.css';

/**
 * 收藏 · 公开入口（宿主只通过这里接入）：
 *   Card    画板紧凑卡        Page   完整工作台及子页（/c/favorites/*）
 *   Crumb   面包屑            Topbar 顶栏任务入口（离开收藏也一直在）
 */
function ItemRoute() { const { id } = useParams(); return <Workbench openId={id} />; }
function RecRoute() { const { id } = useParams(); return <Workbench openRec={id} />; }
function Meta() { const n = S.use((d) => d.items.filter((i) => !i.trashed && i.status === '待处理').length); return <>{n}</>; }
function Crumb({ seg: [a, b] }: { seg: string[] }) {
  S.use((d) => d.items.length);
  if (a === 'i') return <>{item(b)?.title ?? b}</>;
  if (a === 'r') { const r = rec(b); return <>{r ? `${REC_NAME[r.kind]} · ${item(r.itemId)?.title ?? ''}` : b}</>; }
  return <>{{ import: '导入', tasks: '任务', trash: '回收站', settings: '位置与设置' }[a] ?? a}</>;
}
export default defineImpl({
  Card: FavCard,
  Meta,
  Crumb,
  Topbar: () => <TaskButton />,
  Page: () => (
    <Routes>
      <Route index element={<Workbench />} />
      <Route path="i/:id" element={<ItemRoute />} />
      <Route path="r/:id" element={<RecRoute />} />
      <Route path="import" element={<ImportPage />} />
      <Route path="import/:platform" element={<ImportPage />} />
      <Route path="tasks" element={<TasksPage />} />
      <Route path="trash" element={<TrashPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/c/favorites" replace />} />
    </Routes>
  ),
});
