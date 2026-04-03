import React from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-400",
        className,
      )}
      {...props}
    />
  );
}
