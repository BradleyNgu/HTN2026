import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

import { SettingsProvider } from "@/store/SettingsContext";
import { colors } from "@/theme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SettingsProvider>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="phone-setup" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="keyword-sets" options={{ headerShown: false }} />
        <Stack.Screen name="default-alert" options={{ headerShown: false }} />
        <Stack.Screen
          name="caller-editor"
          options={{ title: "Caller preferences" }}
        />
        <Stack.Screen
          name="listening"
          options={{ headerShown: false, gestureEnabled: false }}
        />
      </Stack>
    </SettingsProvider>
  );
}
