import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  useFonts,
} from '@expo-google-fonts/noto-sans-devanagari';

import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { warmUp } from '@/services/api';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden — nothing to do.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Get the backend ready before the user presses Translate.
  useEffect(() => {
    void warmUp();
  }, []);

  // Wait for the Sanskrit font, otherwise the first translation flickers.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="item/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}