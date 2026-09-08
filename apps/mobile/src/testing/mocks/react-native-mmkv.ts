import { createFakeMmkv } from "../../store/fakeMmkv";

/** Vitest alias target for the bare "react-native-mmkv" specifier. */
export function createMMKV({ id }: { id: string }) {
  return createFakeMmkv(id);
}
