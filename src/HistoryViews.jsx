import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  dateInputToEndOfDaySec,
  dateInputToStartOfDaySec,
  fetchAddressTransactions,
  filterHistoryItems,
  getChainDisplayName,
  getTxExplorerTxUrl,
} from "./services/txHistory";
import { EVM_CHAINS } from "./services/chainRegistry";
import { getViemChain } from "./services/sendEstimate";

/** 历史页可选链（X Layer 无索引 API） */
const HISTORY_CHAIN_IDS = EVM_CHAINS.filter((c) => c.id !== 196);

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function isoDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {{ walletAddress: string, chainId: number, onBack: () => void, setToast: (s: string) => void }} props
 */
export function HistoryView({ walletAddress, chainId, onBack, setToast }) {
  const [filterChainId, setFilterChainId] = useState(() => (chainId === 196 ? 1 : chainId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rawItems, setRawItems] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assetKind, setAssetKind] = useState(/** @type {'all' | 'native' | 'erc20'} */ ("all"));
  const [tokenSymbolQuery, setTokenSymbolQuery] = useState("");

  useEffect(() => {
    setFilterChainId(chainId === 196 ? 1 : chainId);
  }, [chainId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    setRawItems([]);
    try {
      const res = await fetchAddressTransactions(walletAddress, filterChainId, { offset: 100 });
      if (!res.ok) {
        setError(res.error || "加载失败");
        return;
      }
      if (res.notice) setNotice(res.notice);
      setRawItems(res.items ?? []);
    } catch (e) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, filterChainId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nc = getViemChain(filterChainId)?.nativeCurrency;
  const nativeSymbol = nc?.symbol ?? "ETH";
  const chainName = getChainDisplayName(filterChainId);

  const timeStartSec = startDate ? dateInputToStartOfDaySec(startDate) : null;
  const timeEndSec = endDate ? dateInputToEndOfDaySec(endDate) : null;

  const displayItems = useMemo(
    () =>
      filterHistoryItems(rawItems, {
        timeStartSec,
        timeEndSec,
        assetKind,
        tokenSymbolQuery,
        nativeSymbol,
      }),
    [rawItems, timeStartSec, timeEndSec, assetKind, tokenSymbolQuery, nativeSymbol],
  );

  function setPresetDays(n) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - n);
    setStartDate(isoDateLocal(start));
    setEndDate(isoDateLocal(end));
  }

  function resetFilters() {
    setStartDate("");
    setEndDate("");
    setAssetKind("all");
    setTokenSymbolQuery("");
  }

  function openExplorer(txHash) {
    const url = getTxExplorerTxUrl(filterChainId, txHash);
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

      <Box
        sx={{
          px: 2,
          pt: 1,
          pb: 1,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        <FormControl size="small" fullWidth>
          <InputLabel id="hist-chain-label">链</InputLabel>
          <Select
            labelId="hist-chain-label"
            label="链"
            value={filterChainId}
            onChange={(e) => setFilterChainId(Number(e.target.value))}
          >
            {HISTORY_CHAIN_IDS.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            时间区间（本地日期）
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              size="small"
              type="date"
              label="开始"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              size="small"
              type="date"
              label="结束"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{ flex: 1, minWidth: 120 }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.75 }}>
            <Chip size="small" label="近7日" onClick={() => setPresetDays(7)} variant="outlined" />
            <Chip size="small" label="近30日" onClick={() => setPresetDays(30)} variant="outlined" />
            <Chip
              size="small"
              label="清空时间"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              variant="outlined"
            />
          </Box>
        </Box>

        <FormControl size="small" fullWidth>
          <InputLabel id="hist-asset-label">代币</InputLabel>
          <Select
            labelId="hist-asset-label"
            label="代币"
            value={assetKind}
            onChange={(e) => setAssetKind(e.target.value)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="native">仅原生币（{nativeSymbol}）</MenuItem>
            <MenuItem value="erc20">仅 ERC-20</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          fullWidth
          label="符号筛选"
          placeholder="如 USDT、ETH"
          value={tokenSymbolQuery}
          onChange={(e) => setTokenSymbolQuery(e.target.value)}
          helperText="按符号包含匹配；填 ETH 等可筛原生记录"
        />

        <Button size="small" variant="text" onClick={resetFilters} sx={{ alignSelf: "flex-start" }}>
          重置筛选条件
        </Button>

        <Typography variant="caption" color="text.secondary">
          当前链：{chainName} · 展示 {displayItems.length} 条 / 已加载 {rawItems.length} 条
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: -0.5 }}>
          时间筛选仅作用于本次已拉取的记录；切换「链」会重新请求。
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 2, pb: 2, pt: 1 }}>
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
            {rawItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                暂无交易记录
              </Typography>
            ) : displayItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                无符合当前筛选条件的记录
              </Typography>
            ) : (
              displayItems.map((tx) => {
                const isToken = tx.kind === "erc20";
                const dirLabel =
                  tx.direction === "in" ? "转入" : tx.direction === "out" ? "转出" : "自转";
                const key = tx.rowKey ?? tx.hash;
                return (
                  <Card key={key} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 0.5 }}>
                            {isToken ? (
                              <Chip label="代币" size="small" color="secondary" sx={{ height: 22, fontSize: 11 }} />
                            ) : null}
                            <Chip
                              size="small"
                              label={dirLabel}
                              color={
                                tx.direction === "in" ? "success" : tx.direction === "out" ? "primary" : "default"
                              }
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
                          {isToken && tx.contractAddress ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                              合约：{shortAddr(tx.contractAddress)}
                            </Typography>
                          ) : null}
                          <Typography variant="body2" fontWeight={600} sx={{ mt: 0.75 }}>
                            {isToken
                              ? `${tx.tokenAmountDisplay} ${tx.tokenSymbol}`
                              : `${tx.valueDisplay} ${nativeSymbol}`}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          aria-label="在浏览器中打开"
                          onClick={() => openExplorer(tx.hash)}
                          disabled={!getTxExplorerTxUrl(filterChainId, tx.hash)}
                        >
                          <ExternalLink size={18} />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })
            )}
            <Button fullWidth sx={{ mt: 1 }} onClick={() => void load()} disabled={loading}>
              刷新数据
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
