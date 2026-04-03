import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  Copy,
  Eye,
  EyeOff,
  History,
  Lock,
  Globe,
  Repeat2,
  Settings,
  ArrowLeftRight,
  AppWindow,
  RefreshCw,
} from "lucide-react";
import QRCode from "qrcode";
import { ThemeProvider, CssBaseline } from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import CircularProgress from "@mui/material/CircularProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Switch from "@mui/material/Switch";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { walletThemeDark, walletThemeLight, POPUP_HEIGHT_PX, POPUP_WIDTH_PX } from "./theme";
import { getStorageValue, removeStorageValue, setStorageValue } from "./services/storage";
import {
  clearUnlockSession,
  isUnlockSessionStillValidByTime,
  queryIdleState,
  saveUnlockSession,
} from "./services/session";
import {
  getWalletDisplayName,
  getWalletPublicAddress,
  setWalletDisplayName,
  setWalletPublicAddress,
} from "./services/walletPrefs";
import {
  findActiveAccount,
  migrateWalletStoreIfEmpty,
  saveWalletStore,
  setActiveAccount,
} from "./services/walletManager";
import {
  AddWalletChoiceView,
  CreateWalletFlowView,
  ImportWalletFlowView,
  WalletHubView,
} from "./WalletManagementViews";
import { getThemeMode, setThemeMode } from "./services/themePrefs";
import {
  fetchEthereumMainnetPortfolio,
  formatTotalUsdLabel,
  formatWeightedChangeLabel,
} from "./services/ethPortfolio";
import { passwordSchema } from "./lib/validators";

const VIEWS = {
  LOGIN: "login",
  FORGOT: "forgot",
  HOME: "home",
  SEND: "send",
  RECEIVE: "receive",
  SETTINGS: "settings",
  WALLET_HUB: "wallet_hub",
  WALLET_ADD_CHOICE: "wallet_add_choice",
  WALLET_CREATE: "wallet_create",
  WALLET_IMPORT: "wallet_import",
};

const FORGOT_ITEMS = [
  "OKX Wallet 不储存你的密码，无法帮你找回。",
  "如果忘记钱包密码，可以使用备份的助记词或私钥，导入钱包后设置新密码。此过程不会影响你的资产。",
  "请注意，若在未备份钱包的情况下重置钱包，你将丢失钱包及其中所有资产。请务必确保所有钱包已备份。",
];

const HOME_ACTIONS = [
  { key: "send", label: "发送", icon: ArrowUpToLine },
  { key: "receive", label: "接收", icon: ArrowDownToLine },
  { key: "swap", label: "兑换", icon: Repeat2 },
  { key: "history", label: "历史", icon: History },
];

const HOME_TABS = ["币种", "DeFi", "NFT", "授权"];

const PASSWORD_HASH_KEY = "wallet_password_hash_v1";
const AUTH_MODE = {
  SETUP: "setup",
  UNLOCK: "unlock",
};

/** 当前页面是否运行在侧边栏（sidepanel.html） */
const IS_SIDE_PANEL_SURFACE =
  typeof window !== "undefined" && window.location.pathname.endsWith("sidepanel.html");

function PageHeader({ title, canBack, onBack }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: 1,
        borderColor: "divider",
        px: 1.5,
        py: 1,
        minHeight: 48,
      }}
    >
      {canBack ? (
        <IconButton size="small" onClick={onBack} sx={{ color: "text.primary" }}>
          ←
        </IconButton>
      ) : (
        <Box sx={{ width: 40 }} />
      )}
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Box sx={{ width: 40 }} />
    </Box>
  );
}

function App() {
  const [stack, setStack] = useState([VIEWS.LOGIN]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checks, setChecks] = useState([false, false, false]);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState(HOME_TABS[0]);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [authMode, setAuthMode] = useState(AUTH_MODE.UNLOCK);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [walletDisplayName, setWalletDisplayNameState] = useState("SUN Wallet");
  const [walletAddress, setWalletAddress] = useState(
    "0x2fF7D743A1A8Bc13f6C01A3fF8EA7e6Ba6a0F2D5",
  );
  const [settingsNameDraft, setSettingsNameDraft] = useState("SUN Wallet");
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);
  const settingsMenuCloseTimerRef = useRef(null);
  const [addressCopiedFeedback, setAddressCopiedFeedback] = useState(false);
  const addressCopyFeedbackTimerRef = useRef(null);
  const [themeMode, setThemeModeState] = useState("dark");
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [portfolioTotalUsd, setPortfolioTotalUsd] = useState(0);
  const [portfolioChange24h, setPortfolioChange24h] = useState(null);
  const [portfolioRefreshing, setPortfolioRefreshing] = useState(false);
  const [walletStore, setWalletStore] = useState(null);
  const unlockPasswordRef = useRef("");
  const [vaultPwOpen, setVaultPwOpen] = useState(false);
  const [vaultPwDraft, setVaultPwDraft] = useState("");
  const [vaultPwShow, setVaultPwShow] = useState(false);
  const vaultPwResolveRef = useRef(null);

  const current = stack[stack.length - 1];
  const muiTheme = themeMode === "light" ? walletThemeLight : walletThemeDark;
  const canBack = stack.length > 1;
  const canReset = checks.every(Boolean);
  const isSetupMode = authMode === AUTH_MODE.SETUP;

  const syncHomeFromWalletStore = useCallback(async (store) => {
    const acc = findActiveAccount(store);
    if (!acc) return;
    const w = store.wallets.find((x) => x.id === store.activeWalletId);
    const label = w?.name?.trim() || "SUN Wallet";
    setWalletAddress(acc.address);
    setWalletDisplayNameState(label);
    await setWalletPublicAddress(acc.address);
    await setWalletDisplayName(label);
  }, []);

  useEffect(() => {
    if (loadingAuth) return;
    const needStore =
      current === VIEWS.HOME ||
      current === VIEWS.WALLET_HUB ||
      current === VIEWS.WALLET_ADD_CHOICE ||
      current === VIEWS.WALLET_CREATE ||
      current === VIEWS.WALLET_IMPORT;
    if (!needStore) return;
    let cancelled = false;
    void (async () => {
      const migrated = await migrateWalletStoreIfEmpty();
      if (cancelled) return;
      setWalletStore(migrated);
      if (current === VIEWS.HOME) {
        await syncHomeFromWalletStore(migrated);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadingAuth, current, syncHomeFromWalletStore]);

  useEffect(() => {
    async function generateQr() {
      if (current !== VIEWS.RECEIVE) return;
      const data = await QRCode.toDataURL(walletAddress, {
        width: 180,
        margin: 1,
      });
      setQrDataUrl(data);
    }
    generateQr();
  }, [current, walletAddress]);

  useEffect(() => {
    let cancelled = false;

    async function initApp() {
      const [hash, name, addr] = await Promise.all([
        getStorageValue(PASSWORD_HASH_KEY, ""),
        getWalletDisplayName(),
        getWalletPublicAddress(),
      ]);
      if (cancelled) return;
      setWalletDisplayNameState(name);
      setWalletAddress(addr);

      if (!hash) {
        setAuthMode(AUTH_MODE.SETUP);
        setStack([VIEWS.LOGIN]);
        setLoadingAuth(false);
        return;
      }

      setAuthMode(AUTH_MODE.UNLOCK);

      const timeOk = await isUnlockSessionStillValidByTime();
      if (!timeOk) {
        setStack([VIEWS.LOGIN]);
        setLoadingAuth(false);
        return;
      }

      const idleState = await queryIdleState(60);
      if (idleState === "locked") {
        await clearUnlockSession();
        setStack([VIEWS.LOGIN]);
        setLoadingAuth(false);
        return;
      }

      await saveUnlockSession();
      setStack([VIEWS.HOME]);
      setLoadingAuth(false);
    }

    initApp();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (addressCopyFeedbackTimerRef.current) {
        clearTimeout(addressCopyFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    getThemeMode().then(setThemeModeState);
  }, []);

  const loadPortfolio = useCallback(
    async (silent = false) => {
      if (silent) setPortfolioRefreshing(true);
      else setPortfolioLoading(true);
      setPortfolioError("");
      try {
        const res = await fetchEthereumMainnetPortfolio(walletAddress);
        if (!res.ok) {
          setPortfolioError(res.error || "加载失败");
          setPortfolioItems([]);
          setPortfolioTotalUsd(0);
          setPortfolioChange24h(null);
          return;
        }
        setPortfolioItems(res.items);
        setPortfolioTotalUsd(res.totalUsd);
        setPortfolioChange24h(res.change24hWeighted);
      } finally {
        if (silent) setPortfolioRefreshing(false);
        else setPortfolioLoading(false);
      }
    },
    [walletAddress],
  );

  useEffect(() => {
    if (current !== VIEWS.HOME) return undefined;
    let cancelled = false;
    void loadPortfolio(false);
    const timer = setInterval(() => {
      if (!cancelled) void loadPortfolio(true);
    }, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [current, walletAddress, loadPortfolio]);

  async function hashPassword(raw) {
    const data = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /** 内存中无解锁密码时（例如自动恢复会话），弹出一次校验，通过后写入 ref */
  const getVaultPassword = useCallback(async () => {
    if (unlockPasswordRef.current) return unlockPasswordRef.current;
    return new Promise((resolve) => {
      vaultPwResolveRef.current = resolve;
      setVaultPwDraft("");
      setVaultPwShow(false);
      setVaultPwOpen(true);
    });
  }, []);

  async function submitVaultPasswordDialog() {
    const raw = vaultPwDraft.trim();
    const validation = passwordSchema.safeParse(raw);
    if (!validation.success) {
      setToast(validation.error.issues[0]?.message || "密码格式不正确");
      return;
    }
    const storedHash = await getStorageValue(PASSWORD_HASH_KEY, "");
    const inputHash = await hashPassword(raw);
    if (!storedHash || inputHash !== storedHash) {
      setToast("密码错误");
      return;
    }
    unlockPasswordRef.current = raw;
    setVaultPwOpen(false);
    const resolve = vaultPwResolveRef.current;
    vaultPwResolveRef.current = null;
    if (resolve) resolve(raw);
  }

  function closeVaultPasswordDialog() {
    setVaultPwOpen(false);
    const resolve = vaultPwResolveRef.current;
    vaultPwResolveRef.current = null;
    if (resolve) resolve(null);
  }

  function goto(view) {
    setToast("");
    setStack((prev) => [...prev, view]);
  }

  function back() {
    setToast("");
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  async function onUnlock() {
    if (submittingAuth) return;
    setSubmittingAuth(true);
    try {
      const passwordValue = password.trim();
      const validation = passwordSchema.safeParse(passwordValue);
      if (!validation.success) {
        setToast(validation.error.issues[0]?.message || "密码格式不正确");
        return;
      }

      if (isSetupMode) {
        if (passwordValue !== confirmPassword.trim()) {
          setToast("两次输入的密码不一致");
          return;
        }
        const newHash = await hashPassword(passwordValue);
        await setStorageValue(PASSWORD_HASH_KEY, newHash);
        await saveUnlockSession();
        unlockPasswordRef.current = passwordValue;
        setAuthMode(AUTH_MODE.UNLOCK);
        setStack([VIEWS.HOME]);
        setToast("密码设置完成，已解锁");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const storedHash = await getStorageValue(PASSWORD_HASH_KEY, "");
      const inputHash = await hashPassword(passwordValue);
      if (!storedHash || inputHash !== storedHash) {
        setToast("密码错误，请重试");
        return;
      }

      await saveUnlockSession();
      unlockPasswordRef.current = passwordValue;
      setStack([VIEWS.HOME]);
      setToast("解锁成功");
      setPassword("");
    } finally {
      setSubmittingAuth(false);
    }
  }

  async function onResetWallet() {
    await removeStorageValue(PASSWORD_HASH_KEY);
    await clearUnlockSession();
    unlockPasswordRef.current = "";
    setPassword("");
    setConfirmPassword("");
    setChecks([false, false, false]);
    setAuthMode(AUTH_MODE.SETUP);
    setStack([VIEWS.LOGIN]);
    setToast("已重置本地密码，请重新设置");
  }

  function onHomeAction(key, label) {
    if (key === "send") {
      goto(VIEWS.SEND);
      return;
    }
    if (key === "receive") {
      goto(VIEWS.RECEIVE);
      return;
    }
    setToast(`${label} 功能占位`);
  }

  function onSubmitSend() {
    setToast("发送流程占位：下一步将进入交易确认页。");
  }

  function shortAddress(addr) {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  async function copyWalletAddress() {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setToast("地址已复制到剪贴板");
      if (addressCopyFeedbackTimerRef.current) {
        clearTimeout(addressCopyFeedbackTimerRef.current);
      }
      setAddressCopiedFeedback(true);
      addressCopyFeedbackTimerRef.current = setTimeout(() => {
        setAddressCopiedFeedback(false);
        addressCopyFeedbackTimerRef.current = null;
      }, 2000);
    } catch {
      setToast("复制失败，请重试或手动复制");
    }
  }

  function clearSettingsMenuCloseTimer() {
    if (settingsMenuCloseTimerRef.current) {
      clearTimeout(settingsMenuCloseTimerRef.current);
      settingsMenuCloseTimerRef.current = null;
    }
  }

  /** 关闭前移出菜单内焦点，避免 Modal 设 aria-hidden 时子元素仍 :focus 触发无障碍告警 */
  function closeSettingsMenu() {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('[role="menu"]')) {
      active.blur();
    }
    setSettingsMenuAnchor(null);
  }

  function scheduleCloseSettingsMenu() {
    clearSettingsMenuCloseTimer();
    settingsMenuCloseTimerRef.current = setTimeout(() => {
      closeSettingsMenu();
    }, 280);
  }

  function openSettingsMenuFromHover(event) {
    clearSettingsMenuCloseTimer();
    const btn = event.currentTarget.querySelector("button");
    if (btn) {
      setSettingsMenuAnchor(btn);
    }
  }

  function goToSettingsPage() {
    clearSettingsMenuCloseTimer();
    closeSettingsMenu();
    setSettingsNameDraft(walletDisplayName);
    goto(VIEWS.SETTINGS);
  }

  function onDappConnectionsPlaceholder() {
    clearSettingsMenuCloseTimer();
    closeSettingsMenu();
    setToast("DApp 连接管理（占位）");
  }

  async function openSidePanelMode() {
    clearSettingsMenuCloseTimer();
    closeSettingsMenu();
    try {
      if (typeof chrome !== "undefined" && chrome.sidePanel?.open && chrome.windows?.getCurrent) {
        const w = await chrome.windows.getCurrent();
        await chrome.sidePanel.open({ windowId: w.id });
        window.close();
        return;
      }
      setToast("当前环境不支持侧边栏");
    } catch {
      setToast("无法打开侧边栏（需 Chrome 114+ 并已授予 sidePanel）");
    }
  }

  /** 侧边栏内：切换为工具栏弹窗 / 独立 popup 窗口 */
  async function switchToWindowMode() {
    clearSettingsMenuCloseTimer();
    closeSettingsMenu();
    try {
      if (typeof chrome !== "undefined" && chrome.action?.openPopup) {
        await chrome.action.openPopup();
        window.close();
        return;
      }
    } catch {
      /* openPopup 在部分环境不可用，走下方 create */
    }
    try {
      if (typeof chrome !== "undefined" && chrome.windows?.create) {
        await chrome.windows.create({
          url: chrome.runtime.getURL("popup.html"),
          type: "popup",
          width: Math.round(POPUP_WIDTH_PX),
          height: Math.round(POPUP_HEIGHT_PX + 32),
          focused: true,
        });
        window.close();
        return;
      }
    } catch {
      setToast("无法打开窗口模式");
    }
  }

  async function lockWallet() {
    clearSettingsMenuCloseTimer();
    closeSettingsMenu();
    await clearUnlockSession();
    unlockPasswordRef.current = "";
    setStack([VIEWS.LOGIN]);
    setToast("钱包已锁定");
  }

  async function saveSettingsName() {
    const name = settingsNameDraft.trim() || "SUN Wallet";
    await setWalletDisplayName(name);
    setWalletDisplayNameState(name);
    if (walletStore?.activeWalletId) {
      const next = {
        ...walletStore,
        wallets: walletStore.wallets.map((w) =>
          w.id === walletStore.activeWalletId ? { ...w, name } : w,
        ),
      };
      await saveWalletStore(next);
      setWalletStore(next);
    }
    setToast("钱包名称已保存");
    back();
  }

  async function onThemeSwitchChange(_event, checked) {
    const mode = checked ? "light" : "dark";
    setThemeModeState(mode);
    await setThemeMode(mode);
    setToast(mode === "light" ? "已切换为阳光明媚主题" : "已切换为深色主题");
  }

  const shellSx = {
    width: POPUP_WIDTH_PX,
    maxWidth: POPUP_WIDTH_PX,
    height: POPUP_HEIGHT_PX,
    maxHeight: POPUP_HEIGHT_PX,
    minHeight: POPUP_HEIGHT_PX,
    boxSizing: "border-box",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    bgcolor: "background.default",
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={shellSx}>
        {loadingAuth ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
        {current === VIEWS.LOGIN && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              px: 2,
              pb: 1.5,
              pt: 1.5,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                component="img"
                src="icons/icon-128.png"
                alt="logo"
                sx={{
                  width: 96,
                  height: 96,
                  mx: "auto",
                  mb: 1.5,
                  mt: 0.5,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 18px rgba(255,190,40,0.35))",
                }}
              />
              <Typography
                variant="h4"
                align="center"
                sx={{
                  fontWeight: 700,
                  letterSpacing: -0.4,
                  fontSize: isSetupMode ? 42 : 40,
                  flexShrink: 0,
                }}
              >
                {isSetupMode ? "设置钱包密码" : "Web3 入口，一个就够"}
              </Typography>
              <Typography
                align="center"
                color="text.secondary"
                sx={{ mt: 0.75, fontSize: isSetupMode ? 14 : 13, flexShrink: 0 }}
              >
                {isSetupMode ? "首次使用请设置解锁密码（至少 8 位）" : "钱包 · 交易 · NFT · 赚币 · DApp"}
              </Typography>

              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5, pb: 1 }}>
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  placeholder={isSetupMode ? "请设置密码（至少 8 位）" : "请输入密码"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end" onClick={() => setShowPassword((v) => !v)} size="small">
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {isSetupMode ? (
                  <TextField
                    fullWidth
                    type="password"
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                ) : null}
              </Box>
            </Box>

            <Box sx={{ flexShrink: 0, pt: 0.5 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                disabled={
                  loadingAuth ||
                  submittingAuth ||
                  !password.trim() ||
                  (isSetupMode && !confirmPassword.trim())
                }
                onClick={onUnlock}
                sx={{
                  py: 1.35,
                  borderRadius: 999,
                  fontSize: 17,
                  fontWeight: 600,
                  color: "primary.contrastText",
                }}
              >
                {submittingAuth ? "处理中..." : isSetupMode ? "创建密码并解锁" : "解锁"}
              </Button>

              {!isSetupMode ? (
                <Button
                  fullWidth
                  variant="text"
                  sx={{ mt: 0.5, py: 0.5, color: "text.secondary", fontSize: 14 }}
                  onClick={() => goto(VIEWS.FORGOT)}
                >
                  忘记密码?
                </Button>
              ) : (
                <Box sx={{ height: 8 }} />
              )}
            </Box>
          </Box>
        )}

        {current === VIEWS.FORGOT && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>
            <PageHeader title="忘记密码" canBack={canBack} onBack={back} />
            <Box
              sx={{
                mx: "auto",
                my: 2,
                width: 92,
                height: 92,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 42,
                background: "radial-gradient(circle at 30% 30%, #b5ff38 0%, #8ff129 45%, #1b2b0d 100%)",
              }}
            >
              💳
            </Box>
            <Box sx={{ px: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              {FORGOT_ITEMS.map((text, i) => (
                <Card key={text} variant="outlined">
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checks[i]}
                          onChange={() =>
                            setChecks((prev) => {
                              const next = [...prev];
                              next[i] = !next[i];
                              return next;
                            })
                          }
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">{text}</Typography>}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
            <Box sx={{ px: 2, mt: "auto", pb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                disabled={!canReset}
                onClick={onResetWallet}
                sx={{ borderRadius: 999, py: 1.25, fontSize: 16 }}
              >
                重置钱包
              </Button>
            </Box>
          </Box>
        )}

        {current === VIEWS.HOME && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              px: 2,
              pt: 1,
              pb: 0,
              /* 不设 hidden，避免 disablePortal 的设置菜单被裁切；滚动仅在中部列表容器上 */
              overflow: "visible",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25, flexShrink: 0 }}>
              <Box
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goto(VIEWS.WALLET_HUB);
                  }
                }}
                onClick={() => goto(VIEWS.WALLET_HUB)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
                  borderRadius: 1,
                  pr: 0.5,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box
                  component="img"
                  src="icons/icon-32.png"
                  alt=""
                  sx={{ width: 32, height: 32, borderRadius: 1, border: 1, borderColor: "divider" }}
                />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {walletDisplayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {shortAddress(walletAddress)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                <IconButton
                  size="small"
                  color="default"
                  onClick={copyWalletAddress}
                  title={addressCopiedFeedback ? "已复制" : "复制地址"}
                  sx={{
                    color: addressCopiedFeedback ? "success.main" : "text.primary",
                    transition: "color 0.2s ease, transform 0.2s ease",
                    transform: addressCopiedFeedback ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {addressCopiedFeedback ? (
                    <Check size={18} strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Copy size={18} aria-hidden />
                  )}
                </IconButton>
                <Box
                  sx={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    zIndex: 10,
                  }}
                  onMouseEnter={openSettingsMenuFromHover}
                  onMouseLeave={scheduleCloseSettingsMenu}
                >
                  <IconButton size="small" color="default" title="设置" sx={{ color: "text.primary" }}>
                    <Settings size={18} />
                  </IconButton>
                  <Menu
                    disablePortal
                    anchorEl={settingsMenuAnchor}
                    open={Boolean(settingsMenuAnchor)}
                    onClose={closeSettingsMenu}
                    autoFocus={false}
                    disableAutoFocusItem
                    disableScrollLock
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                    slotProps={{
                      root: {
                        disableEnforceFocus: true,
                        disableAutoFocus: true,
                        disableRestoreFocus: true,
                      },
                      paper: {
                        sx: {
                          mt: 0,
                          minWidth: 196,
                          maxWidth: 220,
                          bgcolor: "background.paper",
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          boxShadow: (t) =>
                            t.palette.mode === "dark"
                              ? "0 8px 24px rgba(0,0,0,0.45)"
                              : "0 8px 24px rgba(47, 111, 78, 0.18)",
                          py: 0.5,
                          pointerEvents: "auto",
                        },
                        onMouseEnter: clearSettingsMenuCloseTimer,
                      },
                    }}
                  >
                    <MenuItem
                      dense
                      onClick={goToSettingsPage}
                      sx={{ py: 1.1, gap: 1, fontSize: 14, color: "text.primary" }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
                        <Settings size={18} />
                      </ListItemIcon>
                      <ListItemText primary="设置" />
                    </MenuItem>
                    <MenuItem
                      dense
                      onClick={onDappConnectionsPlaceholder}
                      sx={{ py: 1.1, gap: 1, fontSize: 14, color: "text.primary" }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
                        <Globe size={18} />
                      </ListItemIcon>
                      <ListItemText primary="DApp 连接管理" />
                    </MenuItem>
                    <MenuItem
                      dense
                      onClick={IS_SIDE_PANEL_SURFACE ? switchToWindowMode : openSidePanelMode}
                      sx={{ py: 1.1, gap: 1, fontSize: 14, color: "text.primary" }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
                        {IS_SIDE_PANEL_SURFACE ? <AppWindow size={18} /> : <ArrowLeftRight size={18} />}
                      </ListItemIcon>
                      <ListItemText
                        primary={IS_SIDE_PANEL_SURFACE ? "切换为窗口模式" : "侧边栏模式"}
                      />
                    </MenuItem>
                    <MenuItem
                      dense
                      onClick={lockWallet}
                      sx={{ py: 1.1, gap: 1, fontSize: 14, color: "text.primary" }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
                        <Lock size={18} />
                      </ListItemIcon>
                      <ListItemText primary="锁定钱包" />
                    </MenuItem>
                  </Menu>
                </Box>
                <IconButton
                  size="small"
                  color="default"
                  title="网络"
                  onClick={() => setToast("网络切换（占位）")}
                  sx={{ color: "text.primary" }}
                >
                  <Globe size={18} />
                </IconButton>
              </Box>
            </Box>

            <Card variant="outlined" sx={{ mb: 1.25, flexShrink: 0, position: "relative", pr: 5 }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="body2" color="text.secondary">
                  总资产估值
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  以太坊主网 · ETH / USDT / USDC / BTC / SOL
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700, fontSize: "1.85rem" }}>
                  {portfolioLoading ? "…" : formatTotalUsdLabel(portfolioTotalUsd)}
                </Typography>
                {portfolioError ? (
                  <Typography variant="caption" color="error" sx={{ mt: 0.75, display: "block" }}>
                    {portfolioError}
                  </Typography>
                ) : null}
                {!portfolioError && portfolioLoading ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    加载中…
                  </Typography>
                ) : null}
                {!portfolioError && !portfolioLoading && portfolioChange24h != null ? (
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.75,
                      color: portfolioChange24h >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    {formatWeightedChangeLabel(portfolioChange24h).text}
                  </Typography>
                ) : null}
              </CardContent>
              <IconButton
                size="small"
                onClick={() => void loadPortfolio(false)}
                disabled={portfolioLoading || portfolioRefreshing}
                title="刷新资产"
                sx={{
                  position: "absolute",
                  bottom: 10,
                  right: 6,
                  color: "text.secondary",
                  "& svg": {
                    animation: portfolioRefreshing ? "wallet-refresh-spin 0.7s linear infinite" : "none",
                  },
                  "@keyframes wallet-refresh-spin": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                  },
                }}
              >
                <RefreshCw size={18} />
              </IconButton>
            </Card>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mb: 1.25, flexShrink: 0 }}>
              {HOME_ACTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.key}
                    variant="outlined"
                    onClick={() => onHomeAction(item.key, item.label)}
                    sx={{
                      flexDirection: "column",
                      gap: 0.5,
                      py: 0.85,
                      fontSize: 11,
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: "action.hover",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Icon size={16} />
                    </Box>
                    {item.label}
                  </Button>
                );
              })}
            </Box>

            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                flexShrink: 0,
                mb: 0,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              {HOME_TABS.map((t) => (
                <Tab key={t} label={t} value={t} sx={{ minHeight: 36, fontSize: 13 }} />
              ))}
            </Tabs>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                py: 1,
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {portfolioLoading && portfolioItems.length === 0 ? (
                <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                portfolioItems.map((asset) => (
                  <Card
                    key={asset.symbol}
                    variant="outlined"
                    component="button"
                    onClick={() => setToast(`${asset.symbol} 详情页占位`)}
                    sx={{
                      textAlign: "left",
                      cursor: "pointer",
                      flexShrink: 0,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <CardContent sx={{ py: 1.35, "&:last-child": { pb: 1.35 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                          {asset.iconUrl ? (
                            <Box
                              component="img"
                              src={asset.iconUrl}
                              alt=""
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                objectFit: "cover",
                                flexShrink: 0,
                                bgcolor: "action.hover",
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                bgcolor: "action.selected",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {asset.symbol[0]}
                            </Box>
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {asset.symbol}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div">
                              {asset.amount}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, opacity: 0.9 }}>
                              单价 {asset.priceLabel ?? "—"}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" fontWeight={600}>
                            {asset.value}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={
                              asset.change === "—"
                                ? "text.secondary"
                                : asset.change.startsWith("-")
                                  ? "error.main"
                                  : "success.main"
                            }
                          >
                            {asset.change}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0.5,
                flexShrink: 0,
                borderTop: 1,
                borderColor: "divider",
                pt: 1,
                pb: 1,
              }}
            >
              {["首页", "市场", "DApp", "我的"].map((item, idx) => (
                <Button
                  key={item}
                  variant="text"
                  size="small"
                  onClick={() => setToast(`${item} 导航占位`)}
                  sx={{ fontSize: 11, color: idx === 0 ? "primary.main" : "text.secondary", py: 0.5 }}
                >
                  {item}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {current === VIEWS.SEND && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: 2, pb: 2, overflow: "auto" }}>
            <PageHeader title="发送" canBack={canBack} onBack={back} />
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  收款地址
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="0x..."
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  金额
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="0.00"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  网络费用与 nonce 将在确认页展示（占位）。
                </Typography>
              </CardContent>
            </Card>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, borderRadius: 999, py: 1.5, color: "primary.contrastText" }}
              disabled={!sendTo.trim() || !sendAmount.trim()}
              onClick={onSubmitSend}
            >
              下一步
            </Button>
          </Box>
        )}

        {current === VIEWS.RECEIVE && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: 2, pb: 2, overflow: "auto" }}>
            <PageHeader title="接收" canBack={canBack} onBack={back} />
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography align="center" variant="body2" color="text.secondary">
                  当前收款地址
                </Typography>
                <Box sx={{ mt: 2, display: "flex", justifyContent: "center", bgcolor: "#fff", borderRadius: 2, p: 1 }}>
                  {qrDataUrl ? (
                    <Box component="img" src={qrDataUrl} alt="QR" sx={{ width: 180, height: 180 }} />
                  ) : (
                    <Box sx={{ width: 180, height: 180, bgcolor: "grey.300" }} />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    mt: 2,
                    display: "block",
                    wordBreak: "break-all",
                    p: 1,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  {walletAddress}
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={copyWalletAddress}
                    startIcon={
                      addressCopiedFeedback ? (
                        <Check size={16} strokeWidth={2.5} aria-hidden />
                      ) : undefined
                    }
                    sx={{
                      color: addressCopiedFeedback ? "success.main" : undefined,
                      borderColor: addressCopiedFeedback ? "success.main" : undefined,
                      transition: "color 0.2s ease, border-color 0.2s ease",
                    }}
                  >
                    {addressCopiedFeedback ? "已复制" : "复制地址"}
                  </Button>
                  <Button variant="outlined" onClick={() => setToast("分享二维码（占位）")}>
                    分享二维码
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {current === VIEWS.WALLET_HUB && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <PageHeader title="钱包管理" canBack={canBack} onBack={back} />
            {!walletStore ? (
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : (
              <WalletHubView
                store={walletStore}
                onStoreChange={async (next) => {
                  setWalletStore(next);
                  await syncHomeFromWalletStore(next);
                }}
                onAddWallet={() => goto(VIEWS.WALLET_ADD_CHOICE)}
                getVaultPassword={getVaultPassword}
                setToast={setToast}
                onSelectAccount={async (walletId, accountId) => {
                  const next = await setActiveAccount(walletStore, walletId, accountId);
                  setWalletStore(next);
                  await syncHomeFromWalletStore(next);
                  setToast("已切换账户");
                  back();
                }}
              />
            )}
          </Box>
        )}

        {current === VIEWS.WALLET_ADD_CHOICE && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <PageHeader title="添加钱包" canBack={canBack} onBack={back} />
            {!walletStore ? (
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : (
              <AddWalletChoiceView
                onBack={back}
                onCreate={() => goto(VIEWS.WALLET_CREATE)}
                onImport={() => goto(VIEWS.WALLET_IMPORT)}
              />
            )}
          </Box>
        )}

        {current === VIEWS.WALLET_CREATE && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <PageHeader title="创建钱包" canBack={canBack} onBack={back} />
            {!walletStore ? (
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : (
              <CreateWalletFlowView
                store={walletStore}
                onStoreChange={async (next) => {
                  setWalletStore(next);
                  await syncHomeFromWalletStore(next);
                }}
                onBack={back}
                onAfterSuccess={() => {
                  back();
                  back();
                }}
                getVaultPassword={getVaultPassword}
                setToast={setToast}
              />
            )}
          </Box>
        )}

        {current === VIEWS.WALLET_IMPORT && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <PageHeader title="导入钱包" canBack={canBack} onBack={back} />
            {!walletStore ? (
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : (
              <ImportWalletFlowView
                store={walletStore}
                onStoreChange={async (next) => {
                  setWalletStore(next);
                  await syncHomeFromWalletStore(next);
                }}
                onBack={back}
                onAfterSuccess={() => {
                  back();
                  back();
                }}
                getVaultPassword={getVaultPassword}
                setToast={setToast}
              />
            )}
          </Box>
        )}

        {current === VIEWS.SETTINGS && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: 2, pb: 2, overflow: "auto" }}>
            <PageHeader title="设置" canBack={canBack} onBack={back} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              主题
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={themeMode === "light"}
                  onChange={onThemeSwitchChange}
                  color="primary"
                />
              }
              label={themeMode === "light" ? "阳光明媚（浅色）" : "深色模式"}
              sx={{ ml: 0, alignItems: "center", mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              钱包名称
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="例如：主钱包"
              value={settingsNameDraft}
              onChange={(e) => setSettingsNameDraft(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, borderRadius: 999, py: 1.25, color: "primary.contrastText" }}
              onClick={saveSettingsName}
            >
              保存
            </Button>
          </Box>
        )}
          </>
        )}
      </Box>

      <Dialog open={vaultPwOpen} onClose={closeVaultPasswordDialog} fullWidth maxWidth="xs">
        <DialogTitle>输入钱包密码</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            自动恢复会话时未保存密码。请输入钱包密码以继续加密或解密本地数据。
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type={vaultPwShow ? "text" : "password"}
            placeholder="钱包密码"
            value={vaultPwDraft}
            onChange={(e) => setVaultPwDraft(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end" onClick={() => setVaultPwShow((v) => !v)} size="small" aria-label="显示密码">
                    {vaultPwShow ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitVaultPasswordDialog();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeVaultPasswordDialog}>取消</Button>
          <Button variant="contained" onClick={() => void submitVaultPasswordDialog()}>
            确认
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setToast("")} severity="info" variant="filled" sx={{ width: "100%" }}>
          {toast}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
