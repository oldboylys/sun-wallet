import React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function Checkbox({ checked, onCheckedChange, className }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border border-zinc-500 bg-zinc-950 text-black",
        checked && "border-lime-400 bg-lime-400",
        className,
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5" /> : null}
    </button>
  );
}
