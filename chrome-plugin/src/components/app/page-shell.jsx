import React from "react";
import { cn } from "../../lib/utils";

export function PageShell({ className, children }) {
  return (
    <div className={cn("sw-screen", className)}>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_-12%,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(255,190,40,0.15),transparent_72%)]" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
