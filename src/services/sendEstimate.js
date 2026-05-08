import {
  createPublicClient,
  defineChain,
  encodeFunctionData,
  formatEther,
  formatGwei,
  getAddress,
  http,
  isAddress,
  parseUnits,
} from "viem";
import { arbitrum, base, bsc, mainnet, optimism, polygon, sepolia } from "viem/chains";
import { EVM_CHAINS } from "./chainRegistry";

const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  network: "xlayer",
  nativeCurrency: { decimals: 18, name: "OKB", symbol: "OKB" },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
  },
});

const VIEM_CHAIN_BY_ID = {
  1: mainnet,
  11155111: sepolia,
  42161: arbitrum,
  8453: base,
  10: optimism,
  137: polygon,
  56: bsc,
  196: xLayer,
};

export function getViemChain(chainId) {
  return VIEM_CHAIN_BY_ID[chainId] ?? null;
}

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
];

function rpcFor(chainId) {
  return EVM_CHAINS.find((c) => c.id === chainId)?.rpcUrl ?? null;
}

/**
 * @param {{
 *   chainId: number,
 *   from: string,
 *   to: string,
 *   token: { kind: 'native' | 'erc20', address?: string | null, decimals: number },
 *   amountDecimal: string,
 * }} p
 */
export async function estimateSendTransaction(p) {
  const { chainId, from, to, token, amountDecimal } = p;
  const chain = VIEM_CHAIN_BY_ID[chainId];
  const rpc = rpcFor(chainId);
  if (!chain || !rpc) {
    return { ok: false, error: "暂不支持该网络" };
  }

  let fromAddr;
  let toAddr;
  try {
    fromAddr = getAddress(from.trim());
    toAddr = getAddress(to.trim());
  } catch {
    return { ok: false, error: "地址格式无效" };
  }

  if (!isAddress(fromAddr) || !isAddress(toAddr)) {
    return { ok: false, error: "地址格式无效" };
  }

  const amt = String(amountDecimal).trim().replace(",", ".");
  if (!amt || Number.parseFloat(amt) <= 0) {
    return { ok: false, error: "请输入有效金额" };
  }

  const client = createPublicClient({
    chain,
    transport: http(rpc),
  });

  let gasLimit;
  try {
    if (token.kind === "native") {
      const value = parseUnits(amt, token.decimals ?? 18);
      gasLimit = await client.estimateGas({
        account: fromAddr,
        to: toAddr,
        value,
      });
    } else {
      const tokenAddr = getAddress(String(token.address));
      const amountWei = parseUnits(amt, token.decimals);
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [toAddr, amountWei],
      });
      gasLimit = await client.estimateGas({
        account: fromAddr,
        to: tokenAddr,
        data,
      });
    }
  } catch (e) {
    return {
      ok: false,
      error: e?.shortMessage || e?.message || "无法估算 Gas（余额不足或参数无效）",
    };
  }

  let nonce;
  try {
    nonce = await client.getTransactionCount({ address: fromAddr, blockTag: "pending" });
  } catch (e) {
    return { ok: false, error: e?.shortMessage || e?.message || "无法读取 nonce" };
  }

  let maxFeePerGas;
  let maxPriorityFeePerGas;
  let gasPrice;
  try {
    const fees = await client.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas ?? null;
    maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? null;
  } catch {
    maxFeePerGas = null;
    maxPriorityFeePerGas = null;
  }
  if (maxFeePerGas == null) {
    try {
      gasPrice = await client.getGasPrice();
    } catch (e) {
      return { ok: false, error: e?.shortMessage || e?.message || "无法读取 Gas 价格" };
    }
  }

  const feeWei =
    maxFeePerGas != null ? gasLimit * maxFeePerGas : gasLimit * (gasPrice ?? 0n);

  return {
    ok: true,
    gasLimit,
    gasLimitDecimal: gasLimit.toString(),
    nonce,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasPrice,
    feeWei,
    feeEth: formatEther(feeWei),
    maxFeeGwei: maxFeePerGas != null ? formatGwei(maxFeePerGas) : null,
    gasPriceGwei: gasPrice != null ? formatGwei(gasPrice) : null,
    priorityGwei: maxPriorityFeePerGas != null ? formatGwei(maxPriorityFeePerGas) : null,
  };
}
