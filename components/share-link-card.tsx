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
import { issueShareToken, revokeShareToken } from "@/lib/actions/trip";

export function ShareLinkCard({
  tripId,
  shareToken,
}: {
  tripId: string;
  shareToken: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const relativeShareUrl = shareToken ? `/s/${shareToken}` : null;

  function handleIssue() {
    startTransition(async () => {
      const res = await issueShareToken(tripId);
      if (res.ok) toast.success("共有リンクを発行しました");
    });
  }

  function handleRevoke() {
    if (!confirm("共有リンクを無効化しますか？（既存のURLは閲覧できなくなります）"))
      return;
    startTransition(async () => {
      const res = await revokeShareToken(tripId);
      if (res.ok) toast.success("共有リンクを無効化しました");
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
            <p className="text-muted-foreground">
              このURLを知っている人だけがしおりを閲覧できます。
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 truncate rounded border bg-muted px-2 py-1 font-mono text-xs">
                {relativeShareUrl}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? "コピーしました" : "コピー"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRevoke}
                disabled={pending}
              >
                無効化
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
