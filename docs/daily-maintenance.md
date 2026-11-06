# 每日维护：固定 Agent 团队与工作流

> 本文是「每天定时同步 main + 巡检 + 修复 + 推补丁」的可重建说明。定时任务与团队成员
> 都绑定在**当前 Agent 会话**内；会话关闭后，按本文重建即可，不依赖对话记忆。

## 定时任务

- 时间：每天 **09:00（Asia/Shanghai）**。
- 类型：当前会话的每日提醒，到期把维护 prompt 作为一轮任务投递。
- 标题：同步 main 分支并巡检修复插件。
- 完整 prompt 见会话中的 schedule（id `schedule-acac5041-2e65-4873-ad03-1c7ab5d5f6f0`）；
  本文的「工作流」一节与它一致，改流程时两边一起改。
- ⚠️ 会话级限制：会话结束提醒可能失效。需要真正长期无人值守时，用系统级调度
  （launchd / cron）触发一个能启动 Agent 会话的命令，或在新会话里按本文重建。

## 固定团队（4 人）

用 `spawn_teammate` 创建，`context: fresh`，prompt 自包含；`target` 用于 `send_message`。

| 成员 | 职责 | 写范围 |
| --- | --- | --- |
| `main-sync` | `git fetch` / rebase 或 ff-only 同步、ahead/behind、版本与 CHANGELOG 一致性 | 无（只读 + git refs） |
| `macos-compat` | macOS 兼容性只读检查：IS_MAC、⌥ 标签与规范顺序、安全区与全屏、Option/Command 物理键、真实 GUI 0 错误 | 无 |
| `feature-audit` | 全功能回归只读检查：四项自检、功能矩阵、i18n、文档一致性、真实 GUI、远程外部足迹 | 无（可跑命令） |
| `patch-delivery` | 汇总去重定级、修复、bump patch、重建产物、提交、推送准备 | `src/`、`package*.json`、`CHANGELOG.md`、`README*.md`、`test/*`、`docs/*`、`client.js`、`index.js` |

**为什么只有一个写者**：`src/` 里多个模块会一起改（combos / styles / i18n / apply / features），
并发写同一批文件必然冲突。三名检查员只读 + 产出问题清单，由 `patch-delivery` 串行修复。

用 `team_task_create` 建任务、在 `write_scopes` 声明范围、按依赖顺序派发；检查员的
`send_message` 结果作为修复依据，Lead 不重做它们的检查。

## 工作流

1. **同步**（`main-sync`）
   - `git fetch origin`，失败最多重试 2 次；仍失败写「没查成」+ 原始错误，**禁止写成「无更新」**。
   - 当前分支相对 `origin/main` 有独有提交（日常补丁分支）→ `git rebase origin/main`；
     冲突立即停止上报，绝不 merge、绝不 force。无独有提交 → `git pull --ff-only`。
   - 报告 ahead/behind 与 `package.json` / `package-lock.json` / `CHANGELOG.md` 版本一致性。
2. **并行只读检查**（`macos-compat` + `feature-audit`）
   - macOS 域：IS_MAC 检测优先级、`⌥/⌃/⇧/⌘` 与规范顺序、`--dsh-frame-top-clearance`
     （48px + 20px，全屏 20px）、HUD 120px 设计位置、Option/Command 键、无硬编码 `Alt+`。
   - 功能域：`npm run typecheck` / `build` / `check` / `npm test`、快捷键全套、看板/HUD/
     通知/设置、双语键数量、文档与代码一致性、真实 GUI 挂载与 0 控制台错误、远程 tag/Release/CI 是否真跑。
   - 每份清单明确区分「已验证 / 没查成 / 未验证」。
3. **修复与补丁**（`patch-delivery`）
   - 只修有真实证据的问题；**改动必须落在 `src/`**，`client.js` / `index.js` 是生成物，
     改了会被下次 build 覆盖且 CI 报产物不一致。
   - 改完 `npm run build`；有用户可见改动时 bump patch 版本
     （`package.json` + `package-lock.json` + `CHANGELOG.md`），重建产物并一起提交。
   - 四项自检全绿，且重建产物字节一致（CI 的 `git diff --exit-code client.js index.js`）；
     绿不了如实报告阻塞，不硬提交、不删测试绕过检查。
   - 一次一个意图提交，Conventional Commits，身份 `a-pc-dsh`。
4. **推送**（用户已授权无人值守执行）
   - 推到独立分支，名字用 `fix/` `feat/` `docs/` `chore/` 前缀（工作区 hooks 会校验），
     例如 `fix/daily-YYYYMMDD`。
   - `gh pr create` 开 PR 到 `main`，正文含动机 / 改动 / 验证 / 文档与版本一致性 / 关联。
   - 开 PR 前查同 head 是否已有开放 PR，避免重复；远程失败最多重试 2 次，仍失败写「没查成」。
   - **不直接 push 到 main、不自动合并任何 PR**。
5. **收尾报告**：同步到哪个 commit、发现/修复了什么、自检结果、PR 编号、未验证项、待人工处理项。

## 安全边界

- 不改写远程历史、不 force push、不删分支、不改 `~/.dsh/profiles/desktop`、不自动合并 PR。
- 远程不可逆动作只在「用户明确授权 + 执行点确认」后执行；定时任务的授权范围仅限
  「推独立分支 + 开 PR」。
- 网络 / CI / 凭据查询失败必须写明「没查成」及原始错误，不得写成「没有」。

## 仓库规则速查（0.3.0 起）

- 源码 `src/`（TypeScript，strict），产物 `client.js` / `index.js` 由 esbuild 生成。
- 只改 `src/` + `npm run build`；改版本必须重建产物（banner 带版本）。
- 任何用户可见文案 zh + en 都要有；`en: Record<keyof typeof zh, string>` 让缺键编译失败。
- 每次行为修复配一条回归测试；修 bug 把「为什么会发生」写进 `LESSONS.md`。
- 分支与提交规约、发布流程见根目录 `AGENTS.md` / `LESSONS.md`。
