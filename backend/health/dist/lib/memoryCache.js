export function createMemoryCache(ttlMs) {
    let entry = null;
    return {
        ttlMs,
        get() {
            if (entry === null)
                return null;
            if (Date.now() >= entry.expiresAt) {
                entry = null;
                return null;
            }
            return entry.value;
        },
        set(value) {
            entry = { value, expiresAt: Date.now() + ttlMs };
        },
        clear() {
            entry = null;
        },
    };
}
