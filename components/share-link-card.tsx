"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  issueShareToken,
  pauseShare,
  resumeShare,
  revokeShareToken,
} from "@/lib/actions/trip";

export function ShareLinkCard({
  tripId,
  shareToken,
  shareEnabled,
}: {
  tripId: string;
  shareToken: string | null;
  shareEnabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const relativeShareUrl = shareToken ? `/s/${shareToken}` : null;

  function handleIssue() {
    startTransition(async () => {
      const res = await issueShareToken(tripId);
      if (res.ok) toast.success("共有リンクを発行しました");
      else toast.error(res.error ?? "発行に失敗しました");
    });
  }

  function handleRevoke() {
    if (
      !confirm(
        "共有リンクを完全に削除しますか？再発行すると別の URL が割り当てられます。",
      )
    )
      return;
    startTransition(async () => {
      const res = await revokeShareToken(tripId);
      if (res.ok) toast.success("共有リンクを削除しました");
      else toast.error(res.error ?? "削除に失敗しました");
    });
  }

  function handlePause() {
    startTransition(async () => {
      const res = await pauseShare(tripId);
      if (res.ok) toast.success("公開を停止しました");
      else toast.error(res.error ?? "公開停止に失敗しました");
    });
  }

  function handleResume() {
    startTransition(async () => {
      const res = await resumeShare(tripId);
      if (res.ok) toast.success("公開を再開しました");
      else toast.error(res.error ?? "再公開に失敗しました");
    });
  }

  async function handleCopy() {
    if (!relativeShareUrl) return;
    const absoluteUrl = `${window.location.origin}${relativeShareUrl}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("コピーに失敗しました");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>共有リンク</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {shareToken ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <code
                className={
                  "flex-1 min-w-0 truncate rounded border px-2 py-1 font-mono text-xs " +
                  (shareEnabled
                    ? "bg-muted"
                    : "bg-muted/40 text-muted-foreground line-through")
                }
              >
                {relativeShareUrl}
              </code>
              {shareEnabled ? (
                <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-medium dark:bg-emerald-950 dark:text-emerald-300">
                  公開中
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-medium dark:bg-amber-950 dark:text-amber-300">
                  停止中
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {shareEnabled
                ? "このURLを知っている人だけがしおりを閲覧できます。"
                : "現在、このURLからしおりを閲覧できません。再開すると同じURLで閲覧可能に戻ります。"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={!shareEnabled || pending}
              >
                {copied ? "コピーしました" : "コピー"}
              </Button>
              {shareEnabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePause}
                  disabled={pending}
                >
                  公開停止
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleResume}
                  disabled={pending}
                >
                  公開再開
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRevoke}
                disabled={pending}
              >
                URLを削除
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              しおりをメンバーに配布するための非公開URLを発行できます。
            </p>
            <Button onClick={handleIssue} disabled={pending}>
              共有リンクを発行
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
