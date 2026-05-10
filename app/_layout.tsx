import {
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_600SemiBold,
  NotoSansJP_700Bold,
  useFonts,
} from '@expo-google-fonts/noto-sans-jp';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferencesProvider, usePreferences } from '../hooks/PreferencesContext';

// アプリ起動直後はスプラッシュを保持し、フォント読み込み後にフェードアウト
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 400, fade: true });

function ThemedStatusBar() {
  const systemScheme = useColorScheme();
  const { appearance } = usePreferences();
  const effective = appearance === 'system' ? systemScheme : appearance;
  return <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    NotoSansJP_400Regular,
    NotoSansJP_500Medium,
    NotoSansJP_600SemiBold,
    NotoSansJP_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <ThemedStatusBar />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
