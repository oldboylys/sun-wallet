import React, { useEffect, useState } from "react";
import { KeyRound, Plus, Sparkles, Trash2 } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { mnemonicSchema, privateKeySchema } from "./lib/validators";
import {
  addHdAccount,
  encryptAndSaveHdWallet,
  generateMnemonicPhrase,
  importHdWallet,
  importPrivateKeyWallet,
  removeAccount,
  removeWallet,
} from "./services/walletManager";

export function WalletHubView({
  store,
  onStoreChange,
  onAddWallet,
  getVaultPassword,
  onSelectAccount,
  setToast,
}) {
  const [manageMode, setManageMode] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState(store.activeWalletId);
  const [confirmDel, setConfirmDel] = useState({ open: false, kind: "", walletId: "", accountId: "" });

  const selWallet = store.wallets.find((w) => w.id === selectedWalletId) ?? store.wallets[0];
  const accounts = selWallet?.accounts ?? [];

  async function handleAddAccount() {
    if (!selWallet) return;
    if (selWallet.type !== "hd") {
      const kind =
        selWallet.type === "single_pk"
          ? "私钥钱包"
          : "仅地址（占位）钱包";
      setToast?.(
        `「${kind}」无法派生新账户。请在上方钱包列表中切换到「助记词钱包」，或通过底部「添加钱包」导入/创建助记词钱包。`,
      );
      return;
    }
    const pw = await getVaultPassword();
    if (!pw) return;
    try {
      const next = await addHdAccount(store, pw, selWallet.id);
      onStoreChange(next);
    } catch (e) {
      setToast?.(e?.message || "添加失败");
    }
  }

  function askDeleteWallet(wid) {
    setConfirmDel({ open: true, kind: "wallet", walletId: wid, accountId: "" });
  }

  function askDeleteAccount(wid, aid) {
    setConfirmDel({ open: true, kind: "account", walletId: wid, accountId: aid });
  }

  async function runDelete() {
    const { kind, walletId, accountId } = confirmDel;
    setConfirmDel({ open: false, kind: "", walletId: "", accountId: "" });
    if (kind === "wallet") {
      const next = await removeWallet(store, walletId);
      onStoreChange(next);
      setSelectedWalletId(next.wallets[0]?.id ?? null);
      return;
    }
    if (kind === "account") {
      const next = await removeAccount(store, walletId, accountId);
      onStoreChange(next);
    }
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ flex: 1, overflow: "auto", px: 2, pb: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
          钱包列表
        </Typography>
        {store.wallets.map((w) => (
          <Card
            key={w.id}
            variant="outlined"
            onClick={() => setSelectedWalletId(w.id)}
            sx={{
              mb: 1,
              cursor: "pointer",
              borderColor: w.id === selectedWalletId ? "primary.main" : "divider",
            }}
          >
            <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 }, position: "relative" }}>
              {manageMode ? (
                <IconButton
                  size="small"
                  sx={{ position: "absolute", top: 4, right: 4 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    askDeleteWallet(w.id);
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              ) : null}
              <Typography fontWeight={600}>{w.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {w.type === "hd" ? "助记词钱包" : w.type === "single_pk" ? "私钥钱包" : "仅地址"}
                {" · "}
                {w.accounts.length} 个账户
              </Typography>
            </CardContent>
          </Card>
        ))}

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
          账户列表
          {selWallet ? ` · ${selWallet.name}` : ""}
        </Typography>
        {accounts.map((a) => (
          <Card key={a.id} variant="outlined" sx={{ mb: 1 }}>
            <CardContent sx={{ py: 1, "&:last-child": { pb: 1 }, position: "relative" }}>
              {manageMode ? (
                <IconButton
                  size="small"
                  sx={{ position: "absolute", top: 2, right: 2 }}
                  onClick={() => askDeleteAccount(selWallet.id, a.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              ) : null}
              <Button
                fullWidth
                sx={{ justifyContent: "flex-start", textTransform: "none", py: 0.5 }}
                onClick={() => onSelectAccount(selWallet.id, a.id)}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" fontWeight={600}>
                    {a.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                    {a.address}
                  </Typography>
                </Box>
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button
          fullWidth
          variant="outlined"
          startIcon={<Plus size={18} />}
          sx={{ mt: 1, mb: 0.5 }}
          onClick={handleAddAccount}
          disabled={!selWallet}
        >
          添加账户
        </Button>
        {selWallet && selWallet.type !== "hd" ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2, lineHeight: 1.4 }}>
            仅「助记词钱包」可从同一助记词派生多个地址。当前为「
            {selWallet.type === "single_pk" ? "私钥钱包" : "仅地址钱包"}
            」，请切换列表中的助记词钱包，或先「添加钱包」导入/创建助记词。
          </Typography>
        ) : (
          <Box sx={{ mb: 2 }} />
        )}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, px: 2, pb: 2, flexShrink: 0, borderTop: 1, borderColor: "divider", pt: 1.5 }}>
        <Button variant={manageMode ? "contained" : "outlined"} color={manageMode ? "warning" : "primary"} onClick={() => setManageMode((v) => !v)}>
          管理钱包
        </Button>
        <Button variant="contained" color="primary" sx={{ color: "primary.contrastText" }} onClick={onAddWallet}>
          添加钱包
        </Button>
      </Box>

      <Dialog open={confirmDel.open} onClose={() => setConfirmDel({ open: false, kind: "", walletId: "", accountId: "" })}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          {confirmDel.kind === "wallet"
            ? "将删除该钱包及其下全部账户，且不可恢复（未备份将无法找回资产）。是否继续？"
            : "将删除该账户，是否继续？"}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDel({ open: false, kind: "", walletId: "", accountId: "" })}>取消</Button>
          <Button color="error" variant="contained" onClick={runDelete}>
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function AddWalletChoiceView({ onBack, onCreate, onImport }) {
  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", px: 2, pb: 2, pt: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        选择创建新钱包或导入已有钱包。
      </Typography>
      <Button
        variant="contained"
        fullWidth
        sx={{ py: 1.5, mb: 1.5, color: "primary.contrastText" }}
        startIcon={<Sparkles size={20} />}
        onClick={onCreate}
      >
        创建新钱包
      </Button>
      <Button variant="outlined" fullWidth sx={{ py: 1.5, mb: 2 }} startIcon={<KeyRound size={20} />} onClick={onImport}>
        导入已有钱包
      </Button>
      <Button variant="text" onClick={onBack}>
        返回
      </Button>
    </Box>
  );
}

export function CreateWalletFlowView({
  store,
  onStoreChange,
  onBack,
  onAfterSuccess,
  getVaultPassword,
  setToast,
}) {
  const [step, setStep] = useState(0);
  const [mnemonic, setMnemonic] = useState("");
  const [walletName, setWalletName] = useState(`钱包 ${store.wallets.length + 1}`);
  const [backup1, setBackup1] = useState(false);
  const [backup2, setBackup2] = useState(false);

  function doGenerate() {
    const { mnemonic: m } = generateMnemonicPhrase();
    setMnemonic(m);
    setStep(1);
  }

  async function doFinish() {
    if (!backup1 || !backup2) {
      setToast("请确认备份提示");
      return;
    }
    const pw = await getVaultPassword();
    if (!pw) return;
    try {
      const next = await encryptAndSaveHdWallet(store, pw, walletName, mnemonic);
      onStoreChange(next);
      setToast("钱包已创建");
      if (onAfterSuccess) onAfterSuccess();
      else onBack();
    } catch (e) {
      setToast(e?.message || "创建失败");
    }
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: 2, pt: 2, pb: 2, overflow: "auto" }}>
      {step === 0 ? (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>
            创建新钱包
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            将生成 12 词助记词。请勿截图或网络传输，建议在离线环境用纸笔抄写并妥善保管。保存时使用当前解锁密码加密写入本机。
          </Typography>
          <TextField label="钱包名称" fullWidth size="small" value={walletName} onChange={(e) => setWalletName(e.target.value)} sx={{ mb: 2 }} />
          <Button variant="contained" fullWidth sx={{ py: 1.25, color: "primary.contrastText" }} onClick={doGenerate}>
            一键生成助记词
          </Button>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            备份助记词
          </Typography>
          <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 1 }}>
            请勿向任何人透露。丢失助记词将无法恢复资产。
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={mnemonic}
            InputProps={{ readOnly: true }}
            sx={{ mb: 2, "& .MuiInputBase-input": { fontFamily: "ui-monospace, monospace", fontSize: 13 } }}
          />
          <FormControlLabel control={<Checkbox checked={backup1} onChange={(e) => setBackup1(e.target.checked)} />} label="我已抄写助记词并保存在安全处" />
          <FormControlLabel control={<Checkbox checked={backup2} onChange={(e) => setBackup2(e.target.checked)} />} label="我了解泄露或丢失助记词将导致资产永久丢失" />
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2, color: "primary.contrastText" }}
            onClick={doFinish}
            disabled={!backup1 || !backup2}
          >
            完成并保存
          </Button>
        </>
      ) : null}

      <Button sx={{ mt: 2 }} onClick={onBack}>
        取消
      </Button>
    </Box>
  );
}

export function ImportWalletFlowView({
  store,
  onStoreChange,
  onBack,
  onAfterSuccess,
  getVaultPassword,
  setToast,
}) {
  const [tab, setTab] = useState(0);
  const [walletName, setWalletName] = useState(`钱包 ${store.wallets.length + 1}`);
  const [use24, setUse24] = useState(false);
  const [wordInputs, setWordInputs] = useState(() => Array(12).fill(""));
  const [privateKey, setPrivateKey] = useState("");

  useEffect(() => {
    setWordInputs((prev) => {
      const n = use24 ? 24 : 12;
      const next = prev.slice(0, n);
      while (next.length < n) next.push("");
      return next;
    });
  }, [use24]);

  async function submitImport() {
    const pw = await getVaultPassword();
    if (!pw) return;
    try {
      if (tab === 0) {
        const parts = wordInputs.map((w) => w.trim());
        if (parts.some((p) => !p)) {
          setToast("请完整填写所有助记词");
          return;
        }
        const mnemonic = parts.join(" ");
        const v = mnemonicSchema.safeParse(mnemonic);
        if (!v.success) {
          setToast(v.error.issues[0]?.message || "助记词无效");
          return;
        }
        const next = await importHdWallet(store, pw, walletName, mnemonic);
        onStoreChange(next);
      } else {
        const v = privateKeySchema.safeParse(privateKey.trim());
        if (!v.success) {
          setToast(v.error.issues[0]?.message || "私钥格式无效");
          return;
        }
        const next = await importPrivateKeyWallet(store, pw, walletName, privateKey.trim());
        onStoreChange(next);
      }
      setToast("导入成功");
      if (onAfterSuccess) onAfterSuccess();
      else onBack();
    } catch (e) {
      setToast(e?.message || "导入失败");
    }
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: 2, pt: 2, pb: 2, overflow: "auto" }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        钱包名称
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder="例如：主钱包"
        value={walletName}
        onChange={(e) => setWalletName(e.target.value)}
        sx={{ mb: 2 }}
        inputProps={{ autoComplete: "off" }}
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1, minHeight: 40 }}>
        <Tab label="助记词" />
        <Tab label="私钥" />
      </Tabs>
      {tab === 0 ? (
        <>
          <FormControlLabel
            control={<Switch checked={use24} onChange={(_, c) => setUse24(c)} size="small" />}
            label={<Typography variant="body2">24 词助记词</Typography>}
            sx={{ mb: 1, ml: 0, alignItems: "center" }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            按顺序填写每个单词（{use24 ? 24 : 12} 个）
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: use24 ? "repeat(4, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
              gap: 1,
              mb: 2,
            }}
          >
            {wordInputs.map((w, i) => (
              <TextField
                key={i}
                size="small"
                placeholder={`${i + 1}`}
                value={w}
                onChange={(e) => {
                  const v = e.target.value;
                  setWordInputs((prev) => {
                    const next = [...prev];
                    next[i] = v;
                    return next;
                  });
                }}
                inputProps={{ autoComplete: "off", spellCheck: false }}
              />
            ))}
          </Box>
        </>
      ) : (
        <TextField
          fullWidth
          type="password"
          placeholder="0x 开头的 64 位十六进制私钥"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          sx={{ mb: 2 }}
        />
      )}
      <Button variant="contained" fullWidth sx={{ color: "primary.contrastText" }} onClick={submitImport}>
        导入
      </Button>
      <Button sx={{ mt: 1 }} onClick={onBack}>
        返回
      </Button>
    </Box>
  );
}
