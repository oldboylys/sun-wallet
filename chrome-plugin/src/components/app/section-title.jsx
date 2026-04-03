import React from "react";
import { cn } from "../../lib/utils";

export function SectionTitle({ title, subtitle, className, titleClassName, subtitleClassName }) {
  return (
    <div className={cn("text-center", className)}>
      <h1 className={cn("m-0 text-[42px] font-bold leading-tight tracking-[-0.4px] text-sw-text", titleClassName)}>
        {title}
      </h1>
      {subtitle ? <p className={cn("mb-0 mt-2 text-[18px] text-sw-muted", subtitleClassName)}>{subtitle}</p> : null}
    </div>
  );
}
