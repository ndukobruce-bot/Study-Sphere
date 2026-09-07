import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { getDb } from "../src/db/client";
import { touchStreak } from "../src/db/repositories/streak";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

function BootGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await getDb();
      await touchStreak();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.ink }}>
        <ActivityIndicator color={theme.colors.cyan} />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <BootGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding/index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notes/index" options={{ headerShown: true, title: "Notes & Summarizer" }} />
          <Stack.Screen name="flashcards/index" options={{ headerShown: true, title: "Flashcards" }} />
          <Stack.Screen name="exam-mode/index" options={{ headerShown: true, title: "Exam Mode" }} />
          <Stack.Screen name="sage/index" options={{ headerShown: true, title: "Sage" }} />
          <Stack.Screen name="settings/index" options={{ headerShown: true, title: "Settings" }} />
        </Stack>
      </BootGate>
    </ThemeProvider>
  );
}
