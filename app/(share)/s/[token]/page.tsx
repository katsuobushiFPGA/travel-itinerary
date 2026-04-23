import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  formatTripRange,
  tripDurationDays,
} from "@/lib/date-utils";
import { BookletPrintButton } from "@/components/booklet/booklet-print-button";
import { BookletEffects } from "@/components/booklet/booklet-effects";

function parseDayCoverImages(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
}

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
  const dayCoverImages = parseDayCoverImages(trip.dayCoverImages);
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
      <BookletEffects />
      <div
        className="booklet-progress-track print:hidden"
        aria-hidden
      >
        <div id="booklet-progress-bar" className="booklet-progress-bar" />
      </div>

      <section
        data-reveal
        data-parallax
        className="booklet-cover relative overflow-hidden rounded-2xl border bg-card print:rounded-none print:border-0 print:break-after-page"
      >
        {trip.coverImage ? (
          <div className="relative h-72 sm:h-[28rem] print:h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-parallax-img
              src={trip.coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 text-white">
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
        <section
          data-reveal
          className="booklet-section mt-10 print:mt-6"
        >
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
        <section
          data-reveal
          className="booklet-section mt-10 print:mt-6"
        >
          <h2 className="text-lg font-semibold border-b pb-2 mb-3">📝 ご案内</h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {trip.memo}
          </p>
        </section>
      )}

      <section
        data-reveal
        className="booklet-section mt-10 print:mt-6"
      >
        <h2 className="text-lg font-semibold border-b pb-2 mb-3">🗓 旅程</h2>
        <div className="space-y-10">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const items = itemsByDay.get(day) ?? [];
            const dayImage = dayCoverImages[String(day)];
            return (
              <div
                key={day}
                data-reveal
                className="booklet-day relative print:break-inside-avoid"
              >
                <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/85 backdrop-blur-sm text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground print:hidden">
                  Day {day} / {totalDays}
                </div>
                <DayBanner day={day} image={dayImage} totalDays={totalDays} />
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-4">
                    この日の予定はありません
                  </p>
                ) : (
                  <Timeline items={items} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {trip.packingItems.length > 0 && (
        <section
          data-reveal
          className="booklet-section mt-10 print:mt-6 print:break-before-page"
        >
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

      <footer className="mt-12 pt-4 border-t text-center text-xs text-muted-foreground print:mt-6">
        <p>旅のしおり</p>
        <div className="mt-2 print:hidden">
          <BookletPrintButton />
        </div>
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
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mt-1 drop-shadow-sm">
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

function DayBanner({
  day,
  image,
  totalDays,
}: {
  day: number;
  image: string | undefined;
  totalDays: number;
}) {
  if (image) {
    return (
      <div
        data-parallax
        className="booklet-day-banner relative overflow-hidden rounded-xl mb-4 h-36 sm:h-44 print:rounded-none print:h-28"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-parallax-img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-center px-5 sm:px-8 text-white">
          <div>
            <p className="text-xs tracking-widest uppercase text-white/80">
              Day {day} / {totalDays}
            </p>
            <p className="text-2xl sm:text-3xl font-bold mt-0.5">
              {day} 日目
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-3">
      <p className="text-xs tracking-widest uppercase text-muted-foreground">
        Day {day} / {totalDays}
      </p>
      <h3 className="text-xl font-bold mt-0.5">{day} 日目</h3>
    </div>
  );
}

type ItineraryItem = {
  id: string;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string | null;
  url: string | null;
  note: string | null;
};

function Timeline({ items }: { items: ItineraryItem[] }) {
  return (
    <ol className="relative pl-6">
      <span
        aria-hidden
        className="absolute left-[11px] top-2 bottom-2 w-px bg-border"
      />
      {items.map((item) => (
        <li
          key={item.id}
          className="relative pb-5 last:pb-0 print:break-inside-avoid"
        >
          <span
            aria-hidden
            className="absolute -left-6 top-1.5 h-[10px] w-[10px] rounded-full border-2 border-primary bg-background"
          />
          <div className="flex items-baseline gap-3">
            <time className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
              {item.startTime}
              {item.endTime && (
                <span className="text-[10px] ml-0.5">
                  〜{item.endTime}
                </span>
              )}
            </time>
            <p className="font-medium leading-snug">{item.title}</p>
          </div>
          <div className="mt-1 space-y-0.5 text-sm">
            {item.location && (
              <p className="text-muted-foreground">📍 {item.location}</p>
            )}
            {item.url && (
              <p className="break-all">
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
              <p className="text-muted-foreground whitespace-pre-wrap">
                {item.note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
