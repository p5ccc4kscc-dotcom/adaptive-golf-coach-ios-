import { Tabs } from 'expo-router';

import { AnalyseIcon, LearnIcon, MyGameIcon, RoundsIcon, TodayIcon } from '@/ui/TabIcons';
import { useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        // Each tab screen draws a compact title of its own (see Screen `tab`), so the
        // navigator header is hidden instead of stacking two headers.
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: TodayIcon, tabBarAccessibilityLabel: 'Today' }} />
      <Tabs.Screen name="analyse" options={{ title: 'Analyse', tabBarIcon: AnalyseIcon, tabBarAccessibilityLabel: 'Analyse swing videos' }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn & Train', tabBarLabel: 'Learn', tabBarIcon: LearnIcon, tabBarAccessibilityLabel: 'Learn and train' }} />
      <Tabs.Screen name="rounds" options={{ title: 'Rounds & Practice', tabBarLabel: 'Rounds', tabBarIcon: RoundsIcon, tabBarAccessibilityLabel: 'Rounds and practice' }} />
      <Tabs.Screen name="game" options={{ title: 'Progress & My Game', tabBarLabel: 'My Game', tabBarIcon: MyGameIcon, tabBarAccessibilityLabel: 'My Game' }} />
    </Tabs>
  );
}
