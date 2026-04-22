import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TripOverviewPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      _count: {
        select: { members: true, itineraryItems: true, packingItems: true },
      },
    },
  });
  if (!trip) notFound();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>メモ</CardTitle>
        </CardHeader>
        <CardContent className="text-sm whitespace-pre-wrap">
          {trip.memo?.trim() ? (
            trip.memo
          ) : (
            <span className="text-muted-foreground">
              メモはまだありません。右上の「編集」から追加できます。
            </span>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>サマリー</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>参加メンバー: {trip._count.members}人</p>
          <p>旅程アイテム: {trip._count.itineraryItems}件</p>
          <p>持ち物: {trip._count.packingItems}件</p>
        </CardContent>
      </Card>
    </div>
  );
}
