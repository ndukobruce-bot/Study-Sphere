import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { Card, Muted, Screen, Text } from "../../src/components/ui";
import { useTheme } from "../../src/theme/ThemeProvider";

const ITEMS: { href: "/notes" | "/flashcards" | "/exam-mode" | "/sage" | "/settings"; title: string; detail: string }[] = [
  { href: "/notes", title: "Notes & Summarizer", detail: "Capture notes, generate a summary, quiz, and flashcards." },
  { href: "/flashcards", title: "Flashcards", detail: "Review what's due today." },
  { href: "/exam-mode", title: "Exam Mode", detail: "A revision sprint sized to how confident you feel." },
  { href: "/sage", title: "Sage", detail: "Study guidance from your real tasks and schedule." },
  { href: "/settings", title: "Settings", detail: "Theme, notifications, profile, backup." }
];

export default function More() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Screen>
      <Text variant="display">More</Text>
      <View style={{ gap: theme.spacing.md }}>
        {ITEMS.map(item => (
          <Pressable key={item.href} onPress={() => router.push(item.href)} accessibilityRole="button" accessibilityLabel={item.title}>
            <Card>
              <Text variant="title">{item.title}</Text>
              <Muted>{item.detail}</Muted>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
