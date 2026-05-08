import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";

export const SUPPORTED_CHAINS = {
  mainnet,
  sepolia,
};

export function createReadonlyClient(chainKey = "sepolia", rpcUrl) {
  const chain = SUPPORTED_CHAINS[chainKey] || sepolia;
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}
