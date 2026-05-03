import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  CreatePackingItemDialog,
} from "@/components/packing/packing-form";
import { BulkAddPackingDialog } from "@/components/packing/packing-bulk-add-dialog";
import {
  PackingCategoryTable,
  type PackingItem,
} from "@/components/packing/packing-category-table";

const UNCATEGORIZED_LABEL = "その他";

export default async function PackingPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) notFound();

  const items = await prisma.packingItem.findMany({
    where: { tripId },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const total = items.length;
  const checkedCount = items.filter((item) => item.checked).length;

  // category=null は別キー扱いとして Map に集約。表示時は「その他」ラベル + 末尾。
  const grouped = new Map<string | null, PackingItem[]>();
  for (const item of items) {
    const key = item.category;
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  const sortedGroups: Array<{
    key: string | null;
    label: string;
    items: PackingItem[];
  }> = [];
  for (const [key, categoryItems] of grouped) {
    if (key !== null) {
      sortedGroups.push({ key, label: key, items: categoryItems });
    }
  }
  if (grouped.has(null)) {
    sortedGroups.push({
      key: null,
      label: UNCATEGORIZED_LABEL,
      items: grouped.get(null)!,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">持ち物リスト</h2>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">
              {checkedCount} / {total} 完了
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <BulkAddPackingDialog tripId={tripId} />
          <CreatePackingItemDialog tripId={tripId} />
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          持ち物がまだ登録されていません。「持ち物を追加」から追加してください。
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map((g) => (
            <div key={g.label}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                {g.label}
              </h3>
              <PackingCategoryTable
                tripId={tripId}
                categoryKey={g.key}
                items={g.items}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
