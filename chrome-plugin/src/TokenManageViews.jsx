import React, { useMemo, useState } from "react";
import { ChevronRight, CirclePlus, Minus, Search } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { EVM_CHAINS } from "./services/chainRegistry";
import { fetchErc20Metadata } from "./services/erc20Meta";

export function TokenManageView({ tokens, onOpenCustom, onRemove, setToast }) {
  const [query, setQuery] = useState("");
  const [confirmRemove, setConfirmRemove] = useState({ open: false, id: "", symbol: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) => {
      return (
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
      );
    });
  }, [tokens, query]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="搜索币种名称或合约地址"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} strokeWidth={2} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "action.hover",
            },
          }}
        />
      </Box>

      <Card
        variant="outlined"
        sx={{ mx: 2, mb: 1.5, cursor: "pointer", flexShrink: 0 }}
        onClick={onOpenCustom}
      >
        <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 }, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "action.selected",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <CirclePlus size={22} strokeWidth={2} />
          </Box>
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
            自定义币种
          </Typography>
          <ChevronRight size={18} color="var(--mui-palette-text-secondary)" />
        </CardContent>
      </Card>

      <Divider sx={{ mx: 2 }} />

      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
        已添加代币
      </Typography>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, pb: 2, pt: 0.5 }}>
        {filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            {tokens.length === 0 ? "暂无自定义代币，点击上方添加" : "无匹配结果"}
          </Typography>
        ) : (
          filtered.map((t) => (
            <Card key={t.id} variant="outlined" sx={{ mb: 1 }}>
              <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  {t.iconUrl ? (
                    <Box
                      component="img"
                      src={t.iconUrl}
                      alt=""
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        mt: 0.25,
                        bgcolor: "action.hover",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        bgcolor: "action.selected",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      {t.symbol[0] ?? "?"}
                    </Box>
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                      <Typography variant="body2" fontWeight={700}>
                        {t.symbol}
                      </Typography>
                      <Chip label={t.networkBadge} size="small" sx={{ height: 20, fontSize: 10 }} variant="outlined" />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {t.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, wordBreak: "break-all" }}>
                      {t.address}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      flexShrink: 0,
                      gap: 0.25,
                      minWidth: 72,
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {t.amountDisplay ?? "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.valueDisplay ?? "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {t.priceLabel ?? "—"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: 11,
                        color:
                          t.change === "—"
                            ? "text.secondary"
                            : String(t.change).startsWith("-")
                              ? "error.main"
                              : "success.main",
                      }}
                    >
                      {t.change === "—" ? "24h —" : `24h ${t.change}`}
                    </Typography>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setConfirmRemove({ open: true, id: t.id, symbol: t.symbol })}
                      aria-label="移除"
                      sx={{
                        mt: 0.5,
                        p: 0,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        lineHeight: 0,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        "&:hover": { opacity: 0.85 },
                      }}
                    >
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: "2px solid",
                          borderColor: "error.main",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Minus size={14} strokeWidth={2.5} color="var(--mui-palette-error-main)" />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      <Dialog open={confirmRemove.open} onClose={() => setConfirmRemove({ open: false, id: "", symbol: "" })}>
        <DialogTitle>移除自定义代币</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            确定从列表中移除「{confirmRemove.symbol || "该代币"}」吗？移除后仍可在「自定义币种」中重新添加。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove({ open: false, id: "", symbol: "" })}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              const id = confirmRemove.id;
              setConfirmRemove({ open: false, id: "", symbol: "" });
              if (id) onRemove(id);
            }}
          >
            移除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function CustomTokenAddView({ onBack, onAdded, setToast }) {
  const [chainId, setChainId] = useState(EVM_CHAINS[0].id);
  const [contract, setContract] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const chain = EVM_CHAINS.find((c) => c.id === chainId) ?? EVM_CHAINS[0];

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const meta = await fetchErc20Metadata(chain.rpcUrl, contract);
      await onAdded({
        chainId: chain.id,
        chainName: chain.name,
        networkBadge: chain.badge,
        address: meta.address,
        symbol: meta.symbol,
        name: meta.name,
        decimals: meta.decimals,
      });
      setToast("已添加代币");
      onBack();
    } catch (e) {
      setToast(e?.message || "添加失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: 2, pt: 2, pb: 2, overflow: "auto" }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        选择网络并输入代币合约地址，将自动读取名称与符号。
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel id="token-chain-label">网络</InputLabel>
        <Select
          labelId="token-chain-label"
          label="网络"
          value={chainId}
          onChange={(e) => setChainId(Number(e.target.value))}
        >
          {EVM_CHAINS.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        size="small"
        label="合约地址"
        placeholder="0x 开头的合约地址"
        value={contract}
        onChange={(e) => setContract(e.target.value)}
        sx={{ mb: 2 }}
        inputProps={{ autoComplete: "off", spellCheck: false }}
      />

      <Button
        variant="contained"
        fullWidth
        disabled={submitting || !contract.trim()}
        onClick={() => void handleSubmit()}
        sx={{ py: 1.25, color: "primary.contrastText", mb: 1 }}
      >
        {submitting ? <CircularProgress size={22} color="inherit" /> : "确定添加"}
      </Button>
      <Button variant="text" onClick={onBack} disabled={submitting}>
        取消
      </Button>
    </Box>
  );
}
