import { Bookmark } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/**
 * 收藏：各平台的收藏 / 稍后看 / 书签 → 原始材料 → 读、批注、直接入库 → 整理 → 我的知识稿。
 * 一个独立的子项目：自己的数据（store.ts）、自己的完整页（工作台、阅读、导入、任务、回收站、位置设置）、
 * 自己的顶栏任务窗口。详见同目录 README.md 与 docs/卡片/05-收藏.md
 */
export default defineCard({
  id: 'favorites', name: '收藏', icon: Bookmark, category: '输入', status: '样例', folder: 'src/cards/favorites',
  desc: 'B站、YouTube、抖音、X、小黑盒、小红书的收藏：导入、阅读（正文 / 图片 / 字幕）、批注、直接入库、整理成知识稿',
  w: 4, h: 7, minW: 3, minH: 4,
  data: {
    sources: ['P01', 'P02', 'P03', 'P04', 'P07'],
    storage: ['系统/收藏/原始材料/<平台>/（建议，待确认）', '系统/收藏/资料/（建议，待确认）', '系统/收藏/自己处理材料/（建议，待确认）', '知识库/我的知识稿/（建议，待确认）'],
    refresh: '手动导入；导入任务在后台跑，顶栏能看到进度',
    writes: '原始材料、我的批注、入库资料、整理记录、知识稿；推送行动 / 待采纳 / 项目参考',
  },
  hasPage: true,
  aliases: { collect: {} },
  carries: ['信息收集'],
  topbar: true,
  load: () => import('./index'),
});
