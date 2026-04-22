"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteMember } from "@/lib/actions/members";

export function DeleteMemberButton({
  memberId,
  tripId,
}: {
  memberId: string;
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
        if (!confirm("このメンバーを削除しますか？")) {
          return;
        }
        startTransition(async () => {
          const result = await deleteMember(memberId, tripId);
          if (!result.ok) {
            toast.error(result.error ?? "削除に失敗しました");
          } else {
            toast.success("メンバーを削除しました");
          }
        });
      }}
    >
      {pending ? "削除中…" : "削除"}
    </Button>
  );
}
