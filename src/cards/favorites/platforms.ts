import type { Platform } from './model';

/** 平台能力与限制（展示用；真实能力等后端接入后按实际结果说明） */
export interface PlatformInfo { id: Platform; name: string; short: string; scope: string; can: string; limits: string[]; methods: string[]; compat?: boolean; video: boolean }
export const PLATFORMS: PlatformInfo[] = [
  { id: 'bili', name: 'B站', short: 'B', scope: '自建收藏夹（先选夹）', can: '视频、平台字幕或机器转写、简介', video: true,
    limits: ['失效视频只剩标题', '分P 视频可能只取到第一P', '字幕 / 音频可能取不到', '他人订阅的收藏夹默认不算范围'], methods: ['账号登录（保存后复用）', '沿用常用 Chrome（可选）', '导入清单'] },
  { id: 'yt', name: 'YouTube', short: 'Y', scope: '本人可访问的播放列表 / 稍后观看', can: '视频、字幕或机器转写', video: true,
    limits: ['私有、地区、年龄限制', '列表范围按实际读到的说明', '自动字幕是机器生成'], methods: ['账号登录', '沿用常用 Chrome（可选）', '导入清单'] },
  { id: 'douyin', name: '抖音', short: '抖', scope: '本人收藏（需确认收藏标签）', can: '视频文字、字幕或机器转写；图文笔记', video: true,
    limits: ['收藏标签必须确认', '播放地址会过期', '逐句定位可能不可用', '图文与视频分别表达'], methods: ['账号登录', '导入清单'] },
  { id: 'x', name: 'X', short: 'X', scope: '本人书签', can: '正文、图片、实际取得的回复', video: false,
    limits: ['视频通常只有原链接', '回复 / 线程不承诺全量'], methods: ['沿用常用 Chrome（可选）', '书签导出文件'] },
  { id: 'xhh', name: '小黑盒', short: '黑', scope: '本人收藏', can: '文章、顶部图集、段中图、已加载评论', video: false,
    limits: ['只有标题不算取得正文', '纯视频可能只有原链接', '平台验证需本人处理'], methods: ['账号登录', '沿用常用 Chrome（可选）'] },
  { id: 'xhs', name: '小红书', short: '红', scope: '本人收藏标签', can: '正文、图集、实际取得的评论', video: false,
    limits: ['不把发布内容或推荐流当收藏', '视频仅链接时会标明', '页面差异可能受限'], methods: ['账号登录', '沿用常用 Chrome（可选）'] },
  { id: 'reddit', name: 'Reddit', short: 'R', scope: 'saved（宿主已有的兼容入口）', can: '帖子正文、部分评论', video: false, compat: true,
    limits: ['宿主旧来源的兼容入口，未按本卡标准验证', '只有受限小样'], methods: ['受限小样'] },
  { id: 'web', name: '网页链接', short: '链', scope: '你主动粘贴的链接（默认非收藏）', can: '以实际取得的内容为准', video: false,
    limits: ['不是任何平台的收藏', '能力以实际取得为准'], methods: ['粘贴链接', '人工补充'] },
];
export const PF = Object.fromEntries(PLATFORMS.map((p) => [p.id, p])) as Record<Platform, PlatformInfo>;
export const MAIN_PLATFORMS = PLATFORMS.filter((p) => !p.compat && p.id !== 'web');
