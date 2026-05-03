import { describe, expect, it } from "vitest";
import {
  buildTripWhere,
  parseTripFilter,
  statusLabel,
  TRIP_STATUSES,
} from "@/lib/trip-filter";

describe("parseTripFilter", () => {
  it("空オブジェクトはデフォルト値（status=all, q=空）", () => {
    expect(parseTripFilter({})).toEqual({ q: "", status: "all" });
  });

  it("undefined もデフォルト", () => {
    expect(parseTripFilter(undefined)).toEqual({ q: "", status: "all" });
  });

  it("q を trim する", () => {
    expect(parseTripFilter({ q: "  京都  " })).toEqual({
      q: "京都",
      status: "all",
    });
  });

  it("status を 4 値に正規化（不明な値は all）", () => {
    expect(parseTripFilter({ status: "upcoming" }).status).toBe("upcoming");
    expect(parseTripFilter({ status: "active" }).status).toBe("active");
    expect(parseTripFilter({ status: "past" }).status).toBe("past");
    expect(parseTripFilter({ status: "all" }).status).toBe("all");
    expect(parseTripFilter({ status: "weird" }).status).toBe("all");
  });

  it("配列で渡された値は最初の要素を採用", () => {
    expect(parseTripFilter({ q: ["a", "b"], status: ["past", "active"] }))
      .toEqual({ q: "a", status: "past" });
  });
});

describe("buildTripWhere", () => {
  const now = new Date("2026-05-03T12:00:00Z");

  it("status=all かつ q 空 なら空オブジェクト", () => {
    expect(buildTripWhere({ q: "", status: "all" }, now)).toEqual({});
  });

  it("q が指定されると title/destination の OR contains", () => {
    expect(buildTripWhere({ q: "京都", status: "all" }, now)).toEqual({
      OR: [
        { title: { contains: "京都" } },
        { destination: { contains: "京都" } },
      ],
    });
  });

  it("status=upcoming は startDate > now", () => {
    expect(buildTripWhere({ q: "", status: "upcoming" }, now)).toEqual({
      startDate: { gt: now },
    });
  });

  it("status=active は startDate <= now AND endDate >= now", () => {
    expect(buildTripWhere({ q: "", status: "active" }, now)).toEqual({
      AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }],
    });
  });

  it("status=past は endDate < now", () => {
    expect(buildTripWhere({ q: "", status: "past" }, now)).toEqual({
      endDate: { lt: now },
    });
  });

  it("q と status を併用するとどちらの条件も乗る", () => {
    const w = buildTripWhere({ q: "京都", status: "upcoming" }, now);
    expect(w).toEqual({
      OR: [
        { title: { contains: "京都" } },
        { destination: { contains: "京都" } },
      ],
      startDate: { gt: now },
    });
  });

  it("q と status=active を併用すると OR と AND が同居する", () => {
    // active だけ AND を使う特殊ケース。OR/AND が両立するのを担保する。
    const w = buildTripWhere({ q: "京都", status: "active" }, now);
    expect(w).toEqual({
      OR: [
        { title: { contains: "京都" } },
        { destination: { contains: "京都" } },
      ],
      AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }],
    });
  });
});

describe("statusLabel", () => {
  it("4 つすべての日本語ラベルを返す", () => {
    expect(statusLabel("all")).toBe("すべて");
    expect(statusLabel("upcoming")).toBe("これから");
    expect(statusLabel("active")).toBe("進行中");
    expect(statusLabel("past")).toBe("終了");
  });
});

describe("TRIP_STATUSES", () => {
  it("4 値を順序通り含む", () => {
    expect(TRIP_STATUSES).toEqual(["all", "upcoming", "active", "past"]);
  });
});
