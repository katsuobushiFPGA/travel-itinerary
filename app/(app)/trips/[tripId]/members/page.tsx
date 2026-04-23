import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CreateMemberDialog, EditMemberDialog } from "@/components/members/member-form";
import { DeleteMemberButton } from "@/components/members/delete-member-button";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) notFound();

  const members = await prisma.member.findMany({
    where: { tripId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">参加メンバー</h2>
        <CreateMemberDialog tripId={tripId} />
      </div>

      {members.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          まだメンバーがいません。「メンバーを追加」から登録してください。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-lg border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-semibold">{member.name}</p>
                <div className="flex gap-1 shrink-0">
                  <EditMemberDialog
                    memberId={member.id}
                    tripId={tripId}
                    defaults={{
                      name: member.name,
                      role: member.role,
                      contact: member.contact,
                    }}
                  />
                  <DeleteMemberButton memberId={member.id} tripId={tripId} />
                </div>
              </div>
              {member.role && (
                <p className="text-sm text-muted-foreground">
                  役割: {member.role}
                </p>
              )}
              {member.contact && (
                <p className="text-sm text-muted-foreground">
                  連絡先: {member.contact}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
