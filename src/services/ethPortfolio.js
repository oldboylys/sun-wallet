import { createPublicClient, formatUnits, getAddress, http } from "viem";
import { mainnet } from "viem/chains";
import { getChainNativeListSymbol } from "./chainRegistry";

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

/**
 * 以太坊主网：默认追踪的资产。
 * BTC 使用 WBTC；SOL 使用 Wormhole 包装 SOL（ERC-20），价格仍按 SOL/USD。
 */
export const TRACKED_ASSETS = [
  {
    id: "ETH",
    symbol: "ETH",
    kind: "native",
    decimals: 18,
    coingeckoId: "ethereum",
    iconUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  },
  {
    id: "USDT",
    symbol: "USDT",
    kind: "erc20",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    coingeckoId: "tether",
    iconUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  },
  {
    id: "USDC",
    symbol: "USDC",
    kind: "erc20",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    coingeckoId: "usd-coin",
    iconUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  },
  {
    id: "BTC",
    symbol: "BTC",
    kind: "erc20",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    coingeckoId: "bitcoin",
    note: "WBTC 余额按 BTC 展示",
    iconUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  },
  {
    id: "SOL",
    symbol: "SOL",
    kind: "erc20",
    address: "0xD31a59c85aD9ee8cDf6f46FEb8555803A217b2E0",
    decimals: 9,
    coingeckoId: "solana",
    note: "Wormhole 包装 SOL",
    iconUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  },
];

/** 首页展示：不含 WBTC、包装 SOL（按链切换时由主网列表单独控制） */
export const MAINNET_HOME_ASSETS = TRACKED_ASSETS.filter((a) => a.id !== "BTC" && a.id !== "SOL");

const PUBLIC_RPC = "https://ethereum.publicnode.com";

const COINGECKO_SIMPLE = "https://api.coingecko.com/api/v3/simple/price";

/**
 * @returns {Promise<{ ok: boolean, error?: string, totalUsd: number, change24hWeighted: number | null, items: Array<{ symbol: string, amount: string, value: string, change: string, valueUsd: number }> }>}
 */
export async function fetchEthereumMainnetPortfolio(walletAddress) {
  const empty = {
    ok: false,
    error: "",
    totalUsd: 0,
    change24hWeighted: null,
    items: [],
  };

  const trimmed = String(walletAddress ?? "").trim();
  let checksum;
  try {
    /** getAddress 接受任意合法 0x40 位十六进制，并规范为 EIP-55；避免 isAddress 默认 strict 误判 */
    checksum = getAddress(trimmed);
  } catch {
    return { ...empty, error: "钱包地址无效" };
  }

  const client = createPublicClient({
    chain: mainnet,
    transport: http(PUBLIC_RPC),
  });

  const coingeckoIds = [...new Set(MAINNET_HOME_ASSETS.map((a) => a.coingeckoId))].join(",");

  let priceRes;
  try {
    const url = `${COINGECKO_SIMPLE}?ids=${coingeckoIds}&vs_currencies=usd&include_24hr_change=true`;
    priceRes = await fetch(url);
    if (!priceRes.ok) {
      return { ...empty, error: `价格服务不可用 (${priceRes.status})` };
    }
  } catch {
    return { ...empty, error: "无法获取币种价格，请检查网络" };
  }

  /** @type {Record<string, { usd?: number, usd_24h_change?: number }>} */
  const priceData = await priceRes.json();

  const balances = await Promise.all(
    MAINNET_HOME_ASSETS.map(async (asset) => {
      try {
        if (asset.kind === "native") {
          const wei = await client.getBalance({ address: checksum });
          return { asset, raw: wei };
        }
        const raw = await client.readContract({
          address: asset.address,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [checksum],
        });
        return { asset, raw };
      } catch {
        return { asset, raw: 0n };
      }
    }),
  );

  const items = [];
  let totalUsd = 0;
  let weightedChangeSum = 0;

  for (const { asset, raw } of balances) {
    const amountStr = formatTokenAmount(raw, asset.decimals);
    const px = priceData[asset.coingeckoId];
    const priceUsd = typeof px?.usd === "number" ? px.usd : 0;
    const change24h = typeof px?.usd_24h_change === "number" ? px.usd_24h_change : null;

    const numericAmount = Number.parseFloat(amountStr) || 0;
    const valueUsd = numericAmount * priceUsd;

    totalUsd += valueUsd;
    if (change24h != null && valueUsd > 0) {
      weightedChangeSum += valueUsd * change24h;
    }

    items.push({
      rowKey: asset.kind === "native" ? "native-1" : `tracked-${asset.id}`,
      symbol: asset.kind === "native" ? getChainNativeListSymbol(1) : asset.symbol,
      amount: amountStr,
      valueUsd,
      value: formatUsd(valueUsd),
      priceUsd,
      priceLabel: formatTokenUnitPrice(priceUsd),
      iconUrl: asset.iconUrl,
      change:
        change24h == null
          ? "—"
          : `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`,
    });
  }

  const change24hWeighted =
    totalUsd > 0 && weightedChangeSum !== 0 ? weightedChangeSum / totalUsd : null;

  return {
    ok: true,
    totalUsd,
    change24hWeighted,
    items,
  };
}

function formatTokenAmount(raw, decimals) {
  const s = formatUnits(raw, decimals);
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  if (a < 1e-12) return "0";
  if (a < 0.0001) return n.toPrecision(4);
  if (a >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function formatUsd(n) {
  if (!Number.isFinite(n) || n === 0) return "$0.00";
  if (n < 0.01) return `<$0.01`;
  return `$${n.toFixed(2)}`;
}

/** 币种单价（美元）展示 */
export function formatTokenUnitPrice(priceUsd) {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return "$0.00";
  if (priceUsd >= 1) return `$${priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (priceUsd >= 0.0001) return `$${priceUsd.toFixed(6)}`;
  return `$${priceUsd.toPrecision(4)}`;
}

export function formatTotalUsdLabel(totalUsd) {
  if (!Number.isFinite(totalUsd) || totalUsd === 0) return "$0.00";
  return `$${totalUsd.toFixed(2)}`;
}

export function formatWeightedChangeLabel(change24hWeighted) {
  if (change24hWeighted == null || !Number.isFinite(change24hWeighted)) {
    return { text: "—", color: "text.secondary" };
  }
  const sign = change24hWeighted >= 0 ? "+" : "";
  return {
    text: `${sign}${change24hWeighted.toFixed(2)}% 1日`,
    positive: change24hWeighted >= 0,
  };
}
