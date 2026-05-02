import { describe, expect, it } from "vitest";
import { TtlLruCache } from "@/lib/places-cache";

function makeClock(initial = 1000) {
  let t = initial;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("TtlLruCache", () => {
  it("get returns undefined for missing keys", () => {
    const cache = new TtlLruCache<string>(3, 1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("set + get round-trip", () => {
    const cache = new TtlLruCache<string>(3, 1000);
    cache.set("a", "alpha");
    expect(cache.get("a")).toBe("alpha");
  });

  it("TTL 期限切れエントリは get で undefined を返し削除される", () => {
    const clock = makeClock();
    const cache = new TtlLruCache<string>(3, 1000, clock.now);
    cache.set("a", "alpha");
    clock.advance(999);
    expect(cache.get("a")).toBe("alpha");
    clock.advance(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("最大件数を超えると最古のエントリから追い出される", () => {
    const cache = new TtlLruCache<string>(2, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    expect(cache.size()).toBe(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
  });

  it("get で recency が更新され、次の追加で別のキーが追い出される", () => {
    const cache = new TtlLruCache<string>(2, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a"); // a を最新に
    cache.set("c", "3"); // b が追い出されるべき
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("3");
  });

  it("同一キーの再 set は上書き + recency 更新", () => {
    const cache = new TtlLruCache<string>(2, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("a", "1b"); // a を上書きしつつ最新に
    cache.set("c", "3"); // b が追い出される
    expect(cache.get("a")).toBe("1b");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("3");
  });

  it("clear で全エントリが消える", () => {
    const cache = new TtlLruCache<string>(3, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });

  it("非正の maxEntries / ttlMs はコンストラクタで弾く", () => {
    expect(() => new TtlLruCache<string>(0, 1000)).toThrow();
    expect(() => new TtlLruCache<string>(3, 0)).toThrow();
    expect(() => new TtlLruCache<string>(-1, 1000)).toThrow();
  });

  it("ジェネリックで配列値も保持できる", () => {
    const cache = new TtlLruCache<number[]>(3, 1000);
    cache.set("a", [1, 2, 3]);
    expect(cache.get("a")).toEqual([1, 2, 3]);
  });
});
