# 个人知识库与仪表盘平台

基于 v5 的 React 卡片工作台。浏览器运行合成演示；Obsidian 插件直接读写现有 Vault 文件。使用原有卡片协议和样式，没有额外服务器或业务数据库。

## Obsidian 版

此版复用已安装并启用的 `jarvis-dashboard` 插件的 repository，不能脱离该插件单独运行。v5 注册独立标签页，保留原仪表盘。

已接通：

- 行动：读取、新建、编辑、项目关联、完成、排序、归档与移到废纸篓。沿用原文件格式，日期必填；删除后在 Obsidian 废纸篓恢复。
- 项目：读取状态、目标和下一步，创建项目，打开原文。
- 请求：回应、选方案、补充说明、稍后、重新打开和安排验收行动。
- 随手记：追加到原收件箱，保留原话，查看已有记录。
- 日记：按日期读取原话、生活整理版、AI 项目日志，编辑保存；外部修改后提示重新读取，保留草稿。
- 收件：查看已有随手记与收集材料、打开来源、转为行动。
- 界面：画板和外观保存在本插件配置；刷新按钮重读 Vault；最近文件显示已接入文件的修改时间。

AI 整理、平台采集、设备、健康、账单、消息处理等保留待接入状态，真实模式不会显示合成业务内容或模拟成功。请求回应只写回原文件，不自动发送给其他项目或 AI。

### 构建与安装

需要 Node.js 20.19+ 或 22.12+，推荐当前 LTS。

```bash
npm ci
npm run build:obsidian
```

将 `dist/obsidian/` 的四个文件复制到目标 Vault 的 `.obsidian/plugins/dashboard-v5/`，在 Obsidian 的第三方插件中刷新并启用 **Dashboard v5**。命令面板执行 **Dashboard v5: 打开 v5 仪表盘**，也可点击左侧新图标。

配置保存在该插件目录的 `data.json`，不属于公开仓库。首次打开默认日记根目录为 `日记`，随手记为 `系统/随手记/随手记收件箱.md`；已有知识库可在启用前写入自己的相对路径：

```json
{"preferences": {}, "diaryRoot": "日记", "scratchpad": "系统/随手记/随手记收件箱.md"}
```

行动、项目和请求的路径沿用原插件配置。其他位置的修改通过顶栏刷新读取。本版没有额外的自动采集或同步任务。

## 浏览器演示与验证

```bash
npm run dev             # http://127.0.0.1:5185
npm run typecheck
npm run check:privacy
npx playwright install chromium
npm test                # 构建 + 四套既有交互回归
npm run test:obsidian    # 合成内存 Vault 的接入验证
npm run build:obsidian  # npm run build 会清空 dist，应最后打插件包
```

Windows 可使用 `start-dev.bat`。演示数据使用 `pkd.v5.` 浏览器键，与 Obsidian 业务文件分开。写入测试只用合成数据，真实知识库做读取与界面检查。

## 项目结构与隐私

`src/cards/` 保持一张卡一个目录；`src/data/host.ts` 定义宿主入口；`obsidian/main.ts` 负责标签页和 UI 加载；`obsidian/vault.ts` 复用原 repository 和 Vault API。

公开仓库仅含代码、文档与合成示例，不包含真实 Vault 内容、本机配置、账号、密钥、原始下载包、历史截图或浏览器状态。`dist/`、`output/`、`.local/` 均被忽略。示例外链使用 `example.com`。

文档入口：[文档索引](docs/00-索引.md)、[当前交接](docs/project/当前交接.md)。既有产品与架构文档包含后续方向，实际接入范围以本页为准。
