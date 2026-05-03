"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TRIP_STATUSES,
  statusLabel,
  type TripStatus,
} from "@/lib/trip-filter";

const DEBOUNCE_MS = 300;

export function TripFilters({
  initialQ,
  initialStatus,
}: {
  initialQ: string;
  initialStatus: TripStatus;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);

  // 親（URL）が変わったらローカルも追従（戻る/進む対応）
  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const flushDebounce = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const pushUrl = (next: { q?: string; status?: TripStatus }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.status !== undefined) {
      if (next.status === "all") params.delete("status");
      else params.set("status", next.status);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : "/");
    });
  };

  const onChangeQ = (value: string) => {
    setQ(value);
    flushDebounce();
    debounceRef.current = window.setTimeout(() => {
      pushUrl({ q: value.trim() });
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  };

  const onSelectStatus = (status: TripStatus) => {
    // ボタン押下時に保留中の debounce を捨て、現在の入力値とステータスを 1 度に反映する。
    // これをしないと「保留中の古い q + 新しい status」と「新しい q + 新しい status」が
    // 短時間で 2 連続 push されて入力ボックスの値が一瞬消えたように見える。
    flushDebounce();
    pushUrl({ q: q.trim(), status });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input
        type="search"
        value={q}
        onChange={(e) => onChangeQ(e.target.value)}
        placeholder="タイトル・目的地で検索"
        className="sm:max-w-xs"
        aria-label="タイトル・目的地で検索"
      />
      <div
        role="group"
        aria-label="ステータスで絞り込み"
        className={
          "flex flex-wrap gap-1" + (pending ? " opacity-60" : "")
        }
      >
        {TRIP_STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            aria-pressed={initialStatus === s}
            variant={initialStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectStatus(s)}
          >
            {statusLabel(s)}
          </Button>
        ))}
      </div>
    </div>
  );
}
