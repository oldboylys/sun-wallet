import { getStorageValue, setStorageValue } from "./storage";

export const WALLET_DISPLAY_NAME_KEY = "wallet_display_name";
export const WALLET_PUBLIC_ADDRESS_KEY = "wallet_public_address";

const DEFAULT_NAME = "SUN Wallet";
/** EIP-55 正确校验和（与 viem getAddress 一致） */
const DEFAULT_ADDRESS = "0x2fF7D743A1A8Bc13f6C01A3fF8EA7e6Ba6a0F2D5";

export async function getWalletDisplayName() {
  const name = await getStorageValue(WALLET_DISPLAY_NAME_KEY, "");
  return name || DEFAULT_NAME;
}

export async function setWalletDisplayName(name) {
  const trimmed = String(name || "").trim();
  await setStorageValue(WALLET_DISPLAY_NAME_KEY, trimmed || DEFAULT_NAME);
}

export async function getWalletPublicAddress() {
  const addr = await getStorageValue(WALLET_PUBLIC_ADDRESS_KEY, "");
  return addr || DEFAULT_ADDRESS;
}

export async function setWalletPublicAddress(addr) {
  await setStorageValue(WALLET_PUBLIC_ADDRESS_KEY, String(addr || "").trim());
}
