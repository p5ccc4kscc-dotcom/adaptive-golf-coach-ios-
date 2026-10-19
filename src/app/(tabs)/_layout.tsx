import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';

import { useTheme } from '@/ui/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.surface },
        headerTitleStyle: { color: t.text },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: icon('☀︎') }} />
      <Tabs.Screen name="analyse" options={{ title: 'Analyse', tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn & Train', tabBarLabel: 'Learn', tabBarIcon: icon('✎') }} />
      <Tabs.Screen name="rounds" options={{ title: 'Rounds & Practice', tabBarLabel: 'Rounds', tabBarIcon: icon('⛳︎') }} />
      <Tabs.Screen name="game" options={{ title: 'Progress & My Game', tabBarLabel: 'My Game', tabBarIcon: icon('◆') }} />
    </Tabs>
  );
}
