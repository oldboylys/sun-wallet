# ETH Wallet Chrome Plugin

这是一个基于 **React + Material UI** 的 Chrome 插件钱包 Demo（Manifest V3）。

## 目录结构

```text
chrome-plugin/
  manifest.json
  popup.html
  src/popup.entry.jsx
  src/theme.js
  popup.js
  package.json
  README.md
```

## 先安装依赖并构建

```powershell
cd D:\lys-self-project\test\chrome-plugin
npm install
npm run build
```

说明：插件加载根目录的 `popup.js`（由 `src/popup.entry.jsx` 与 MUI 等依赖打包生成）。样式由 MUI `ThemeProvider` + `CssBaseline` 注入，不再使用 `popup.css` / Tailwind。

## 页面流转（OKX 风格）

1. 欢迎页：创建钱包 / 导入钱包
2. 创建流程：
   - 展示助记词
   - 助记词抽词校验
   - 进入钱包主页
3. 导入流程：
   - 选择导入方式（助记词 / 私钥）
   - 导入成功后进入钱包主页
4. 钱包主页：展示地址、基础功能入口、清除本地钱包

## 本地开发安装（推荐）

1. 打开 Chrome，访问 `chrome://extensions/`
2. 右上角打开 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择当前目录：`chrome-plugin`
5. 在浏览器右上角点击插件图标，测试钱包生成和导入功能

## 打包为 CRX（方式 1：Chrome 图形界面）

1. 打开 `chrome://extensions/`
2. 打开 **开发者模式**
3. 点击 **打包扩展程序**
4. 扩展程序根目录选择 `chrome-plugin`（确保已执行过 `npm run build`）
5. 私钥文件第一次可留空，Chrome 会自动生成 `.pem`
6. 点击打包后会生成：
   - `chrome-plugin.crx`
   - `chrome-plugin.pem`（务必保存好，用于后续升级）

## 打包为 CRX（方式 2：命令行）

先找到你的 Chrome 安装路径（通常是以下之一）：

- `C:\Program Files\Google\Chrome\Application\chrome.exe`
- `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

首次打包（自动生成 key）：

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --pack-extension="D:\lys-self-project\test\chrome-plugin"
```

后续版本复用同一个 key（保证扩展 ID 不变）：

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --pack-extension="D:\lys-self-project\test\chrome-plugin" --pack-extension-key="D:\lys-self-project\test\chrome-plugin.pem"
```

## 在本地浏览器应用 CRX

由于 Chrome 安全策略，通常不支持直接拖拽第三方 CRX 离线安装。推荐两种方式：

1. **开发阶段**：始终用「加载已解压的扩展程序」
2. **分发阶段**：通过企业策略或 Chrome Web Store 分发

如果只是你本机使用，最稳定方式仍是 `chrome://extensions/` -> 加载已解压。

## 修改代码后的最短流程

```powershell
cd D:\lys-self-project\test\chrome-plugin
npm run build
```

然后在 `chrome://extensions/` 点击该插件卡片上的“重新加载”。

## 说明

- 本项目用于功能演示，不适合生产环境保管资产。
- 当前会将钱包数据保存在本地 `chrome.storage.local`，生产钱包应增加密码学加密、锁屏、风控与审计设计。
