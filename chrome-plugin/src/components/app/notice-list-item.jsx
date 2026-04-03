import React from "react";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";

export function NoticeListItem({ text, checked, onCheckedChange }) {
  return (
    <Card className="sw-card flex min-h-[62px] items-start gap-2 p-2.5">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-[12px] leading-[1.35] text-zinc-100">{text}</span>
    </Card>
  );
}
