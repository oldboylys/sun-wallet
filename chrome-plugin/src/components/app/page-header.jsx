import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";

export function PageHeader({ title, canBack = false, onBack }) {
  return (
    <div className="flex h-[62px] items-center justify-between border-b border-zinc-800/80 px-3.5 backdrop-blur-sm">
      {canBack ? (
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-0"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : (
        <span className="w-[30px]" />
      )}
      <div className="text-[32px] font-semibold tracking-[-0.2px]">{title}</div>
      <span className="w-[30px]" />
    </div>
  );
}
