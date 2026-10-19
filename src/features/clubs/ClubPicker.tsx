import { useState } from 'react';

import { ClubChoice } from '@/domain/baseline';
import { ClubInstance, clubDisplayName } from '@/domain/clubs';
import { AppText, Button, ChoiceChips, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

const labelFor = (c: ClubInstance) => `${clubDisplayName(c)}${c.brand ? ` (${c.brand})` : ''}`;

/**
 * Club selection by ClubInstanceID (spec §2.4): defaults to clubs in the
 * active bag, with explicit “Choose another owned club” and
 * “Unknown / not entered” options. Works with an empty bag.
 */
export function ClubPicker({
  label,
  bag,
  owned,
  value,
  onChange,
  error,
  testIDPrefix = 'club-pick',
}: {
  label: string;
  bag: ClubInstance[];
  owned: ClubInstance[];
  value: ClubChoice | null;
  onChange: (v: ClubChoice | null) => void;
  error?: string;
  testIDPrefix?: string;
}) {
  const bagIds = new Set(bag.map((c) => c.id));
  const others = owned.filter((c) => !bagIds.has(c.id));
  const [showOthers, setShowOthers] = useState(value?.kind === 'other_owned');

  const encoded = value ? (value.kind === 'unknown' ? 'unknown' : value.clubInstanceId) : null;
  const decode = (v: string | null): ClubChoice | null => {
    if (v === null) return null;
    if (v === 'unknown') return { kind: 'unknown', clubInstanceId: null };
    return { kind: bagIds.has(v) ? 'bag' : 'other_owned', clubInstanceId: v };
  };

  const options = [
    ...bag.map((c) => ({ value: c.id, label: labelFor(c) })),
    ...(showOthers ? others.map((c) => ({ value: c.id, label: `${labelFor(c)} · not in bag` })) : []),
    { value: 'unknown', label: 'Unknown / not entered' },
  ];

  return (
    <Stack gap={space.xs}>
      <ChoiceChips label={label} helper={bag.length === 0 ? 'Your bag is empty. You can still record this with an owned club or as unknown.' : 'Clubs in your current bag.'} options={options} value={encoded} onChange={(v) => onChange(decode(v))} testIDPrefix={testIDPrefix} />
      {others.length > 0 && !showOthers ? (
        <Button compact variant="ghost" label="Choose another owned club" onPress={() => setShowOthers(true)} testID={`${testIDPrefix}-show-others`} />
      ) : null}
      {error ? <AppText variant="caption">{error}</AppText> : null}
    </Stack>
  );
}
