/**
 * An in-memory stand-in for react-native-mmkv, used:
 *  1. On web (react-native-mmkv v4 is Nitro-module-based, no web support) —
 *     see store/mmkv.web.ts. Mirrors to localStorage when available so
 *     preferences survive a page reload in a browser.
 *  2. Under Vitest (see vitest.config.ts's alias for "react-native-mmkv") —
 *     no localStorage in Node, so this is the sole backing store there.
 */
export interface FakeMmkv {
  set(key: string, value: boolean | string | number): void;
  getString(key: string): string | undefined;
  getBoolean(key: string): boolean | undefined;
  remove(key: string): void;
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

export function createFakeMmkv(id: string): FakeMmkv {
  const prefix = `studysphere:${id}:`;
  const memory = new Map<string, boolean | string | number>();

  if (hasLocalStorage()) {
    // Hydrate memory from any previously persisted values.
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          memory.set(key.slice(prefix.length), JSON.parse(localStorage.getItem(key)!));
        } catch {
          // ignore malformed entries
        }
      }
    }
  }

  return {
    set(key, value) {
      memory.set(key, value);
      if (hasLocalStorage()) localStorage.setItem(prefix + key, JSON.stringify(value));
    },
    getString(key) {
      const value = memory.get(key);
      return typeof value === "string" ? value : undefined;
    },
    getBoolean(key) {
      const value = memory.get(key);
      return typeof value === "boolean" ? value : undefined;
    },
    remove(key) {
      memory.delete(key);
      if (hasLocalStorage()) localStorage.removeItem(prefix + key);
    }
  };
}
