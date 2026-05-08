import { COINGECKO_PLATFORM_BY_CHAIN_ID } from "./chainRegistry";

const BASE = "https://api.coingecko.com/api/v3";

/**
 * @returns {Promise<{ iconUrl: string | null, priceUsd: number, change24hPct: number | null } | null>}
 */
export async function fetchCoinGeckoTokenByContract(chainId, contractAddress) {
  const platform = COINGECKO_PLATFORM_BY_CHAIN_ID[chainId];
  if (!platform || !contractAddress) return null;
  const addr = String(contractAddress).toLowerCase();
  const url = `${BASE}/coins/${platform}/contract/${addr}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const priceUsd = j.market_data?.current_price?.usd;
    const change24hPct = j.market_data?.price_change_percentage_24h;
    return {
      iconUrl: j.image?.small ?? j.image?.thumb ?? null,
      priceUsd: typeof priceUsd === "number" ? priceUsd : 0,
      change24hPct: typeof change24hPct === "number" ? change24hPct : null,
    };
  } catch {
    return null;
  }
}
