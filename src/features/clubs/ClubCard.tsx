import { Pressable, StyleSheet, View } from 'react-native';

import { getClubType } from '@/domain/clubCatalog';
import { ClubDistanceObservation, ClubInstance, clubBadge, clubDisplayName, latestDistance } from '@/domain/clubs';
import { DistanceUnit, formatDistance } from '@/domain/units';
import { ClubArt } from '@/ui/ClubArt';
import { AppText, Checkbox } from '@/ui/components';
import { radius, space, useTheme } from '@/ui/theme';

export function clubDetailLine(club: ClubInstance): string {
  const brand = [club.brand, club.model].filter(Boolean).join(' · ') || 'Brand not entered';
  const loft = club.loftStatus === 'known' && club.loftDeg !== null ? `${club.loftDeg}°` : club.loftStatus === 'not_known' ? 'Loft not known' : 'Loft not entered';
  return `${brand} · ${loft}`;
}

export function carryLine(observations: ClubDistanceObservation[], unit: DistanceUnit): string {
  const measured = latestDistance(observations, 'carry', 'measured');
  if (measured) return `Measured carry ${formatDistance(measured.valueM, unit)}`;
  const est = latestDistance(observations, 'carry', 'estimated');
  if (est) return `Estimated carry ${formatDistance(est.valueM, unit)}`;
  return 'Carry unknown';
}

export function ClubCard({
  club,
  inBag,
  onToggleBag,
  onPress,
  observations,
  distanceUnit,
  toggleDisabled,
}: {
  club: ClubInstance;
  inBag?: boolean;
  onToggleBag?: () => void;
  onPress?: () => void;
  observations?: ClubDistanceObservation[];
  distanceUnit?: DistanceUnit;
  toggleDisabled?: boolean;
}) {
  const t = useTheme();
  const type = getClubType(club.typeCode);
  const name = clubDisplayName(club);
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: inBag ? t.primary : t.border }]} testID={`club-card-${club.id}`}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${name}. ${clubDetailLine(club)}${inBag ? '. In bag' : ''}`}
        onPress={onPress}
        disabled={!onPress}
        style={styles.main}
      >
        <ClubArt artwork={type?.artwork ?? 'custom'} badge={clubBadge(club)} size={64} putterSubtype={club.putterSubtype} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label">{name}</AppText>
          <AppText variant="caption" muted>
            {clubDetailLine(club)}
          </AppText>
          {observations && distanceUnit ? (
            <AppText variant="caption" muted>
              {carryLine(observations, distanceUnit)}
            </AppText>
          ) : null}
        </View>
      </Pressable>
      {onToggleBag ? (
        <Checkbox
          checked={!!inBag}
          onPress={onToggleBag}
          disabled={toggleDisabled}
          label={inBag ? `Remove ${name}${club.brand ? ` (${club.brand})` : ''} from bag` : `Add ${name}${club.brand ? ` (${club.brand})` : ''} to bag`}
          testID={`bag-toggle-${club.id}`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1.5, borderRadius: radius.md, paddingRight: space.md },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  tile: { borderWidth: 1.5, borderRadius: radius.md, padding: space.sm, alignItems: 'center', gap: space.xs },
});

/** Compact tile for the grouped visual grid in My Clubs. */
export function ClubGridTile({
  club,
  inBag,
  onToggleBag,
  onPress,
  width,
}: {
  club: ClubInstance;
  inBag: boolean;
  onToggleBag: () => void;
  onPress: () => void;
  width: number;
}) {
  const t = useTheme();
  const type = getClubType(club.typeCode);
  const name = clubDisplayName(club);
  return (
    <View style={[styles.tile, { width, backgroundColor: t.surface, borderColor: inBag ? t.primary : t.border }]} testID={`club-tile-${club.id}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${name}. ${clubDetailLine(club)}${inBag ? '. In bag' : ''}`} onPress={onPress} style={{ alignItems: 'center', gap: 2 }}>
        <ClubArt artwork={type?.artwork ?? 'custom'} badge={clubBadge(club)} size={Math.min(80, width - 16)} putterSubtype={club.putterSubtype} />
        <AppText variant="label" style={{ textAlign: 'center', fontSize: 13 }}>
          {name}
        </AppText>
        <AppText variant="caption" muted style={{ textAlign: 'center' }}>
          {club.brand ?? 'Brand not entered'}
        </AppText>
      </Pressable>
      <Checkbox
        checked={inBag}
        onPress={onToggleBag}
        label={inBag ? `Remove ${name}${club.brand ? ` (${club.brand})` : ''} from bag` : `Add ${name}${club.brand ? ` (${club.brand})` : ''} to bag`}
        testID={`grid-bag-toggle-${club.id}`}
      />
    </View>
  );
}
