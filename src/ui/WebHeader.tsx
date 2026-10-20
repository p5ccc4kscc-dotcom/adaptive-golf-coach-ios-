import { NativeStackHeaderProps, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from './theme';

/** Where Back goes when there is no history (e.g. the page was opened from a link or reloaded). */
function fallbackFor(routeName: string): '/clubs' | '/game' | '/today' {
  if (routeName.startsWith('clubs/') && routeName !== 'clubs/index') return '/clubs';
  if (routeName === 'clubs/index' || routeName === 'bag' || routeName === 'settings' || routeName.startsWith('profile/')) return '/game';
  return '/today';
}

/**
 * Compact header for the browser preview. The default web stack header is
 * 64 px tall; this one is 48 px plus the top safe-area inset, with a 44 pt
 * Back button. The native iPhone app keeps the standard iOS header.
 */
export function WebHeader({ navigation, route, options, back }: NativeStackHeaderProps) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const title = typeof options.title === 'string' ? options.title : route.name;
  const showBack = options.headerBackVisible !== false;
  return (
    <View style={[styles.bar, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: t.surface, borderBottomColor: t.border }]} testID="web-header">
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={back?.title ? `Back to ${back.title}` : 'Back'}
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : router.replace(fallbackFor(route.name)))}
              style={styles.back}
              testID="header-back"
            >
              <Text style={{ color: t.primary, fontSize: 17, fontWeight: '600' }}>‹ Back</Text>
            </Pressable>
          ) : null}
        </View>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: t.text }]}>
          {title}
        </Text>
        <View style={[styles.side, { alignItems: 'flex-end' }]}>
          {options.headerRight ? options.headerRight({ canGoBack: !!back, tintColor: t.primary }) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs },
  side: { width: 88, justifyContent: 'center' },
  back: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
});
