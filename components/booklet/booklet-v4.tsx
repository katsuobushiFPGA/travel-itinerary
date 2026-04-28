"use client";

import * as React from "react";

type Member = {
  id: string;
  name: string;
  role: string | null;
  contact: string | null;
};

type ItineraryItem = {
  id: string;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string | null;
  url: string | null;
  note: string | null;
};

type DayBlock = {
  day: number;
  items: ItineraryItem[];
};

type PackingGroup = {
  category: string;
  items: { id: string; name: string; quantity: number }[];
};

export type BookletData = {
  title: string;
  destination: string | null;
  dates: string;
  totalDays: number;
  memo: string | null;
  coverImage: string | null;
  dayCoverImages: Record<string, string>;
  members: Member[];
  days: DayBlock[];
  packing: PackingGroup[];
};

const DAY_ACCENTS = ["#c94a3b", "#3a6b8a", "#6b8a3a", "#8a4a8a", "#3a8a8a"];

function dayAccent(day: number): string {
  return DAY_ACCENTS[(day - 1) % DAY_ACCENTS.length];
}

export function BookletV4({ data }: { data: BookletData }) {
  const order = React.useMemo(
    () =>
      data.days.flatMap((d) =>
        d.items.map((it) => ({ id: it.id, day: d.day })),
      ),
    [data],
  );

  const initialOpen =
    data.days.length > 0 ? `day-${data.days[0].day}` : "cover";

  const [openSection, setOpenSection] = React.useState<string | null>(
    initialOpen,
  );
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [flashId, setFlashId] = React.useState<string | null>(null);

  const currentItem = order[currentIdx] ?? null;
  const nextItem =
    order.length > 0
      ? order[Math.min(currentIdx + 1, order.length - 1)]
      : null;

  const advance = () => {
    if (order.length === 0) return;
    setCurrentIdx((i) => (i + 1) % order.length);
  };

  const flashTimer = React.useRef<number | null>(null);
  const flash = (id: string) => {
    setFlashId(id);
    if (flashTimer.current !== null) {
      window.clearTimeout(flashTimer.current);
    }
    flashTimer.current = window.setTimeout(() => {
      setFlashId(null);
      flashTimer.current = null;
    }, 1400);
  };

  React.useEffect(
    () => () => {
      if (flashTimer.current !== null) {
        window.clearTimeout(flashTimer.current);
      }
    },
    [],
  );

  const currentTitle = currentItem ? findTitle(data, currentItem.id) : "";
  const nextTitle =
    nextItem && nextItem.id !== currentItem?.id
      ? findTitle(data, nextItem.id)
      : null;

  return (
    <div
      className="mx-auto w-full max-w-[480px] px-3 pb-24 pt-3 sm:px-4"
      style={{ fontFamily: "var(--font-yomogi)" }}
    >
      <Section
        id="cover"
        openSection={openSection}
        setOpen={setOpenSection}
        icon="🏯"
        title="表紙"
        sub={data.dates}
      >
        <div className="flex gap-3 items-start">
          {data.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.coverImage}
              alt=""
              className="w-24 h-24 rounded-lg object-cover shrink-0 border"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-muted shrink-0 grid place-items-center text-xs text-muted-foreground border">
              表紙写真
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-kaisei)" }}
            >
              {data.title}
            </h1>
            {data.destination && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.destination}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {data.dates}（{data.totalDays}日間）
            </p>
          </div>
        </div>
      </Section>

      {data.members.length > 0 && (
        <Section
          id="members"
          openSection={openSection}
          setOpen={setOpenSection}
          icon="👪"
          title="メンバー"
          sub={`${data.members.length}名`}
        >
          <ul className="grid grid-cols-2 gap-2">
            {data.members.map((m) => (
              <li key={m.id} className="rounded-lg border px-2.5 py-1.5">
                <div className="font-semibold text-sm leading-tight">
                  {m.name}
                </div>
                {m.role && (
                  <div className="text-xs text-muted-foreground">{m.role}</div>
                )}
                {m.contact && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {m.contact}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.memo && (
        <Section
          id="memo"
          openSection={openSection}
          setOpen={setOpenSection}
          icon="📝"
          title="ご案内"
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {data.memo}
          </p>
        </Section>
      )}

      {data.days.map((d) => {
        const accent = dayAccent(d.day);
        const banner = data.dayCoverImages[String(d.day)];
        return (
          <Section
            key={d.day}
            id={`day-${d.day}`}
            openSection={openSection}
            setOpen={setOpenSection}
            icon="🗓"
            title={`${d.day}日目`}
            sub={`Day ${d.day} / ${data.totalDays}`}
            accent={accent}
          >
            {banner && (
              <div className="relative h-28 rounded-lg overflow-hidden mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div
                  className="absolute left-3 bottom-2 text-white text-xs tracking-widest"
                  style={{ fontFamily: "var(--font-kaisei)" }}
                >
                  Day {d.day} / {data.totalDays}
                </div>
              </div>
            )}
            {d.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                この日の予定はありません
              </p>
            ) : (
              <Timeline
                items={d.items}
                accent={accent}
                currentItemId={currentItem?.id ?? null}
                flashId={flashId}
                onTapItem={flash}
              />
            )}
          </Section>
        );
      })}

      {data.packing.length > 0 && (
        <Section
          id="packing"
          openSection={openSection}
          setOpen={setOpenSection}
          icon="🎒"
          title="持ち物"
          sub="チェック"
        >
          <div className="space-y-3">
            {data.packing.map((g) => (
              <div key={g.category}>
                <div
                  className="font-semibold text-sm mb-1"
                  style={{ fontFamily: "var(--font-kaisei)" }}
                >
                  {g.category}
                </div>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm">
                  {g.items.map((p) => (
                    <li key={p.id} className="flex items-baseline gap-1.5">
                      <span className="text-muted-foreground">□</span>
                      <span>{p.name}</span>
                      {p.quantity > 1 && (
                        <span className="text-xs text-muted-foreground">
                          ×{p.quantity}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {currentItem && (
        <button
          type="button"
          onClick={advance}
          aria-label="次の予定に進む"
          className="bookletv4-now-chip fixed left-1/2 -translate-x-1/2 bottom-4 z-30 rounded-xl px-3 py-2 text-left leading-tight shadow-lg cursor-pointer min-w-[200px] max-w-[calc(100%-1.5rem)]"
          style={{
            background: "#2a2622",
            color: "#fbf6ec",
            fontFamily: "var(--font-yomogi)",
          }}
        >
          <div
            className="text-[9px] tracking-[0.1em]"
            style={{ color: "#d8a43b" }}
          >
            ★ NOW
          </div>
          <div className="text-[13px] font-semibold truncate">
            {currentTitle}
          </div>
          {nextTitle && (
            <div
              className="text-[10px] mt-0.5 truncate"
              style={{ color: "#bdb3a8" }}
            >
              次：{nextTitle} →
            </div>
          )}
        </button>
      )}
    </div>
  );
}

function findTitle(data: BookletData, id: string): string {
  for (const d of data.days) {
    for (const it of d.items) {
      if (it.id === id) return it.title;
    }
  }
  return "";
}

function Section({
  id,
  openSection,
  setOpen,
  icon,
  title,
  sub,
  accent = "#2a2622",
  children,
}: {
  id: string;
  openSection: string | null;
  setOpen: (id: string | null) => void;
  icon: string;
  title: string;
  sub?: string;
  accent?: string;
  children: React.ReactNode;
}) {
  const isOpen = openSection === id;
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = React.useState(0);
  const bodyId = `bookletv4-section-${id}`;

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    setContentHeight(el.scrollHeight);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setContentHeight(el.scrollHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  return (
    <div
      data-section={id}
      className="rounded-xl border overflow-hidden mb-2.5"
      style={{
        borderColor: isOpen ? accent : undefined,
        background: isOpen
          ? `color-mix(in oklab, var(--background) 92%, ${accent})`
          : undefined,
        transition: "background .2s, border-color .2s",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(isOpen ? null : id)}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        className="flex items-center w-full px-3 py-2.5 gap-2 text-left"
      >
        <span
          aria-hidden
          className="w-7 h-7 rounded-full grid place-items-center text-sm shrink-0"
          style={{
            background: isOpen ? accent : "color-mix(in oklab, var(--muted) 80%, transparent)",
            color: isOpen ? "#fbf6ec" : undefined,
            transition: "background .2s, color .2s",
          }}
        >
          {icon}
        </span>
        <span className="flex-1 min-w-0">
          <span
            className="block font-bold text-sm leading-tight"
            style={{ fontFamily: "var(--font-kaisei)" }}
          >
            {title}
          </span>
          {sub && (
            <span className="block text-[11px] text-muted-foreground">
              {sub}
            </span>
          )}
        </span>
        <span
          aria-hidden
          className={
            "bookletv4-chev text-sm text-muted-foreground" +
            (isOpen ? " is-open" : "")
          }
        >
          ▾
        </span>
      </button>
      <div
        id={bodyId}
        className="bookletv4-section-body"
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : 0,
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div
          ref={innerRef}
          className="px-3 pb-3 pt-2 border-t border-dashed"
          style={{
            borderTopColor: "color-mix(in oklab, var(--border) 60%, transparent)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Timeline({
  items,
  accent,
  currentItemId,
  flashId,
  onTapItem,
}: {
  items: ItineraryItem[];
  accent: string;
  currentItemId: string | null;
  flashId: string | null;
  onTapItem: (id: string) => void;
}) {
  return (
    <div className="relative pl-12 mt-1.5">
      <span
        aria-hidden
        className="absolute top-1 bottom-1 border-l-2 border-dashed"
        style={{ left: 38, borderColor: accent }}
      />
      <ul className="space-y-2.5">
        {items.map((it) => {
          const isNow = currentItemId === it.id;
          const isFlashing = flashId === it.id;
          return (
            <li key={it.id} className="relative">
              <div
                className="absolute -left-12 w-9 text-right top-0"
                style={{ fontFamily: "var(--font-kaisei)" }}
              >
                <div className="font-bold text-[13px] leading-none">
                  {it.startTime}
                </div>
                {it.endTime && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    〜{it.endTime}
                  </div>
                )}
              </div>
              <span
                aria-hidden
                className="absolute top-1 w-3 h-3 rounded-full"
                style={{
                  left: -7,
                  background: isNow ? accent : "var(--background)",
                  border: `2px solid ${accent}`,
                  boxShadow: isFlashing
                    ? "0 0 0 4px rgba(216,164,59,0.4)"
                    : "none",
                  transition: "box-shadow .25s, background .25s",
                }}
              />
              {isNow && (
                <span
                  aria-hidden
                  className="bookletv4-now-pulse absolute top-1 w-3 h-3 rounded-full pointer-events-none"
                  style={{ left: -7, border: `2px solid ${accent}` }}
                />
              )}
              <button
                type="button"
                onClick={() => onTapItem(it.id)}
                className={
                  "block w-full text-left rounded-lg border px-2.5 py-1.5" +
                  (isFlashing ? " bookletv4-row-flash" : "")
                }
                style={{
                  borderColor: isNow ? accent : undefined,
                  background: isNow
                    ? `color-mix(in oklab, var(--background) 90%, ${accent})`
                    : undefined,
                  transition: "background .2s, border-color .2s",
                }}
              >
                <div className="text-sm font-semibold leading-tight">
                  {it.title}
                </div>
                {it.location && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    📍 {it.location}
                  </div>
                )}
                {it.note && (
                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap mt-0.5">
                    {it.note}
                  </div>
                )}
                {it.url && (
                  <div className="text-[11px] mt-0.5 break-all">
                    🔗{" "}
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {it.url}
                    </a>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
