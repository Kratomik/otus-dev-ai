export interface MemoryCache<T> {
  get(): T | null;
  set(value: T): void;
  clear(): void;
  readonly ttlMs: number;
}

export function createMemoryCache<T>(ttlMs: number): MemoryCache<T> {
  let entry: { value: T; expiresAt: number } | null = null;

  return {
    ttlMs,
    get(): T | null {
      if (entry === null) return null;
      if (Date.now() >= entry.expiresAt) {
        entry = null;
        return null;
      }
      return entry.value;
    },
    set(value: T): void {
      entry = { value, expiresAt: Date.now() + ttlMs };
    },
    clear(): void {
      entry = null;
    },
  };
}
