import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppServicesProvider } from '@/services/AppServices';
import { AppText, Button, Loading, Screen } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <AppServicesProvider
        renderLoading={() => <Loading label="Opening your private data…" />}
        renderConflict={() => (
          <Screen testID="storage-conflict">
            <AppText variant="title">Reload needed</AppText>
            <AppText>
              Your golf data was changed in another tab or window. To avoid overwriting those changes, this page has stopped saving. Reload to
              continue with the latest data.
            </AppText>
            <Button label="Reload" onPress={() => (Platform.OS === 'web' ? window.location.reload() : undefined)} testID="reload-after-conflict" />
          </Screen>
        )}
        renderError={(message, retry) => (
          <Screen>
            <AppText variant="title">Something went wrong</AppText>
            <AppText>Your data could not be opened. Nothing has been deleted.</AppText>
            <AppText variant="caption" muted>
              {message}
            </AppText>
            <Button label="Try again" onPress={retry} />
          </Screen>
        )}
      >
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.primary,
            headerTitleStyle: { color: t.text },
            contentStyle: { backgroundColor: t.bg },
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/[step]" options={{ title: 'Set up', headerBackVisible: false }} />
          <Stack.Screen name="clubs/index" options={{ title: 'My Clubs' }} />
          <Stack.Screen name="clubs/catalogue" options={{ title: 'Club Face Gallery' }} />
          <Stack.Screen name="clubs/add" options={{ title: 'Add club' }} />
          <Stack.Screen name="clubs/[id]" options={{ title: 'Edit club' }} />
          <Stack.Screen name="clubs/iron-set" options={{ title: 'Add iron set' }} />
          <Stack.Screen name="bag" options={{ title: 'Build My Bag' }} />
          <Stack.Screen name="profile/[section]" options={{ title: 'Player profile' }} />
          <Stack.Screen name="settings" options={{ title: 'Units, data & privacy' }} />
        </Stack>
      </AppServicesProvider>
    </SafeAreaProvider>
  );
}
