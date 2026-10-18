import { NotebookPen } from 'lucide-react';
import { defineCard } from '../../workbench/cards/protocol';

/** 日记：一天三份文件（原话 / 生活整理版 / AI 项目日志）。日记文件是共享对象（复盘也读） */
export default defineCard({
  id: 'diary', name: '日记', icon: NotebookPen, category: '今天', status: '样例', folder: 'src/cards/diary',
  desc: '今天三份日记文件的状态和原话开头',
  w: 5, h: 7, minW: 3, minH: 4,
  data: { sources: ['C11'], storage: ['示例数据/日记/YYYY-MM/上半月|下半月/YYYY-MM-DD/YYYY-MM-DD_用户原文.md', '…_生活日记整理版.md', '…_AI项目日志.md'], refresh: '文件变化时', writes: '直接编辑三份文件（带冲突检测）' },
  hasPage: true,
  aliases: { 'diary-today': {} },
  carries: ['日记接入'],
  load: () => import('./index'),
});
