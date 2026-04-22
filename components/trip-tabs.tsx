"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/trips/${tripId}`, label: "概要" },
    { href: `/trips/${tripId}/itinerary`, label: "旅程" },
    { href: `/trips/${tripId}/packing`, label: "持ち物" },
    { href: `/trips/${tripId}/members`, label: "メンバー" },
  ];
  return (
    <nav className="border-b">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          const isActive =
            t.href === `/trips/${tripId}`
              ? pathname === t.href
              : pathname?.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "inline-flex items-center px-4 py-2 text-sm border-b-2 -mb-px transition",
                  isActive
                    ? "border-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
