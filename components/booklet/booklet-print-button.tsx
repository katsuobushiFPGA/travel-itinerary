"use client";

import { Button } from "@/components/ui/button";

export function BookletPrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
    >
      印刷 / PDF保存
    </Button>
  );
}
