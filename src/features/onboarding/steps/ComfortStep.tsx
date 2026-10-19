import { useState } from 'react';

import { UnitPreferences } from '@/data/repositories/profileRepository';
import { LABELS, MOVEMENT_COMFORT, MovementComfort, PRACTICE_VOLUME, PlayerProfile, PracticeVolume, TRANSPORT, Transport } from '@/domain/profile';
import { cmToFeetInches, cmToInches, feetInchesToCm, inchesToCm, parseNumberInput } from '@/domain/units';
import { useServices } from '@/services/AppServices';
import { AppText, Card, ChoiceChips, Row, Stack, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

import { StepFrame, StepProps, noErrors } from '../StepFrame';
import { options, strOf } from './stepUtils';

const HEIGHT_CM = { min: 100, max: 230 };
const WRIST_CM = { min: 45, max: 115 };

export function ComfortStep({ profile, units, ...props }: StepProps & { profile: PlayerProfile; units: UnitPreferences }) {
  const { repos, ownerId } = useServices();
  const initialFtIn = profile.heightCm.value !== null ? cmToFeetInches(profile.heightCm.value) : null;
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft_in'>((profile.heightCm.unit as 'cm' | 'ft_in' | null) ?? units.heightUnit);
  const [heightCm, setHeightCm] = useState(strOf(profile.heightCm.value, 0));
  const [feet, setFeet] = useState(initialFtIn ? String(initialFtIn.feet) : '');
  const [inches, setInches] = useState(initialFtIn ? String(initialFtIn.inches) : '');
  const [wristUnit, setWristUnit] = useState<'cm' | 'in'>((profile.wristToFloorCm.unit as 'cm' | 'in' | null) ?? units.clubLengthUnit);
  const [wrist, setWrist] = useState(
    profile.wristToFloorCm.value === null ? '' : wristUnit === 'in' ? strOf(cmToInches(profile.wristToFloorCm.value), 1) : strOf(profile.wristToFloorCm.value, 1),
  );
  const [movement, setMovement] = useState<MovementComfort | null>(profile.movementComfort.value);
  const [volume, setVolume] = useState<PracticeVolume | null>(profile.practiceVolume.value);
  const [transport, setTransport] = useState<Transport | null>(profile.transport.value);
  const [accessibility, setAccessibility] = useState(profile.accessibilityNeeds.value ?? '');
  const [notes, setNotes] = useState(profile.comfortNotes.value ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    let heightValue: number | null = null;
    if (heightUnit === 'cm') {
      const h = parseNumberInput(heightCm);
      if (h !== null) {
        if (Number.isNaN(h) || h < HEIGHT_CM.min || h > HEIGHT_CM.max) e.height = `Enter a height between ${HEIGHT_CM.min} and ${HEIGHT_CM.max} cm, or leave blank.`;
        else heightValue = h;
      }
    } else {
      const f = parseNumberInput(feet);
      const i = parseNumberInput(inches);
      if (f !== null || i !== null) {
        const cm = feetInchesToCm(f ?? 0, i ?? 0);
        if (Number.isNaN(cm) || (i !== null && (i < 0 || i >= 12)) || cm < HEIGHT_CM.min || cm > HEIGHT_CM.max) e.height = 'Enter feet and inches (0–11.9), e.g. 5 ft 9 in, or leave blank.';
        else heightValue = Math.round(cm * 10) / 10;
      }
    }
    let wristValue: number | null = null;
    const w = parseNumberInput(wrist);
    if (w !== null) {
      const cm = wristUnit === 'in' ? inchesToCm(w) : w;
      if (Number.isNaN(w) || cm < WRIST_CM.min || cm > WRIST_CM.max) e.wrist = 'That measurement looks outside the usual range. Check the value and unit, or leave blank.';
      else wristValue = Math.round(cm * 10) / 10;
    }
    setErrors(e);
    if (!noErrors(e)) return false;
    await repos.profile.setFacts(ownerId, {
      heightCm: { value: heightValue, unit: heightUnit },
      wristToFloorCm: { value: wristValue, unit: wristUnit },
      movementComfort: { value: movement },
      practiceVolume: { value: volume },
      transport: { value: transport },
      accessibilityNeeds: { value: accessibility },
      comfortNotes: { value: notes },
    });
    return true;
  };

  return (
    <StepFrame step="comfort" {...props} onSave={save} intro="Optional. Used only to keep suggestions comfortable and to prepare questions for a professional club fitting.">
      <Card tone="info">
        <AppText variant="caption">
          The app does not calculate club length or lie from body measurements and does not make medical assessments. Don’t enter health
          diagnoses. Leave any field blank if you don’t know.
        </AppText>
      </Card>
      <Card>
        <Stack gap={space.md}>
          <ChoiceChips
            label="Height unit"
            options={[
              { value: 'ft_in' as const, label: 'Feet & inches' },
              { value: 'cm' as const, label: 'Centimetres' },
            ]}
            value={heightUnit}
            onChange={(v) => v && setHeightUnit(v)}
            testIDPrefix="height-unit"
          />
          {heightUnit === 'cm' ? (
            <TextField label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" error={errors.height} testID="height-cm" />
          ) : (
            <Stack gap={space.xs}>
              <Row gap={space.sm}>
                <TextField label="Height: feet" value={feet} onChangeText={setFeet} keyboardType="number-pad" style={{ flex: 1 }} testID="height-ft" />
                <TextField label="inches" value={inches} onChangeText={setInches} keyboardType="decimal-pad" style={{ flex: 1 }} testID="height-in" />
              </Row>
              {errors.height ? <AppText variant="caption">{errors.height}</AppText> : null}
            </Stack>
          )}
        </Stack>
      </Card>
      <Card>
        <Stack gap={space.md}>
          <AppText variant="subheading">Wrist-to-floor (optional)</AppText>
          <AppText variant="caption" muted>
            Stand straight in flat shoes with arms hanging relaxed. Measure from the crease where your wrist meets your hand straight down to the
            floor. A helper makes this easier.
          </AppText>
          <ChoiceChips
            label="Unit"
            options={[
              { value: 'in' as const, label: 'Inches' },
              { value: 'cm' as const, label: 'Centimetres' },
            ]}
            value={wristUnit}
            onChange={(v) => v && setWristUnit(v)}
            testIDPrefix="wrist-unit"
          />
          <TextField label={`Wrist-to-floor (${wristUnit})`} value={wrist} onChangeText={setWrist} keyboardType="decimal-pad" error={errors.wrist} testID="wrist" />
        </Stack>
      </Card>
      <ChoiceChips label="Movement comfort" options={options(MOVEMENT_COMFORT, LABELS.movementComfort)} value={movement} onChange={setMovement} testIDPrefix="movement" />
      <ChoiceChips label="Preferred practice volume" options={options(PRACTICE_VOLUME, LABELS.practiceVolume)} value={volume} onChange={setVolume} testIDPrefix="volume" />
      <ChoiceChips label="Getting round the course" options={options(TRANSPORT, LABELS.transport)} value={transport} onChange={setTransport} testIDPrefix="transport" />
      <TextField
        label="Accessibility needs (optional)"
        helper="For example: larger text, prefer audio instructions, seated practice. Not a medical history."
        value={accessibility}
        onChangeText={setAccessibility}
        multiline
        maxLength={500}
      />
      <TextField label="Anything else about comfort (optional)" value={notes} onChangeText={setNotes} multiline maxLength={500} />
    </StepFrame>
  );
}
