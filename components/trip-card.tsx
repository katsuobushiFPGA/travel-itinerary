import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTripRange, tripDurationDays } from "@/lib/date-utils";

type Trip = {
  id: string;
  title: string;
  destination: string | null;
  startDate: Date;
  endDate: Date;
  memberCount: number;
  itineraryCount: number;
  packingCount: number;
};

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link href={`/trips/${trip.id}`} className="block group">
      <Card className="transition hover:border-foreground/40">
        <CardHeader>
          <CardTitle className="group-hover:underline">{trip.title}</CardTitle>
          {trip.destination && (
            <p className="text-sm text-muted-foreground">{trip.destination}</p>
          )}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            {formatTripRange(trip.startDate, trip.endDate)}（
            {tripDurationDays(trip.startDate, trip.endDate)}日間）
          </p>
          <p>
            メンバー {trip.memberCount}人 / 旅程 {trip.itineraryCount}件 / 持ち物{" "}
            {trip.packingCount}件
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
