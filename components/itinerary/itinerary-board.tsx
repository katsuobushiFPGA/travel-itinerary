"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { reorderItineraryItemsCrossDay } from "@/lib/actions/itinerary";
import { EditItineraryDialog } from "@/components/itinerary/itinerary-form";
import { DeleteItineraryButton } from "@/components/itinerary/delete-itinerary-button";
import { cn } from "@/lib/utils";

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

// state: dayIndex -> アイテム配列。useMemo で props から作る。
type DayMap = Map<number, ItineraryItem[]>;

export function ItineraryBoard({
  tripId,
  totalDays,
  items,
}: {
  tripId: string;
  totalDays: number;
  items: ItineraryItem[];
}) {
  const [board, setBoard] = useState<DayMap>(() => makeBoard(items, totalDays));
  useEffect(() => {
    setBoard(makeBoard(items, totalDays));
  }, [items, totalDays]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // すべての ID を集めて、ID -> item / ID -> day を素早く引けるようにする
  const indexById = useMemo(() => {
    const map = new Map<string, { day: number; item: ItineraryItem }>();
    for (const [day, list] of board) {
      for (const item of list) map.set(item.id, { day, item });
    }
    return map;
  }, [board]);

  const activeItem = activeId ? indexById.get(activeId)?.item ?? null : null;

  function findContainerOfId(id: string): number | null {
    const entry = indexById.get(id);
    if (entry) return entry.day;
    // id が日コンテナ自体の場合（"day-3" の形）
    const m = /^day-(\d+)$/.exec(id);
    return m ? Number(m[1]) : null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeContainer = findContainerOfId(activeIdStr);
    const overContainer = findContainerOfId(overIdStr);
    if (activeContainer === null || overContainer === null) return;
    if (activeContainer === overContainer) return;

    setBoard((prev) => {
      const next = new Map(prev);
      const fromList = [...(next.get(activeContainer) ?? [])];
      const toList = [...(next.get(overContainer) ?? [])];
      const fromIdx = fromList.findIndex((it) => it.id === activeIdStr);
      if (fromIdx === -1) return prev;
      const [moved] = fromList.splice(fromIdx, 1);
      // over がアイテムならその位置の前、コンテナなら末尾
      const overIdx =
        toList.findIndex((it) => it.id === overIdStr);
      if (overIdx === -1) {
        toList.push({ ...moved, dayIndex: overContainer });
      } else {
        toList.splice(overIdx, 0, { ...moved, dayIndex: overContainer });
      }
      next.set(activeContainer, fromList);
      next.set(overContainer, toList);
      return next;
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    // 直前のサーバ呼び出しが進行中ならドラッグ結果を発射しない（ロールバック競合防止）
    if (pending) return;
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeContainer = findContainerOfId(activeIdStr);
    const overContainer = findContainerOfId(overIdStr);
    if (activeContainer === null || overContainer === null) return;

    let nextBoard = board;
    if (activeContainer === overContainer) {
      // 同一 day 内の並び替え
      const list = board.get(activeContainer) ?? [];
      const fromIdx = list.findIndex((it) => it.id === activeIdStr);
      const toIdx = list.findIndex((it) => it.id === overIdStr);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        nextBoard = new Map(board);
        nextBoard.set(activeContainer, arrayMove(list, fromIdx, toIdx));
      }
    }
    if (nextBoard === board && !crossDayChanged(items, board)) {
      // 何も変わらなければサーバ呼び出し不要
      return;
    }
    if (nextBoard !== board) setBoard(nextBoard);

    const prev = items; // 失敗時のロールバック元
    const payload: Record<string, string[]> = {};
    for (const [day, list] of nextBoard) {
      // 空 day はキーを送らない。サーバ側は全 day の flatten で集合一致を検証するため
      // 「アイテムを持つ day だけ送れば残り day は触らない」という契約になる。
      if (list.length > 0) payload[String(day)] = list.map((it) => it.id);
    }

    startTransition(async () => {
      const res = await reorderItineraryItemsCrossDay(tripId, payload);
      if (!res.ok) {
        setBoard(makeBoard(prev, totalDays));
        toast.error(res.error ?? "並び替えに失敗しました");
      }
    });
  }

  return (
    <DndContext
      id="itinerary-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("space-y-4", pending && "opacity-90")}>
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
          <DayColumn
            key={day}
            day={day}
            items={board.get(day) ?? []}
            totalDays={totalDays}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? <RowSurface item={activeItem} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// 現在の board と元の items を比較して、day 跨ぎの変更があったかを判定する
function crossDayChanged(items: ItineraryItem[], board: DayMap): boolean {
  const prevIndex = new Map(items.map((it) => [it.id, it.dayIndex]));
  for (const [day, list] of board) {
    for (const it of list) {
      if (prevIndex.get(it.id) !== day) return true;
    }
  }
  return false;
}

function makeBoard(items: ItineraryItem[], totalDays: number): DayMap {
  const m: DayMap = new Map();
  for (let d = 1; d <= totalDays; d++) m.set(d, []);
  // sortOrder asc -> startTime asc -> id asc は呼び出し側で済ませている前提だが、念のため
  const sorted = [...items].sort(
    (a, b) =>
      a.dayIndex - b.dayIndex ||
      a.sortOrder - b.sortOrder ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id),
  );
  for (const it of sorted) {
    if (!m.has(it.dayIndex)) m.set(it.dayIndex, []);
    m.get(it.dayIndex)!.push(it);
  }
  return m;
}

function DayColumn({
  day,
  items,
  totalDays,
}: {
  day: number;
  items: ItineraryItem[];
  totalDays: number;
}) {
  const containerId = `day-${day}`;
  const { setNodeRef, isOver } = useDroppable({ id: containerId });
  const ids = items.map((it) => it.id);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{day} 日目</CardTitle>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "p-0 transition-colors",
          isOver && "bg-muted/40",
        )}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              ここにドラッグ
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  totalDays={totalDays}
                />
              ))}
            </ul>
          )}
        </SortableContext>
      </CardContent>
    </Card>
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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="px-0">
      <RowSurface
        item={item}
        totalDays={totalDays}
        attributes={attributes}
        listeners={listeners}
      />
    </li>
  );
}

type DraggableAttrs = ReturnType<typeof useSortable>["attributes"];
type DraggableListeners = ReturnType<typeof useSortable>["listeners"];

function RowSurface({
  item,
  totalDays,
  attributes,
  listeners,
  dragging = false,
}: {
  item: ItineraryItem;
  totalDays?: number;
  attributes?: DraggableAttrs;
  listeners?: DraggableListeners;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3",
        dragging && "rounded bg-background shadow-lg ring-1 ring-foreground/10",
      )}
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
      {!dragging && totalDays !== undefined && (
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
      )}
    </div>
  );
}
