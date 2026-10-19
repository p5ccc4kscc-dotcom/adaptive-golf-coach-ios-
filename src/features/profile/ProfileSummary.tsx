import { View } from 'react-native';

import { UnitPreferences } from '@/data/repositories/profileRepository';
import { OnboardingStep } from '@/domain/onboarding';
import { LABELS, PlayerProfile, ProfileFieldKey } from '@/domain/profile';
import { Fact, PROVENANCE_LABELS } from '@/domain/provenance';
import { formatHeight, formatLength } from '@/domain/units';
import { AppText, Badge, Button, Card, Row, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

type Formatter = (p: PlayerProfile, u: UnitPreferences) => string | null;

const list = <T extends string>(values: T[] | null, labels: Record<T, string>) => (values && values.length ? values.map((v) => labels[v]).join(', ') : null);

export const PROFILE_SECTIONS: { step: OnboardingStep; title: string; fields: { key: ProfileFieldKey; label: string; format: Formatter }[] }[] = [
  {
    step: 'experience',
    title: 'About your golf',
    fields: [
      { key: 'displayName', label: 'Name', format: (p) => p.displayName.value },
      { key: 'playingHand', label: 'Playing hand', format: (p) => (p.playingHand.value ? LABELS.playingHand[p.playingHand.value] : null) },
      { key: 'abilityLevel', label: 'Ability', format: (p) => (p.abilityLevel.value ? LABELS.abilityLevel[p.abilityLevel.value] : null) },
      { key: 'yearsPlayed', label: 'Years playing', format: (p) => (p.yearsPlayed.value === null ? null : String(p.yearsPlayed.value)) },
      {
        key: 'handicap',
        label: 'Handicap',
        format: (p) => {
          const h = p.handicap.value;
          if (!h) return null;
          const shown = h.value < 0 ? `+${Math.abs(h.value)}` : String(h.value);
          return `${shown} (${h.kind === 'official' ? 'official index' : 'my estimate'})`;
        },
      },
      { key: 'usualRounds', label: 'Usual rounds', format: (p) => (p.usualRounds.value ? LABELS.usualRounds[p.usualRounds.value] : null) },
      { key: 'practiceTypes', label: 'Practice', format: (p) => list(p.practiceTypes.value, LABELS.practiceTypes) },
      { key: 'typicalPracticeMinutes', label: 'Typical session', format: (p) => (p.typicalPracticeMinutes.value === null ? null : `${p.typicalPracticeMinutes.value} min`) },
      { key: 'ageRange', label: 'Age range', format: (p) => (p.ageRange.value ? LABELS.ageRange[p.ageRange.value] : null) },
    ],
  },
  {
    step: 'comfort',
    title: 'Comfort & body fit',
    fields: [
      { key: 'heightCm', label: 'Height', format: (p, u) => (p.heightCm.value === null ? null : formatHeight(p.heightCm.value, (p.heightCm.unit as 'cm' | 'ft_in') ?? u.heightUnit)) },
      {
        key: 'wristToFloorCm',
        label: 'Wrist-to-floor',
        format: (p, u) => (p.wristToFloorCm.value === null ? null : formatLength(p.wristToFloorCm.value, (p.wristToFloorCm.unit as 'in' | 'cm') ?? u.clubLengthUnit)),
      },
      { key: 'movementComfort', label: 'Movement', format: (p) => (p.movementComfort.value ? LABELS.movementComfort[p.movementComfort.value] : null) },
      { key: 'practiceVolume', label: 'Practice volume', format: (p) => (p.practiceVolume.value ? LABELS.practiceVolume[p.practiceVolume.value] : null) },
      { key: 'transport', label: 'On course', format: (p) => (p.transport.value ? LABELS.transport[p.transport.value] : null) },
      { key: 'accessibilityNeeds', label: 'Accessibility', format: (p) => p.accessibilityNeeds.value },
    ],
  },
  {
    step: 'goals',
    title: 'Tendencies',
    fields: [
      { key: 'challenges', label: 'Challenges', format: (p) => list(p.challenges.value, LABELS.challenges) },
      { key: 'challengesOther', label: 'Other', format: (p) => p.challengesOther.value },
    ],
  },
  {
    step: 'practice',
    title: 'Practice situation',
    fields: [
      { key: 'playFrequency', label: 'Plays', format: (p) => (p.playFrequency.value ? LABELS.playFrequency[p.playFrequency.value] : null) },
      { key: 'surfaceAccess', label: 'Practice access', format: (p) => list(p.surfaceAccess.value, LABELS.surfaceAccess) },
      { key: 'practiceAids', label: 'Aids owned', format: (p) => list(p.practiceAids.value, LABELS.practiceAids) },
      {
        key: 'indoorSpaceM',
        label: 'Indoor space',
        format: (p) => (p.indoorSpaceM.value === null ? null : p.indoorSpaceM.unit === 'ft' ? `${Math.round(p.indoorSpaceM.value / 0.3048)} ft` : `${p.indoorSpaceM.value} m`),
      },
      { key: 'coachName', label: 'Coach', format: (p) => p.coachName.value },
      { key: 'upcomingEvents', label: 'Upcoming', format: (p) => p.upcomingEvents.value },
    ],
  },
];

function statusText(f: Fact<unknown>): string {
  return f.status === 'not_assessed' ? 'Not answered yet' : PROVENANCE_LABELS[f.status];
}

export function ProfileSummary({ profile, units, onEdit }: { profile: PlayerProfile; units: UnitPreferences; onEdit: (step: OnboardingStep) => void }) {
  return (
    <Stack gap={space.md}>
      {PROFILE_SECTIONS.map((section) => {
        const missing = section.fields.filter((f) => profile[f.key].value === null || (Array.isArray(profile[f.key].value) && (profile[f.key].value as unknown[]).length === 0));
        return (
          <Card key={section.step} testID={`summary-${section.step}`}>
            <Stack gap={space.sm}>
              <Row style={{ justifyContent: 'space-between' }}>
                <AppText variant="subheading">{section.title}</AppText>
                <Button compact variant="ghost" label="Edit" accessibilityLabel={`Edit ${section.title}`} onPress={() => onEdit(section.step)} testID={`edit-${section.step}`} />
              </Row>
              {section.fields.map((f) => {
                const value = f.format(profile, units);
                return (
                  <View key={f.key} style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                    <AppText variant="label" style={{ minWidth: 120 }}>
                      {f.label}
                    </AppText>
                    {value ? <AppText style={{ flex: 1 }}>{value}</AppText> : <Badge label={statusText(profile[f.key])} />}
                  </View>
                );
              })}
              {missing.length === section.fields.length ? (
                <AppText variant="caption" muted>
                  Nothing entered in this section. That’s fine — the app will not guess.
                </AppText>
              ) : null}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
