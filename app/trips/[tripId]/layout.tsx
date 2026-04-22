import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TripTabs } from "@/components/trip-tabs";
import { EditTripDialog } from "@/components/trip-form";
import { DeleteTripButton } from "@/components/delete-trip-button";
import { formatTripRange, toDateInputValue, tripDurationDays } from "@/lib/date-utils";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">
              しおり一覧
            </Link>
            <span className="mx-2">/</span>
            <span>{trip.title}</span>
          </p>
          <h1 className="text-3xl font-semibold mt-1">{trip.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {trip.destination ? `${trip.destination}　` : ""}
            {formatTripRange(trip.startDate, trip.endDate)}（
            {tripDurationDays(trip.startDate, trip.endDate)}日間）
          </p>
        </div>
        <div className="flex gap-2">
          <EditTripDialog
            tripId={trip.id}
            defaults={{
              title: trip.title,
              destination: trip.destination,
              startDate: toDateInputValue(trip.startDate),
              endDate: toDateInputValue(trip.endDate),
              memo: trip.memo,
            }}
          />
          <DeleteTripButton tripId={trip.id} />
        </div>
      </div>
      <TripTabs tripId={trip.id} />
      <div>{children}</div>
    </div>
  );
}
