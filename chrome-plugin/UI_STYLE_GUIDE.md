# Sun Wallet UI 风格规范（V1）

后续所有页面统一遵循本规范，除非明确升级到 V2。

## 1. 风格定位

- **关键词**：`暗色`、`高对比`、`科技感`、`轻霓虹`
- **产品气质**：专业可信 + Web3 感，不花哨但有记忆点
- **品牌锚点**：以太阳图标的金色作为主强调色

## 2. 视觉令牌（Design Tokens）

所有颜色通过 `src/tailwind.css` 中 CSS 变量维护：

- `--sw-bg`: 全局背景
- `--sw-surface`: 一级容器背景
- `--sw-surface-2`: 二级卡片背景
- `--sw-border`: 边框
- `--sw-primary`: 主色（金黄）
- `--sw-primary-soft`: 主色浅阶
- `--sw-danger`: 风险/错误
- `--sw-success`: 成功
- `--sw-text-primary`: 主文本
- `--sw-text-muted`: 次级文本

规则：

- 禁止在业务页面直接写硬编码色值（如 `#fff`、`#000`），优先使用 token。
- 新增颜色必须先加 token，再在页面使用。

## 3. 字体与排版

- 字体：`Outfit`（已全局配置）
- 标题层级：
  - H1: 36/40, bold
  - H2: 28/32, semibold
  - H3: 22/28, semibold
- 正文：
  - 主正文：14/22
  - 注释：12/18
- 数字资产金额可放大，但不得超过 H1 视觉层级 1.4 倍

## 4. 圆角、边框、阴影

- 主容器圆角：`14px`
- 输入/按钮圆角：`12px ~ 9999px`（胶囊按钮）
- 默认边框：`1px solid var(--sw-border)`
- 卡片阴影：`shadow-card`
- 发光仅用于品牌元素，不可全局滥用

## 5. 组件规范（shadcn 风格）

已统一组件入口：

- `src/components/ui/button.jsx`
- `src/components/ui/input.jsx`
- `src/components/ui/checkbox.jsx`
- `src/components/ui/card.jsx`
- `src/components/app/page-shell.jsx`
- `src/components/app/section-title.jsx`
- `src/components/app/primary-action.jsx`
- `src/components/app/page-header.jsx`
- `src/components/app/notice-list-item.jsx`
- `src/components/app/password-field.jsx`
- `src/components/app/bottom-toast.jsx`

规则：

- 页面禁止直接写原生按钮样式，统一用 `Button`
- 文本输入统一用 `Input`
- 勾选统一用 `Checkbox`
- 信息块统一用 `Card`
- 页面外层统一用 `PageShell`
- 主标题区统一用 `SectionTitle`
- 主行动按钮统一用 `PrimaryAction`
- 顶部导航统一用 `PageHeader`
- 风险说明列表统一用 `NoticeListItem`
- 密码输入统一用 `PasswordField`
- 页面反馈统一用 `BottomToast`

## 6. 钱包扩展基础能力（已预埋）

为后续钱包页面扩展，已加入通用工具层：

- 状态管理：`zustand`（`src/stores/app-store.js`）
- 表单校验：`zod`（`src/lib/validators.js`）
- 表单能力：`react-hook-form`（后续页面直接接入）
- 链交互基础：`viem`（`src/services/web3.js`）
- 本地持久化：`src/services/storage.js`
- 二维码能力：`qrcode`（后续收款页可直接生成）

推荐新增页面优先顺序（骨架）：

1. `HOME`：资产卡 + 快捷操作 + 币种列表 + 底部导航
2. `SEND`：收款地址输入、金额输入、确认页
3. `RECEIVE`：地址展示 + 二维码
4. `SETTINGS`：网络、语言、主题、清除数据

当前进度：

- `HOME` 骨架：已完成
- `SEND` 骨架：已完成
- `RECEIVE` 骨架：已完成（已接 `qrcode` 生成）

## 7. 布局规范

- 弹窗宽度固定：`380px`
- 纵向最小高度：`620px`
- 页面左右安全边距：`16px`
- 模块垂直间距基准：`8 / 12 / 16 / 24`

## 8. 交互状态

- 按钮必须有：默认 / hover / disabled
- 输入框必须有：默认 / focus / 错误态（后续表单接入）
- 危险操作（如重置钱包）使用 `danger` 风格
- toast 统一底部浮层，不使用浏览器原生 alert

## 9. 后续开发约束（强制）

- 新页面提交前自查：
  - 是否只使用 UI 组件库
  - 是否只使用 design tokens
  - 是否满足 380x620 视窗无横向滚动
  - 是否有 disabled 态与 hover 态
- 不符合以上任一项，视为样式不合格
