import { createTheme } from "@mui/material/styles";

/** 弹窗宽度（与 html/body/#root 一致） */
export const POPUP_WIDTH_PX = 348;

/** 弹窗总高度（与 html/body/#root 一致，修改此处即可全局生效） */
export const POPUP_HEIGHT_PX = 599;

const rootBoxStyles = {
  width: POPUP_WIDTH_PX,
  maxWidth: POPUP_WIDTH_PX,
  height: POPUP_HEIGHT_PX,
  maxHeight: POPUP_HEIGHT_PX,
  margin: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

/** 深色（当前默认） */
export const walletThemeDark = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#f8b90f", contrastText: "#0a0a0a" },
    secondary: { main: "#85ff39" },
    error: { main: "#ef5f79" },
    success: { main: "#5ee59d" },
    background: {
      default: "#000000",
      paper: "#16181d",
    },
    text: {
      primary: "#f7f8fa",
      secondary: "#9ba2b0",
    },
    divider: "#2a2d34",
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": {
          ...rootBoxStyles,
          backgroundColor: "#000000",
        },
      },
    },
  },
});

/** 阳光明媚 · 绿色调浅色 */
export const walletThemeLight = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2f6f4e", contrastText: "#f8fff5" },
    secondary: { main: "#52b788" },
    error: { main: "#c62828" },
    success: { main: "#1b7a4a" },
    warning: { main: "#e6a800" },
    info: { main: "#2d8a6e" },
    background: {
      default: "#eef6f0",
      paper: "#ffffff",
    },
    text: {
      primary: "#143524",
      secondary: "#4a6356",
    },
    divider: "#c8e0d0",
    action: {
      hover: "rgba(47, 111, 78, 0.08)",
      selected: "rgba(47, 111, 78, 0.12)",
    },
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": {
          ...rootBoxStyles,
          backgroundColor: "#eef6f0",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 2px 8px rgba(47, 111, 78, 0.35)",
          },
        },
      },
    },
  },
});

/** @deprecated 使用 walletThemeDark / 按模式选择 */
export const walletTheme = walletThemeDark;
