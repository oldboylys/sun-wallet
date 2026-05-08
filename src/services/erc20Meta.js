import {
  Contract,
  JsonRpcProvider,
  decodeBytes32String,
  getAddress,
  isAddress,
} from "ethers";

const ERC20_STRING = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const ERC20_BYTES32 = [
  "function name() view returns (bytes32)",
  "function symbol() view returns (bytes32)",
  "function decimals() view returns (uint8)",
];

/** 部分代币 decimals 声明为 uint256 */
const ERC20_DECIMALS_UINT256 = ["function decimals() view returns (uint256)"];

function normalizeDecimals(raw) {
  const n = typeof raw === "bigint" ? Number(raw) : Number(raw);
  if (Number.isNaN(n) || n < 0 || n > 255) return 18;
  return n;
}

async function readDecimals(provider, address) {
  const c8 = new Contract(address, ERC20_STRING, provider);
  try {
    const d = await c8.decimals();
    return normalizeDecimals(d);
  } catch {
    /* empty */
  }
  const c256 = new Contract(address, ERC20_DECIMALS_UINT256, provider);
  try {
    const d = await c256.decimals();
    return normalizeDecimals(d);
  } catch {
    throw new Error("无法读取 decimals，请确认合约地址与所选网络一致");
  }
}

async function readNameOrSymbol(provider, address, field) {
  const cStr = new Contract(address, ERC20_STRING, provider);
  const cB32 = new Contract(address, ERC20_BYTES32, provider);
  try {
    const v = field === "name" ? await cStr.name() : await cStr.symbol();
    return String(v);
  } catch {
    /* empty */
  }
  try {
    const b = field === "name" ? await cB32.name() : await cB32.symbol();
    try {
      return decodeBytes32String(b);
    } catch {
      return "";
    }
  } catch {
    return "";
  }
}

/**
 * 读取 ERC20 元数据（兼容 string / bytes32 的 name、symbol，以及 uint8 / uint256 的 decimals）
 * @returns {{ address: string, name: string, symbol: string, decimals: number }}
 */
export async function fetchErc20Metadata(rpcUrl, addressInput) {
  const trimmed = String(addressInput || "").trim();
  if (!trimmed || !isAddress(trimmed)) {
    throw new Error("请输入有效的合约地址（0x…）");
  }
  const address = getAddress(trimmed);
  const provider = new JsonRpcProvider(rpcUrl);

  let code;
  try {
    code = await provider.getCode(address);
  } catch (e) {
    throw new Error(formatRpcError(e, "getCode"));
  }
  if (!code || code === "0x") {
    throw new Error(
      "当前所选网络上该地址没有合约代码。请切换为代币所在链后再试（BGB 官方合约为以太坊主网，若在 BSC 等链请选择对应网络与地址）。",
    );
  }

  let decimals;
  try {
    decimals = await readDecimals(provider, address);
  } catch (e) {
    throw new Error(formatRpcError(e, "decimals"));
  }

  let name = "";
  let symbol = "";
  try {
    name = await readNameOrSymbol(provider, address, "name");
    symbol = await readNameOrSymbol(provider, address, "symbol");
  } catch (e) {
    throw new Error(formatRpcError(e, "name/symbol"));
  }

  if (!name && !symbol) {
    throw new Error(
      "无法读取代币名称与符号。请确认「网络」与代币官网一致：同一地址在不同链上可能无效（例如 BGB 常见为以太坊主网合约）。",
    );
  }

  let symbolStr = symbol || "???";
  if (symbolStr.length > 20) symbolStr = `${symbolStr.slice(0, 18)}…`;

  return {
    address,
    name: name || "Unknown",
    symbol: symbolStr,
    decimals,
  };
}

function formatRpcError(e, hint) {
  const msg = String(e?.shortMessage || e?.message || e || "");
  const lower = msg.toLowerCase();
  if (lower.includes("missing revert data") || lower.includes("execution reverted")) {
    return `合约调用失败（${hint}）。请确认所选「网络」与该代币官方文档一致，合约在错误链上调用会无返回数据。`;
  }
  return msg || `无法读取合约（${hint}）`;
}
