/**
 * Vitest alias target for the bare "react-native" specifier. Only exports
 * what src/notifications/scheduler.ts actually needs (Platform.OS) — the
 * real package doesn't parse cleanly under plain Node/Vite, and pulling in
 * a full react-native-web-style shim is unnecessary for the logic under
 * test here (repositories, migrations, backup, notification scheduling —
 * no components).
 */
export const Platform = { OS: "android" as const };
