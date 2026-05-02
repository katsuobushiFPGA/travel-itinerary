"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { createPackingItemsBulk } from "@/lib/actions/packing";
import {
  MAX_BULK_PACKING_ITEMS,
  parseBulkPacking,
  type ParsedPackingLine,
} from "@/lib/packing-parser";

const PLACEHOLDER = `# 衣類
Tシャツ x3
パーカー
靴下 x5

# 電子機器
モバイルバッテリー
スマホ充電器 x2 @太郎`;

export function BulkAddPackingDialog({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const parsed = useMemo(() => parseBulkPacking(text), [text]);

  const overLimit = parsed.items.length > MAX_BULK_PACKING_ITEMS;

  const isValid =
    parsed.items.length > 0 && !overLimit && parsed.errors.length === 0;

  const submit = () => {
    if (!isValid) return;
    startTransition(async () => {
      const res = await createPackingItemsBulk(tripId, parsed.items);
      if (res.ok) {
        toast.success(`${res.created} 件を追加しました`);
        setText("");
        setOpen(false);
      } else {
        toast.error(res.error ?? "保存に失敗しました");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline">テキストで一括追加</Button>}
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>テキストで一括追加</DialogTitle>
          <DialogDescription>
            各行を「名前 [xN|×N] [@担当者]」の形式で書きます。
            「# カテゴリ名」と書いた行以降のアイテムはそのカテゴリに分類されます。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div>
            <Label htmlFor="bulk-packing-text">入力</Label>
            <textarea
              id="bulk-packing-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              spellCheck={false}
              placeholder={PLACEHOLDER}
              className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono leading-relaxed shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <BulkPreview
            items={parsed.items}
            errors={parsed.errors}
            overLimit={overLimit}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={submit}
            disabled={!isValid || pending}
          >
            {pending ? "追加中…" : `${parsed.items.length} 件追加`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkPreview({
  items,
  errors,
  overLimit,
}: {
  items: ParsedPackingLine[];
  errors: { line: number; raw: string; message: string }[];
  overLimit: boolean;
}) {
  if (items.length === 0 && errors.length === 0) {
    return null;
  }

  const grouped = new Map<string, ParsedPackingLine[]>();
  for (const it of items) {
    const key = it.category ?? "(未分類)";
    const list = grouped.get(key) ?? [];
    list.push(it);
    grouped.set(key, list);
  }

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
      {items.length > 0 && (
        <p className="mb-1 font-medium">パース結果: {items.length} 件</p>
      )}
      {Array.from(grouped.entries()).map(([category, group]) => (
        <div key={category} className="mb-1">
          <span className="font-semibold">{category}</span>
          <span className="text-muted-foreground"> ({group.length}件)</span>
          <ul className="pl-3">
            {group.slice(0, 3).map((g, i) => (
              <li key={i} className="truncate text-muted-foreground">
                {g.name}
                {g.quantity > 1 ? ` x${g.quantity}` : ""}
                {g.owner ? ` @${g.owner}` : ""}
              </li>
            ))}
            {group.length > 3 && (
              <li className="text-muted-foreground">
                …他 {group.length - 3} 件
              </li>
            )}
          </ul>
        </div>
      ))}
      {overLimit && (
        <p className="mt-1 text-destructive">
          一度に登録できるのは {MAX_BULK_PACKING_ITEMS} 件までです
        </p>
      )}
      {errors.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {errors.map((e) => (
            <li key={e.line} className="text-destructive">
              {e.line} 行目「{e.raw}」: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
