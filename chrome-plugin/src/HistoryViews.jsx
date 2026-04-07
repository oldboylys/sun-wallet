import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import {
  fetchAddressTransactions,
  getChainDisplayName,
  getTxExplorerTxUrl,
} from "./services/txHistory";
import { getViemChain } from "./services/sendEstimate";

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * @param {{ walletAddress: string, chainId: number, onBack: () => void, setToast: (s: string) => void }} props
 */
export function HistoryView({ walletAddress, chainId, onBack, setToast }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    setItems([]);
    try {
      const res = await fetchAddressTransactions(walletAddress, chainId, { offset: 30 });
      if (!res.ok) {
        setError(res.error || "加载失败");
        return;
      }
      if (res.notice) setNotice(res.notice);
      setItems(res.items ?? []);
    } catch (e) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, chainId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nc = getViemChain(chainId)?.nativeCurrency;
  const nativeSymbol = nc?.symbol ?? "ETH";
  const chainName = getChainDisplayName(chainId);

  function openExplorer(hash) {
    const url = getTxExplorerTxUrl(chainId, hash);
    if (!url) {
      setToast("当前网络无区块浏览器链接");
      return;
    }
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setToast("无法打开浏览器");
    }
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          px: 1.5,
          py: 1,
          minHeight: 48,
          flexShrink: 0,
        }}
      >
        <IconButton size="small" onClick={onBack} sx={{ color: "text.primary" }} aria-label="返回">
          <ArrowLeft size={22} strokeWidth={2.25} />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          历史
        </Typography>
        <Box sx={{ width: 40 }} />
      </Box>

      <Box sx={{ px: 2, pt: 1, pb: 0.5, flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          网络：{chainName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          金额均为该链原生币（{nativeSymbol}）；代币转账可能显示为 0。
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 2, pb: 2 }}>
        {loading ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        ) : (
          <>
            {notice ? (
              <Typography variant="body2" color="warning.main" sx={{ mb: 1.5, lineHeight: 1.5 }}>
                {notice}
              </Typography>
            ) : null}
            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                暂无交易记录
              </Typography>
            ) : (
              items.map((tx) => (
                <Card key={tx.hash} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 0.5 }}>
                          <Chip
                            size="small"
                            label={
                              tx.direction === "in" ? "转入" : tx.direction === "out" ? "转出" : "自转"
                            }
                            color={tx.direction === "in" ? "success" : tx.direction === "out" ? "primary" : "default"}
                            sx={{ height: 22, fontSize: 11 }}
                          />
                          {!tx.statusOk ? (
                            <Chip size="small" label="失败" color="error" sx={{ height: 22, fontSize: 11 }} />
                          ) : null}
                          <Typography variant="caption" color="text.secondary">
                            {tx.timeLabel}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            wordBreak: "break-all",
                            color: "text.secondary",
                          }}
                        >
                          {tx.hash.slice(0, 10)}…{tx.hash.slice(-8)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          对手方：
                          {tx.direction === "in"
                            ? shortAddr(tx.from)
                            : tx.to
                              ? shortAddr(tx.to)
                              : "合约创建"}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.75 }}>
                          {tx.valueDisplay} {nativeSymbol}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        aria-label="在浏览器中打开"
                        onClick={() => openExplorer(tx.hash)}
                        disabled={!getTxExplorerTxUrl(chainId, tx.hash)}
                      >
                        <ExternalLink size={18} />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
            <Button fullWidth sx={{ mt: 1 }} onClick={() => void load()} disabled={loading}>
              刷新
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
