import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  formatTripRange,
  tripDurationDays,
} from "@/lib/date-utils";
import { BookletPrintButton } from "@/components/booklet/booklet-print-button";

export default async function SharedBookletPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const trip = await prisma.trip.findUnique({
    where: { shareToken: token },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      itineraryItems: {
        orderBy: [{ dayIndex: "asc" }, { startTime: "asc" }],
      },
      packingItems: {
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!trip) notFound();

  const totalDays = tripDurationDays(trip.startDate, trip.endDate);
  const itemsByDay = new Map<number, typeof trip.itineraryItems>();
  for (const item of trip.itineraryItems) {
    const list = itemsByDay.get(item.dayIndex) ?? [];
    list.push(item);
    itemsByDay.set(item.dayIndex, list);
  }

  const packingByCategory = new Map<string, typeof trip.packingItems>();
  for (const item of trip.packingItems) {
    const key = item.category?.trim() || "その他";
    const list = packingByCategory.get(key) ?? [];
    list.push(item);
    packingByCategory.set(key, list);
  }

  return (
    <article className="booklet mx-auto max-w-3xl px-4 py-8 print:px-0 print:py-0 print:max-w-none">
      <div className="flex justify-end mb-4 print:hidden">
        <BookletPrintButton />
      </div>

      <section className="booklet-cover relative overflow-hidden rounded-2xl border bg-card print:rounded-none print:border-0 print:break-after-page">
        {trip.coverImage ? (
          <div className="relative h-64 sm:h-80 print:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={trip.coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 text-white">
              <CoverText trip={trip} totalDays={totalDays} onImage />
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-10">
            <CoverText trip={trip} totalDays={totalDays} />
          </div>
        )}
      </section>

      {trip.members.length > 0 && (
        <section className="booklet-section mt-8 print:mt-6">
          <h2 className="text-lg font-semibold border-b pb-2 mb-3">
            👥 メンバー
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {trip.members.map((m) => (
              <li
                key={m.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium">{m.name}</span>
                {m.role && (
                  <span className="ml-2 text-muted-foreground">{m.role}</span>
                )}
                {m.contact && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {m.contact}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {trip.memo && (
        <section className="booklet-section mt-8 print:mt-6">
          <h2 className="text-lg font-semibold border-b pb-2 mb-3">📝 ご案内</h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {trip.memo}
          </p>
        </section>
      )}

      <section className="booklet-section mt-8 print:mt-6">
        <h2 className="text-lg font-semibold border-b pb-2 mb-3">🗓 旅程</h2>
        <div className="space-y-6">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const items = itemsByDay.get(day) ?? [];
            return (
              <div key={day} className="booklet-day print:break-inside-avoid">
                <h3 className="text-base font-semibold mb-2">
                  Day {day}
                  {day < totalDays && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      （{day} 日目）
                    </span>
                  )}
                </h3>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2">
                    この日の予定はありません
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-4 px-3 py-3 print:break-inside-avoid"
                      >
                        <div className="w-20 shrink-0 text-sm text-muted-foreground tabular-nums">
                          <div>{item.startTime}</div>
                          {item.endTime && (
                            <div className="text-xs">〜 {item.endTime}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium leading-snug">
                            {item.title}
                          </p>
                          {item.location && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              📍 {item.location}
                            </p>
                          )}
                          {item.url && (
                            <p className="text-sm mt-0.5 break-all">
                              🔗{" "}
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-primary hover:underline"
                              >
                                {item.url}
                              </a>
                            </p>
                          )}
                          {item.note && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {trip.packingItems.length > 0 && (
        <section className="booklet-section mt-8 print:mt-6 print:break-before-page">
          <h2 className="text-lg font-semibold border-b pb-2 mb-3">
            🎒 持ち物リスト
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from(packingByCategory.entries()).map(([category, items]) => (
              <div key={category} className="print:break-inside-avoid">
                <h3 className="text-sm font-semibold mb-1">{category}</h3>
                <ul className="text-sm space-y-0.5">
                  {items.map((p) => (
                    <li key={p.id} className="flex items-baseline gap-2">
                      <span className="text-muted-foreground">□</span>
                      <span>{p.name}</span>
                      {p.quantity > 1 && (
                        <span className="text-xs text-muted-foreground">
                          ×{p.quantity}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-10 pt-4 border-t text-center text-xs text-muted-foreground print:mt-6">
        旅のしおり
      </footer>
    </article>
  );
}

function CoverText({
  trip,
  totalDays,
  onImage = false,
}: {
  trip: { title: string; destination: string | null; startDate: Date; endDate: Date };
  totalDays: number;
  onImage?: boolean;
}) {
  return (
    <div>
      {trip.destination && (
        <p
          className={`text-sm ${onImage ? "text-white/80" : "text-muted-foreground"}`}
        >
          {trip.destination}
        </p>
      )}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">
        {trip.title}
      </h1>
      <p
        className={`mt-2 text-sm ${onImage ? "text-white/90" : "text-muted-foreground"}`}
      >
        {formatTripRange(trip.startDate, trip.endDate)}（{totalDays}日間）
      </p>
    </div>
  );
}
