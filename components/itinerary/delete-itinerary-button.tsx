"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteItineraryItem } from "@/lib/actions/itinerary";

export function DeleteItineraryButton({
  itemId,
  tripId,
}: {
  itemId: string;
  tripId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("この旅程を削除しますか？")) {
          return;
        }
        startTransition(async () => {
          try {
            await deleteItineraryItem(itemId, tripId);
            toast.success("旅程を削除しました");
          } catch {
            toast.error("削除に失敗しました");
          }
        });
      }}
    >
      {pending ? "削除中…" : "削除"}
    </Button>
  );
}
