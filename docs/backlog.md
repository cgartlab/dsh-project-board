# 待办与可选改进（backlog）

这个文件记录"还没做，但值得做"的点，避免有价值的工作散落在关闭的 PR 里。

## 来源：PR #1（work/local-13-commits）

PR #1 是一条与主分支并行的本地开发线（当时版本 1.0.1–1.0.4），和主分支改动严重重叠，
已作为"被主分支取代"关闭。主分支后来用另一套实现覆盖了大部分重叠功能，下面这些是主分支
**目前还没有**、但 PR 里已经有原型的点。需要时可以直接对照分支 `work/local-13-commits`
里的对应提交取用。

| 改进 | 说明 | 参考提交 |
| --- | --- | --- |
| macOS 快捷键符号 | 在 macOS 上把 `Alt+…` 显示成 `⌥+…`，并按 Control → Alt → Shift → Meta 的规范顺序显示 | `1370b5b`、`757273c` |
| macOS 顶部安全区 | HUD / 通知 / 搜索面板 / 弹窗避开窗口顶部按钮区，读取 DSH 的 `--dsh-frame-top-clearance`（普通 48px+20px，全屏 20px） | `6b1b873` |
| 失败通知 | 区分"任务完成"和"任务失败"；失败时把原因（回合错误行或会话快照的 `lastAgentError` / `promptError`）写进通知正文 | `13d09c0`、`3590c23`、`82ddb22` |
| 本地化审批原因 | 审批原因可能是 `{en,zh}` 对象，需要取出可读文本，避免通知里出现 `[object Object]` | `fabfe51` |
| 停止运行中的回合 | 会话操作弹窗里增加"停止回合"，调用 `remote.session.cancel` | `0eb1948` |
| ChatViewport 精确滚动 | 通过 DSH 的 ChatViewport owner API（`write()` / `metrics()` / `scrollToTurn()`）驱动滚动；主分支目前是 `scrollTop` 写入 + wheel 信号，能用但更依赖 DOM 细节 | `6f0c934` |
| 文档/版本一致性检查 | 在 `scripts/check-bundle.cjs` 里校验 README、CHANGELOG 与 `package.json` 版本一致 | `0450c98` |

## 选用建议

- 优先级最高：失败通知（日常最有用）、停止回合（操作闭环）。
- 其次是 macOS 快捷键符号与顶部安全区（只在 mac 上体现，但影响观感）。
- ChatViewport 改造属于大改，建议单独开分支验证后再合，不要和当前实现混在一起。

## 维护约定

- 从 backlog 拿走一项时，请在 PR 或提交里注明"来自 backlog"。
- 已完成的条目直接从本文件删除，并在 CHANGELOG 的 `[未发布]` 里记一笔。
