import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditItineraryDialog } from "@/components/itinerary/itinerary-form";
import { DeleteItineraryButton } from "@/components/itinerary/delete-itinerary-button";

type ItineraryItem = {
  id: string;
  tripId: string;
  dayIndex: number;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string | null;
  url: string | null;
  note: string | null;
  mapX: number | null;
  mapY: number | null;
  sortOrder: number;
};

export function ItineraryDaySection({
  day,
  items,
  totalDays,
}: {
  day: number;
  items: ItineraryItem[];
  totalDays: number;
}) {
  const sortedItems = [...items].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{day} 日目</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sortedItems.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            この日の旅程はまだありません
          </p>
        ) : (
          <ul className="divide-y">
            {sortedItems.map((item) => (
              <li key={item.id} className="flex items-start gap-4 px-4 py-3">
                <div className="w-20 shrink-0 text-sm text-muted-foreground tabular-nums">
                  <span>{item.startTime}</span>
                  {item.endTime && (
                    <>
                      <br />
                      <span>〜 {item.endTime}</span>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-snug">{item.title}</p>
                  {item.location && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.location}
                    </p>
                  )}
                  {item.url && (
                    <p className="text-sm mt-0.5 truncate">
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
                <div className="flex shrink-0 gap-1">
                  <EditItineraryDialog
                    itemId={item.id}
                    defaults={{
                      dayIndex: item.dayIndex,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      title: item.title,
                      location: item.location,
                      url: item.url,
                      note: item.note,
                      mapX: item.mapX,
                      mapY: item.mapY,
                    }}
                    totalDays={totalDays}
                  />
                  <DeleteItineraryButton itemId={item.id} tripId={item.tripId} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
