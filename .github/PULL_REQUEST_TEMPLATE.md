## 动机

<!-- 为什么要做这个改动？解决了什么问题，或带来什么能力。一两句。 -->

## 改动

<!-- 逐条写清楚改了什么，不要只写「优化」「重构」。 -->
-

## 验证

提交前四项自检都要绿（见 `AGENTS.md`）：

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run check`
- [ ] `npm test`
- [ ] `git diff --exit-code -- client.js index.js` 无差异 —— CI 会重建产物并断言一致
- [ ] `node --check client.js` / `node --check index.js`

行为改动还需要真实运行验证（本机热重载或 headless 加载），并在下面写出结果：

<!-- 例：headless Chromium 打开本机 GUI，插件挂载、0 控制台错误；⌥ 标签与安全区数值见截图。 -->

## 文档与版本一致性

- 核心文档：<!-- README.md / README.zh.md / CHANGELOG.md / docs/ 是否已同步；或写明「无需更新」及理由 -->
- 快捷键：若改了默认组合，检查五处同步（`src/constants.ts`、`SHORTCUT_LABEL_KEYS`、设置页录制项、两份 README 快捷键表、`test/shortcuts.test.cjs`）
- 版本：<!-- 未涉及 release / 已 bump 至 vX.Y.Z 并重建产物 / tag 计划 -->
- i18n：任何用户可见文案都要 zh + en

## 已知未验证项

<!-- 没查成、未验证、需要人工确认的点。写「没查成」要附原始错误；不要把失败写成「没有问题」。 -->
-

## 关联

<!-- Closes #N，或相关 issue / PR 链接；没有就写「无」。 -->
