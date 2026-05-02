import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PackingCheckbox } from "@/components/packing/packing-checkbox";
import { DeletePackingButton } from "@/components/packing/delete-packing-button";
import {
  CreatePackingItemDialog,
  EditPackingItemDialog,
} from "@/components/packing/packing-form";
import { BulkAddPackingDialog } from "@/components/packing/packing-bulk-add-dialog";

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

  // カテゴリごとにグループ化（未設定は「その他」）
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.category ?? "その他";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  // 「その他」を末尾に並び替え
  const sortedGroups: [string, typeof items][] = [];
  for (const [category, categoryItems] of grouped) {
    if (category !== "その他") {
      sortedGroups.push([category, categoryItems]);
    }
  }
  if (grouped.has("その他")) {
    sortedGroups.push(["その他", grouped.get("その他")!]);
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
          {sortedGroups.map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                {category}
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 p-2 text-center"></th>
                      <th className="p-2 text-left font-medium">名前</th>
                      <th className="p-2 text-center font-medium w-16">数量</th>
                      <th className="p-2 text-left font-medium">担当者</th>
                      <th className="p-2 text-right w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="p-2 text-center">
                          <PackingCheckbox
                            itemId={item.id}
                            tripId={tripId}
                            checked={item.checked}
                          />
                        </td>
                        <td className="p-2">
                          <span
                            className={
                              item.checked
                                ? "line-through text-muted-foreground"
                                : ""
                            }
                          >
                            {item.name}
                          </span>
                        </td>
                        <td className="p-2 text-center text-muted-foreground">
                          {item.quantity}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {item.owner ?? ""}
                        </td>
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
                            <DeletePackingButton
                              itemId={item.id}
                              tripId={tripId}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
