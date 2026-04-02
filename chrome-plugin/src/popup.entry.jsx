import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Wallet } from "ethers";

const STORAGE_KEY = "wallet_demo_data_v1";

const VIEWS = {
  WELCOME: "welcome",
  CREATE_BACKUP: "create-backup",
  CREATE_VERIFY: "create-verify",
  IMPORT_PICK: "import-pick",
  IMPORT_MNEMONIC: "import-mnemonic",
  IMPORT_PK: "import-pk",
  HOME: "home",
};

const storage = {
  async get() {
    if (globalThis.chrome?.storage?.local) {
      const res = await chrome.storage.local.get([STORAGE_KEY]);
      return res[STORAGE_KEY] || null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async set(value) {
    if (globalThis.chrome?.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: value });
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },
  async clear() {
    if (globalThis.chrome?.storage?.local) {
      await chrome.storage.local.remove([STORAGE_KEY]);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  },
};

function makeIndexes(count) {
  const list = Array.from({ length: count }, (_, i) => i);
  const out = [];
  while (out.length < 3 && list.length) {
    const pick = Math.floor(Math.random() * list.length);
    out.push(list.splice(pick, 1)[0]);
  }
  return out;
}

function normalizeMnemonic(v) {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePrivateKey(v) {
  const text = v.trim();
  if (!text) return "";
  return text.startsWith("0x") ? text : `0x${text}`;
}

function shortAddress(addr) {
  if (!addr) return "-";
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function App() {
  const [stack, setStack] = useState([VIEWS.WELCOME]);
  const [wallet, setWallet] = useState(null);
  const [draftWallet, setDraftWallet] = useState(null);
  const [verifyIndexes, setVerifyIndexes] = useState([0, 1, 2]);
  const [verifyInputs, setVerifyInputs] = useState(["", "", ""]);
  const [importMnemonic, setImportMnemonic] = useState("");
  const [importPk, setImportPk] = useState("");
  const [status, setStatus] = useState({ text: "", error: false });

  const current = stack[stack.length - 1];

  useEffect(() => {
    (async () => {
      const cached = await storage.get();
      if (cached?.address) {
        setWallet(cached);
        setStack([VIEWS.HOME]);
      }
    })();
  }, []);

  const title = useMemo(() => {
    switch (current) {
      case VIEWS.WELCOME:
        return "OKX 风格钱包";
      case VIEWS.CREATE_BACKUP:
        return "备份助记词";
      case VIEWS.CREATE_VERIFY:
        return "验证助记词";
      case VIEWS.IMPORT_PICK:
        return "导入钱包";
      case VIEWS.IMPORT_MNEMONIC:
        return "助记词导入";
      case VIEWS.IMPORT_PK:
        return "私钥导入";
      case VIEWS.HOME:
        return "钱包主页";
      default:
        return "钱包";
    }
  }, [current]);

  function goto(view) {
    setStatus({ text: "", error: false });
    setStack((prev) => [...prev, view]);
  }

  function back() {
    setStatus({ text: "", error: false });
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  async function saveAndEnterHome(w) {
    await storage.set(w);
    setWallet(w);
    setStack([VIEWS.HOME]);
    setStatus({ text: "导入成功。", error: false });
  }

  function createWalletFlow() {
    const created = Wallet.createRandom();
    const phrase = normalizeMnemonic(created.mnemonic?.phrase || "");
    const w = {
      address: created.address,
      privateKey: created.privateKey,
      mnemonic: phrase,
      source: "created",
    };
    setDraftWallet(w);
    setVerifyIndexes(makeIndexes(phrase.split(" ").length));
    setVerifyInputs(["", "", ""]);
    goto(VIEWS.CREATE_BACKUP);
  }

  async function verifyAndComplete() {
    if (!draftWallet?.mnemonic) {
      setStatus({ text: "缺少助记词数据，请重新创建。", error: true });
      return;
    }
    const words = draftWallet.mnemonic.split(" ");
    const ok = verifyInputs.every(
      (v, i) => v.trim().toLowerCase() === words[verifyIndexes[i]],
    );
    if (!ok) {
      setStatus({ text: "校验失败，请检查输入。", error: true });
      return;
    }
    await saveAndEnterHome(draftWallet);
  }

  async function importByMnemonic() {
    try {
      const phrase = normalizeMnemonic(importMnemonic);
      const imported = Wallet.fromPhrase(phrase);
      await saveAndEnterHome({
        address: imported.address,
        privateKey: imported.privateKey,
        mnemonic: phrase,
        source: "mnemonic",
      });
    } catch (e) {
      setStatus({ text: `导入失败：${e.message}`, error: true });
    }
  }

  async function importByPrivateKey() {
    try {
      const key = normalizePrivateKey(importPk);
      const imported = new Wallet(key);
      await saveAndEnterHome({
        address: imported.address,
        privateKey: imported.privateKey,
        mnemonic: "",
        source: "private-key",
      });
    } catch (e) {
      setStatus({ text: `导入失败：${e.message}`, error: true });
    }
  }

  async function resetWallet() {
    await storage.clear();
    setWallet(null);
    setDraftWallet(null);
    setImportMnemonic("");
    setImportPk("");
    setStack([VIEWS.WELCOME]);
    setStatus({ text: "已清除本地钱包。", error: false });
  }

  const canBack = stack.length > 1;

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          {canBack ? (
            <button className="back-btn" onClick={back}>
              ←
            </button>
          ) : (
            <span style={{ width: 30 }} />
          )}
          <div className="top-title">{title}</div>
        </div>
        <span className="tag">ETH</span>
      </div>

      {current === VIEWS.WELCOME && (
        <div className="panel hero-card">
          <div className="headline">One Wallet, Web3 Ready</div>
          <p className="sub">创建或导入以太坊钱包，流程体验接近 OKX 钱包新手引导。</p>
          <div className="actions">
            <button className="btn-primary" onClick={createWalletFlow}>
              创建钱包
            </button>
            <button className="btn-secondary" onClick={() => goto(VIEWS.IMPORT_PICK)}>
              导入已有钱包
            </button>
          </div>
        </div>
      )}

      {current === VIEWS.CREATE_BACKUP && draftWallet && (
        <div className="panel">
          <div className="block">
            <div className="label">请离线保存助记词（仅展示一次）</div>
            <div className="phrase-grid">
              {draftWallet.mnemonic.split(" ").map((w, i) => (
                <div className="chip" key={`${w}-${i}`}>
                  {i + 1}. {w}
                </div>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={() => goto(VIEWS.CREATE_VERIFY)}>
            我已备份，下一步
          </button>
        </div>
      )}

      {current === VIEWS.CREATE_VERIFY && draftWallet && (
        <div className="panel">
          <div className="block">
            <div className="label">请输入下列位置的助记词，完成校验</div>
            {verifyIndexes.map((idx, i) => (
              <div className="block" key={idx}>
                <input
                  placeholder={`第 ${idx + 1} 个词`}
                  value={verifyInputs[i]}
                  onChange={(e) =>
                    setVerifyInputs((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                />
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={verifyAndComplete}>
            完成创建
          </button>
        </div>
      )}

      {current === VIEWS.IMPORT_PICK && (
        <div className="panel">
          <div className="block">
            <div className="headline" style={{ fontSize: 16 }}>
              选择导入方式
            </div>
            <p className="sub">支持助记词与私钥两种导入路径。</p>
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={() => goto(VIEWS.IMPORT_MNEMONIC)}>
              通过助记词导入
            </button>
            <button className="btn-secondary" onClick={() => goto(VIEWS.IMPORT_PK)}>
              通过私钥导入
            </button>
          </div>
        </div>
      )}

      {current === VIEWS.IMPORT_MNEMONIC && (
        <div className="panel">
          <div className="block">
            <div className="label">助记词（空格分隔）</div>
            <textarea
              value={importMnemonic}
              onChange={(e) => setImportMnemonic(e.target.value)}
              placeholder="legal winner thank year wave sausage worth useful legal winner thank yellow"
            />
          </div>
          <button className="btn-primary" onClick={importByMnemonic}>
            导入并进入钱包
          </button>
        </div>
      )}

      {current === VIEWS.IMPORT_PK && (
        <div className="panel">
          <div className="block">
            <div className="label">私钥（0x 开头或 64 位十六进制）</div>
            <input
              value={importPk}
              onChange={(e) => setImportPk(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <button className="btn-primary" onClick={importByPrivateKey}>
            导入并进入钱包
          </button>
        </div>
      )}

      {current === VIEWS.HOME && wallet && (
        <div className="panel">
          <div className="wallet-card">
            <div className="label">当前地址</div>
            <div className="wallet-address">{wallet.address}</div>
            <div className="status">来源：{wallet.source}</div>
          </div>

          <div className="mono block">简短地址: {shortAddress(wallet.address)}</div>
          <div className="tabs">
            <div className="tab">资产</div>
            <div className="tab">转账</div>
            <div className="tab">发现</div>
          </div>

          <div className="actions">
            <button className="btn-secondary" onClick={() => goto(VIEWS.IMPORT_PICK)}>
              导入其他钱包
            </button>
            <button className="btn-danger" onClick={resetWallet}>
              清除本地钱包
            </button>
          </div>
        </div>
      )}

      {status.text ? (
        <div className={`status ${status.error ? "error" : ""}`}>{status.text}</div>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
