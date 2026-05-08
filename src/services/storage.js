const isChromeStorageAvailable = Boolean(globalThis.chrome?.storage?.local);

export async function getStorageValue(key, fallback = null) {
  if (isChromeStorageAvailable) {
    const res = await chrome.storage.local.get([key]);
    return res[key] ?? fallback;
  }
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export async function setStorageValue(key, value) {
  if (isChromeStorageAvailable) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

export async function removeStorageValue(key) {
  if (isChromeStorageAvailable) {
    await chrome.storage.local.remove([key]);
    return;
  }
  localStorage.removeItem(key);
}
