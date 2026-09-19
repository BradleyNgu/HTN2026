import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SettingsProvider } from "@/store/SettingsContext";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="keyword-sets" options={{ headerShown: false }} />
        <Stack.Screen name="situations" options={{ headerShown: false }} />
        <Stack.Screen name="default-alert" options={{ headerShown: false }} />
        <Stack.Screen
          name="caller-editor"
          options={{ title: "Caller preferences" }}
        />
        <Stack.Screen
          name="listening"
          options={{ title: "Live session", gestureEnabled: false }}
        />
        <Stack.Screen
          name="incoming-call"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            gestureEnabled: false,
          }}
        />
      </Stack>
    </SettingsProvider>
  );
}
