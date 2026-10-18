# 收藏（`favorites`）

独立子项目。宿主只认两个文件：`manifest.ts`（描述）和 `index.tsx`（实现，懒加载）。登记在 `src/cards/index.ts` 一行。

- 完整说明、需求映射、验收结果：[`docs/卡片/05-收藏.md`](../../../docs/卡片/05-收藏.md)
- 私有数据：`store.ts`（`localStorage['pkd.v5.card.favorites.v1']`，样例按天重建）；界面状态 `sessionStorage['pkd.v5.fav.ui']`
- 共享对象只经 `src/data`（收件投影、行动、待采纳、项目）；不 import 别的卡
- 样例：`fixtures.ts`（全部「示例·」+ `example.com/demo`）；演示开关在 `/c/favorites/settings`

## 接后端

只替换 `store.ts` 里导出的函数（签名不变）：`startImport / finishImport / recollect / addLink / addManual / importFile / saveRecord / saveMyNotes / startRound / reviewRound / place / confirmDraft / send / batch / retryTask / cancelTask / retryBody …`。
删掉 `fixtures.ts` 引用、`EFFECTS` 计时器和 `setDemo`。界面不用改。

## 还没做的前端

真实文件选择器 · 项目「需求」类去向 · 收藏专属的冲突页面（现在走宿主统一写入表达）。
