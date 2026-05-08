# Chrome 网上应用店上架说明（SUN Wallet）

本文档供打包 zip、填写审核表单与「权限说明」时直接使用。

---

## 一、上架前构建

在项目根目录 `chrome-plugin/` 执行：

```bash
npm install
npm run build
```

确保生成最新的 `popup.js`（由 `src/popup.entry.jsx` 打包）。

---

## 二、需要打进 zip 的文件（白名单）

**根目录 `manifest.json` 必须在 zip 根目录**（解压后第一层可见 `manifest.json`，不要多套一层文件夹）。

建议仅包含：

| 路径 | 说明 |
|------|------|
| `manifest.json` | 扩展清单 |
| `popup.html` | 弹窗页 |
| `popup.js` | 构建产物（**必须**先 `npm run build`） |
| `sidepanel.html` | 侧边栏（若与 popup 共用同一脚本，请确认其中引用与 `popup.html` 一致） |
| `icons/icon-16.png` | 图标 |
| `icons/icon-32.png` | 图标 |
| `icons/icon-48.png` | 图标 |
| `icons/icon-128.png` | 商店要求常用 128 |

**不要打入 zip 的内容：**

- `node_modules/`
- `src/`
- `package.json` / `package-lock.json`（除非你愿意开源审查，一般不必）
- `*.map`、开发用脚本
- `docs/`（可选，非运行必需）

**验证：** Chrome 打开 `chrome://extensions` → 开发者模式 → **加载已解压的扩展**，选解压后的文件夹，能正常弹出界面即可再压缩为 zip。

---

## 三、商店「权限 / 远程域名」说明（可复制到审核表单）

以下为中文说明草稿，请按实际功能微调。

### `permissions`

| 权限 | 用途说明（提交审核用） |
|------|------------------------|
| **storage** | 在本地保存钱包解锁会话、主题、用户设置的 BscScan API Key、所选链 ID、自定义代币列表等；数据存储在用户本机，不上传我方服务器。 |
| **idle** | 用于检测浏览器空闲状态，在合理超时后锁定钱包界面，降低他人盗用风险。 |
| **sidePanel** | 提供侧边栏模式打开钱包界面（与弹窗二选一），便于宽屏使用。 |
| **windows** | 在需要时打开或切换浏览器窗口（例如从侧边栏切回普通窗口等交互）。 |

### `host_permissions`（按域名）

| 域名模式 | 用途说明 |
|----------|----------|
| `ethereum.publicnode.com`、`ethereum-sepolia.publicnode.com`、`eth.llamarpc.com`、`arb1.arbitrum.io`、`mainnet.base.org`、`mainnet.optimism.io`、`polygon-bor-rpc.publicnode.com`、`bsc-dataseed.binance.org`、`rpc.xlayer.tech` | 通过公开 RPC **只读**链上数据：余额、Gas 估算、合约元数据（代币名称/精度等）、发送前模拟等；不向这些节点上传用户私钥（本扩展当前逻辑为本地演示/只读为主，请与实际上线版本一致）。 |
| `api.coingecko.com`、`assets.coingecko.com` | 获取代币美元价格、涨跌幅及代币图标 URL，用于首页资产展示；仅请求行情与静态资源，不提交钱包私钥。 |
| `*.blockscout.com` | 通过 Blockscout 公开 API 查询**交易历史**与 **NFT 转账记录**（`txlist` / `tokentx` / `tokennfttx` 等）；仅地址与链上公开数据。 |
| `api.bscscan.com`、`bscscan.com` | 在用户于设置中自行填写 **BscScan API Key** 时，查询 BNB Chain 上的交易与代币/NFT 相关索引；密钥仅存用户本地 `chrome.storage`。 |
| `fonts.googleapis.com`、`fonts.gstatic.com` | 加载弹窗界面使用的 **Outfit** 字体（与 `popup.html` 中 link 一致）；仅样式资源。 |

> **隐私：** 若商店问卷询问「是否收集用户数据」：本扩展主要使用上述第三方做**只读链上/行情请求**；敏感信息（如助记词、私钥）的处理方式需与你实际代码一致，务必在「隐私权政策」中写明。

---

## 四、隐私权政策（上架常要求）

你需要一个可公开访问的 **隐私政策 URL**（GitHub Pages、语雀、个人站点均可），建议至少包含：

1. 扩展名称与开发者联系方式。  
2. 使用 `storage` 存什么、是否同步到云端（通常：**仅本地**）。  
3. 调用的远程服务类型（RPC、CoinGecko、Blockscout、BscScan 等）及目的。  
4. 不将私钥/助记词上传至开发者服务器（若确实如此）。  
5. 用户如何删除数据（卸载扩展 / 清除浏览器扩展数据）。

---

## 五、版本与更新

- 每次提交新版本前，在 `manifest.json` 中提高 **`version`**（如 `1.0.0` → `1.0.1`）。  
- 重新 `npm run build` → 重新打 zip → 在开发者后台上传新版本。

---

## 六、截图与文案建议

- **截图**：展示主界面资产、发送流程、历史记录、设置等；避免仅空白页。  
- **说明**：用简短中文说明「多链钱包、资产查看、转账演示、交易/NFT 查询」等，避免夸大尚未实现的功能（如链上真实签名广播若未上线，勿写「已支持全功能主网交易」）。

---

## 七、本仓库已做的 manifest 补丁

- 已增加 **`https://ethereum-sepolia.publicnode.com/*`**，与代码中 Sepolia RPC 一致。  
- 已增加 **`fonts.googleapis.com` / `fonts.gstatic.com`**，与 `popup.html` 引用字体一致，减少审核时「权限与行为不一致」风险。

若后续代码新增其它 `fetch` 域名，请同步扩展 `host_permissions` 并在商店说明中补充一行。
