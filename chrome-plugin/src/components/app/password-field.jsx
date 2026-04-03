import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export function PasswordField({ value, onChange, showPassword, onToggle, placeholder = "请输入密码" }) {
  return (
    <div className="flex h-12 items-center rounded-xl border border-sw-border bg-gradient-to-r from-[#0f1013] to-[#1a1b20] shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
      <Input
        className="h-full rounded-none border-0 bg-transparent text-[16px] text-white placeholder:text-zinc-500 focus:border-0 focus:ring-0"
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <Button
        className="mr-1 h-10 w-10 rounded-lg bg-transparent p-0 text-zinc-500 hover:bg-zinc-800/40"
        variant="ghost"
        size="icon"
        onClick={onToggle}
      >
        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </Button>
    </div>
  );
}
