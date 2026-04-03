import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownToLine, ArrowUpToLine, Compass, Copy, History, Repeat2, Wallet } from "lucide-react";
import QRCode from "qrcode";
import "./styles.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { PageShell } from "./components/app/page-shell";
import { SectionTitle } from "./components/app/section-title";
import { PrimaryAction } from "./components/app/primary-action";
import { PageHeader } from "./components/app/page-header";
import { NoticeListItem } from "./components/app/notice-list-item";
import { PasswordField } from "./components/app/password-field";
import { BottomToast } from "./components/app/bottom-toast";
import { getStorageValue, removeStorageValue, setStorageValue } from "./services/storage";
import { passwordSchema } from "./lib/validators";

const VIEWS = {
  LOGIN: "login",
  FORGOT: "forgot",
  HOME: "home",
  SEND: "send",
  RECEIVE: "receive",
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

const HOME_ASSETS = [
  { symbol: "ETH", amount: "0.0235", value: "$48.02", change: "-4.12%" },
  { symbol: "USDT", amount: "12.40", value: "$12.40", change: "+0.03%" },
  { symbol: "SOL", amount: "0.8900", value: "$79.16", change: "-5.07%" },
];

const RECEIVE_ADDRESS = "0x2fF7D743A1A8Bc13f6C01A3fF8eA7E6Ba6A0f2d5";
const PASSWORD_HASH_KEY = "wallet_password_hash_v1";
const AUTH_MODE = {
  SETUP: "setup",
  UNLOCK: "unlock",
};

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

  const current = stack[stack.length - 1];
  const canBack = stack.length > 1;
  const canReset = checks.every(Boolean);
  const isSetupMode = authMode === AUTH_MODE.SETUP;

  useEffect(() => {
    async function generateQr() {
      if (current !== VIEWS.RECEIVE) return;
      const data = await QRCode.toDataURL(RECEIVE_ADDRESS, {
        width: 220,
        margin: 1,
      });
      setQrDataUrl(data);
    }
    generateQr();
  }, [current]);

  useEffect(() => {
    async function initAuthMode() {
      const hash = await getStorageValue(PASSWORD_HASH_KEY, "");
      setAuthMode(hash ? AUTH_MODE.UNLOCK : AUTH_MODE.SETUP);
      setLoadingAuth(false);
    }
    initAuthMode();
  }, []);

  async function hashPassword(raw) {
    const data = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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

      setStack([VIEWS.HOME]);
      setToast("解锁成功");
      setPassword("");
    } finally {
      setSubmittingAuth(false);
    }
  }

  async function onResetWallet() {
    await removeStorageValue(PASSWORD_HASH_KEY);
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

  return (
    <PageShell>
      {current === VIEWS.LOGIN && (
        <section className="relative flex h-full flex-col px-4 pb-5 pt-5">
          <img
            className="mx-auto mb-4 mt-2 block h-[110px] w-[110px] drop-shadow-[0_0_18px_rgba(255,190,40,0.35)]"
            src="icons/icon-128.png"
            alt="sun wallet logo"
          />

          <SectionTitle
            title={isSetupMode ? "设置钱包密码" : "Web3 入口，一个就够"}
            subtitle={isSetupMode ? "首次使用请设置解锁密码（至少 8 位）" : "钱包 · 交易 · NFT · 赚币 · DApp"}
            titleClassName={isSetupMode ? "text-[52px] tracking-[-0.6px]" : "text-[48px]"}
            subtitleClassName={isSetupMode ? "text-[16px]" : "text-[18px]"}
          />

          <div className="mt-6 space-y-3">
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPassword={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            placeholder={isSetupMode ? "请设置密码（至少 8 位）" : "请输入密码"}
          />

          {isSetupMode ? (
            <Input
              className="h-12 text-[16px]"
              type="password"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          ) : null}
          </div>

          <PrimaryAction
            className="mt-auto text-[24px]"
            disabled={loadingAuth || submittingAuth || !password.trim() || (isSetupMode && !confirmPassword.trim())}
            onClick={onUnlock}
          >
            {submittingAuth ? "处理中..." : isSetupMode ? "创建密码并解锁" : "解锁"}
          </PrimaryAction>

          {!isSetupMode ? (
            <Button
              variant="ghost"
              className="mx-auto mt-3 block h-auto rounded-none p-0 text-[16px] text-zinc-300 hover:bg-transparent hover:text-zinc-100"
              onClick={() => goto(VIEWS.FORGOT)}
            >
              忘记密码?
            </Button>
          ) : null}
        </section>
      )}

      {current === VIEWS.FORGOT && (
        <section className="relative h-full pb-4">
          <PageHeader title="忘记密码" canBack={canBack} onBack={back} />

          <div className="mx-auto mb-3 mt-3 grid h-[92px] w-[92px] place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#b5ff38_0%,#8ff129_45%,#1b2b0d_100%)] text-[42px] text-[#081102] shadow-glow">
            💳
          </div>

          <div className="grid gap-2 px-4">
            {FORGOT_ITEMS.map((text, i) => (
              <NoticeListItem
                key={text}
                text={text}
                checked={checks[i]}
                onCheckedChange={() =>
                  setChecks((prev) => {
                    const next = [...prev];
                    next[i] = !next[i];
                    return next;
                  })
                }
              />
            ))}
          </div>

          <Button
            variant={canReset ? "primary" : "danger"}
            className="mx-4 mt-3 h-[46px] w-[calc(100%-32px)] text-[20px] tracking-[0.2px] rounded-full"
            disabled={!canReset}
            onClick={onResetWallet}
          >
            重置钱包
          </Button>
        </section>
      )}

      {current === VIEWS.HOME && (
        <section className="relative px-4 pb-4 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-md border border-sw-border bg-sw-surface2">
                <img className="h-full w-full object-cover" src="icons/icon-32.png" alt="account avatar" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-sw-text">账户 01</p>
                <p className="text-[12px] text-sw-muted">钱包 01</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg">
                <Compass className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg">
                <Wallet className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="sw-card mb-4 p-4">
            <p className="text-sm text-sw-muted">总资产估值</p>
            <h2 className="mt-1 text-[42px] font-bold leading-none text-sw-text">$89.49</h2>
            <p className="mt-2 text-sm font-medium text-sw-success">+$10.67 (+13.54%) 1日</p>
          </div>

          <div className="mb-4 grid grid-cols-4 gap-2">
            {HOME_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.key}
                  variant="secondary"
                  className="h-auto flex-col gap-1 rounded-xl py-2 text-[12px]"
                  onClick={() => onHomeAction(item.key, item.label)}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-zinc-800">
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </Button>
              );
            })}
          </div>

          <div className="mb-2 flex gap-3 border-b border-sw-border">
            {HOME_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`pb-2 text-[14px] ${
                  activeTab === tab
                    ? "border-b-2 border-sw-primary text-sw-text"
                    : "text-sw-muted hover:text-zinc-300"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {HOME_ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                type="button"
                className="sw-card flex w-full items-center justify-between px-3 py-3 text-left"
                onClick={() => setToast(`${asset.symbol} 详情页占位`)}
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-800 text-xs font-semibold">
                    {asset.symbol[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sw-text">{asset.symbol}</p>
                    <p className="text-xs text-sw-muted">{asset.amount}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-sw-text">{asset.value}</p>
                  <p className={`text-xs ${asset.change.startsWith("-") ? "text-sw-danger" : "text-sw-success"}`}>
                    {asset.change}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-sw-border pt-3">
            {["首页", "市场", "DApp", "我的"].map((item, idx) => (
              <button
                key={item}
                type="button"
                className={`text-center text-[12px] ${idx === 0 ? "text-sw-primary" : "text-sw-muted"}`}
                onClick={() => setToast(`${item} 导航占位`)}
              >
                <div className="mb-1 text-base">{idx === 0 ? "●" : "○"}</div>
                {item}
              </button>
            ))}
          </div>
        </section>
      )}

      {current === VIEWS.SEND && (
        <section className="relative px-4 pb-5">
          <PageHeader title="发送" canBack={canBack} onBack={back} />
          <div className="mt-4 sw-card p-4">
            <p className="mb-2 text-sm text-sw-muted">收款地址</p>
            <Input
              className="mb-3 h-11 text-sm"
              placeholder="0x..."
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
            />
            <p className="mb-2 text-sm text-sw-muted">金额</p>
            <Input
              className="h-11 text-sm"
              placeholder="0.00"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
            />
            <p className="mt-3 text-xs text-sw-muted">网络费用与 nonce 将在确认页展示（占位）。</p>
          </div>
          <PrimaryAction
            className="mt-4 text-[24px]"
            disabled={!sendTo.trim() || !sendAmount.trim()}
            onClick={onSubmitSend}
          >
            下一步
          </PrimaryAction>
        </section>
      )}

      {current === VIEWS.RECEIVE && (
        <section className="relative px-4 pb-5">
          <PageHeader title="接收" canBack={canBack} onBack={back} />
          <div className="mt-4 sw-card p-4">
            <p className="text-center text-sm text-sw-muted">当前收款地址</p>
            <div className="mt-3 grid place-items-center rounded-xl bg-white p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="receive qrcode" className="h-[220px] w-[220px]" />
              ) : (
                <div className="h-[220px] w-[220px] bg-zinc-200" />
              )}
            </div>
            <div className="mt-3 rounded-lg border border-sw-border bg-sw-surface px-3 py-2 text-xs text-zinc-300">
              {RECEIVE_ADDRESS}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" className="h-10" onClick={() => setToast("地址已复制（占位）")}>
                复制地址
              </Button>
              <Button variant="secondary" className="h-10" onClick={() => setToast("分享二维码（占位）")}>
                分享二维码
              </Button>
            </div>
          </div>
        </section>
      )}

      <BottomToast message={toast} />
    </PageShell>
  );
}

createRoot(document.getElementById("root")).render(<App />);
