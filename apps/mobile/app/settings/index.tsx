import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Button, Card, Input, Muted, Screen, Text } from "../../src/components/ui";
import { wipeAllData } from "../../src/db/backup";
import { exportToFile, importFromFile } from "../../src/db/fileIO";
import { getProfile, saveProfile, type Profile } from "../../src/db/repositories/profile";
import { requestNotificationPermission } from "../../src/notifications/scheduler";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import type { ThemePreference } from "../../src/store/preferencesStore";
import { useTheme } from "../../src/theme/ThemeProvider";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const { themePreference, setThemePreference, notificationsEnabled, setNotificationsEnabled } = usePreferencesStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => { getProfile().then(setProfile); }, []));

  async function toggleNotifications(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert("Notifications blocked", "Enable notifications for StudySphere in your phone's settings to use deadline reminders.");
        return;
      }
    }
    setNotificationsEnabled(value);
  }

  async function saveProfileField(patch: Partial<Profile>) {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    await saveProfile(next);
  }

  async function handleExport() {
    setBusy(true);
    try {
      await exportToFile();
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const result = await importFromFile();
      if (result.imported) Alert.alert("Import complete", "Your data has been restored. Restart the app to see it everywhere.");
    } catch (error) {
      Alert.alert("Import failed", error instanceof Error ? error.message : "That file couldn't be read.");
    } finally {
      setBusy(false);
    }
  }

  function confirmWipe() {
    Alert.alert(
      "Delete all data",
      "This permanently deletes every task, plan, note, flashcard, and exam on this device. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            await wipeAllData();
            router.replace("/onboarding");
          }
        }
      ]
    );
  }

  return (
    <Screen>
      <Text variant="display">Settings</Text>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="title">Theme</Text>
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          {THEME_OPTIONS.map(option => (
            <Pressable
              key={option}
              onPress={() => setThemePreference(option)}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.pill,
                alignItems: "center",
                backgroundColor: themePreference === option ? theme.colors.cyan : "transparent",
                borderWidth: 1,
                borderColor: theme.colors.line
              }}
            >
              <Text variant="label" color={themePreference === option ? theme.colors.ink : theme.colors.paper}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text variant="title">Deadline reminders</Text>
          <Muted>A notification at 9am on the day a task is due.</Muted>
        </View>
        <Button
          label={notificationsEnabled ? "On" : "Off"}
          variant={notificationsEnabled ? "primary" : "outline"}
          onPress={() => toggleNotifications(!notificationsEnabled)}
        />
      </Card>

      {profile && (
        <Card style={{ gap: theme.spacing.md }}>
          <Text variant="title">Profile</Text>
          <Input label="University" value={profile.university} onChangeText={value => saveProfileField({ university: value })} />
          <Input label="Course" value={profile.course} onChangeText={value => saveProfileField({ course: value })} />
          <Input
            label="Minutes per study day"
            value={String(profile.dailyMinutes)}
            onChangeText={value => saveProfileField({ dailyMinutes: Number(value) || 0 })}
            keyboardType="number-pad"
          />
        </Card>
      )}

      <Card style={{ gap: theme.spacing.md }}>
        <Text variant="title">Backup</Text>
        <Muted>StudySphere has no account and no server - this is the only way to move your data to a new phone.</Muted>
        <Button label="Export my data" variant="outline" onPress={handleExport} loading={busy} />
        <Button label="Import from a file" variant="outline" onPress={handleImport} loading={busy} />
      </Card>

      <Card style={{ gap: theme.spacing.md }}>
        <Text variant="title">Delete all data</Text>
        <Muted>Permanently erases everything on this device.</Muted>
        <Button label="Delete all data" variant="outline" onPress={confirmWipe} />
      </Card>
    </Screen>
  );
}
