import { HashRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { host } from '../../data/host';
import Shell from './Shell';
import { OverlayProvider } from './overlay';
import { CardPage } from '../cards/host';
import BoardPage from '../pages/BoardPage';
import AllCards from '../pages/AllCards';
import Settings from '../pages/Settings';

/**
 * 路由只有四种：
 *   /、/b/:boardId     画板
 *   /c/:cardId/*       某张卡自己的完整页（子路由由卡片自己定）
 *   /cards、/settings  全部卡片、设置
 * 浏览器用 HashRouter；Obsidian 内存路由不改宿主地址。
 */
const LEGACY: [string, string][] = [
  ['/today/approvals', '/c/approvals'], ['/today', '/c/today'], ['/decisions', '/c/decisions'], ['/projects', '/c/projects'], ['/inbox', '/c/inbox'], ['/flow', '/c/inbox/flow'],
  ['/collect', '/c/favorites'], ['/qq', '/c/qq'], ['/diary', '/c/diary'], ['/knowledge', '/c/knowledge'], ['/review', '/c/review'], ['/runtime/ningshi', '/c/ningshi'],
  ['/runtime/node', '/c/node'], ['/runtime/usage', '/c/usage'], ['/runtime/bili', '/c/bili-speed'], ['/health', '/c/health'], ['/cost', '/c/cost'],
  ['/diagnostics', '/c/sources/diagnostics'], ['/sources', '/c/sources'],
];
/** 旧版地址（v3 及以前的 /today、/collect…）自动转到新地址；不认识的回画板 */
function Legacy() {
  const { pathname, search } = useLocation();
  const hit = LEGACY.find(([a]) => pathname === a || pathname.startsWith(a + '/'));
  if (!hit) return <BoardPage />;
  let rest = pathname.slice(hit[0].length);
  if (hit[0] === '/collect') rest = rest ? `/import${rest}` : '';   // /collect/:platform → 收藏的平台导入页
  return <Navigate replace to={hit[1] + rest + search} />;
}
export default function App() {
  const Router = host ? MemoryRouter : HashRouter;
  return (
    <Router>
      <OverlayProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<BoardPage />} />
            <Route path="b/:boardId" element={<BoardPage />} />
            <Route path="c/:cardId/*" element={<CardPage />} />
            <Route path="cards" element={<AllCards />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Legacy />} />
          </Route>
        </Routes>
      </OverlayProvider>
    </Router>
  );
}
