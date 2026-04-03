import { createPublicClient, formatUnits, getAddress, http } from "viem";
import { mainnet } from "viem/chains";
import { fetchCoinGeckoTokenByContract } from "./coingeckoContract";
import { formatTokenUnitPrice, formatUsd } from "./ethPortfolio";

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const PUBLIC_RPC = "https://ethereum.publicnode.com";

function formatTokenAmountFromRaw(raw, decimals) {
  const s = formatUnits(raw, decimals);
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  if (a < 1e-12) return "0";
  if (a < 0.0001) return n.toPrecision(4);
  if (a >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function formatChangePct(pct) {
  if (pct == null || !Number.isFinite(pct)) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

export function parseChangePercentString(change) {
  if (change === "—" || change == null || change === "") return null;
  const m = String(change).match(/([+-]?\d+\.?\d*)/);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * 仅以太坊主网：余额 + 行情，用于首页资产列表
 * @returns {Promise<Array<{ rowKey: string, symbol: string, amount: string, valueUsd: number, value: string, priceLabel: string, iconUrl: string | null, change: string, change24hPct: number | null }>>}
 */
export async function fetchCustomTokenHomeRows(walletAddress, customTokens) {
  const eth = (customTokens || []).filter((t) => t.chainId === 1);
  if (eth.length === 0) return [];

  let checksum;
  try {
    checksum = getAddress(String(walletAddress || "").trim());
  } catch {
    return [];
  }

  const client = createPublicClient({
    chain: mainnet,
    transport: http(PUBLIC_RPC),
  });

  const rows = await Promise.all(
    eth.map(async (t) => {
      const market = await fetchCoinGeckoTokenByContract(1, t.address);
      let raw = 0n;
      try {
        raw = await client.readContract({
          address: t.address,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [checksum],
        });
      } catch {
        raw = 0n;
      }

      const amountStr = formatTokenAmountFromRaw(raw, t.decimals);
      const numericAmount = Number.parseFloat(amountStr) || 0;
      const priceUsd = market?.priceUsd ?? 0;
      const valueUsd = numericAmount * priceUsd;
      const change24hPct = market?.change24hPct ?? null;

      return {
        rowKey: `custom-${t.id}`,
        symbol: t.symbol,
        amount: amountStr,
        valueUsd,
        value: formatUsd(valueUsd),
        priceLabel: formatTokenUnitPrice(priceUsd),
        iconUrl: market?.iconUrl ?? null,
        change: formatChangePct(change24hPct),
        change24hPct,
      };
    }),
  );

  return rows;
}

/**
 * 合并默认资产与自定义代币，重算总资产与加权 24h 涨跌
 */
export function mergeTrackedPortfolioWithCustom(res, customRows) {
  const mergedItems = [...res.items, ...customRows];
  let weightedSum = 0;
  for (const it of res.items) {
    const pct = parseChangePercentString(it.change);
    if (pct != null && it.valueUsd > 0) weightedSum += it.valueUsd * pct;
  }
  for (const r of customRows) {
    if (r.change24hPct != null && r.valueUsd > 0) weightedSum += r.valueUsd * r.change24hPct;
  }
  const extraUsd = customRows.reduce((s, r) => s + r.valueUsd, 0);
  const totalUsd = res.totalUsd + extraUsd;
  const change24hWeighted = totalUsd > 0 ? weightedSum / totalUsd : null;
  return { mergedItems, totalUsd, change24hWeighted };
}

/**
 * 币种管理页：为每条自定义代币拉取图标与行情（多链）；余额仅以太坊主网
 */
export async function enrichCustomTokensForManage(walletAddress, tokens) {
  const list = tokens || [];
  let checksum = null;
  try {
    if (walletAddress) checksum = getAddress(String(walletAddress).trim());
  } catch {
    checksum = null;
  }

  const client = checksum
    ? createPublicClient({ chain: mainnet, transport: http(PUBLIC_RPC) })
    : null;

  return Promise.all(
    list.map(async (t) => {
      const market = await fetchCoinGeckoTokenByContract(t.chainId, t.address);
      let amount = "—";
      let value = "—";
      let valueUsd = 0;

      if (t.chainId === 1 && client && checksum) {
        try {
          const raw = await client.readContract({
            address: t.address,
            abi: ERC20_BALANCE_ABI,
            functionName: "balanceOf",
            args: [checksum],
          });
          const amountStr = formatTokenAmountFromRaw(raw, t.decimals);
          amount = amountStr;
          const n = Number.parseFloat(amountStr) || 0;
          const px = market?.priceUsd ?? 0;
          valueUsd = n * px;
          value = formatUsd(valueUsd);
        } catch {
          /* empty */
        }
      }

      return {
        ...t,
        iconUrl: market?.iconUrl ?? t.iconUrl ?? null,
        priceLabel: market ? formatTokenUnitPrice(market.priceUsd) : "—",
        change: formatChangePct(market?.change24hPct ?? null),
        amountDisplay: amount,
        valueDisplay: value,
        valueUsd,
      };
    }),
  );
}
