import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-white to-zinc-200 text-black shadow-[0_8px_28px_rgba(255,255,255,0.2)] hover:from-white hover:to-zinc-100",
        secondary: "bg-zinc-900/90 text-zinc-100 border border-zinc-700 hover:bg-zinc-800",
        ghost: "bg-transparent text-zinc-300 hover:text-white hover:bg-zinc-900/40",
        danger: "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700",
      },
      size: {
        default: "h-12 px-4",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
