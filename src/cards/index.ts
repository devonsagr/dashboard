/**
 * 卡片登记处：一行一张卡。顺序 = 卡片库里的显示顺序。
 * 新增一张卡：建 src/cards/<id>/（可以复制 _template），在这里加一行 import + 放进数组。
 * 删掉一张卡：删文件夹 + 删这一行；画板上已放的实例会显示「未知卡片」，可以移除，别的卡不受影响。
 * 这里只 import manifest（很轻）；实现由宿主按需加载。
 */
import today from './today/manifest';
import daily from './daily/manifest';
import context from './context/manifest';
import approvals from './approvals/manifest';
import decisions from './decisions/manifest';
import diary from './diary/manifest';
import review from './review/manifest';
import projects from './projects/manifest';
import inbox from './inbox/manifest';
import quickNote from './quick-note/manifest';
import favorites from './favorites/manifest';
import qq from './qq/manifest';
import knowledge from './knowledge/manifest';
import health from './health/manifest';
import ningshi from './ningshi/manifest';
import node from './node/manifest';
import usage from './usage/manifest';
import cost from './cost/manifest';
import sources from './sources/manifest';
import biliSpeed from './bili-speed/manifest';
import clock from './clock/manifest';
import habits from './habits/manifest';
import countdown from './countdown/manifest';
import sticky from './sticky/manifest';
import recentDocs from './recent-docs/manifest';
import quickEdit from './quick-edit/manifest';
import embed from './embed/manifest';
import overdue from './overdue/manifest';
import type { CardModule } from '../workbench/cards/protocol';

export const MODULES: CardModule[] = [
  daily, today, approvals, decisions, diary, review,
  projects,
  inbox, quickNote, favorites, qq,
  knowledge, context,
  health, ningshi, node, usage, cost, sources, biliSpeed,
  clock, habits, countdown, sticky, recentDocs, quickEdit, embed,
  overdue,
];
