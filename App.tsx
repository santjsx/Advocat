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

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const themeMode = useAppStore(state => state.themeMode);

  useEffect(() => {
    const init = async () => {
      await requestPermissions();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: darkColors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={darkColors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
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
