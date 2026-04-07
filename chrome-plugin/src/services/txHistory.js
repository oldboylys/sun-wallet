import { formatEther, formatUnits, getAddress } from "viem";
import { EVM_CHAINS } from "./chainRegistry";
import { getStorageValue } from "./storage";

/** 设置页保存后，BNB Chain 历史使用 BscScan API */
export const BSCSCAN_API_KEY_STORAGE_KEY = "wallet_bscscan_api_key_v1";

const BLOCKSCOUT_API_BASE = {
  1: "https://eth.blockscout.com/api",
  11155111: "https://eth-sepolia.blockscout.com/api",
  42161: "https://arbitrum.blockscout.com/api",
  8453: "https://base.blockscout.com/api",
  10: "https://optimism.blockscout.com/api",
  137: "https://polygon.blockscout.com/api",
};

/** 浏览器查看单笔交易 */
const TX_EXPLORER_TX_PREFIX = {
  1: "https://eth.blockscout.com/tx/",
  11155111: "https://eth-sepolia.blockscout.com/tx/",
  42161: "https://arbitrum.blockscout.com/tx/",
  8453: "https://base.blockscout.com/tx/",
  10: "https://optimism.blockscout.com/tx/",
  137: "https://polygon.blockscout.com/tx/",
  56: "https://bscscan.com/tx/",
  196: "https://www.oklink.com/xlayer/tx/",
};

/**
 * @typedef {{
 *   rowKey: string,
 *   kind: 'native' | 'erc20',
 *   hash: string,
 *   from: string,
 *   to: string,
 *   timestamp: number,
 *   timeLabel: string,
 *   statusOk: boolean,
 *   direction: 'in' | 'out' | 'self',
 *   explorerUrl: string,
 *   valueDisplay?: string,
 *   valueWei?: string,
 *   tokenSymbol?: string,
 *   tokenAmountDisplay?: string,
 *   contractAddress?: string,
 * }} TxHistoryRow
 */

/**
 * @param {string} walletAddress
 * @param {number} chainId
 * @param {{ page?: number, offset?: number }} [opts]
 * @returns {Promise<{ ok: boolean, error?: string, notice?: string, items: TxHistoryRow[] }>}
 */
export async function fetchAddressTransactions(walletAddress, chainId, opts = {}) {
  const page = opts.page ?? 1;
  const offset = Math.min(opts.offset ?? 30, 100);

  const empty = { ok: false, error: "", items: [] };
  let checksumWallet;
  try {
    checksumWallet = getAddress(String(walletAddress ?? "").trim());
  } catch {
    return { ...empty, error: "钱包地址无效" };
  }

  if (chainId === 196) {
    return {
      ...empty,
      error: "X Layer 暂不支持在此查询交易历史，请到区块浏览器查看。",
    };
  }

  if (chainId === 56) {
    return fetchBscScanHistory(checksumWallet, page, offset);
  }

  const base = BLOCKSCOUT_API_BASE[chainId];
  if (!base) {
    return { ...empty, error: "当前网络未配置交易历史数据源" };
  }

  const txlistParams = new URLSearchParams({
    module: "account",
    action: "txlist",
    address: checksumWallet,
    page: String(page),
    offset: String(offset),
    sort: "desc",
  });
  const tokenParams = new URLSearchParams({
    module: "account",
    action: "tokentx",
    address: checksumWallet,
    page: String(page),
    offset: String(offset),
    sort: "desc",
  });

  let nativeJson;
  let tokenJson;
  try {
    const [r1, r2] = await Promise.all([
      fetch(`${base}?${txlistParams.toString()}`),
      fetch(`${base}?${tokenParams.toString()}`),
    ]);
    nativeJson = await r1.json();
    tokenJson = await r2.json();
  } catch {
    return { ...empty, error: "网络请求失败，请稍后重试" };
  }

  const nativeNorm = normalizeNativeTxResponse(nativeJson, checksumWallet, chainId);
  if (!nativeNorm.ok) {
    return nativeNorm;
  }

  let tokenItems = [];
  const tokenNorm = normalizeTokenTxResponse(tokenJson, checksumWallet, chainId);
  if (tokenNorm.ok) {
    tokenItems = tokenNorm.items;
  }

  const merged = mergeByTimeDesc(nativeNorm.items, tokenItems, offset);
  return { ok: true, items: merged };
}

/**
 * @param {TxHistoryRow[]} a
 * @param {TxHistoryRow[]} b
 * @param {number} max
 */
function mergeByTimeDesc(a, b, max) {
  return [...a, ...b]
    .sort((x, y) => y.timestamp - x.timestamp)
    .slice(0, max);
}

async function fetchBscScanHistory(checksumWallet, page, offset) {
  const empty = { ok: false, error: "", items: [] };
  const apiKey = (await getStorageValue(BSCSCAN_API_KEY_STORAGE_KEY, "")) || "";
  if (!String(apiKey).trim()) {
    return {
      ok: true,
      items: [],
      notice:
        "BNB Chain 交易列表需 BscScan API Key：打开 bscscan.com/apis 注册免费 Key，在「设置」中粘贴保存后即可查询。",
    };
  }

  const key = String(apiKey).trim();
  const common = {
    module: "account",
    address: checksumWallet,
    startblock: "0",
    endblock: "99999999",
    page: String(page),
    offset: String(offset),
    sort: "desc",
    apikey: key,
  };

  const txParams = new URLSearchParams({ ...common, action: "txlist" });
  const tokenParams = new URLSearchParams({ ...common, action: "tokentx" });

  let nativeJson;
  let tokenJson;
  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://api.bscscan.com/api?${txParams.toString()}`),
      fetch(`https://api.bscscan.com/api?${tokenParams.toString()}`),
    ]);
    nativeJson = await r1.json();
    tokenJson = await r2.json();
  } catch {
    return { ...empty, error: "网络请求失败，请稍后重试" };
  }

  const nativeNorm = normalizeNativeTxResponse(nativeJson, checksumWallet, 56);
  if (!nativeNorm.ok) {
    return nativeNorm;
  }

  let tokenItems = [];
  const tokenNorm = normalizeTokenTxResponse(tokenJson, checksumWallet, 56);
  if (tokenNorm.ok) {
    tokenItems = tokenNorm.items;
  }

  const merged = mergeByTimeDesc(nativeNorm.items, tokenItems, offset);
  return { ok: true, items: merged };
}

/**
 * @param {unknown} json
 * @param {string} checksumWallet
 * @param {number} chainId
 */
function normalizeNativeTxResponse(json, checksumWallet, chainId) {
  const empty = { ok: false, error: "", items: [] };
  const err = parseExplorerError(json);
  if (err) {
    if (err.empty) return { ok: true, items: [] };
    return { ...empty, error: err.message };
  }

  const result = json?.result;
  if (!Array.isArray(result)) {
    return { ok: true, items: [] };
  }

  const prefix = TX_EXPLORER_TX_PREFIX[chainId] ?? "";
  /** @type {TxHistoryRow[]} */
  const items = [];

  for (const raw of result) {
    const hash = raw?.hash;
    if (!hash || typeof hash !== "string") continue;

    let from = String(raw.from ?? "");
    let to = String(raw.to ?? "");
    try {
      from = getAddress(from);
    } catch {
      continue;
    }
    try {
      to = to ? getAddress(to) : "";
    } catch {
      to = "";
    }

    const valueStr = String(raw.value ?? "0");
    let valueDisplay = "0";
    try {
      valueDisplay = formatEther(BigInt(valueStr));
    } catch {
      valueDisplay = "0";
    }

    const ts = Number.parseInt(String(raw.timeStamp ?? "0"), 10);
    const timestamp = Number.isFinite(ts) ? ts : 0;
    const timeLabel = formatTimeLabel(timestamp);

    const receipt = raw.txreceipt_status ?? raw.isError;
    const statusOk =
      receipt === "1" || receipt === 1 || raw.isError === "0" || raw.isError === 0;

    let direction = "self";
    if (from.toLowerCase() === checksumWallet.toLowerCase() && to.toLowerCase() === checksumWallet.toLowerCase()) {
      direction = "self";
    } else if (from.toLowerCase() === checksumWallet.toLowerCase()) {
      direction = "out";
    } else if (to.toLowerCase() === checksumWallet.toLowerCase()) {
      direction = "in";
    }

    items.push({
      kind: "native",
      rowKey: `n-${hash}`,
      hash,
      from,
      to,
      valueWei: valueStr,
      valueDisplay,
      timestamp,
      timeLabel,
      statusOk,
      direction,
      explorerUrl: prefix ? `${prefix}${hash}` : "",
    });
  }

  return { ok: true, items };
}

/**
 * ERC-20：`tokentx`（Blockscout / Etherscan 系）
 * @param {unknown} json
 * @param {string} checksumWallet
 * @param {number} chainId
 */
function normalizeTokenTxResponse(json, checksumWallet, chainId) {
  const err = parseExplorerError(json);
  if (err) {
    if (err.empty) return { ok: true, items: [] };
    /** 代币列表非关键路径：失败时仍展示原生转账 */
    return { ok: true, items: [] };
  }

  const result = json?.result;
  if (!Array.isArray(result)) {
    return { ok: true, items: [] };
  }

  const prefix = TX_EXPLORER_TX_PREFIX[chainId] ?? "";
  /** @type {TxHistoryRow[]} */
  const items = [];

  for (let i = 0; i < result.length; i += 1) {
    const raw = result[i];
    const hash = raw?.hash;
    if (!hash || typeof hash !== "string") continue;

    let from = String(raw.from ?? "");
    let to = String(raw.to ?? "");
    const contractAddress = String(raw.contractAddress ?? "").trim();
    try {
      from = getAddress(from);
    } catch {
      continue;
    }
    try {
      to = to ? getAddress(to) : "";
    } catch {
      to = "";
    }

    const decimals = Math.min(36, Math.max(0, Number.parseInt(String(raw.tokenDecimal ?? "18"), 10) || 18));
    const valueStr = String(raw.value ?? "0");
    let tokenAmountDisplay = "0";
    try {
      tokenAmountDisplay = formatUnits(BigInt(valueStr), decimals);
    } catch {
      tokenAmountDisplay = "0";
    }

    const symbol = String(raw.tokenSymbol ?? "?").trim() || "?";

    const ts = Number.parseInt(String(raw.timeStamp ?? "0"), 10);
    const timestamp = Number.isFinite(ts) ? ts : 0;
    const timeLabel = formatTimeLabel(timestamp);

    let direction = "self";
    if (from.toLowerCase() === checksumWallet.toLowerCase() && to.toLowerCase() === checksumWallet.toLowerCase()) {
      direction = "self";
    } else if (from.toLowerCase() === checksumWallet.toLowerCase()) {
      direction = "out";
    } else if (to.toLowerCase() === checksumWallet.toLowerCase()) {
      direction = "in";
    }

    let contractCs = "";
    try {
      contractCs = contractAddress ? getAddress(contractAddress) : "";
    } catch {
      contractCs = contractAddress;
    }

    const logIndex = raw.logIndex ?? raw.transactionIndex ?? i;
    const rowKey = `t-${hash}-${contractCs || "unknown"}-${String(logIndex)}`;

    items.push({
      kind: "erc20",
      rowKey,
      hash,
      from,
      to,
      contractAddress: contractCs,
      tokenSymbol: symbol,
      tokenAmountDisplay,
      timestamp,
      timeLabel,
      statusOk: true,
      direction,
      explorerUrl: prefix ? `${prefix}${hash}` : "",
    });
  }

  return { ok: true, items };
}

/** @param {number} timestamp */
function formatTimeLabel(timestamp) {
  if (timestamp <= 0) return "—";
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * @param {unknown} json
 * @returns {{ empty?: boolean, message?: string } | null}
 */
function parseExplorerError(json) {
  const status = json?.status;
  const message = json?.message;
  const result = json?.result;

  if (status === "0" && typeof result === "string") {
    const r = result;
    const msg = String(message ?? "").toLowerCase();
    if (msg.includes("no transactions") || r === "No transactions found") {
      return { empty: true };
    }
    return {
      message:
        r === "Invalid API Key"
          ? "BscScan API Key 无效，请在设置中更新。"
          : r || String(message || "查询失败"),
    };
  }

  if (status === "0" && typeof message === "string") {
    const m = message.toLowerCase();
    if (m.includes("no transactions") || m.includes("no record")) {
      return { empty: true };
    }
    return { message: message || "查询失败" };
  }

  return null;
}

export function getTxExplorerTxUrl(chainId, hash) {
  const p = TX_EXPLORER_TX_PREFIX[chainId];
  if (!p || !hash) return "";
  return `${p}${hash}`;
}

/** @param {number} chainId */
export function getChainDisplayName(chainId) {
  return EVM_CHAINS.find((c) => c.id === chainId)?.name ?? `链 ${chainId}`;
}

/**
 * 客户端筛选（时间/资产类型/代币符号）。时间仅作用于已拉取到的记录。
 * @param {TxHistoryRow[]} items
 * @param {{
 *   timeStartSec: number | null,
 *   timeEndSec: number | null,
 *   assetKind: 'all' | 'native' | 'erc20',
 *   tokenSymbolQuery: string,
 *   nativeSymbol: string,
 * }} f
 */
export function filterHistoryItems(items, f) {
  let ts = f.timeStartSec;
  let te = f.timeEndSec;
  if (ts != null && te != null && ts > te) {
    const x = ts;
    ts = te;
    te = x;
  }

  const sym = (f.nativeSymbol || "ETH").trim();
  const q = (f.tokenSymbolQuery || "").trim().toLowerCase();

  return items.filter((tx) => {
    if (ts != null && tx.timestamp < ts) return false;
    if (te != null && tx.timestamp > te) return false;

    if (f.assetKind === "native" && tx.kind !== "native") return false;
    if (f.assetKind === "erc20" && tx.kind !== "erc20") return false;

    if (q) {
      if (tx.kind === "native") {
        if (!sym.toLowerCase().includes(q)) return false;
      } else {
        if (!(tx.tokenSymbol || "").toLowerCase().includes(q)) return false;
      }
    }

    return true;
  });
}

/** `YYYY-MM-DD` → 当日 00:00:00 本地时间的 unix 秒 */
export function dateInputToStartOfDaySec(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return null;
  const t = Date.parse(`${isoDate}T00:00:00`);
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 1000);
}

/** `YYYY-MM-DD` → 当日 23:59:59 本地时间的 unix 秒 */
export function dateInputToEndOfDaySec(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return null;
  const t = Date.parse(`${isoDate}T23:59:59`);
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 1000);
}
