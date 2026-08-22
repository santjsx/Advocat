import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { requestPermissions } from './src/services/notifications';
import { useAppStore } from './src/store/useAppStore';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider } from './src/theme/ThemeContext';
import { darkColors } from './src/theme/colors';
import { ToastProvider } from './src/context/ToastContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import { useTheme } from './src/theme/ThemeContext';

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const { colors, mode } = useTheme();

  useEffect(() => {
    const init = async () => {
      await requestPermissions();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} backgroundColor={colors.surface} />
      <RootNavigator />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: darkColors.background }}>
      <ThemeProvider>
        <ErrorBoundary>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
