import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { exportAllData, importAllData, type BackupFile } from "./backup";

/** Writes the export to a cache file, then opens the share sheet so the
 * user can save it anywhere (Drive, Files, email) - this is the practical
 * SAF round-trip on Android without hand-rolling native SAF integration. */
export async function exportToFile(): Promise<void> {
  const backup = await exportAllData();
  const fileName = `studysphere-backup-${backup.exportedAt.slice(0, 10)}.json`;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save your StudySphere backup" });
  }
}

export async function importFromFile(): Promise<{ imported: boolean }> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json" });
  if (result.canceled || !result.assets?.[0]) return { imported: false };

  const file = new File(result.assets[0].uri);
  const content = await file.text();
  const backup = JSON.parse(content) as BackupFile;
  if (backup.version !== 1 || !backup.tables) {
    throw new Error("This file doesn't look like a StudySphere backup.");
  }
  await importAllData(backup);
  return { imported: true };
}
