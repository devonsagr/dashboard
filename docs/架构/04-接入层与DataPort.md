# 架构 04 · 接入层与 DataPort

> **后端实现两类函数**（保持签名）：共享对象的 `src/data/store.ts`，以及每张卡自己的 `src/cards/<id>/store.ts`（只有有私有数据的卡才有）。界面通过 `useData(select)` 读，通过 `store.xxx()` 写，从不直接碰文件、HTTP 或样例。

## 当前实现（样例）

- `sample.ts` 生成一份内存数据库 `db`（时间按“今天”动态生成，Asia/Hong_Kong）；保存在 `localStorage['pkd.v5.sample.v5']`，跨天自动重建。
- `write()` 模拟 420–680ms 延迟，并按 `pkd.v5.sim.v1`（样例药丸里的模拟开关）返回 ok / failed / unknown / conflict。
- `subscribe / getVersion` + `useSyncExternalStore`：任何写入成功后 `emit()`，所有订阅的卡片刷新。

## 替换步骤（建议）

1. 保持 `types.ts` 不变，新建 `data/port/obsidian.ts`（名字随意），实现同名函数；
2. `store.ts` 里把 `db` 改为由后端加载（启动时读取，文件变化时增量刷新并 `emit()`）；
3. `write()` 改为：调用后端 → 等确认 → 成功后**重新读取受影响对象**（而不是本地 `apply`）→ `emit()`；
4. 删除 `sample.ts` 的引用与样例药丸（或保留为“演示模式”开关）；
5. 每张卡 `status` 从“样例”改为真实状态（`src/cards/<id>/manifest.ts` 的 `status`）。

## 读取（查询函数）

| 函数 | 返回 |
| --- | --- |
| `db.*` 通过 `useData((db)=>…)` | `sources` `materials` `approvals` `actions` `decisions` `projects` `platforms` `collectRuns` `qqGroups` `qqRuns` `batches` `diary` `knodes` `library` `questions` `dayMeta` `reflections` `ningshi` `node` `usage` `health` `costs` `diagnostics` `recentDocs` `files` `receipts`（`generatedFor` 只用于样例按天重建） |
| `mat / act / dec / proj / appr / src (id)` | 单个对象 |
| `mainState(m)` `undigested(m)` `sectionOf(a)` | 派生状态（纯函数，后端不用实现） |
| `liveActions()` `openDecisions()` `pendingApprovals()` | 常用过滤 |

## 写入（命令函数）——每个都返回 `Promise<Receipt>`

| 分组 | 函数 | 写到哪（现有落点，见 05） |
| --- | --- | --- |
| 随手记 | `capture(text, type)` | `系统/随手记/随手记收件箱.md` 追加一条，带 `^块ID` |
| 材料事实 | `markRead` `saveNote` `confirmDigest` `undoDigest` `setLater` `archiveMat` | 处理侧记录（`系统/收集处理/<来源>/`），**不改原文** |
| 材料去向 | `toKnowledge` `linkProject` `unlinkProject` `materialToAction` `attachToAction` `pushApproval` | 知识库 / 项目投影 / 行动 / 待采纳 |
| 待采纳 | `decideApproval(id, adopted/rejected/later/pending, reason?, date?)` | 采纳生成 `系统/行动/<id>.md` |
| 行动 | `createAction` `updateAction` `toggleDone` `archiveAction` `deleteAction` `reorder` | `系统/行动/*.md` |
| 请求 | `respond(id, {kind, optionId?, text, verify?})` `reopen` `scheduleCheck` | 写回原请求 `系统/需要我/*.md` |
| 收集 | `startCollect(platform, mode)` `collectQQ(groupIds, mode)` | `系统/信息收集/原始导出/<平台>/`、QQ 批次目录 |
| 批次 | `createBatch` `confirmBatch` `retryItem` `recheckItem` | `系统/收集处理/批次/` |
| 日记 | `saveDiary(date, kind, text)` `ensureDiaryDay(date)` `saveFile(path, text)` | `示例数据/日记/YYYY-MM/上半月或下半月/YYYY-MM-DD/…` |
| 知识 | `setKnown` `saveNodeBody` `answerQuestion` `addQuestion` | `系统/知识景观/*.md` |
| 复盘 | `saveReflection(key, text)` | `系统/复盘/`（建议，待确认） |
| 专注计时 | `ningshiCmd(开始/暂停/继续/停止, goal?)` `ningshiReconnect` | 专注计时本机 API（runtime） |
| 节点 | `nodeCmd(...)` `setAutoRoute` `switchNode` `setNodeRange` | 节点监控本机 API（runtime）；`setNodeRange` 只是视图 |
| 演示 | `resetSample` `getSim` `setSim` | 只在样例模式存在 |

## 每张卡的私有数据（`cardStore`）

`src/data/cardStore.ts` 给每张卡一个独立的小数据库：`S.use(sel)` 读，`S.write(op, label, fn)` 写（走同一套写入语义与回执）。接入时**一张卡一张卡地换**，换一张不影响别的：

| 卡片 | 私有数据 | 接入后来自 |
| --- | --- | --- |
| `favorites` 收藏 | 原始材料、第一层记录、AI 轮次、任务、导入记录、草稿、位置设置 | 各平台采集器 / 转写 / 模型 / Vault；详见 [卡片/05-收藏](../卡片/05-收藏.md) §8 |
| `qq` | 群白名单、收集批次 | QQ 存档服务 |
| `inbox` | 处理批次、筛选状态 | `系统/收集处理/` |
| `knowledge` `review` | 节点展开、复盘草稿 | `系统/知识景观/`、`系统/复盘/`（建议） |
| `ningshi` `node` `usage` | 运行时快照 | 各自本机 API |
| `health` `cost` `sources` | 导入状态、账单、源设置 | Health Sync CSV、账单文件、`系统/界面/接入设置.json`（建议） |
| `recent-docs` `quick-edit` | 文件列表、草稿 | Vault |
| `sticky` `habits`（`content: true`） | 用户内容 | `系统/界面/便签.json`、`系统/打卡/`（建议） |

收藏用到共享层的地方只有一个新函数 `upsertProjection(material)`：把收藏条目投影成收件材料（同 id 覆盖），然后复用已有的 `materialToAction / attachToAction / pushApproval / linkProject`。

## 后端最少要提供

1. **读**：每类对象的列表 + 单个；每个源的 `health / lastReadAt / asOf`。
2. **写**：上表命令；返回真实路径与对象 id；冲突检测（读取时带版本 / mtime，写入时比对）。
3. **变化通知**：Vault 文件变化 → 推送受影响对象（Obsidian 里可用 `vault.on('modify')`）。
4. **运行时代理**：专注计时 / 节点 / 使用时长的本机 API 状态与心跳。

## 不要做

- 不要让界面直接 `fetch` 或读文件——都经过 store。
- 不要在后端补默认值让界面“看起来完整”：缺就是缺（见 [07-规则边界](07-规则边界.md)）。
