# GitHub 协作配置

> 本仓库的 issue / PR 模板与自动打标签规则。改动这些文件时同步更新本文。

## 模板

| 文件 | 用途 |
| --- | --- |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | Bug 报告；`labels: [bug]`，要求插件版本、宿主版本、复现步骤、期望/实际行为 |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | 功能建议；`labels: [enhancement]`，要求先写问题再写提案，含去重勾选 |
| `.github/ISSUE_TEMPLATE/config.yml` | 模板选择器，`blank_issues_enabled: false` 强制走模板 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 正文骨架：动机 / 改动 / 验证 / 文档与版本一致性 / 已知未验证项 / 关联 |

PR 模板里的「验证」清单对应 `AGENTS.md` 的四项自检与 CI 的
`git diff --exit-code -- client.js index.js` 产物守卫，不要删改。

`bug_report.yml` 的版本占位符写的是示例（`e.g. v0.3.1 or 296aa36`），不要写死某个
具体版本 —— 仓库发版频繁，写死的版本很快会过时。

## 自动打标签

`.github/workflows/label.yml`：

- **PR 按路径**：`actions/labeler@v5` 读 `.github/labeler.yml`，命中 `**/*.md`、
  `docs/**`、issue 模板 → `documentation`；命中 `src/features/**`、`src/ui/**` →
  `enhancement`。`sync-labels: false`，只加不删。
- **issue 按关键字**：`actions/github-script@v7` 对标题 + 正文匹配中英文关键词，
  命中 → `bug` / `enhancement` / `documentation` / `question`。无命中时不动标签。

触发事件：`issues: [opened, edited, reopened]`、
`pull_request_target: [opened, edited, synchronize, reopened]`。

### 约束

- **只使用仓库里已存在的标签**（`gh label list` 可查）。workflow 不创建标签，
  因此权限只需 `issues: write` / `pull-requests: write` / `contents: read`。
  需要更细的 `area:*` 标签时，先由人创建标签，再改 `labeler.yml`，别让 CI 隐式创建。
- `pull_request_target` 只在 base 仓库上下文运行；`actions/labeler` 通过 API 读 diff，
  **不 checkout、不执行 PR 里的代码**，因此不会对 fork PR 暴露写权限给不可信代码。
- issue 关键字正则里英文词用 `\b` 包边界、中文词单独一条正则 —— 中文不是 `\w`，
  用 `\b` 包中文会永不命中。
- `actions/github-script` 把 `script:` 包在 async 上下文执行，顶层 `await` / `return`
  是合法写法；用 `node --check` 直接校验片段会误报，需包一层 async 函数再校验。

## 验证方式

- YAML：`ruby -ryaml -e 'YAML.load_file("…")'`（本机没装 PyYAML）。
- 内嵌 JS：从 workflow 里取出 `script:` 内容，包进 `(async () => { … })()` 后
  `node --check`。
- 标签存在性：`gh label list --json name`。
- 模板/标签规则本身由 GitHub 在新建 issue / PR 时生效，本地无法完整模拟；
  合并后开一个测试 issue/PR 验证一次，再删掉测试对象。
