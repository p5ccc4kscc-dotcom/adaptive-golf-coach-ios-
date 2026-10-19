import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CLUB_CATEGORIES, ClubCategory, ClubTypeDefinition, searchClubTypes } from '@/domain/clubCatalog';
import { ClubArt } from '@/ui/ClubArt';
import { AppText, Badge, Stack, TextField } from '@/ui/components';
import { radius, space, useTheme } from '@/ui/theme';

/**
 * Club Face Gallery: every catalogue type as its own tile with original
 * generic artwork, a readable name and an Add control. Choosing a tile opens
 * the Add Club form for a *new, separate* club instance.
 */
export function ClubGallery({ ownedCounts, onSelect }: { ownedCounts: Map<string, number>; onSelect: (type: ClubTypeDefinition) => void }) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<ClubCategory>>(new Set());
  const { width } = useWindowDimensions();
  const t = useTheme();
  const contentWidth = Math.min(width, 720) - space.lg * 2;
  const columns = contentWidth >= 560 ? 4 : 3;
  const tileWidth = (contentWidth - space.sm * (columns - 1)) / columns;

  const results = useMemo(() => searchClubTypes(query), [query]);
  const searching = query.trim() !== '';

  return (
    <Stack gap={space.md}>
      <TextField
        label="Search clubs"
        value={query}
        onChangeText={setQuery}
        placeholder="e.g. 7-iron, hybrid, 56, W"
        autoCapitalize="none"
        testID="club-search"
      />
      {results.length === 0 ? <AppText muted>No club types match “{query}”. Try “Custom / other club”.</AppText> : null}
      {CLUB_CATEGORIES.map((cat) => {
        const types = results.filter((r) => r.category === cat.category).sort((a, b) => a.sortOrder - b.sortOrder);
        if (types.length === 0) return null;
        const isCollapsed = !searching && collapsed.has(cat.category);
        return (
          <View key={cat.category} style={{ gap: space.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: !isCollapsed }}
              accessibilityLabel={`${cat.label}, ${types.length} types`}
              onPress={() =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(cat.category)) next.delete(cat.category);
                  else next.add(cat.category);
                  return next;
                })
              }
              style={styles.catHeader}
              testID={`category-${cat.category}`}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="subheading">{cat.label}</AppText>
                <AppText variant="caption" muted>
                  {cat.description}
                </AppText>
              </View>
              <Text style={{ color: t.textMuted, fontSize: 18 }}>{isCollapsed ? '▸' : '▾'}</Text>
            </Pressable>
            {isCollapsed ? null : (
              <View style={styles.grid}>
                {types.map((type) => (
                  <ClubTile key={type.code} type={type} owned={ownedCounts.get(type.code) ?? 0} width={tileWidth} onPress={() => onSelect(type)} />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </Stack>
  );
}

function ClubTile({ type, owned, width, onPress }: { type: ClubTypeDefinition; owned: number; width: number; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${type.label}`}
      accessibilityHint={owned > 0 ? `You already own ${owned}. This adds another, separate club.` : 'Opens a form to add this club.'}
      onPress={onPress}
      testID={`tile-${type.code}`}
      style={({ pressed }) => [styles.tile, { width, backgroundColor: t.surface, borderColor: owned > 0 ? t.primary : t.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <ClubArt artwork={type.artwork} badge={type.badge} size={Math.min(88, width - 16)} />
      <Text numberOfLines={3} style={{ color: t.text, fontSize: 13, fontWeight: '600', textAlign: 'center', minHeight: 34 }}>
        {type.label}
      </Text>
      {owned > 0 ? <Badge label={`Owned × ${owned}`} tone="primary" /> : null}
      <View style={[styles.addPill, { backgroundColor: t.primarySoft }]}>
        <Text style={{ color: t.primary, fontWeight: '700', fontSize: 13 }}>+ Add</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { borderRadius: radius.md, borderWidth: 1.5, padding: space.sm, alignItems: 'center', gap: space.xs },
  addPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 2 },
});
