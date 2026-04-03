import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { EVM_CHAINS } from "./services/chainRegistry";
import { TRACKED_ASSETS } from "./services/ethPortfolio";
import { estimateSendTransaction, getViemChain } from "./services/sendEstimate";

/**
 * @typedef {{ id: string, kind: 'native' | 'erc20', symbol: string, decimals: number, address?: string, label: string, iconUrl?: string }} SendTokenOption
 */

function buildSendTokenOptions(chainId, customTokens) {
  const vc = getViemChain(chainId);
  if (!vc) return [];
  const nc = vc.nativeCurrency;
  const out = [
    {
      id: "native",
      kind: "native",
      symbol: nc.symbol,
      decimals: nc.decimals,
      label: `${nc.symbol}（主网原生）`,
    },
  ];
  if (chainId === 1) {
    for (const a of TRACKED_ASSETS) {
      if (a.kind === "erc20") {
        out.push({
          id: `def-${a.address}`,
          kind: "erc20",
          symbol: a.symbol,
          address: a.address,
          decimals: a.decimals,
          label: a.note ? `${a.symbol}（${a.note}）` : a.symbol,
          iconUrl: a.iconUrl,
        });
      }
    }
  }
  for (const t of (customTokens || []).filter((x) => x.chainId === chainId)) {
    out.push({
      id: `cus-${t.id}`,
      kind: "erc20",
      symbol: t.symbol,
      address: t.address,
      decimals: t.decimals,
      label: `${t.symbol}（${t.name}）`,
      iconUrl: t.iconUrl,
    });
  }
  return out;
}

/**
 * @param {{ walletAddress: string, customTokens: Array, onBack: () => void, setToast: (s: string) => void }} props
 */
export function SendFlowView({ walletAddress, customTokens, onBack, setToast }) {
  const [step, setStep] = useState("chain");
  const [chainId, setChainId] = useState(EVM_CHAINS[0].id);
  const [tokenId, setTokenId] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [est, setEst] = useState(null);
  const [estLoading, setEstLoading] = useState(false);
  const [estError, setEstError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tokenOptions = useMemo(() => buildSendTokenOptions(chainId, customTokens), [chainId, customTokens]);
  const selectedToken = useMemo(
    () => tokenOptions.find((t) => t.id === tokenId) ?? null,
    [tokenOptions, tokenId],
  );

  const runEstimate = useCallback(async () => {
    if (!selectedToken || !sendTo.trim() || !sendAmount.trim()) return;
    setEstLoading(true);
    setEstError("");
    setEst(null);
    try {
      const token =
        selectedToken.kind === "native"
          ? { kind: "native", decimals: selectedToken.decimals }
          : {
              kind: "erc20",
              address: selectedToken.address,
              decimals: selectedToken.decimals,
            };
      const r = await estimateSendTransaction({
        chainId,
        from: walletAddress,
        to: sendTo.trim(),
        token,
        amountDecimal: sendAmount.trim(),
      });
      if (!r.ok) {
        setEstError(r.error || "估算失败");
        return;
      }
      setEst(r);
    } catch (e) {
      setEstError(e?.message || "估算失败");
    } finally {
      setEstLoading(false);
    }
  }, [chainId, walletAddress, sendTo, sendAmount, selectedToken]);

  useEffect(() => {
    if (step !== "confirm") return;
    void runEstimate();
  }, [step, runEstimate]);

  function handleHeaderBack() {
    if (step === "chain") {
      onBack();
      return;
    }
    if (step === "token") {
      setStep("chain");
      return;
    }
    if (step === "form") {
      setStep("token");
      return;
    }
    if (step === "confirm") {
      setStep("form");
      setEst(null);
      setEstError("");
      return;
    }
    if (step === "result") {
      onBack();
    }
  }

  const title =
    step === "chain"
      ? "选择网络"
      : step === "token"
        ? "选择币种"
        : step === "form"
          ? "发送"
          : step === "confirm"
            ? "确认交易"
            : "交易结果";

  async function handleConfirmBroadcast() {
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setStep("result");
      setToast("演示流程已完成（未实际广播）");
    } finally {
      setSubmitting(false);
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
        <IconButton size="small" onClick={handleHeaderBack} sx={{ color: "text.primary" }} aria-label="返回">
          <ArrowLeft size={22} strokeWidth={2.25} />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Box sx={{ width: 40 }} />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 2, pb: 2, pt: 1.5 }}>
        {step === "chain" ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              请选择要发送资产所在的网络。
            </Typography>
            {EVM_CHAINS.map((c) => (
              <Card key={c.id} variant="outlined" sx={{ mb: 1 }}>
                <CardActionArea onClick={() => setChainId(c.id)}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Radio checked={chainId === c.id} size="small" />
                      <Box>
                        <Typography fontWeight={600}>{c.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.badge}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 1, py: 1.25, color: "primary.contrastText" }}
              onClick={() => {
                const opts = buildSendTokenOptions(chainId, customTokens);
                setTokenId(opts[0]?.id ?? "native");
                setStep("token");
              }}
            >
              下一步
            </Button>
          </>
        ) : null}

        {step === "token" ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              当前网络：{EVM_CHAINS.find((c) => c.id === chainId)?.name ?? ""}
            </Typography>
            <RadioGroup value={tokenId} onChange={(e) => setTokenId(e.target.value)}>
              {tokenOptions.map((t) => (
                <FormControlLabel
                  key={t.id}
                  value={t.id}
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {t.iconUrl ? (
                        <Box component="img" src={t.iconUrl} alt="" sx={{ width: 24, height: 24, borderRadius: "50%" }} />
                      ) : null}
                      <Typography variant="body2">{t.label}</Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2, py: 1.25, color: "primary.contrastText" }}
              disabled={!tokenId}
              onClick={() => setStep("form")}
            >
              下一步
            </Button>
          </>
        ) : null}

        {step === "form" ? (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              {EVM_CHAINS.find((c) => c.id === chainId)?.name} · {selectedToken?.label ?? ""}
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="收款地址"
              placeholder="0x…"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="small"
              label="金额"
              placeholder="0.0"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              fullWidth
              sx={{ py: 1.25, color: "primary.contrastText" }}
              disabled={!sendTo.trim() || !sendAmount.trim() || !selectedToken}
              onClick={() => setStep("confirm")}
            >
              预览费用并确认
            </Button>
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              向 <strong>{sendTo.slice(0, 8)}…{sendTo.slice(-6)}</strong> 发送{" "}
              <strong>
                {sendAmount} {selectedToken?.symbol}
              </strong>
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            {estLoading ? (
              <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : estError ? (
              <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                {estError}
              </Typography>
            ) : est ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Typography variant="caption" color="text.secondary">
                  Gas 上限（估算）
                </Typography>
                <Typography variant="body2">{est.gasLimitDecimal}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Nonce（pending）
                </Typography>
                <Typography variant="body2">{String(est.nonce)}</Typography>
                {est.maxFeeGwei != null ? (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Max Fee（EIP-1559）
                    </Typography>
                    <Typography variant="body2">{est.maxFeeGwei} Gwei</Typography>
                    {est.priorityGwei != null ? (
                      <Typography variant="caption" color="text.secondary">
                        优先费：{est.priorityGwei} Gwei
                      </Typography>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Gas 价格
                    </Typography>
                    <Typography variant="body2">{est.gasPriceGwei ?? "—"} Gwei</Typography>
                  </>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  预估网络费用（上限）
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {est.feeEth} {getViemChain(chainId)?.nativeCurrency.symbol ?? "ETH"}
                </Typography>
              </Box>
            ) : null}
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2, py: 1.25, color: "primary.contrastText" }}
              disabled={estLoading || !!estError || !est || submitting}
              onClick={() => void handleConfirmBroadcast()}
            >
              {submitting ? "处理中…" : "确认发送"}
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => setStep("form")}>
              返回修改
            </Button>
          </>
        ) : null}

        {step === "result" ? (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              演示完成
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              当前扩展未内置本地签名私钥，未向链上广播真实交易。后续可接入签名与广播。
            </Typography>
            <Button variant="contained" fullWidth sx={{ color: "primary.contrastText" }} onClick={onBack}>
              返回首页
            </Button>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
