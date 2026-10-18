/**
 * 卡片协议。仪表盘只有三层用户看得见的东西：
 *
 *   画板（Board） → 卡片（Card） → 卡片自己的完整页（/c/<卡片 id>/…）
 *
 * 一张卡片 = 一个文件夹 src/cards/<id>/ = 一个独立模块：
 *  - manifest.ts   这张卡是什么（名字、尺寸、视图、设置、数据说明）。很轻，不 import 任何界面或数据
 *  - index.tsx     实现（卡片正文 Card + 完整页 Page + 可选的标题 / 计数 / 面包屑 / 顶栏挂件），按需懒加载
 *  - 其余文件       只属于这张卡：页面、私有数据（store.ts，用 cardStore）、样例、样式、README
 * 同一件事的不同样子（比如「今日行动」的列表 / 日程）是这张卡的「视图」，不是另一张卡。
 * 卡片之间不互相 import；需要共用的东西只有两类：共享对象（src/data）和共享界面零件（src/ui）。
 * 详见 docs/架构/01-层级与目录.md、docs/前端/04-怎么新增一张卡.md
 */
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { CardInst } from '../board/store';

export type CardCategory = '轻量' | '今天' | '输入' | '项目' | '知识' | '身体与工具' | '自定义';
export type CardStatus = '样例' | '未接入' | '本地' | '不读数据';
export interface PropField {
  key: string; label: string; type: 'select' | 'text' | 'date';
  options?: { value: string; label: string }[] | (() => { value: string; label: string }[]); placeholder?: string;
  /** 只在某个视图下出现 */
  when?: string;
}
/** 卡片「属性」面里展示的数据说明：来源、存储、刷新、写回 */
export interface CardData {
  sources: string[];        // 接入源编号（见「接入源」卡）；空 = 不读外部数据
  storage: string[];        // 数据实际在哪（Vault 相对路径 / 本机服务 / 浏览器本地）
  refresh: string;          // 怎么更新
  writes?: string;          // 会写回什么（没有 = 只读）
  content?: string;         // 用户内容（便签文字、打卡）存在哪：与布局分开
}
/** 视图：同一张卡的不同样子。放到画板上时选一个，之后在「属性」里能换 */
export interface CardView { id: string; name: string; desc?: string; w?: number; h?: number; minW?: number; minH?: number }

export interface CardProps {
  inst: CardInst & { props: Record<string, string> };   // props 已合并 defaults
  view: string;                                        // 当前视图 id（没有视图的卡是 ''）
  edit: boolean;
  setProps: (p: Record<string, string>) => void;
}
type P = { props: Record<string, string> };
/** 实现：index.tsx 默认导出。只有 Card 是必须的 */
export interface CardImpl {
  Card: ComponentType<CardProps>;
  /** 完整页。挂在 /c/<id>/* 下，里面用相对路径的 <Routes> 自己分子页 */
  Page?: ComponentType;
  /** 卡片头部右侧的小字（计数等） */
  Meta?: ComponentType<P>;
  /** 动态标题（比如钉住的项目名）；没有就用 manifest.name */
  Title?: ComponentType<P>;
  /** 面包屑最后一段：seg = /c/<id>/ 之后的路径段 */
  Crumb?: ComponentType<{ seg: string[] }>;
  /** 顶栏挂件（比如收藏卡的任务窗口），manifest.topbar = true 时宿主才会加载 */
  Topbar?: ComponentType;
  /** 卡片库里这张卡下面的额外内容（比如「移除过的便签」） */
  LibraryExtra?: ComponentType<{ add: (props: Record<string, string>) => void; usedProps: Record<string, string>[] }>;
}
export interface CardModule {
  id: string; name: string; icon: LucideIcon; category: CardCategory; desc: string;
  folder: string; status: CardStatus; light?: boolean;
  w: number; h: number; minW: number; minH: number;
  views?: CardView[];
  props?: PropField[];
  defaults?: Record<string, string>;
  data: CardData;
  /** 有没有完整页（有才显示「放大」） */
  hasPage: boolean;
  /** 放大时进完整页的哪个子路径（相对 /c/<id>/），按实例设置决定 */
  pageFor?: (props: Record<string, string>) => string;
  /** 旧版卡片 kind → 这张卡 + 实例设置（迁移旧布局用） */
  aliases?: Record<string, Record<string, string>>;
  /** 与既有卡片职责对应的名称，用于兼容入口说明 */
  carries?: string[];
  topbar?: boolean;
  /** 卡片库里要不要显示它的 LibraryExtra（为 true 才会为此加载实现） */
  libraryExtra?: boolean;
  load: () => Promise<{ default: CardImpl }>;
}
export const defineCard = (m: CardModule) => m;
export const defineImpl = (i: CardImpl) => i;
