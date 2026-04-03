import React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn("rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 text-zinc-100", className)}
      {...props}
    />
  );
}
