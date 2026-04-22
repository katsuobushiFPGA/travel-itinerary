"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { togglePackingItemChecked } from "@/lib/actions/packing";

type PackingCheckboxProps = {
  itemId: string;
  tripId: string;
  checked: boolean;
};

export function PackingCheckbox({ itemId, tripId, checked }: PackingCheckboxProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Checkbox
      checked={checked}
      disabled={pending}
      onCheckedChange={(value) => {
        startTransition(async () => {
          const result = await togglePackingItemChecked(itemId, tripId, value);
          if (!result.ok) {
            toast.error("更新に失敗しました");
          }
        });
      }}
    />
  );
}
