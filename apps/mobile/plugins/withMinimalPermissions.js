const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Strips permissions that show up in the merged manifest (see
 * docs/PLAY_CHECKLIST.md) but that this app doesn't actually need:
 *
 * - READ/WRITE_EXTERNAL_STORAGE (legacy, auto-injected by
 *   expo-document-picker/expo-file-system's manifest merge, both already
 *   maxSdkVersion=32 so inactive on API 33+ anyway): Settings' export and
 *   import go through expo-file-system's modern File/Paths API,
 *   expo-sharing's share sheet, and expo-document-picker's picker — all
 *   scoped-storage/SAF-based, none of which need a broad storage grant.
 * - SYSTEM_ALERT_WINDOW: traced to React Native's own debug-only manifest
 *   fragment (see docs/PLAY_CHECKLIST.md) — no app code requests it, and
 *   it must not reach a release build.
 *
 * INTERNET is deliberately NOT stripped, even though v1's release build
 * makes no network call at runtime (see docs/AUDIT.md decision 1): the
 * `development` and `preview` EAS profiles in eas.json install a dev
 * client that loads the JS bundle from Metro over a socket, which Android
 * gates behind this exact permission even for localhost/LAN connections —
 * removing it here would silently break `expo start`/dev-client iteration
 * for the whole team, not just tidy the production manifest. Making this
 * variant-aware (stripped only for the `production` EAS profile) needs
 * app.json to become app.config.js so a plugin can read the active build
 * profile — a real structural change, deferred rather than done
 * reflexively. See docs/PLAY_CHECKLIST.md.
 *
 * Every permission removed here is one fewer line the Play Data Safety
 * form and a reviewer have to reconcile against what the app actually does.
 */
const REMOVE_PERMISSIONS = [
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW"
];

module.exports = function withMinimalPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (Array.isArray(manifest["uses-permission"])) {
      manifest["uses-permission"] = manifest["uses-permission"].filter(entry => {
        const name = entry.$ && entry.$["android:name"];
        return !REMOVE_PERMISSIONS.includes(name);
      });
    }
    return config;
  });
};
