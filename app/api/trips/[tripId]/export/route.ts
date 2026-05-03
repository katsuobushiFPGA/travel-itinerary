import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatItineraryIcal } from "@/lib/itinerary-ical";
import { formatItineraryCsv } from "@/lib/itinerary-csv";

// 旅程を iCal / CSV 形式でダウンロードするための Route Handler。
// /api/trips/<tripId>/export?format=ical|csv

const ALLOWED_FORMATS = new Set(["ical", "csv"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await context.params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "ical";

  if (!ALLOWED_FORMATS.has(format)) {
    return NextResponse.json(
      { error: `unknown format: ${format}` },
      { status: 400 },
    );
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      itineraryItems: {
        orderBy: [
          { dayIndex: "asc" },
          { sortOrder: "asc" },
          { startTime: "asc" },
        ],
      },
    },
  });
  if (!trip) {
    return NextResponse.json({ error: "trip not found" }, { status: 404 });
  }

  const baseFileName = sanitizeFileName(trip.title);

  if (format === "ical") {
    const body = formatItineraryIcal(
      { id: trip.id, title: trip.title, startDate: trip.startDate },
      trip.itineraryItems.map((it) => ({
        id: it.id,
        dayIndex: it.dayIndex,
        startTime: it.startTime,
        endTime: it.endTime,
        title: it.title,
        location: it.location,
        url: it.url,
        note: it.note,
      })),
    );
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": contentDisposition(baseFileName, "ics"),
        "cache-control": "no-store",
      },
    });
  }

  // csv
  const body = formatItineraryCsv(
    trip.itineraryItems.map((it) => ({
      dayIndex: it.dayIndex,
      startTime: it.startTime,
      endTime: it.endTime,
      title: it.title,
      location: it.location,
      url: it.url,
      note: it.note,
    })),
  );
  // Excel が UTF-8 を検出するための BOM。リテラルだと不可視で diff が崩れるので定数化。
  const UTF8_BOM = "﻿";
  const withBom = UTF8_BOM + body;
  return new NextResponse(withBom, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": contentDisposition(baseFileName, "csv"),
      "cache-control": "no-store",
    },
  });
}

// HTTP ヘッダは ByteString (Latin-1) しか入らないので、非 ASCII を含む filename は
// RFC 5987 の filename*=UTF-8''<percent-encoded> で送る。古いブラウザ向けに ASCII
// フォールバックも併記する。
function contentDisposition(name: string, ext: string): string {
  const ascii = toAsciiFallback(name);
  const utf8 = encodeURIComponent(name);
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${utf8}.${ext}`;
}

function toAsciiFallback(input: string): string {
  // 非 ASCII を `_` に潰しつつ空にならないよう保険を入れる
  const safe = input.replace(/[^\x20-\x7e]/g, "_").replace(/[\\/:*?"<>|]/g, "_");
  return safe.trim() || "itinerary";
}

function sanitizeFileName(input: string): string {
  // ファイル名に使えない/混乱しやすい文字を `_` に置換、長さを制限
  return (
    input
      .replace(/[\\/:*?"<>|\r\n\t]/g, "_")
      .trim()
      .slice(0, 50) || "itinerary"
  );
}
