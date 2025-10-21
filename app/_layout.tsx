// app/_layout.tsx
import React from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // ✅ Added

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastHost } from "@/components/ToastHost";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}> {/* ✅ Wrap everything */}
      <AuthProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
          {/* ✅ Toast must remain inside root */}
          <ToastHost />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
