import { getStorageValue, setStorageValue } from "./storage";

export const THEME_MODE_KEY = "wallet_theme_mode_v1";

/** @returns {Promise<"dark" | "light">} */
export async function getThemeMode() {
  const v = await getStorageValue(THEME_MODE_KEY, "dark");
  return v === "light" ? "light" : "dark";
}

/** @param {"dark" | "light"} mode */
export async function setThemeMode(mode) {
  await setStorageValue(THEME_MODE_KEY, mode === "light" ? "light" : "dark");
}
