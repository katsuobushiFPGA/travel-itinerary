import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { tripDurationDays } from "@/lib/date-utils";
import { CreateItineraryDialog } from "@/components/itinerary/itinerary-form";
import { BulkAddItineraryDialog } from "@/components/itinerary/itinerary-bulk-add-dialog";
import { ItineraryBoard } from "@/components/itinerary/itinerary-board";

function ExportLink({
  tripId,
  format,
  label,
  srLabel,
}: {
  tripId: string;
  format: "ical" | "csv";
  label: string;
  srLabel: string;
}) {
  return (
    <a
      href={`/api/trips/${tripId}/export?format=${format}`}
      aria-label={srLabel}
      download
      className="inline-flex h-8 items-center rounded-lg border border-input bg-transparent px-3 text-xs font-medium hover:bg-muted transition-colors"
    >
      {label}
    </a>
  );
}

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) notFound();

  const items = await prisma.itineraryItem.findMany({
    where: { tripId },
    orderBy: [
      { dayIndex: "asc" },
      { sortOrder: "asc" },
      { startTime: "asc" },
      { id: "asc" },
    ],
  });

  const totalDays = tripDurationDays(trip.startDate, trip.endDate);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <ExportLink tripId={tripId} format="ical" label=".ics" srLabel="iCal形式でダウンロード" />
        <ExportLink tripId={tripId} format="csv" label=".csv" srLabel="CSV形式でダウンロード" />
        <BulkAddItineraryDialog tripId={tripId} totalDays={totalDays} />
        <CreateItineraryDialog tripId={tripId} totalDays={totalDays} />
      </div>
      <ItineraryBoard
        tripId={tripId}
        totalDays={totalDays}
        items={items}
      />
    </div>
  );
}
