import { Tabs } from "expo-router";
import React from "react";
import { ColorValue, Text } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.cyan,
        tabBarInactiveTintColor: theme.colors.mist,
        tabBarStyle: { backgroundColor: theme.colors.slate, borderTopColor: theme.colors.line }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: ({ color }) => <TabIcon symbol="◆" color={color} /> }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: "Tasks", tabBarIcon: ({ color }) => <TabIcon symbol="☑" color={color} /> }}
      />
      <Tabs.Screen
        name="autopilot"
        options={{ title: "Autopilot", tabBarIcon: ({ color }) => <TabIcon symbol="⟳" color={color} /> }}
      />
      <Tabs.Screen
        name="timer"
        options={{ title: "Focus", tabBarIcon: ({ color }) => <TabIcon symbol="◷" color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: ({ color }) => <TabIcon symbol="⋯" color={color} /> }}
      />
    </Tabs>
  );
}
