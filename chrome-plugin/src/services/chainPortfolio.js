import { createPublicClient, formatUnits, getAddress, http } from "viem";
import { CHAIN_DEFAULT_STABLECOINS, EVM_CHAINS, getChainNativeListSymbol } from "./chainRegistry";
import { getViemChain } from "./sendEstimate";
import { fetchEthereumMainnetPortfolio, formatTokenUnitPrice, formatUsd } from "./ethPortfolio";

const COINGECKO_SIMPLE = "https://api.coingecko.com/api/v3/simple/price";

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

/** 各链原生币 CoinGecko id（用于单价与 24h 涨跌） */
const NATIVE_COINGECKO_ID_BY_CHAIN = {
  1: "ethereum",
  11155111: "ethereum",
  42161: "ethereum",
  8453: "ethereum",
  10: "ethereum",
  137: "matic-network",
  56: "binancecoin",
  196: "okb",
};

const NATIVE_HOME_ICON_BY_CHAIN = {
  1: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  11155111: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  42161: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  8453: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  10: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  137: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  56: "https://assets.coingecko.com/coins/images/12591/small/binance-coin-logo.png",
  196: "https://assets.coingecko.com/coins/images/6113/small/OKB.png",
};

function formatNativeAmount(raw) {
  const s = formatUnits(raw, 18);
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  if (a < 1e-12) return "0";
  if (a < 0.0001) return n.toPrecision(4);
  if (a >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function formatErc20Amount(raw, decimals) {
  const s = formatUnits(raw, decimals);
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  if (a < 1e-12) return "0";
  if (a < 0.0001) return n.toPrecision(4);
  if (a >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

/**
 * 按当前选中链拉取首页资产：主网为 ETH+稳定币（无 BTC/SOL）；其它链为原生币 + 默认 USDT/USDC + 自定义代币（在 popup 中合并）。
 * @param {string} walletAddress
 * @param {number} chainId
 */
export async function fetchChainHomePortfolio(walletAddress, chainId) {
  if (chainId === 1) {
    return fetchEthereumMainnetPortfolio(walletAddress);
  }
  return fetchEvmChainHomePortfolio(walletAddress, chainId);
}

async function fetchEvmChainHomePortfolio(walletAddress, chainId) {
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
    checksum = getAddress(trimmed);
  } catch {
    return { ...empty, error: "钱包地址无效" };
  }

  const chain = getViemChain(chainId);
  const rpc = EVM_CHAINS.find((c) => c.id === chainId)?.rpcUrl ?? null;
  if (!chain || !rpc) {
    return { ...empty, error: "暂不支持该网络" };
  }

  const nativeCoingeckoId = NATIVE_COINGECKO_ID_BY_CHAIN[chainId];
  if (!nativeCoingeckoId) {
    return { ...empty, error: "未配置该链行情" };
  }

  const stables = CHAIN_DEFAULT_STABLECOINS[chainId] ?? [];
  const priceIds = [...new Set([nativeCoingeckoId, "tether", "usd-coin"])].join(",");

  let priceRes;
  try {
    const url = `${COINGECKO_SIMPLE}?ids=${priceIds}&vs_currencies=usd&include_24hr_change=true`;
    priceRes = await fetch(url);
    if (!priceRes.ok) {
      return { ...empty, error: `价格服务不可用 (${priceRes.status})` };
    }
  } catch {
    return { ...empty, error: "无法获取币种价格，请检查网络" };
  }

  /** @type {Record<string, { usd?: number, usd_24h_change?: number }>} */
  const priceData = await priceRes.json();

  const client = createPublicClient({
    chain,
    transport: http(rpc),
  });

  let wei;
  try {
    wei = await client.getBalance({ address: checksum });
  } catch {
    return { ...empty, error: "无法读取链上余额" };
  }

  const nativePx = priceData[nativeCoingeckoId];
  const nativePriceUsd = typeof nativePx?.usd === "number" ? nativePx.usd : 0;
  const nativeChange24h =
    typeof nativePx?.usd_24h_change === "number" ? nativePx.usd_24h_change : null;

  const amountStr = formatNativeAmount(wei);
  const numericNative = Number.parseFloat(amountStr) || 0;
  const nativeValueUsd = numericNative * nativePriceUsd;
  const listSymbol = getChainNativeListSymbol(chainId);
  const iconUrl = NATIVE_HOME_ICON_BY_CHAIN[chainId] ?? NATIVE_HOME_ICON_BY_CHAIN[1];

  /** @type {Array<{ rowKey: string, symbol: string, amount: string, valueUsd: number, value: string, priceUsd: number, priceLabel: string, iconUrl: string, change: string }>} */
  const items = [
    {
      rowKey: `native-${chainId}`,
      symbol: listSymbol,
      amount: amountStr,
      valueUsd: nativeValueUsd,
      value: formatUsd(nativeValueUsd),
      priceUsd: nativePriceUsd,
      priceLabel: formatTokenUnitPrice(nativePriceUsd),
      iconUrl,
      change:
        nativeChange24h == null ? "—" : `${nativeChange24h >= 0 ? "+" : ""}${nativeChange24h.toFixed(2)}%`,
    },
  ];

  let totalUsd = nativeValueUsd;
  let weightedChangeSum = 0;
  if (nativeChange24h != null && nativeValueUsd > 0) {
    weightedChangeSum += nativeValueUsd * nativeChange24h;
  }

  const tetherPx = priceData.tether;
  const usdcPx = priceData["usd-coin"];
  const tetherPriceUsd = typeof tetherPx?.usd === "number" ? tetherPx.usd : 0;
  const tetherChange24h =
    typeof tetherPx?.usd_24h_change === "number" ? tetherPx.usd_24h_change : null;
  const usdcPriceUsd = typeof usdcPx?.usd === "number" ? usdcPx.usd : 0;
  const usdcChange24h =
    typeof usdcPx?.usd_24h_change === "number" ? usdcPx.usd_24h_change : null;

  for (const st of stables) {
    const isUsdt = st.coingeckoId === "tether";
    const priceUsd = isUsdt ? tetherPriceUsd : usdcPriceUsd;
    const change24h = isUsdt ? tetherChange24h : usdcChange24h;

    let raw = 0n;
    try {
      const tokenAddr = getAddress(st.address);
      raw = await client.readContract({
        address: tokenAddr,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf",
        args: [checksum],
      });
    } catch {
      raw = 0n;
    }

    const amtStr = formatErc20Amount(raw, st.decimals);
    const numAmt = Number.parseFloat(amtStr) || 0;
    const valueUsd = numAmt * priceUsd;

    totalUsd += valueUsd;
    if (change24h != null && valueUsd > 0) {
      weightedChangeSum += valueUsd * change24h;
    }

    items.push({
      rowKey: `default-stable-${chainId}-${st.id}`,
      symbol: st.symbol,
      amount: amtStr,
      valueUsd,
      value: formatUsd(valueUsd),
      priceUsd,
      priceLabel: formatTokenUnitPrice(priceUsd),
      iconUrl: st.iconUrl,
      change:
        change24h == null ? "—" : `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`,
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
