import { useState } from 'react';

import { LABELS, PLAY_FREQUENCY, PRACTICE_AIDS, PlayFrequency, PlayerProfile, PracticeAid, SURFACE_ACCESS, SurfaceAccess } from '@/domain/profile';
import { parseNumberInput } from '@/domain/units';
import { useServices } from '@/services/AppServices';
import { AppText, Card, ChoiceChips, MultiChips, Stack, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

import { CoachNotesSection } from '../../profile/CoachNotesSection';
import { StepFrame, StepProps, noErrors } from '../StepFrame';
import { options, strOf } from './stepUtils';

const M_PER_FT = 0.3048;

export function PracticeStep({ profile, ...props }: StepProps & { profile: PlayerProfile }) {
  const { repos, ownerId } = useServices();
  const [frequency, setFrequency] = useState<PlayFrequency | null>(profile.playFrequency.value);
  const [spaceUnit, setSpaceUnit] = useState<'m' | 'ft'>((profile.indoorSpaceM.unit as 'm' | 'ft' | null) ?? 'm');
  const [indoor, setIndoor] = useState(
    profile.indoorSpaceM.value === null ? '' : spaceUnit === 'ft' ? strOf(profile.indoorSpaceM.value / M_PER_FT, 1) : strOf(profile.indoorSpaceM.value, 1),
  );
  const [aids, setAids] = useState<PracticeAid[]>(profile.practiceAids.value ?? []);
  const [surfaces, setSurfaces] = useState<SurfaceAccess[]>(profile.surfaceAccess.value ?? []);
  const [coachName, setCoachName] = useState(profile.coachName.value ?? '');
  const [events, setEvents] = useState(profile.upcomingEvents.value ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    const v = parseNumberInput(indoor);
    let metres: number | null = null;
    if (v !== null) {
      metres = spaceUnit === 'ft' ? v * M_PER_FT : v;
      if (Number.isNaN(v) || metres <= 0 || metres > 100) e.indoor = 'Enter a length up to 100 m, or leave blank.';
    }
    setErrors(e);
    if (!noErrors(e)) return false;
    await repos.profile.setFacts(ownerId, {
      playFrequency: { value: frequency },
      indoorSpaceM: { value: metres === null ? null : Math.round(metres * 100) / 100, unit: spaceUnit },
      practiceAids: { value: aids },
      surfaceAccess: { value: surfaces },
      coachName: { value: coachName },
      upcomingEvents: { value: events },
    });
    return true;
  };

  return (
    <StepFrame step="practice" {...props} onSave={save} intro="No equipment or coach is required. Tell us only what you actually have.">
      <ChoiceChips label="How often can you play?" options={options(PLAY_FREQUENCY, LABELS.playFrequency)} value={frequency} onChange={setFrequency} testIDPrefix="frequency" />
      <MultiChips label="Where can you practise?" options={options(SURFACE_ACCESS, LABELS.surfaceAccess)} value={surfaces} onChange={setSurfaces} testIDPrefix="surface" />
      <MultiChips
        label="Practice aids you own (optional)"
        helper="Drills that need equipment you don’t have will be left out."
        options={options(PRACTICE_AIDS, LABELS.practiceAids)}
        value={aids}
        onChange={setAids}
        testIDPrefix="aid"
      />
      <Card>
        <Stack gap={space.md}>
          <AppText variant="subheading">Indoor straight-line floor space (optional)</AppText>
          <AppText variant="caption" muted>
            Useful for indoor putting drills. Measure the longest clear straight line you could putt along.
          </AppText>
          <ChoiceChips
            label="Unit"
            options={[
              { value: 'm' as const, label: 'Metres' },
              { value: 'ft' as const, label: 'Feet' },
            ]}
            value={spaceUnit}
            onChange={(v) => v && setSpaceUnit(v)}
          />
          <TextField label={`Floor space (${spaceUnit})`} value={indoor} onChangeText={setIndoor} keyboardType="decimal-pad" error={errors.indoor} />
        </Stack>
      </Card>
      <Card>
        <Stack gap={space.md}>
          <AppText variant="subheading">Coach or PGA professional (optional, private)</AppText>
          <TextField label="Coach name" value={coachName} onChangeText={setCoachName} maxLength={80} testID="coach-name" />
        </Stack>
      </Card>
      <CoachNotesSection defaultCoachName={coachName.trim() || profile.coachName.value} />
      <TextField label="Upcoming rounds or events (optional)" value={events} onChangeText={setEvents} multiline maxLength={500} />
    </StepFrame>
  );
}
