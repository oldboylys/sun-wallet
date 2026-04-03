/**
 * 自定义代币支持的 EVM 网络（RPC 为公开节点，仅用于读取合约元数据）
 * @type {Array<{ id: number, name: string, badge: string, rpcUrl: string }>}
 */
export const EVM_CHAINS = [
  { id: 1, name: "Ethereum", badge: "Ethereum", rpcUrl: "https://ethereum.publicnode.com" },
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

/** CoinGecko `/coins/{platform}/contract/{address}` 的 platform 段 */
export const COINGECKO_PLATFORM_BY_CHAIN_ID = {
  1: "ethereum",
  42161: "arbitrum-one",
  8453: "base",
  10: "optimistic-ethereum",
  137: "polygon-pos",
  56: "binance-smart-chain",
  196: "x-layer",
};
