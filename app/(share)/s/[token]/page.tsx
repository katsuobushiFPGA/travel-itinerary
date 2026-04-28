import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatTripRange, tripDurationDays } from "@/lib/date-utils";
import { BookletPrintButton } from "@/components/booklet/booklet-print-button";
import { BookletV4, type BookletData } from "@/components/booklet/booklet-v4";

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
        orderBy: [
          { dayIndex: "asc" },
          { sortOrder: "asc" },
          { startTime: "asc" },
        ],
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
  const days = Array.from({ length: totalDays }, (_, i) => i + 1).map(
    (day) => ({
      day,
      items: (itemsByDay.get(day) ?? []).map((it) => ({
        id: it.id,
        startTime: it.startTime,
        endTime: it.endTime,
        title: it.title,
        location: it.location,
        url: it.url,
        note: it.note,
      })),
    }),
  );

  const packingByCategory = new Map<string, typeof trip.packingItems>();
  for (const item of trip.packingItems) {
    const key = item.category?.trim() || "その他";
    const list = packingByCategory.get(key) ?? [];
    list.push(item);
    packingByCategory.set(key, list);
  }
  const packing = Array.from(packingByCategory.entries()).map(
    ([category, items]) => ({
      category,
      items: items.map((p) => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
      })),
    }),
  );

  const data: BookletData = {
    title: trip.title,
    destination: trip.destination,
    dates: formatTripRange(trip.startDate, trip.endDate),
    totalDays,
    memo: trip.memo,
    coverImage: trip.coverImage,
    dayCoverImages,
    members: trip.members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      contact: m.contact,
    })),
    days,
    packing,
  };

  return (
    <article className="booklet">
      <BookletV4 data={data} />
      <footer className="pb-10 text-center print:hidden">
        <BookletPrintButton />
      </footer>
    </article>
  );
}
