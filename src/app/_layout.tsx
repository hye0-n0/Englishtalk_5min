import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ title: "대화", gestureEnabled: false }} />
        <Stack.Screen name="session/[id]" options={{ title: "오늘의 피드백" }} />
        <Stack.Screen name="history" options={{ title: "학습 기록" }} />
        <Stack.Screen name="settings" options={{ title: "설정" }} />
      </Stack>
    </>
  );
}
