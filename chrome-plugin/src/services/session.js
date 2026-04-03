import { getStorageValue, removeStorageValue, setStorageValue } from "./storage";

/** 免密会话过期时间戳（毫秒） */
export const SESSION_EXPIRES_KEY = "wallet_unlock_session_expires_at";

/** 单次解锁后免密有效时长（默认 8 小时，可按产品调整） */
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export async function saveUnlockSession() {
  await setStorageValue(SESSION_EXPIRES_KEY, Date.now() + SESSION_DURATION_MS);
}

export async function clearUnlockSession() {
  await removeStorageValue(SESSION_EXPIRES_KEY);
}

export async function isUnlockSessionStillValidByTime() {
  const raw = await getStorageValue(SESSION_EXPIRES_KEY, 0);
  const expires = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(expires) && Date.now() < expires;
}

/**
 * 查询系统空闲/锁屏状态。锁屏时视为不安全，应要求重新输入密码。
 * @returns {Promise<"active" | "idle" | "locked" | "unknown">}
 */
export function queryIdleState(detectionIntervalSec = 60) {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.idle?.queryState) {
      resolve("unknown");
      return;
    }
    try {
      chrome.idle.queryState(detectionIntervalSec, (state) => {
        resolve(state || "unknown");
      });
    } catch {
      resolve("unknown");
    }
  });
}
