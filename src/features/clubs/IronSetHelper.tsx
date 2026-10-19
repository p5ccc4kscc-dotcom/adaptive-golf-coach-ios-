import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useServices } from '@/services/AppServices';
import { AppText, Button, Card, MultiChips, Stack, TextField, ToggleRow } from '@/ui/components';
import { goBackOr } from '@/ui/navigation';
import { space } from '@/ui/theme';

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/**
 * Bulk-creates the irons the golfer picks — one separate club instance each.
 * Nothing is pre-selected and missing numbers are never filled in.
 */
export function IronSetHelper() {
  const { repos, ownerId, invalidate } = useServices();
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>([]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [addToBag, setAddToBag] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Stack gap={space.lg}>
      <AppText muted>Pick only the irons you own — for example 5, 7, 8 and 9 without a 6. Each becomes its own club with its own Brand box you can change later.</AppText>
      <MultiChips label="Iron numbers" options={NUMBERS.map((n) => ({ value: n, label: `${n}-iron` }))} value={chosen} onChange={setChosen} testIDPrefix="iron-number" />
      <Card>
        <Stack gap={space.md}>
          <AppText variant="caption" muted>
            Optional starting text. It is copied into each iron’s own Brand and Model fields, which you can then edit one by one (for a mixed-brand set).
          </AppText>
          <TextField label="Starting brand (optional)" value={brand} onChangeText={setBrand} placeholder="Enter brand" maxLength={80} testID="set-brand" />
          <TextField label="Starting model (optional)" value={model} onChangeText={setModel} placeholder="Enter model" maxLength={80} />
        </Stack>
      </Card>
      <ToggleRow label="Also add them to My Bag" value={addToBag} onChange={setAddToBag} />
      {message ? <AppText variant="caption">{message}</AppText> : null}
      <Button
        label={chosen.length === 0 ? 'Choose at least one iron' : `Add ${chosen.length} ${chosen.length === 1 ? 'iron' : 'irons'}`}
        disabled={chosen.length === 0}
        testID="create-iron-set"
        onPress={async () => {
          const created = await repos.clubs.createIronSet(ownerId, chosen.map(Number), brand, model);
          let skipped = 0;
          if (addToBag) {
            const bag = await repos.bags.ensureDefault(ownerId);
            for (const c of created) {
              const r = await repos.bags.addClub(bag.id, c.id);
              if (!r.ok) skipped++;
            }
          }
          invalidate();
          if (skipped > 0) {
            setMessage(`${created.length - skipped} added to the bag; ${skipped} left in My Clubs because the bag reached 14.`);
            return;
          }
          goBackOr(router, '/clubs');
        }}
      />
    </Stack>
  );
}
