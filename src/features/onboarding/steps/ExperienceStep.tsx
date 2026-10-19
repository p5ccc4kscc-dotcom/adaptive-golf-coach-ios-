import { useState } from 'react';

import { UnitPreferences } from '@/data/repositories/profileRepository';
import {
  ABILITY_LEVELS,
  AbilityLevel,
  LABELS,
  PLAYING_HANDS,
  PRACTICE_TYPES,
  PlayerProfile,
  PlayingHand,
  PracticeType,
  USUAL_ROUNDS,
  UsualRounds,
} from '@/domain/profile';
import { parseNumberInput } from '@/domain/units';
import { useServices } from '@/services/AppServices';
import { Card, ChoiceChips, MultiChips, Stack, TextField, AppText } from '@/ui/components';
import { space } from '@/ui/theme';

import { StepFrame, StepProps, noErrors } from '../StepFrame';
import { options, strOf } from './stepUtils';

export function ExperienceStep({ profile, units, ...props }: StepProps & { profile: PlayerProfile; units: UnitPreferences }) {
  const { repos, ownerId } = useServices();
  const [displayName, setDisplayName] = useState(profile.displayName.value ?? '');
  const [hand, setHand] = useState<PlayingHand | null>(profile.playingHand.value);
  const [ability, setAbility] = useState<AbilityLevel | null>(profile.abilityLevel.value);
  const [years, setYears] = useState(strOf(profile.yearsPlayed.value));
  const [handicap, setHandicap] = useState(strOf(profile.handicap.value?.value ?? null));
  const [handicapKind, setHandicapKind] = useState<'official' | 'estimated' | null>(profile.handicap.value?.kind ?? null);
  const [rounds, setRounds] = useState<UsualRounds | null>(profile.usualRounds.value);
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>(profile.practiceTypes.value ?? []);
  const [minutes, setMinutes] = useState(strOf(profile.typicalPracticeMinutes.value));
  const [distanceUnit, setDistanceUnit] = useState(units.distanceUnit);
  const [clubLengthUnit, setClubLengthUnit] = useState(units.clubLengthUnit);
  const [heightUnit, setHeightUnit] = useState(units.heightUnit);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    const y = parseNumberInput(years);
    if (y !== null && (Number.isNaN(y) || y < 0 || y > 90)) e.years = 'Enter years between 0 and 90, or leave blank.';
    const h = parseNumberInput(handicap);
    if (h !== null) {
      if (Number.isNaN(h) || h < -10 || h > 54) e.handicap = 'Handicap must be between +10 (enter −10) and 54, or leave blank.';
      if (!handicapKind) e.handicapKind = 'Say whether this is an official handicap index or your own estimate.';
    }
    const m = parseNumberInput(minutes);
    if (m !== null && (Number.isNaN(m) || m < 1 || m > 600)) e.minutes = 'Enter minutes between 1 and 600, or leave blank.';
    setErrors(e);
    if (!noErrors(e)) return false;
    await repos.profile.setFacts(ownerId, {
      displayName: { value: displayName },
      playingHand: { value: hand },
      abilityLevel: { value: ability },
      yearsPlayed: { value: y },
      handicap: { value: h === null ? null : { value: h, kind: handicapKind } },
      usualRounds: { value: rounds },
      practiceTypes: { value: practiceTypes },
      typicalPracticeMinutes: { value: m },
    });
    await repos.preferences.setUnits(ownerId, { distanceUnit, clubLengthUnit, heightUnit });
    return true;
  };

  return (
    <StepFrame step="experience" {...props} onSave={save} intro="All optional. Leave anything blank that you don’t know or would rather not say.">
      <TextField label="Preferred name (optional)" value={displayName} onChangeText={setDisplayName} placeholder="What should the app call you?" maxLength={40} testID="display-name" />
      <ChoiceChips
        label="Which hand do you play?"
        helper="Used to describe ball flight correctly. There is no default."
        options={options(PLAYING_HANDS, LABELS.playingHand)}
        value={hand}
        onChange={setHand}
        testIDPrefix="hand"
      />
      <ChoiceChips label="How would you describe your golf?" options={options(ABILITY_LEVELS, LABELS.abilityLevel)} value={ability} onChange={setAbility} testIDPrefix="ability" />
      <TextField label="Years playing (optional)" value={years} onChangeText={setYears} keyboardType="decimal-pad" error={errors.years} testID="years" />
      <Card>
        <Stack gap={space.md}>
          <TextField
            label="Handicap (optional)"
            helper="For a plus handicap, enter a negative number (e.g. +2 → −2)."
            value={handicap}
            onChangeText={setHandicap}
            keyboardType="numbers-and-punctuation"
            error={errors.handicap}
            testID="handicap"
          />
          <ChoiceChips
            label="Is that official or estimated?"
            options={[
              { value: 'official' as const, label: 'Official handicap index' },
              { value: 'estimated' as const, label: 'My estimate' },
            ]}
            value={handicapKind}
            onChange={setHandicapKind}
            testIDPrefix="handicap-kind"
          />
          {errors.handicapKind ? <AppText variant="caption">{errors.handicapKind}</AppText> : null}
        </Stack>
      </Card>
      <ChoiceChips label="Usual rounds" options={options(USUAL_ROUNDS, LABELS.usualRounds)} value={rounds} onChange={setRounds} testIDPrefix="rounds" />
      <MultiChips label="Where do you usually practise?" options={options(PRACTICE_TYPES, LABELS.practiceTypes)} value={practiceTypes} onChange={setPracticeTypes} testIDPrefix="practice-type" />
      <TextField label="Typical practice session (minutes, optional)" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" error={errors.minutes} testID="minutes" />
      <Card>
        <Stack gap={space.md}>
          <AppText variant="subheading">Units</AppText>
          <AppText variant="caption" muted>
            Suggested from your phone’s region settings. Change them to whatever you prefer.
          </AppText>
          <ChoiceChips
            label="Distances"
            options={[
              { value: 'yards' as const, label: 'Yards' },
              { value: 'metres' as const, label: 'Metres' },
            ]}
            value={distanceUnit}
            onChange={(v) => v && setDistanceUnit(v)}
            testIDPrefix="unit-distance"
          />
          <ChoiceChips
            label="Height"
            options={[
              { value: 'ft_in' as const, label: 'Feet & inches' },
              { value: 'cm' as const, label: 'Centimetres' },
            ]}
            value={heightUnit}
            onChange={(v) => v && setHeightUnit(v)}
            testIDPrefix="unit-height"
          />
          <ChoiceChips
            label="Club length"
            options={[
              { value: 'in' as const, label: 'Inches' },
              { value: 'cm' as const, label: 'Centimetres' },
            ]}
            value={clubLengthUnit}
            onChange={(v) => v && setClubLengthUnit(v)}
            testIDPrefix="unit-length"
          />
        </Stack>
      </Card>
    </StepFrame>
  );
}
