"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reorderItineraryItems } from "@/lib/actions/itinerary";
import { EditItineraryDialog } from "@/components/itinerary/itinerary-form";
import { DeleteItineraryButton } from "@/components/itinerary/delete-itinerary-button";

export type ItineraryItem = {
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

export function ItineraryDayList({
  tripId,
  dayIndex,
  items,
  totalDays,
}: {
  tripId: string;
  dayIndex: number;
  items: ItineraryItem[];
  totalDays: number;
}) {
  // サーバから来た順序をローカルで上書きしてドラッグ中の位置を反映する。
  // props.items が変わったら追従する（外部の編集・削除・追加に対応）。
  const [order, setOrder] = useState(items);
  useEffect(() => {
    setOrder(items);
  }, [items]);

  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // クリックとドラッグを区別する閾値。誤発火防止。
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = order.map((it) => it.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(order, oldIndex, newIndex);
    const prev = order;
    setOrder(next);

    startTransition(async () => {
      const res = await reorderItineraryItems(
        tripId,
        dayIndex,
        next.map((it) => it.id),
      );
      if (!res.ok) {
        // 失敗したら元の順序に戻す
        setOrder(prev);
        toast.error(res.error ?? "並び替えに失敗しました");
      }
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul
          className={
            "divide-y" + (pending ? " opacity-70 pointer-events-none" : "")
          }
        >
          {order.map((item) => (
            <SortableRow key={item.id} item={item} totalDays={totalDays} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  item,
  totalDays,
}: {
  item: ItineraryItem;
  totalDays: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // ドラッグ中の行を浮かせる
    zIndex: isDragging ? 10 : undefined,
    background: isDragging ? "var(--background)" : undefined,
    boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,.08)" : undefined,
    opacity: isDragging ? 0.95 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 px-4 py-3"
    >
      <button
        type="button"
        className="mt-1 -mx-1 rounded p-1 text-muted-foreground hover:bg-muted/50 cursor-grab touch-none"
        aria-label={`「${item.title}」を並び替え`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
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
  );
}
