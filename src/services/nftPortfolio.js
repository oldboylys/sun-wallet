import { getAddress } from "viem";
import { getStorageValue } from "./storage";
import { BSCSCAN_API_KEY_STORAGE_KEY } from "./txHistory";

const BLOCKSCOUT_API_BASE = {
  1: "https://eth.blockscout.com/api",
  11155111: "https://eth-sepolia.blockscout.com/api",
  42161: "https://arbitrum.blockscout.com/api",
  8453: "https://base.blockscout.com/api",
  10: "https://optimism.blockscout.com/api",
  137: "https://polygon.blockscout.com/api",
};

const TX_PREFIX = {
  1: "https://eth.blockscout.com/tx/",
  11155111: "https://eth-sepolia.blockscout.com/tx/",
  42161: "https://arbitrum.blockscout.com/tx/",
  8453: "https://base.blockscout.com/tx/",
  10: "https://optimism.blockscout.com/tx/",
  137: "https://polygon.blockscout.com/tx/",
  56: "https://bscscan.com/tx/",
};

/**
 * @typedef {{
 *   rowKey: string,
 *   contractAddress: string,
 *   tokenId: string,
 *   name: string,
 *   symbol: string,
 *   timestamp: number,
 *   timeLabel: string,
 *   hash: string,
 *   direction: 'in' | 'out',
 *   explorerTxUrl: string,
 * }} NftHistoryRow
 */

function formatTimeLabel(ts) {
  if (ts <= 0) return "—";
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * ERC-721/1155 链上活动（tokennfttx），用于首页 NFT Tab 展示近期 NFT 流转。
 * @param {string} walletAddress
 * @param {number} chainId
 * @param {{ offset?: number }} [opts]
 */
export async function fetchNftTransfers(walletAddress, chainId, opts = {}) {
  const offset = Math.min(opts.offset ?? 40, 100);
  const empty = { ok: false, error: "", items: [], notice: "" };

  let checksum;
  try {
    checksum = getAddress(String(walletAddress ?? "").trim());
  } catch {
    return { ...empty, error: "钱包地址无效" };
  }

  if (chainId === 196) {
    return { ...empty, notice: "X Layer 暂未接入 NFT 索引，请到浏览器查看。" };
  }

  if (chainId === 56) {
    return fetchBscNftTx(checksum, offset);
  }

  const base = BLOCKSCOUT_API_BASE[chainId];
  if (!base) {
    return { ...empty, error: "当前网络未配置 NFT 数据" };
  }

  const params = new URLSearchParams({
    module: "account",
    action: "tokennfttx",
    address: checksum,
    page: "1",
    offset: String(offset),
    sort: "desc",
  });

  let json;
  try {
    const res = await fetch(`${base}?${params.toString()}`);
    json = await res.json();
  } catch {
    return { ...empty, error: "网络请求失败" };
  }

  return normalizeNftJson(json, checksum, chainId);
}

async function fetchBscNftTx(checksum, offset) {
  const empty = { ok: false, error: "", items: [], notice: "" };
  const apiKey = (await getStorageValue(BSCSCAN_API_KEY_STORAGE_KEY, "")) || "";
  if (!String(apiKey).trim()) {
    return {
      ok: true,
      items: [],
      notice: "BNB Chain 需先在「设置」中配置 BscScan API Key 才可查询 NFT 记录。",
    };
  }

  const params = new URLSearchParams({
    module: "account",
    action: "tokennfttx",
    address: checksum,
    startblock: "0",
    endblock: "99999999",
    page: "1",
    offset: String(offset),
    sort: "desc",
    apikey: String(apiKey).trim(),
  });

  let json;
  try {
    const res = await fetch(`https://api.bscscan.com/api?${params.toString()}`);
    json = await res.json();
  } catch {
    return { ...empty, error: "网络请求失败" };
  }

  return normalizeNftJson(json, checksum, 56);
}

/**
 * @param {unknown} json
 * @param {string} checksumWallet
 * @param {number} chainId
 */
function normalizeNftJson(json, checksumWallet, chainId) {
  const empty = { ok: false, error: "", items: [], notice: "" };
  const status = json?.status;
  const message = json?.message;
  const result = json?.result;

  if (String(status) === "0") {
    if (typeof result === "string") {
      const msg = String(message ?? "").toLowerCase();
      if (msg.includes("no transaction") || result === "No transactions found") {
        return { ok: true, items: [], notice: "" };
      }
      return { ...empty, error: result };
    }
    const m = String(message ?? "").toLowerCase();
    if (m.includes("no transaction") || m.includes("no record")) {
      return { ok: true, items: [], notice: "" };
    }
    return { ...empty, error: String(message || "查询失败") };
  }

  if (!Array.isArray(result)) {
    return { ok: true, items: [], notice: "" };
  }

  const txPrefix = TX_PREFIX[chainId] ?? "";
  const items = [];

  for (const raw of result) {
    const hash = raw?.hash;
    const contractAddress = String(raw.contractAddress ?? "").trim();
    const tokenId = String(raw.tokenID ?? raw.tokenId ?? "");
    if (!hash || !contractAddress || tokenId === "") continue;

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

    const ts = Number.parseInt(String(raw.timeStamp ?? "0"), 10);
    const timestamp = Number.isFinite(ts) ? ts : 0;

    let direction = "out";
    if (to.toLowerCase() === checksumWallet.toLowerCase()) direction = "in";
    else if (from.toLowerCase() === checksumWallet.toLowerCase()) direction = "out";

    let contractCs = contractAddress;
    try {
      contractCs = getAddress(contractAddress);
    } catch {
      /* keep raw */
    }

    const name = String(raw.tokenName ?? "未命名 NFT").trim() || "未命名 NFT";
    const symbol = String(raw.tokenSymbol ?? "NFT").trim() || "NFT";

    items.push({
      rowKey: `${hash}-${contractCs}-${tokenId}`,
      contractAddress: contractCs,
      tokenId,
      name,
      symbol,
      timestamp,
      timeLabel: formatTimeLabel(timestamp),
      hash,
      direction,
      explorerTxUrl: txPrefix ? `${txPrefix}${hash}` : "",
    });
  }

  return { ok: true, items, notice: "" };
}
