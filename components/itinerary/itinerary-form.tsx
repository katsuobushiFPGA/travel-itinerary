"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createItineraryItem,
  updateItineraryItem,
} from "@/lib/actions/itinerary";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type ItemDefaults = {
  dayIndex: number;
  startTime: string;
  endTime?: string | null;
  title: string;
  location?: string | null;
  note?: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "保存中…" : label}
    </Button>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive mt-1">{messages[0]}</p>;
}

function ItineraryFields({
  defaults,
  fieldErrors,
  totalDays,
}: {
  defaults?: ItemDefaults;
  fieldErrors?: Record<string, string[]>;
  totalDays: number;
}) {
  return (
    <div className="grid gap-4 py-2">
      <div>
        <Label htmlFor="dayIndex">日程 *</Label>
        <select
          id="dayIndex"
          name="dayIndex"
          required
          defaultValue={defaults?.dayIndex ?? 1}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {day} 日目
            </option>
          ))}
        </select>
        <FieldError messages={fieldErrors?.dayIndex} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="startTime">開始時刻 * (HH:mm)</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue={defaults?.startTime ?? ""}
            placeholder="09:00"
          />
          <FieldError messages={fieldErrors?.startTime} />
        </div>
        <div>
          <Label htmlFor="endTime">終了時刻 (HH:mm)</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={defaults?.endTime ?? ""}
            placeholder="10:00"
          />
          <FieldError messages={fieldErrors?.endTime} />
        </div>
      </div>
      <div>
        <Label htmlFor="title">タイトル *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title ?? ""}
          placeholder="東京駅集合"
        />
        <FieldError messages={fieldErrors?.title} />
      </div>
      <div>
        <Label htmlFor="location">場所</Label>
        <Input
          id="location"
          name="location"
          defaultValue={defaults?.location ?? ""}
          placeholder="東京都千代田区"
        />
        <FieldError messages={fieldErrors?.location} />
      </div>
      <div>
        <Label htmlFor="note">メモ</Label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={defaults?.note ?? ""}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="持ち物、注意事項など"
        />
        <FieldError messages={fieldErrors?.note} />
      </div>
    </div>
  );
}

export function CreateItineraryDialog({
  tripId,
  totalDays,
}: {
  tripId: string;
  totalDays: number;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = createItineraryItem.bind(null, tripId);
  const [state, action] = useActionState<FormState, FormData>(
    boundAction,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("旅程を追加しました");
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>旅程を追加</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>旅程を追加</DialogTitle>
            <DialogDescription>
              旅程の詳細を入力してください。
            </DialogDescription>
          </DialogHeader>
          <ItineraryFields fieldErrors={state.fieldErrors} totalDays={totalDays} />
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <SubmitButton label="追加" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditItineraryDialog({
  itemId,
  defaults,
  totalDays,
}: {
  itemId: string;
  defaults: ItemDefaults;
  totalDays: number;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updateItineraryItem.bind(null, itemId);
  const [state, action] = useActionState<FormState, FormData>(
    boundAction,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("旅程を更新しました");
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">編集</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>旅程を編集</DialogTitle>
            <DialogDescription>旅程の詳細を変更します。</DialogDescription>
          </DialogHeader>
          <ItineraryFields
            defaults={defaults}
            fieldErrors={state.fieldErrors}
            totalDays={totalDays}
          />
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <SubmitButton label="保存" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
