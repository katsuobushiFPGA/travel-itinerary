import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ItineraryDayList,
  type ItineraryItem,
} from "@/components/itinerary/itinerary-day-list";

export function ItineraryDaySection({
  tripId,
  day,
  items,
  totalDays,
}: {
  tripId: string;
  day: number;
  items: ItineraryItem[];
  totalDays: number;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{day} 日目</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            この日の旅程はまだありません
          </p>
        ) : (
          <ItineraryDayList
            tripId={tripId}
            dayIndex={day}
            items={items}
            totalDays={totalDays}
          />
        )}
      </CardContent>
    </Card>
  );
}
