import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Tests here exercise src/db (repositories, migrations, backup/restore)
 * and src/notifications/scheduler.ts under plain Node — no Expo runtime,
 * no device. Native-only packages are aliased to lightweight mocks so the
 * exact same source files that ship to Android run under test, rather
 * than testing a parallel implementation. See src/testing/mocks/.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "expo-sqlite": path.resolve(__dirname, "src/testing/mocks/expo-sqlite.ts"),
      "react-native-mmkv": path.resolve(__dirname, "src/testing/mocks/react-native-mmkv.ts"),
      "expo-notifications": path.resolve(__dirname, "src/testing/mocks/expo-notifications.ts"),
      "react-native": path.resolve(__dirname, "src/testing/mocks/react-native.ts")
    }
  }
});
