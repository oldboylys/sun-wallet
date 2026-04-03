import React from "react";

export function BottomToast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-3 left-3.5 right-3.5 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 text-[13px] leading-[1.4] text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur">
      {message}
    </div>
  );
}
