# 设计审阅汇总 — dsh-tac

> 日期：2026-11-06。审阅视角：架构（architect）、逻辑正确性（reviewer）、UX/交互（designer）。
> 三份独立清单合并去重后，按主题分组。每条 = 严重度 + 标题 + 说明 + 方向。
> 这是**审阅结论、非改动**；是否修、怎么修、优先级由后续讨论决定。

## 汇总统计

- 架构 22 条（高 5 / 中 12 / 低 5）
- 逻辑 20 条（高 3 / 中 11 / 低 6）
- UX 22 条（高 3 / 中 13 / 低 6）

三份清单有重叠（硬编码颜色、热重载监听、isExpanded、超大组件、快捷键冲突、可访问性），
已合并去重。下面按「是否值得动手」的讨论主题重组。

---

## A. 结构性与可维护性（要不要拆）

- **[高] `apply.ts`（891 行）是上帝文件**：同时建字典/样式/全部 store、实现原生看板/侧栏动作、写诊断日志、注册 13 个插槽。任何动作改动都要碰它，且反向依赖所有 feature。
  → 方向：原生动作抽 `core/board-actions.ts`；插槽注册拆成每 feature 一个 `register()`；apply 只编排。
- **[高] 超大组件**：`hud.ts`（1082）/`board.ts`（972）/`apply.ts`（891）/`palette.ts`（574），合计约 3519 行，占源码大半。
  → 方向：至少先拆 `hud.ts` 的 dock/让位 与 `board.ts` 的双视图。
- **[中] `hud.ts` 一个组件兼做六件事**（状态、布局、设置、拖拽、dock、让位）。
  → 方向：dock/restore+让位抽 `core/hud-dock.ts`；计时抽 `useRunTimers`；主组件只渲染行。
- **[中] `board.ts` 把数据表视图与项目卡视图揉在一处**，`view` 状态切两套 sort/filter/render。
  → 方向：拆 `BoardProjectsView` / `BoardSessionsView`，共享数据归一化。
- **[中] 快捷键分发写在 `palette.ts` 的 useEffect 里**，与面板 UI 同文件，且依赖一堆 ref。
  → 方向：抽 `core/keyboard-dispatcher.ts` 纯函数（入参 `{combo,gated,actions}`）。
- **[中] 快捷键「五处同步」仍是人工约定，无编译检查强制**。
  → 方向：加 `scripts/check-shortcuts.cjs` 从 `constants.ts` 派生，断言 README/设置页/测试覆盖同一集合。
- **[低] `BOARD_WIDTH_KEY` 在 apply.ts 内定义，未与其它存储键集中**。
  → 方向：移进 `constants.ts` 与 HUD 键并列。
- **[低] `NO_SCHEDULE_HOOK` 导出但从未被引用**（core/schedule.ts:150）——死代码。
  → 方向：删除。

## B. 状态管理与生命周期（热重载 / 泄漏）

- **[高] 热重载后残留监听/定时器未走 `ctx.effect`**：`installChatScrollListeners()`（window.addEventListener 三条）与 `apply.ts` 裸 `setTimeout` 诊断，不在 cleanup 里。LESSONS 已把热重载列为核心坑，但只处理了快捷键的 `pbxSidebarActed`，这两处同类未覆盖。
  → 方向：包进 `ctx.effect` 返回 cleanup；`installChatScrollListeners` 改为返回 dispose。
- **[中] 多个 `useEffect` 以 `config.hud.enabled` 为依赖**，disable/enable 时反复重建整套监听器。
  → 方向：收敛到一个常驻 effect，内部用 ref 读最新 enabled。
- **[中] `createUiStore` 浅快照 + 手动 `Object.assign`**，嵌套对象需整体替换，易漏 seq/字段。
  → 方向：加 `patch(path,value)` 或 immutable update 助手。
- **[中] `notificationAudio` 模块级单例 AudioContext 从不 close**：长期运行/热重载可能堆积（浏览器限 6 个 active context）。
  → 方向：插件卸载/热重载时 `close()` 并置空。
- **[中] `palette.ts` 快捷键监听 useEffect 依赖只含 `[palette]`**：内部用 `props.*`、`t()` 不在依赖，locale/回调刷新后监听器持旧闭包。
  → 方向：回调入依赖或用 ref 存最新回调。
- **[中] `settings.ts` 录制快捷键 useEffect 依赖缺 `t`**：locale 变化后录制提示仍旧语言。
  → 方向：加 `t` 或经 ref 转发。
- **[低] `store.ts` set 用 `Object.assign({}, snapshot, patch)`**，引用类型字段共享同一对象。
  → 方向：浅克隆或文档化「只允许顶层替换」。
- **[低] `guard.ts` 用 `setInterval(450)` 常驻轮询 + 最多 10 次 setTimeout 重试**，是猜状态稳定的启发式。
  → 方向：改事件驱动或 store 订阅。
- **[低] `NotificationWatcher` 的 `previousRef` 在 notify 关闭时仍推进**：重新开启后不会对关闭期间变化发通知。
  → 方向：做显式 paused 状态。

## C. 宿主契约（不确定能力 / 已知坑残留）

- **[中] `host.ts` 大量 `?` 可选方法 + `[extra:string]:unknown` 索引签名**，契约边界过弱；`get('uiWorkspace')`/`get('shortcuts')` 动态取服务，`remote.session` 是 `Record<string,unknown>`，能力全靠 `owns` 探测。
  → 方向：动态 get 的服务声明成显式接口，或 discriminated union 让存在性在类型层体现。
- **[中] 仍在调用宿主未公开/不确定能力，靠 try/catch 兜底**：`layout.panels.setRightbar`、`sidebarRight.commandTarget`/`toggleFullscreen`、`remote.$on('schedule/changed')`、`remote.session.rename`。
  → 方向：集中到 `host-adapters.ts` 做能力探测与降级，写清依据到 docs。
- **[低] `isExpanded()` 仍在 `collapseRightBoard` 使用**（apply.ts:240）——LESSONS 明确点名不可靠，应改 DOM 判（`[data-sidebar-right-open]` + `active().kind`）。
- **[低] 宿主 DOM 探测选择器散布多处**（`[class*="_centerCol"]`/`[class*="_frame"]`/`[data-chat-anchor-key]` 等），类名猜测易失效。
  → 方向：集中到 `core/dom.ts` 并加「依据 docs/architecture.md 诊断表」注释。

## D. 正确性与逻辑

- **[高] 设置迁移标记 `boardProjVersion` 分两个同名位置**：`mergeSettings` 写嵌套 `out.board.boardProjVersion`，`loadSettings`/`writeSettings` 追顶层。迁移判定与写入失配。
  → 方向：只留一个位置（建议顶层），两处写同一处，`DEFAULT_SETTINGS` 显式补默认值。
- **[高] `headerButtons` 迁移整组替换清掉用户配置**：`headerButtonsVersion!==3` 时 `out.headerButtons = cloneJson(DEFAULT)`，用户改过的 side/hidden/order 全丢。
  → 方向：逐 id 叠加到默认，而非整组替换。
- **[中] `hud.ts` 渲染期直接 `rows.length=0` + push**（渲染函数体里原地改数组）。
  → 方向：`const rows = trimmed.map(...)` 生成新数组。
- **[中] `comboBindingOf` 与 `comboFromEvent` 修饰符命名不一致**：一个产出 `ctrl`，另一个只把 `ctrl→control`，`alt/meta/shift` 保持原样；冲突检测可能漏判/误判。
  → 方向：统一映射表，补两函数一致性的单元断言。
- **[中] `findScrollToBottomButton` 用 `label.indexOf(text)===0` 前缀匹配 + 硬编码双语标签**（interject.ts:56-61）——前缀匹配会误命中，标签未走 i18n。
  → 方向：改精确匹配，标签收敛到 aria-label 精确值。
- **[中] `apply.ts` 归档行 `null as unknown as void` 初始值**：`archiveSession` 返回 undefined 会被当成功。
  → 方向：用 `{ok?:boolean}` 结果类型，undefined 归失败。
- **[低] `comboHasModifier` 不查 `shift`**，但 `comboDisplay` 能显示 `Shift+…`——设置页会拒 shift 单独组合，与显示能力不一致。
  → 方向：明确意图——纳入 shift 或去掉 display 分支。

## E. 一致性（主题 token / i18n / 文案）

- **[中] 硬编码颜色违反「颜色用主题 token」硬规则**：`#2f6fed`、`rgba(47,111,237,*)`、`#f59e0b` 散布 `styles.ts` 与 `board.ts:581,961`；暗色主题下不随主题。
  → 方向：换 `var(--dsw-alias-state-warn-primary)` / `var(--dsw-alias-brand-primary)`。
- **[中] `status.done` 中英术语不一致**：zh `已完成`，en `Completed`；而 `col.done`/`settings.pc.done` 英文 `Done`/`Completed`。同义不同词，切换语言后列标题与状态 pill 措辞不一致。
  → 方向：统一 `Completed`（中文 `已完成`）。
- **[低] 英文统计标签全小写**（`stat.workspaces/sessions/attention/running`、`hud.running`），与 `All`/`Status` 大小写不一致。
  → 方向：首字母大写。
- **[低] 重复逻辑散落**：`typeof props.x==='function'? props.x : fallbackHook()` 约 20 次；「当前会话」「settings 读取」「combo 命中」在 5+ 组件各自实现。
  → 方向：抽 `useOptionalHook` 与共享 helper。

## F. UX 与可访问性

- **[高] 快捷键默认值与浏览器/系统冲突**：`Alt+D`（地址栏）、`Alt+E`（菜单）、`Alt+N`（新窗口）直接踩浏览器默认动作；`Alt+,` 在非英文布局易按错。
  → 方向：改 `Alt+Shift+?` 或 Ctrl 系；录制时对危险组合给警告。
- **[高] 首次使用无 onboarding**：14 个快捷键只能靠一条半透明小字（9px、opacity:.5）硬记。
  → 方向：首启 3 步轻量引导；HUD 空状态改「可发现」引导文案。
- **[高] 看板分组折叠无法键盘操作**：`<td colSpan=7 onClick>` 无 `tabIndex`/`onKeyDown`/`role=button`，键盘用户被排除。
  → 方向：加 `tabIndex=0`+`role=button`+`aria-expanded`+Enter/Space。
- **[中] HUD 空状态文案已定义却从未渲染**（`hud.empty` 存在但 `return null`）。
  → 方向：空时渲染可读空状态 + 引导按钮。
- **[中] 重命名成功静默无 toast**。
  → 方向：补成功 toast（短 ttl）。
- **[中] 通知可能频响：无合并/限流**，多会话同时完成会叠音；只有「声音开关」一个粗粒度控制。
  → 方向：加合并、仅前后台切换、同类节流。
- **[中] 提示条 9–10px + opacity:.5**（`pbx-hintKey`/`pbx-hudKey`/`pbx-shortcutHints`），对比度不足。
  → 方向：提到 11–12px、opacity≥.8，或默认折叠 hover 展开。
- **[中] 会话/看板行用 `<tr tabindex=0>` + Enter/Space 打开**：`<tr>` 非标准交互元素，屏幕阅读器朗读不理想，空格可能触发页面滚动。
  → 方向：行内主操作收敛到明确可聚焦 `<button>`。
- **[中] 设置页改快捷键入口深、录制交互无视觉引导**。
  → 方向：录制项加「点击后按新组合」占位文案，录制中高亮。
- **[中] 窄窗口全屏看板 7 列 + nowrap 横向拥挤**；HUD 底部 9px 提示更挤。
  → 方向：全屏看板加横向滚动容器+固定首列；HUD 窄屏隐藏提示行。
- **[低] `prefers-reduced-motion` 处理不一致**：CSS 全覆盖，但 JS 的 `element.animate`（hud FLIP）、定时器驱动动效未统一走 reduce。
  → 方向：抽 `prefersReducedMotion()` 常量 + 统一动效 token，JS 动画全经它判断。
- **[低] 响应式断点写死分散**（`>=0.72`、`<=460`、`wideThreshold=520`、`<360`）。
  → 方向：集中到 `constants.ts` 或 `core/breakpoints.ts`。
- **[低] 设置页入口深，插件内无直达按钮/快捷键**。
  → 方向：HUD 底部或看板工具栏加齿轮入口；或配默认组合。

## 三份最值得先讨论

- **Architect**：① apply.ts 上帝文件（拆分根）；② 热重载监听/定时器残留；③ isExpanded 同类残留。
- **Reviewer**：① boardProjVersion 迁移失配；② headerButtons 迁移清配置；③ 硬编码颜色；④ hud 渲染期改数组；⑤ palette 监听依赖。
- **Designer**：① 快捷键默认值踩浏览器冲突；② 首次可发现性；③ 看板分组折叠无法键盘操作。

> 合并后的「最高优先级候选」建议优先讨论三组：
> 1. **迁移正确性**（boardProjVersion 失配 + headerButtons 清配置）——升级丢配置，真实用户可见。
> 2. **快捷键冲突 + 可发现性**（Alt+D/E/N 踩浏览器 + 无 onboarding）——日常使用受影响。
> 3. **热重载监听残留 + 硬编码颜色**——违背 AGENTS.md 硬规则，且实际会叠监听。
