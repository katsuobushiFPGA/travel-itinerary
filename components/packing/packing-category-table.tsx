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
import { reorderPackingItems } from "@/lib/actions/packing";
import { PackingCheckbox } from "@/components/packing/packing-checkbox";
import { DeletePackingButton } from "@/components/packing/delete-packing-button";
import { EditPackingItemDialog } from "@/components/packing/packing-form";
import { cn } from "@/lib/utils";

export type PackingItem = {
  id: string;
  tripId: string;
  name: string;
  category: string | null;
  owner: string | null;
  quantity: number;
  checked: boolean;
  sortOrder: number;
};

export function PackingCategoryTable({
  tripId,
  // 「その他」カテゴリ表示時には category=null を action に渡す必要があるため、
  // 表示用の文字列とは別に nullable なキーを受け取る。
  categoryKey,
  items,
}: {
  tripId: string;
  categoryKey: string | null;
  items: PackingItem[];
}) {
  const [order, setOrder] = useState(items);
  useEffect(() => {
    setOrder(items);
  }, [items]);

  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
      const res = await reorderPackingItems(
        tripId,
        categoryKey,
        next.map((it) => it.id),
      );
      if (!res.ok) {
        setOrder(prev);
        toast.error(res.error ?? "並び替えに失敗しました");
      }
    });
  };

  // DndContext 内の Accessibility 用 hidden <div> が <table> の子になると無効な
   // HTML 入れ子になるため、DndContext は table の外側に置く。id を categoryKey
   // で固定して、SSR/CSR 間で auto-id が食い違うのを防ぐ。
  const dndId = `packing-${categoryKey ?? "uncategorized"}`;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-8 p-2"></th>
                <th className="w-10 p-2 text-center"></th>
                <th className="p-2 text-left font-medium">名前</th>
                <th className="p-2 text-center font-medium w-16">数量</th>
                <th className="p-2 text-left font-medium">担当者</th>
                <th className="p-2 text-right w-32"></th>
              </tr>
            </thead>
            <tbody className={cn(pending && "opacity-70 pointer-events-none")}>
              {order.map((item) => (
                <SortableRow key={item.id} item={item} tripId={tripId} />
              ))}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  item,
  tripId,
}: {
  item: PackingItem;
  tripId: string;
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
    zIndex: isDragging ? 10 : undefined,
    background: isDragging ? "var(--background)" : undefined,
    boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,.08)" : undefined,
    opacity: isDragging ? 0.95 : 1,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b last:border-b-0 hover:bg-muted/30"
    >
      <td className="p-2 text-center">
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted/50 cursor-grab touch-none"
          aria-label={`「${item.name}」を並び替え`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="p-2 text-center">
        <PackingCheckbox
          itemId={item.id}
          tripId={tripId}
          checked={item.checked}
        />
      </td>
      <td className="p-2">
        <span
          className={cn(item.checked && "line-through text-muted-foreground")}
        >
          {item.name}
        </span>
      </td>
      <td className="p-2 text-center text-muted-foreground">
        {item.quantity}
      </td>
      <td className="p-2 text-muted-foreground">{item.owner ?? ""}</td>
      <td className="p-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <EditPackingItemDialog
            itemId={item.id}
            defaults={{
              name: item.name,
              category: item.category,
              owner: item.owner,
              quantity: item.quantity,
            }}
          />
          <DeletePackingButton itemId={item.id} tripId={tripId} />
        </div>
      </td>
    </tr>
  );
}
