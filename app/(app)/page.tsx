import { prisma } from "@/lib/db";
import { TripCard } from "@/components/trip-card";
import { CreateTripDialog } from "@/components/trip-form";
import { TripFilters } from "@/components/trip-filters";
import { buildTripWhere, parseTripFilter } from "@/lib/trip-filter";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const filter = parseTripFilter(params);
  const where = buildTripWhere(filter, new Date());

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: {
      _count: {
        select: { members: true, itineraryItems: true, packingItems: true },
      },
    },
  });

  const isFiltering = filter.q !== "" || filter.status !== "all";

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

      <TripFilters initialQ={filter.q} initialStatus={filter.status} />

      {trips.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {isFiltering
            ? "条件に一致するしおりがありません。"
            : "まだしおりがありません。「しおりを新規作成」から始めましょう。"}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{trips.length} 件</p>
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
        </>
      )}
    </div>
  );
}
