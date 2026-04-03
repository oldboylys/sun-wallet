# Sun Wallet UI 风格规范（V2 · Material UI）

后续所有页面统一使用 **Material UI（MUI）** 与 **Emotion**，不再使用 Tailwind CSS 与自建 shadcn 风格组件。

## 1. 技术栈

- **UI 框架**：`@mui/material`
- **样式引擎**：`@emotion/react`、`@emotion/styled`
- **主题**：`src/theme.js` 中 `createTheme`，由 `ThemeProvider` 包裹根组件
- **全局重置**：`CssBaseline`

## 2. 主题与令牌

- 主题对象集中在 `src/theme.js`（palette、typography、组件覆盖）
- 业务代码优先使用 `sx` 或 `theme` 引用颜色，避免散落硬编码十六进制色值
- 弹窗固定尺寸在 `walletTheme` 的 `MuiCssBaseline` 中约束：`380×620`、`overflow: hidden`

## 3. 组件使用约定

- 布局：`Box`、`Stack`（按需）
- 文字：`Typography`
- 表单：`TextField`、`FormControlLabel`、`Checkbox`
- 按钮：`Button`、`IconButton`
- 卡片：`Card` + `CardContent`
- 反馈：`Snackbar` + `Alert`
- 导航：`Tabs` + `Tab`

## 4. 布局规范

- 弹窗宽度：`380px`
- 弹窗高度：`620px`
- 主容器使用 `Box` + `flex` 纵向布局，避免内容撑出滚动条（复杂页需控制内部 `overflow`）

## 5. 与业务逻辑

- 状态管理、校验、存储等仍使用 `src/stores`、`src/lib/validators`、`src/services` 等，与 UI 库解耦

## 6. 构建

- 仅执行 `esbuild` 打包 `src/popup.entry.jsx` → `popup.js`，不再执行 Tailwind 构建步骤
