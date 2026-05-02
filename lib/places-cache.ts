// Nominatim 検索結果のためのインメモリ TTL + LRU キャッシュ。
//
// Server Action は同一プロセス内で長時間動き続けるため（Next.js dev/prod とも
// モジュールスコープが共有される）、結果をプロセスローカルに溜めるだけで
// 同一クエリの再リクエストを大きく抑制できる。永続化は不要。

type Entry<V> = { value: V; expiresAt: number };

export class TtlLruCache<V> {
  private readonly map = new Map<string, Entry<V>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (maxEntries <= 0) {
      throw new Error("maxEntries must be positive");
    }
    if (ttlMs <= 0) {
      throw new Error("ttlMs must be positive");
    }
  }

  get(key: string): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.map.delete(key);
      return undefined;
    }
    // recency 更新のため、一旦削除して末尾に挿入し直す
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: this.now() + this.ttlMs });
    if (this.map.size > this.maxEntries) {
      // 1 回の set で増えるのは最大 1 件なので削除も最大 1 件で十分。
      const oldest = this.map.keys().next().value;
      // size > maxEntries > 0 が成り立つ時点で必ず値を持つが、
      // IteratorResult.value の TS 型が string | undefined のため型ガードを残す。
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }

  size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}
