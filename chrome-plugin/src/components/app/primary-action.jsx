import React from "react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

export function PrimaryAction({ className, children, ...props }) {
  return (
    <Button className={cn("h-14 w-full text-[32px] font-medium", className)} {...props}>
      {children}
    </Button>
  );
}
