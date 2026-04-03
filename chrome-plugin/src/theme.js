import { createTheme } from "@mui/material/styles";

/** 弹窗宽度（与 html/body/#root 一致） */
export const POPUP_WIDTH_PX = 348;

/** 弹窗总高度（与 html/body/#root 一致，修改此处即可全局生效） */
export const POPUP_HEIGHT_PX = 599;

export const walletTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#f8b90f" },
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
          width: POPUP_WIDTH_PX,
          maxWidth: POPUP_WIDTH_PX,
          height: POPUP_HEIGHT_PX,
          maxHeight: POPUP_HEIGHT_PX,
          margin: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        },
      },
    },
  },
});
