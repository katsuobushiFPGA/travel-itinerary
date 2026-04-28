"use client";

import * as React from "react";

export type MapPin = {
  id: string;
  day: number;
  x: number;
  y: number;
  label: string;
  hint: string | null;
};

export function BookletMap({
  pins,
  dayAccent,
  currentPinId,
  onPickPin,
}: {
  pins: MapPin[];
  dayAccent: (day: number) => string;
  currentPinId: string | null;
  onPickPin: (id: string) => void;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const reactId = React.useId();
  const gridId = `bookletv4-map-grid-${reactId}`;

  const dayGroups = React.useMemo(() => {
    const m = new Map<number, MapPin[]>();
    for (const p of pins) {
      const list = m.get(p.day) ?? [];
      list.push(p);
      m.set(p.day, list);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, ps]) => ({ day, pins: ps }));
  }, [pins]);

  if (pins.length === 0) return null;

  const handlePick = (id: string) => {
    setActiveId(id);
    onPickPin(id);
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 100 75"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-44 sm:h-56 rounded-xl border bg-muted/20"
        role="img"
        aria-label="旅程マップ"
      >
        <defs>
          <pattern
            id={gridId}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 5 0 L 0 0 0 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.15"
              opacity="0.18"
            />
          </pattern>
        </defs>
        <rect width="100" height="75" fill={`url(#${gridId})`} />

        {dayGroups.map(({ day, pins: ps }) => {
          if (ps.length < 2) return null;
          const accent = dayAccent(day);
          const d = ps
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");
          return (
            <path
              key={`route-${day}`}
              d={d}
              fill="none"
              stroke={accent}
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeDasharray="2.4 1.6"
              opacity="0.85"
            />
          );
        })}

        {pins.map((p) => {
          const accent = dayAccent(p.day);
          const isCurrent = currentPinId === p.id;
          const isActive = activeId === p.id;
          const ariaLabel = `${p.day}日目 ${p.label}${p.hint ? ` (${p.hint})` : ""}`;
          return (
            <g
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              onClick={() => handlePick(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePick(p.id);
                }
              }}
              style={{ cursor: "pointer", outline: "none" }}
            >
              {isCurrent && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill={accent}
                  opacity="0.4"
                  className="bookletv4-now-pulse"
                  style={{ transformBox: "fill-box" }}
                />
              )}
              {isActive && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5.2"
                  fill="none"
                  stroke={accent}
                  strokeWidth="0.5"
                  strokeDasharray="1 0.8"
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive || isCurrent ? 2.8 : 2.1}
                fill={isCurrent ? "var(--background)" : accent}
                stroke={accent}
                strokeWidth={isCurrent ? "0.9" : "0.5"}
              />
              <text
                x={p.x + 3}
                y={p.y + 1.2}
                fontSize={isActive || isCurrent ? "2.9" : "2.5"}
                fill="currentColor"
                style={{
                  pointerEvents: "none",
                  paintOrder: "stroke",
                  stroke: "var(--background)",
                  strokeWidth: "0.8",
                  fontFamily: "var(--font-yomogi)",
                }}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute left-2 top-2 flex gap-2 rounded-md border bg-background/85 px-2 py-1 text-[10px] backdrop-blur-sm">
        {dayGroups.map(({ day }) => (
          <span key={day} className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: dayAccent(day) }}
            />
            {day}日目
          </span>
        ))}
      </div>
    </div>
  );
}
