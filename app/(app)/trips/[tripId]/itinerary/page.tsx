import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { tripDurationDays } from "@/lib/date-utils";
import { CreateItineraryDialog } from "@/components/itinerary/itinerary-form";
import { BulkAddItineraryDialog } from "@/components/itinerary/itinerary-bulk-add-dialog";
import { ItineraryDaySection } from "@/components/itinerary/itinerary-day-section";

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
      <div className="flex justify-end gap-2">
        <BulkAddItineraryDialog tripId={tripId} totalDays={totalDays} />
        <CreateItineraryDialog tripId={tripId} totalDays={totalDays} />
      </div>
      <div className="space-y-4">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
          <ItineraryDaySection
            key={day}
            tripId={tripId}
            day={day}
            items={items.filter((item) => item.dayIndex === day)}
            totalDays={totalDays}
          />
        ))}
      </div>
    </div>
  );
}
