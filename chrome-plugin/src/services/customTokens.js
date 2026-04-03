import { getStorageValue, setStorageValue } from "./storage";

export const CUSTOM_TOKENS_KEY = "custom_tokens_v1";

/**
 * @typedef {{
 *   id: string,
 *   chainId: number,
 *   chainName: string,
 *   networkBadge: string,
 *   address: string,
 *   symbol: string,
 *   name: string,
 *   decimals: number,
 * }} CustomTokenRecord
 */

export async function loadCustomTokens() {
  const raw = await getStorageValue(CUSTOM_TOKENS_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

export async function saveCustomTokens(tokens) {
  await setStorageValue(CUSTOM_TOKENS_KEY, tokens);
}

export function makeCustomTokenId(chainId, addressLower) {
  return `${chainId}-${String(addressLower).toLowerCase()}`;
}

/**
 * @param {Omit<CustomTokenRecord, "id"> & { address: string }} token
 * @returns {Promise<CustomTokenRecord[]>}
 */
export async function addCustomToken(token) {
  const tokens = await loadCustomTokens();
  const id = makeCustomTokenId(token.chainId, token.address);
  if (tokens.some((t) => t.id === id)) {
    throw new Error("该网络下此合约已添加");
  }
  const row = { ...token, id };
  tokens.push(row);
  await saveCustomTokens(tokens);
  return tokens;
}

/**
 * @returns {Promise<CustomTokenRecord[]>}
 */
export async function removeCustomToken(id) {
  const tokens = (await loadCustomTokens()).filter((t) => t.id !== id);
  await saveCustomTokens(tokens);
  return tokens;
}
