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
import { createItineraryItemsBulk } from "@/lib/actions/itinerary";
import { parseBulkItinerary } from "@/lib/itinerary-parser";

const PLACEHOLDER = `Day 1
09:00 東京駅集合 @東京駅
10:30-12:00 大涌谷観光 @大涌谷駅
12:30 ランチ @Bakery&Table

Day 2
09:00 ポーラ美術館 @ポーラ美術館`;

export function BulkAddItineraryDialog({
  tripId,
  totalDays,
}: {
  tripId: string;
  totalDays: number;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const parsed = useMemo(() => parseBulkItinerary(text), [text]);

  const dayOutOfRange = parsed.items
    .filter((it) => it.day < 1 || it.day > totalDays)
    .map((it) => it.day);
  const uniqueOutOfRange = Array.from(new Set(dayOutOfRange));

  const isValid =
    parsed.items.length > 0 &&
    parsed.errors.length === 0 &&
    uniqueOutOfRange.length === 0;

  const submit = () => {
    if (!isValid) return;
    startTransition(async () => {
      const res = await createItineraryItemsBulk(tripId, parsed.items);
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
            各行を「HH:MM タイトル @場所」の形式で書きます。
            「Day 2」と書いた行以降は 2 日目に切り替わります。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div>
            <Label htmlFor="bulk-text">入力</Label>
            <textarea
              id="bulk-text"
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
            outOfRange={uniqueOutOfRange}
            totalDays={totalDays}
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
  outOfRange,
  totalDays,
}: {
  items: { day: number; startTime: string; endTime?: string; title: string; location?: string }[];
  errors: { line: number; raw: string; message: string }[];
  outOfRange: number[];
  totalDays: number;
}) {
  if (items.length === 0 && errors.length === 0) {
    return null;
  }
  const grouped = new Map<number, typeof items>();
  for (const it of items) {
    const list = grouped.get(it.day) ?? [];
    list.push(it);
    grouped.set(it.day, list);
  }

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
      {items.length > 0 && (
        <p className="mb-1 font-medium">
          パース結果: {items.length} 件
        </p>
      )}
      {Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([day, group]) => (
          <div key={day} className="mb-1">
            <span className="font-semibold">Day {day}</span>
            <span className="text-muted-foreground"> ({group.length}件)</span>
            <ul className="pl-3">
              {group.slice(0, 3).map((g, i) => (
                <li key={i} className="truncate text-muted-foreground">
                  {g.startTime}
                  {g.endTime ? `-${g.endTime}` : ""} {g.title}
                  {g.location ? ` @${g.location}` : ""}
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
      {outOfRange.length > 0 && (
        <p className="mt-1 text-destructive">
          Day {outOfRange.join(", ")} は旅程の範囲外です（最大 {totalDays}）
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
