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
import { createPackingItem, updatePackingItem } from "@/lib/actions/packing";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type PackingItemDefaults = {
  name: string;
  category?: string | null;
  owner?: string | null;
  quantity: number;
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

function PackingFields({
  defaults,
  fieldErrors,
}: {
  defaults?: PackingItemDefaults;
  fieldErrors?: Record<string, string[]>;
}) {
  return (
    <div className="grid gap-4 py-2">
      <div>
        <Label htmlFor="name">名前 *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="歯ブラシ"
        />
        <FieldError messages={fieldErrors?.name} />
      </div>
      <div>
        <Label htmlFor="category">カテゴリ</Label>
        <Input
          id="category"
          name="category"
          defaultValue={defaults?.category ?? ""}
          placeholder="衣類、電子機器、書類など"
        />
        <FieldError messages={fieldErrors?.category} />
      </div>
      <div>
        <Label htmlFor="owner">担当者</Label>
        <Input
          id="owner"
          name="owner"
          defaultValue={defaults?.owner ?? ""}
          placeholder="共同、山田太郎など"
        />
        <FieldError messages={fieldErrors?.owner} />
      </div>
      <div>
        <Label htmlFor="quantity">数量 *</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={9999}
          defaultValue={defaults?.quantity ?? 1}
        />
        <FieldError messages={fieldErrors?.quantity} />
      </div>
    </div>
  );
}

export function CreatePackingItemDialog({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const boundAction = createPackingItem.bind(null, tripId);
  const [state, action] = useActionState<FormState, FormData>(
    boundAction,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("持ち物を追加しました");
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>持ち物を追加</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>持ち物を追加</DialogTitle>
            <DialogDescription>
              持ち物の情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <PackingFields fieldErrors={state.fieldErrors} />
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

export function EditPackingItemDialog({
  itemId,
  defaults,
}: {
  itemId: string;
  defaults: PackingItemDefaults;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updatePackingItem.bind(null, itemId);
  const [state, action] = useActionState<FormState, FormData>(
    boundAction,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("持ち物を更新しました");
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">編集</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>持ち物を編集</DialogTitle>
            <DialogDescription>持ち物の情報を変更します。</DialogDescription>
          </DialogHeader>
          <PackingFields defaults={defaults} fieldErrors={state.fieldErrors} />
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
