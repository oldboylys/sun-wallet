import { getAddress, HDNodeWallet, Mnemonic, Wallet } from "ethers";
import { getStorageValue, setStorageValue } from "./storage";
import { getWalletPublicAddress } from "./walletPrefs";

export const WALLET_MANAGER_KEY = "wallet_manager_v1";

/**
 * @typedef {{ id: string, name: string, address: string, derivationIndex?: number }} WalletAccount
 * @typedef {{
 *   id: string,
 *   name: string,
 *   type: "hd" | "single_pk" | "address_only",
 *   encryptedVault?: { saltB64: string, ivB64: string, dataB64: string },
 *   accounts: WalletAccount[],
 * }} WalletRecord
 * @typedef {{ wallets: WalletRecord[], activeWalletId: string | null, activeAccountId: string | null }} WalletStore
 */

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `w_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function toB64(buf) {
  let s = "";
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

function fromB64(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function deriveAesKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptJson(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    saltB64: toB64(salt),
    ivB64: toB64(iv),
    dataB64: toB64(new Uint8Array(ct)),
  };
}

async function decryptJson(encrypted, password) {
  const salt = fromB64(encrypted.saltB64);
  const iv = fromB64(encrypted.ivB64);
  const data = fromB64(encrypted.dataB64);
  const key = await deriveAesKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plain));
}

function deriveEthAddressFromMnemonic(mnemonic, index) {
  const path = `m/44'/60'/0'/0/${index}`;
  const w = HDNodeWallet.fromPhrase(mnemonic.trim(), "", path);
  return getAddress(w.address);
}

/**
 * @returns {Promise<WalletStore>}
 */
export async function loadWalletStore() {
  const raw = await getStorageValue(WALLET_MANAGER_KEY, null);
  if (!raw || typeof raw !== "object") {
    return { wallets: [], activeWalletId: null, activeAccountId: null };
  }
  return {
    wallets: Array.isArray(raw.wallets) ? raw.wallets : [],
    activeWalletId: raw.activeWalletId ?? null,
    activeAccountId: raw.activeAccountId ?? null,
  };
}

export async function saveWalletStore(store) {
  await setStorageValue(WALLET_MANAGER_KEY, store);
}

/** 首次：用当前偏好地址生成占位钱包，便于衔接旧数据 */
export async function migrateWalletStoreIfEmpty() {
  const store = await loadWalletStore();
  if (store.wallets.length > 0) return store;
  const addr = await getWalletPublicAddress();
  try {
    getAddress(addr);
  } catch {
    return store;
  }
  const wid = randomId();
  const aid = randomId();
  const next = {
    wallets: [
      {
        id: wid,
        name: "默认钱包",
        type: "address_only",
        accounts: [{ id: aid, name: "账户 1", address: getAddress(addr), derivationIndex: 0 }],
      },
    ],
    activeWalletId: wid,
    activeAccountId: aid,
  };
  await saveWalletStore(next);
  return next;
}

/**
 * 一键创建：生成助记词并返回明文（仅用于展示备份流程，调用方需随后 encryptAndSaveHdWallet）
 */
export function generateMnemonicPhrase() {
  const w = Wallet.createRandom();
  return { mnemonic: w.mnemonic.phrase, previewAddress: getAddress(w.address) };
}

export async function encryptAndSaveHdWallet(store, password, name, mnemonicPhrase) {
  const vault = await encryptJson({ mnemonic: mnemonicPhrase.trim() }, password);
  const wid = randomId();
  const aid = randomId();
  const address = deriveEthAddressFromMnemonic(mnemonicPhrase, 0);
  const wallet = {
    id: wid,
    name: name.trim() || "新钱包",
    type: "hd",
    encryptedVault: vault,
    accounts: [{ id: aid, name: "账户 1", address, derivationIndex: 0 }],
  };
  const next = {
    ...store,
    wallets: [...store.wallets, wallet],
    activeWalletId: wid,
    activeAccountId: aid,
  };
  await saveWalletStore(next);
  return next;
}

export async function importHdWallet(store, password, name, mnemonicPhrase) {
  const normalized = mnemonicPhrase.trim().split(/\s+/).join(" ");
  Mnemonic.fromPhrase(normalized);
  return encryptAndSaveHdWallet(store, password, name, normalized);
}

export async function importPrivateKeyWallet(store, password, name, privateKeyInput) {
  const pk = privateKeyInput.trim().startsWith("0x") ? privateKeyInput.trim() : `0x${privateKeyInput.trim()}`;
  const w = new Wallet(pk);
  const addr = getAddress(w.address);
  const vault = await encryptJson({ privateKey: w.privateKey }, password);
  const wid = randomId();
  const aid = randomId();
  const wallet = {
    id: wid,
    name: name.trim() || "导入钱包",
    type: "single_pk",
    encryptedVault: vault,
    accounts: [{ id: aid, name: "账户 1", address: addr }],
  };
  const next = {
    ...store,
    wallets: [...store.wallets, wallet],
    activeWalletId: wid,
    activeAccountId: aid,
  };
  await saveWalletStore(next);
  return next;
}

export async function addHdAccount(store, password, walletId) {
  const w = store.wallets.find((x) => x.id === walletId);
  if (!w || w.type !== "hd" || !w.encryptedVault?.dataB64) {
    throw new Error("仅助记词钱包可添加账户");
  }
  const secrets = await decryptJson(w.encryptedVault, password);
  if (!secrets.mnemonic) throw new Error("无法解密钱包");
  const nextIndex =
    w.accounts.reduce((m, a) => Math.max(m, a.derivationIndex ?? 0), -1) + 1;
  const address = deriveEthAddressFromMnemonic(secrets.mnemonic, nextIndex);
  const aid = randomId();
  const acc = { id: aid, name: `账户 ${w.accounts.length + 1}`, address, derivationIndex: nextIndex };
  const wallets = store.wallets.map((x) =>
    x.id === walletId ? { ...x, accounts: [...x.accounts, acc] } : x,
  );
  const next = { ...store, wallets, activeWalletId: walletId, activeAccountId: aid };
  await saveWalletStore(next);
  return next;
}

export async function removeAccount(store, walletId, accountId) {
  const wallets = store.wallets
    .map((w) => {
      if (w.id !== walletId) return w;
      return { ...w, accounts: w.accounts.filter((a) => a.id !== accountId) };
    })
    .filter((w) => w.accounts.length > 0);
  let { activeWalletId, activeAccountId } = store;
  if (activeAccountId === accountId) {
    activeAccountId = null;
    const w = wallets.find((x) => x.id === activeWalletId);
    if (w?.accounts[0]) activeAccountId = w.accounts[0].id;
    else if (wallets[0]?.accounts[0]) {
      activeWalletId = wallets[0].id;
      activeAccountId = wallets[0].accounts[0].id;
    } else {
      activeWalletId = wallets[0]?.id ?? null;
      activeAccountId = wallets[0]?.accounts[0]?.id ?? null;
    }
  }
  const next = { ...store, wallets, activeWalletId, activeAccountId };
  await saveWalletStore(next);
  return next;
}

export async function removeWallet(store, walletId) {
  const wallets = store.wallets.filter((w) => w.id !== walletId);
  let { activeWalletId, activeAccountId } = store;
  if (activeWalletId === walletId) {
    activeWalletId = wallets[0]?.id ?? null;
    activeAccountId = wallets[0]?.accounts[0]?.id ?? null;
  }
  const next = { ...store, wallets, activeWalletId, activeAccountId };
  await saveWalletStore(next);
  return next;
}

export async function setActiveAccount(store, walletId, accountId) {
  const next = { ...store, activeWalletId: walletId, activeAccountId: accountId };
  await saveWalletStore(next);
  return next;
}

export function findActiveAccount(store) {
  const w = store.wallets.find((x) => x.id === store.activeWalletId);
  if (!w) return null;
  return w.accounts.find((a) => a.id === store.activeAccountId) ?? w.accounts[0] ?? null;
}
