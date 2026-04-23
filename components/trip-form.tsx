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
import { createTrip, updateTrip } from "@/lib/actions/trip";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type TripDefaults = {
  title: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  memo?: string | null;
  coverImage?: string | null;
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

function TripFields({
  defaults,
  fieldErrors,
}: {
  defaults?: TripDefaults;
  fieldErrors?: Record<string, string[]>;
}) {
  return (
    <div className="grid gap-4 py-2">
      <div>
        <Label htmlFor="title">タイトル *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title ?? ""}
          placeholder="沖縄家族旅行"
        />
        <FieldError messages={fieldErrors?.title} />
      </div>
      <div>
        <Label htmlFor="destination">目的地</Label>
        <Input
          id="destination"
          name="destination"
          defaultValue={defaults?.destination ?? ""}
          placeholder="沖縄県 那覇市"
        />
        <FieldError messages={fieldErrors?.destination} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="startDate">開始日 *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={defaults?.startDate ?? ""}
          />
          <FieldError messages={fieldErrors?.startDate} />
        </div>
        <div>
          <Label htmlFor="endDate">終了日 *</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={defaults?.endDate ?? ""}
          />
          <FieldError messages={fieldErrors?.endDate} />
        </div>
      </div>
      <div>
        <Label htmlFor="memo">メモ</Label>
        <textarea
          id="memo"
          name="memo"
          rows={3}
          defaultValue={defaults?.memo ?? ""}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="行きたいお店、目的、注意事項など自由に"
        />
        <FieldError messages={fieldErrors?.memo} />
      </div>
      <div>
        <Label htmlFor="coverImage">表紙画像 URL</Label>
        <Input
          id="coverImage"
          name="coverImage"
          type="url"
          inputMode="url"
          defaultValue={defaults?.coverImage ?? ""}
          placeholder="https://example.com/cover.jpg"
        />
        <FieldError messages={fieldErrors?.coverImage} />
      </div>
    </div>
  );
}

export function CreateTripDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(
    createTrip,
    { ok: false },
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>しおりを新規作成</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>新しい旅のしおり</DialogTitle>
            <DialogDescription>
              基本情報を入力してください。詳細は作成後に編集できます。
            </DialogDescription>
          </DialogHeader>
          <TripFields fieldErrors={state.fieldErrors} />
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <SubmitButton label="作成" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditTripDialog({
  tripId,
  defaults,
}: {
  tripId: string;
  defaults: TripDefaults;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updateTrip.bind(null, tripId);
  const [state, action] = useActionState<FormState, FormData>(
    boundAction,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("しおりを更新しました");
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">編集</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>しおりを編集</DialogTitle>
            <DialogDescription>基本情報を変更します。</DialogDescription>
          </DialogHeader>
          <TripFields defaults={defaults} fieldErrors={state.fieldErrors} />
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
