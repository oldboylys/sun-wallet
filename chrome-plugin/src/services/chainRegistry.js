/**
 * 自定义代币支持的 EVM 网络（RPC 为公开节点，仅用于读取合约元数据）
 * @type {Array<{ id: number, name: string, badge: string, rpcUrl: string }>}
 */
export const EVM_CHAINS = [
  { id: 1, name: "Ethereum", badge: "Ethereum", rpcUrl: "https://ethereum.publicnode.com" },
  { id: 11155111, name: "Sepolia", badge: "Sepolia", rpcUrl: "https://ethereum-sepolia.publicnode.com" },
  { id: 42161, name: "Arbitrum One", badge: "Arbitrum One", rpcUrl: "https://arb1.arbitrum.io/rpc" },
  { id: 8453, name: "Base", badge: "Base", rpcUrl: "https://mainnet.base.org" },
  { id: 10, name: "Optimism", badge: "Optimism", rpcUrl: "https://mainnet.optimism.io" },
  { id: 137, name: "Polygon", badge: "Polygon", rpcUrl: "https://polygon-bor-rpc.publicnode.com" },
  { id: 56, name: "BNB Chain", badge: "BSC", rpcUrl: "https://bsc-dataseed.binance.org" },
  { id: 196, name: "X Layer", badge: "X Layer", rpcUrl: "https://rpc.xlayer.tech" },
];

export function getChainById(chainId) {
  return EVM_CHAINS.find((c) => c.id === chainId) ?? null;
}

/**
 * 首页资产列表中的链上原生资产展示名（如 arb_eth、sepolia_eth），便于区分多链 ETH 等。
 * @param {number} chainId
 */
export function getChainNativeListSymbol(chainId) {
  const m = {
    1: "eth",
    11155111: "sepolia_eth",
    42161: "arb_eth",
    8453: "base_eth",
    10: "op_eth",
    137: "polygon_matic",
    56: "bsc_bnb",
    196: "xlayer_okb",
  };
  return m[chainId] ?? "native";
}

const STABLE_ICON = {
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
};

/**
 * 非主网链首页默认展示的稳定币（官方/常用桥合约）；与主网 TRACKED 中 USDT/USDC 行情 id 一致。
 * @type {Record<number, Array<{ id: string, symbol: string, address: string, decimals: number, coingeckoId: string, iconUrl: string }>>}
 */
export const CHAIN_DEFAULT_STABLECOINS = {
  11155111: [
    {
      id: "USDT",
      symbol: "USDT",
      address: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D4",
      decimals: 6,
      coingeckoId: "tether",
      iconUrl: STABLE_ICON.USDT,
    },
    {
      id: "USDC",
      symbol: "USDC",
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      decimals: 6,
      coingeckoId: "usd-coin",
      iconUrl: STABLE_ICON.USDC,
    },
  ],
  42161: [
    {
      id: "USDT",
      symbol: "USDT",
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      decimals: 6,
      coingeckoId: "tether",
      iconUrl: STABLE_ICON.USDT,
    },
    {
      id: "USDC",
      symbol: "USDC",
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      decimals: 6,
      coingeckoId: "usd-coin",
      iconUrl: STABLE_ICON.USDC,
    },
  ],
  8453: [
    {
      id: "USDT",
      symbol: "USDT",
      address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699f2d",
      decimals: 6,
      coingeckoId: "tether",
      iconUrl: STABLE_ICON.USDT,
    },
    {
      id: "USDC",
      symbol: "USDC",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      coingeckoId: "usd-coin",
      iconUrl: STABLE_ICON.USDC,
    },
  ],
  10: [
    {
      id: "USDT",
      symbol: "USDT",
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      decimals: 6,
      coingeckoId: "tether",
      iconUrl: STABLE_ICON.USDT,
    },
    {
      id: "USDC",
      symbol: "USDC",
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      decimals: 6,
      coingeckoId: "usd-coin",
      iconUrl: STABLE_ICON.USDC,
    },
  ],
  137: [
    {
      id: "USDT",
      symbol: "USDT",
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6,
      coingeckoId: "tether",
      iconUrl: STABLE_ICON.USDT,
    },
    {
      id: "USDC",
      symbol: "USDC",
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      decimals: 6,
      coingeckoId: "usd-coin",
      iconUrl: STABLE_ICON.USDC,
    },
  ],
  56: [
    {
      id: "USDT",
      symbol: "USDT",
      address: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
      coingeckoId: "tether",
      iconUrl: STABLE_ICON.USDT,
    },
    {
      id: "USDC",
      symbol: "USDC",
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      decimals: 18,
      coingeckoId: "usd-coin",
      iconUrl: STABLE_ICON.USDC,
    },
  ],
  196: [
    {
      id: "USDT",
      symbol: "USDT",
      address: "0x1e4a5963AbFd975D8d9021C481b42188849D41D",
      decimals: 6,
      coingeckoId: "tether",
      iconUrl: STABLE_ICON.USDT,
    },
    {
      id: "USDC",
      symbol: "USDC",
      address: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
      decimals: 6,
      coingeckoId: "usd-coin",
      iconUrl: STABLE_ICON.USDC,
    },
  ],
};

/** 持久化当前选中的 EVM 链（与首页 Globe 网络切换一致） */
export const SELECTED_CHAIN_ID_STORAGE_KEY = "wallet_selected_chain_id_v1";

/** @param {unknown} id */
export function normalizeStoredChainId(id) {
  const n = typeof id === "number" ? id : Number(id);
  if (Number.isFinite(n) && EVM_CHAINS.some((c) => c.id === n)) return n;
  return EVM_CHAINS[0].id;
}

/** CoinGecko `/coins/{platform}/contract/{address}` 的 platform 段 */
export const COINGECKO_PLATFORM_BY_CHAIN_ID = {
  1: "ethereum",
  11155111: "ethereum-sepolia",
  42161: "arbitrum-one",
  8453: "base",
  10: "optimistic-ethereum",
  137: "polygon-pos",
  56: "binance-smart-chain",
  196: "x-layer",
};
