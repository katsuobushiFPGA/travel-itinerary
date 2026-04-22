"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePackingItem } from "@/lib/actions/packing";

type DeletePackingButtonProps = {
  itemId: string;
  tripId: string;
};

export function DeletePackingButton({ itemId, tripId }: DeletePackingButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("このアイテムを削除しますか？")) {
          return;
        }
        startTransition(async () => {
          const result = await deletePackingItem(itemId, tripId);
          if (!result.ok) {
            toast.error("削除に失敗しました");
          }
        });
      }}
    >
      {pending ? "削除中…" : "削除"}
    </Button>
  );
}
