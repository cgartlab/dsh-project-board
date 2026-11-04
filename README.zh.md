# dsh-project-board

[![check](https://github.com/cgartlab/dsh-project-board/actions/workflows/check.yml/badge.svg)](https://github.com/cgartlab/dsh-project-board/actions/workflows/check.yml)
[![license: CC BY-NC-SA 4.0](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[English](README.md) | 中文

一个 [DeepSeek Harness](https://deepseek.com) 客户端插件，把 Harness 变成项目感知的工作台：
原生右侧栏的全局项目/会话看板、浮动会话 HUD、键盘优先的会话导航、按住即滚的长对话阅读，
以及桌面级的任务通知。

## 功能

- **项目看板** —— 会话与项目两种数据库视图，支持搜索、状态/类型/项目筛选、分组、多列排序、
  归档感知的行，以及每个项目自定义图标与颜色。支持窄（380px）、中（50vw）、原生全屏三种呈现，
  同一个键打开、再按关闭。
- **浮会话 HUD** —— 实时展示活跃/最近会话、计时、待处理提醒、自动化任务标记，可拖拽移动，
  胶囊 ⇄ 列表带动画收起展开。
- **搜索面板** —— 模糊搜索会话、按项目限定范围、键盘导航、跳转到会话。
- **按住滚动阅读** —— 按住快捷键平滑滚动对话，在到达边界前自动预载更早历史；
  当聊天视图回弹位置写入时，退化为按消息锚点分步上移。
- **任务通知** —— 会话完成、等待回答或请求权限时，在会话面板右下角弹出应用内卡片并播放提示音；
  应用在后台时改用系统通知，并完整带出问题文本与全部选项。
- **快捷键冲突检测** —— 录入与插件自身或 DSH 内置命令重复的组合会被当场拒绝，
  已保存的冲突会在启动时与设置页中提示。

## 快捷键

所有快捷键都可在 **设置 → 项目看板设置** 中修改。默认值：

| 快捷键 | 行为 |
| --- | --- |
| `Alt+K` | 搜索会话 |
| `Alt+I` / `Alt+,` | 上一个 / 下一个会话 |
| `Alt+U` / `Alt+M` | 上一条 / 下一条用户指令（点按跳转，按住滚动） |
| `Alt+S` | 滚动到底并聚焦输入框 |
| `Alt+D` | 会话操作弹窗（归档、取消运行中的回合、客户端支持时删除） |
| `Alt+N` / `Alt+B` / `Alt+V` | 看板窄 / 中 / 全屏，同键关闭 |
| `Alt+R` | 重命名当前会话 |
| `Alt+E` | 收起 / 展开浮会话列表 |
| `Alt+Enter` | 把最早一条排队消息插话发送到运行中的回合 |

## 环境要求

- 支持客户端插件的 DeepSeek Harness 构建，并带有 `dsh-client-ui-sidebar`、
  `dsh-client-ui-workspace`、`dsh-client-ui-session` 客户端包。
- Node.js 18+ 仅用于仓库检查；插件本身由 Harness 加载。

## 安装

以本地链接方式安装（不发布到 npm）：

```powershell
plugin_manager install_bundle target="<本仓库路径>"
```

`package.json` 暴露 `dsh.bundle.patch` 与 `dsh.client`；插件注入
`conversation.header.leading`、`conversation.session.header.utilities`、
`conversation.composer.dock`、`shell.overlay` 和 `settings.section`。

## 实现方式

插件是一个客户端 bundle（`client.js`），通过 Harness 客户端模块加载器加载，只使用公开客户端能力
（`ctx.slots`、`ctx.sidebarRight`、`ctx.layout`、`ctx.get('workspaces')`、会话状态 store）
以及宿主提供的 React，自身没有运行时依赖；宿主侧 `index.js` 刻意保持 no-op。

- `client.js` —— 全部界面：看板、HUD、搜索面板、快捷键、通知、设置页
- `index.js` —— 宿主侧（no-op）
- `cordis.patch.yml` —— bundle 插入声明
- `locale/` —— zh/en 尾部字符串
- `scripts/` —— 本地与 CI 使用的清单、语法、i18n 检查

## 已知限制

- 会话删除取决于客户端契约；当前 DeepSeek Harness 构建只开放归档与取消运行中的回合，
  因此会话弹窗会禁用删除并提示改用归档。
- 归档仍在运行的会话会被宿主拒绝，弹窗会显示错误而不是强行执行。
- 系统通知受操作系统/浏览器通知权限影响，提示音受 Harness WebView 的自动播放策略影响。
- 插件面向当前客户端插槽与服务接口；若 Harness 更新重命名这些插槽，需要同步更新插件。

## 开发

```bash
node scripts/check-bundle.cjs   # 清单、exports、语法
node scripts/check-i18n.cjs     # zh/en 字典一致性（含间接引用键）
node --test test/load.test.cjs  # bundle 在打桩宿主服务下加载并挂载
```

这些检查都会在每次推送和 PR 时由 CI 执行（`.github/workflows/check.yml`）。

## 协议

采用 [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)，
与 [cgartlab.com](https://cgartlab.com) 相同。

Copyright (c) 2025-2026 CGArtLab.
