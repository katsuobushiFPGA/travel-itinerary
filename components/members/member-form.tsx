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
import { createMember, updateMember } from "@/lib/actions/members";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type MemberDefaults = {
  name: string;
  role?: string | null;
  contact?: string | null;
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

function MemberFields({
  defaults,
  fieldErrors,
}: {
  defaults?: MemberDefaults;
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
          placeholder="山田太郎"
        />
        <FieldError messages={fieldErrors?.name} />
      </div>
      <div>
        <Label htmlFor="role">役割</Label>
        <Input
          id="role"
          name="role"
          defaultValue={defaults?.role ?? ""}
          placeholder="運転担当、会計など"
        />
        <FieldError messages={fieldErrors?.role} />
      </div>
      <div>
        <Label htmlFor="contact">連絡先</Label>
        <Input
          id="contact"
          name="contact"
          defaultValue={defaults?.contact ?? ""}
          placeholder="電話番号またはメールアドレス"
        />
        <FieldError messages={fieldErrors?.contact} />
      </div>
    </div>
  );
}

export function CreateMemberDialog({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const boundAction = createMember.bind(null, tripId);
  const [state, action] = useActionState<FormState, FormData>(
    boundAction,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("メンバーを追加しました");
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>メンバーを追加</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>メンバーを追加</DialogTitle>
            <DialogDescription>
              参加メンバーの情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <MemberFields fieldErrors={state.fieldErrors} />
          {state.error && !state.ok && state.fieldErrors === undefined && (
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

export function EditMemberDialog({
  memberId,
  tripId,
  defaults,
}: {
  memberId: string;
  tripId: string;
  defaults: MemberDefaults;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updateMember.bind(null, memberId, tripId);
  const [state, action] = useActionState<FormState, FormData>(
    boundAction,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("メンバーを更新しました");
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">編集</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>メンバーを編集</DialogTitle>
            <DialogDescription>メンバー情報を変更します。</DialogDescription>
          </DialogHeader>
          <MemberFields defaults={defaults} fieldErrors={state.fieldErrors} />
          {state.error && !state.ok && state.fieldErrors === undefined && (
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
