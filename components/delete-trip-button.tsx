"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTrip } from "@/lib/actions/trip";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("このしおりを削除しますか？紐づくデータも全て削除されます。")) {
          return;
        }
        startTransition(async () => {
          try {
            await deleteTrip(tripId);
          } catch (err) {
            // Next.js の redirect はエラーとして throw されるので握り潰す
            if ((err as Error)?.message?.includes("NEXT_REDIRECT")) return;
            toast.error("削除に失敗しました");
          }
        });
      }}
    >
      {pending ? "削除中…" : "削除"}
    </Button>
  );
}
