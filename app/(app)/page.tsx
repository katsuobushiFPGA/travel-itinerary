import { prisma } from "@/lib/db";
import { TripCard } from "@/components/trip-card";
import { CreateTripDialog } from "@/components/trip-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const trips = await prisma.trip.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: {
        select: { members: true, itineraryItems: true, packingItems: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">しおり一覧</h1>
          <p className="text-sm text-muted-foreground mt-1">
            これまでに作成した旅のしおりを確認・編集できます。
          </p>
        </div>
        <CreateTripDialog />
      </div>

      {trips.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          まだしおりがありません。「しおりを新規作成」から始めましょう。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map((t) => (
            <TripCard
              key={t.id}
              trip={{
                id: t.id,
                title: t.title,
                destination: t.destination,
                startDate: t.startDate,
                endDate: t.endDate,
                memberCount: t._count.members,
                itineraryCount: t._count.itineraryItems,
                packingCount: t._count.packingItems,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
