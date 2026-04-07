import { formatEther, getAddress } from "viem";
import { EVM_CHAINS } from "./chainRegistry";
import { getStorageValue } from "./storage";

/** 设置页保存后，BNB Chain 历史使用 BscScan API */
export const BSCSCAN_API_KEY_STORAGE_KEY = "wallet_bscscan_api_key_v1";

/**
 * Blockscout 公开 API（account/txlist），无需 API Key。
 * BSC 公共 Blockscout 实例不稳定，链 56 走 BscScan（可选 Key，见 fetchAddressTransactions）。
 */
const BLOCKSCOUT_TXLIST_BASE = {
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
 *   hash: string,
 *   from: string,
 *   to: string,
 *   valueWei: string,
 *   valueDisplay: string,
 *   timestamp: number,
 *   timeLabel: string,
 *   statusOk: boolean,
 *   direction: 'in' | 'out' | 'self',
 *   explorerUrl: string,
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
  const offset = Math.min(opts.offset ?? 25, 100);

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
    return fetchBscScanTxList(checksumWallet, page, offset);
  }

  const base = BLOCKSCOUT_TXLIST_BASE[chainId];
  if (!base) {
    return { ...empty, error: "当前网络未配置交易历史数据源" };
  }

  const params = new URLSearchParams({
    module: "account",
    action: "txlist",
    address: checksumWallet,
    page: String(page),
    offset: String(offset),
    sort: "desc",
  });

  let res;
  try {
    res = await fetch(`${base}?${params.toString()}`);
  } catch {
    return { ...empty, error: "网络请求失败，请稍后重试" };
  }

  let json;
  try {
    json = await res.json();
  } catch {
    return { ...empty, error: "无法解析服务器响应" };
  }

  return normalizeExplorerTxResponse(json, checksumWallet, chainId);
}

async function fetchBscScanTxList(checksumWallet, page, offset) {
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

  const params = new URLSearchParams({
    module: "account",
    action: "txlist",
    address: checksumWallet,
    startblock: "0",
    endblock: "99999999",
    page: String(page),
    offset: String(offset),
    sort: "desc",
    apikey: String(apiKey).trim(),
  });

  let res;
  try {
    res = await fetch(`https://api.bscscan.com/api?${params.toString()}`);
  } catch {
    return { ...empty, error: "网络请求失败，请稍后重试" };
  }

  let json;
  try {
    json = await res.json();
  } catch {
    return { ...empty, error: "无法解析 BscScan 响应" };
  }

  return normalizeExplorerTxResponse(json, checksumWallet, 56);
}

/**
 * @param {unknown} json
 * @param {string} checksumWallet
 * @param {number} chainId
 */
function normalizeExplorerTxResponse(json, checksumWallet, chainId) {
  const empty = { ok: false, error: "", items: [] };
  const status = json?.status;
  const message = json?.message;
  const result = json?.result;

  if (status === "0" && typeof result === "string") {
    const r = result;
    const msg = String(message ?? "").toLowerCase();
    if (msg.includes("no transactions") || r === "No transactions found") {
      return { ok: true, items: [] };
    }
    return {
      ...empty,
      error:
        r === "Invalid API Key"
          ? "BscScan API Key 无效，请在设置中更新。"
          : r || String(message || "查询失败"),
    };
  }

  if (status === "0" && typeof message === "string") {
    const m = message.toLowerCase();
    if (m.includes("no transactions") || m.includes("no record")) {
      return { ok: true, items: [] };
    }
    return {
      ...empty,
      error: message || "查询失败",
    };
  }

  if (!Array.isArray(result)) {
    return { ok: true, items: [] };
  }

  const prefix = TX_EXPLORER_TX_PREFIX[chainId] ?? "";
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
    const timeLabel =
      timestamp > 0
        ? new Date(timestamp * 1000).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";

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

export function getTxExplorerTxUrl(chainId, hash) {
  const p = TX_EXPLORER_TX_PREFIX[chainId];
  if (!p || !hash) return "";
  return `${p}${hash}`;
}

/** @param {number} chainId */
export function getChainDisplayName(chainId) {
  return EVM_CHAINS.find((c) => c.id === chainId)?.name ?? `链 ${chainId}`;
}
