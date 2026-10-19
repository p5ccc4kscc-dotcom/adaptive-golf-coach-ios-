import { useState } from 'react';
import { View } from 'react-native';

import { UnitPreferences } from '@/data/repositories/profileRepository';
import {
  ClubInstance,
  DISTANCE_CONTEXT_LABELS,
  DISTANCE_SOURCE_LABELS,
  DistanceContext,
  DistanceDraft,
  DistanceSource,
  validateDistanceDraft,
} from '@/domain/clubs';
import { formatLocalDate } from '@/domain/dates';
import { formatDistance } from '@/domain/units';
import { useQuery, useServices } from '@/services/AppServices';
import { AppText, Button, Card, ChoiceChips, Divider, Row, Stack, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

export function DistanceSection({ club, units }: { club: ClubInstance; units: UnitPreferences }) {
  const { repos, ownerId, invalidate, todayLocal } = useServices();
  const observations = useQuery((s) => s.repos.distances.listForClub(club.id), [club.id]).data ?? [];
  const blank = (): DistanceDraft => ({
    kind: 'carry',
    method: 'estimated',
    value: '',
    unit: units.distanceUnit,
    observedOn: '',
    source: 'user_estimate',
    context: 'range',
    sampleCount: '',
    notes: '',
  });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DistanceDraft>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof DistanceDraft>(k: K, v: DistanceDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    const r = validateDistanceDraft(draft, todayLocal());
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    await repos.distances.add(ownerId, club.id, r.value);
    setErrors({});
    setDraft(blank());
    setAdding(false);
    invalidate();
  };

  return (
    <Card testID="distance-section">
      <Stack gap={space.md}>
        <AppText variant="subheading">Distances</AppText>
        <AppText variant="caption" muted>
          Each record keeps whether it is an estimate or a measurement, carry or total, and where it came from. Nothing is filled in for you.
        </AppText>
        {observations.length === 0 ? <AppText muted>No distances recorded — unknown.</AppText> : null}
        {observations.map((o) => (
          <View key={o.id} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText variant="label">
                {o.method === 'measured' ? 'Measured' : 'Estimated'} {o.kind}: {formatDistance(o.valueM, units.distanceUnit)}
              </AppText>
              <Button compact variant="ghost" label="Remove" accessibilityLabel={`Remove ${o.kind} record from ${o.observedOn}`} onPress={async () => { await repos.distances.remove(o.id); invalidate(); }} />
            </Row>
            <AppText variant="caption" muted>
              {formatLocalDate(o.observedOn)} · {DISTANCE_CONTEXT_LABELS[o.context]} · {DISTANCE_SOURCE_LABELS[o.source]}
              {o.sampleCount ? ` · ${o.sampleCount} shots` : ''} · entered as {o.enteredValue} {o.enteredUnit === 'yards' ? 'yd' : 'm'}
            </AppText>
            <Divider />
          </View>
        ))}
        {adding ? (
          <Stack gap={space.md}>
            <ChoiceChips label="Carry or total?" options={[{ value: 'carry' as const, label: 'Carry' }, { value: 'total' as const, label: 'Total (with roll)' }]} value={draft.kind} onChange={(v) => v && set('kind', v)} />
            <ChoiceChips
              label="Estimated or measured?"
              options={[{ value: 'estimated' as const, label: 'My estimate' }, { value: 'measured' as const, label: 'Measured' }]}
              value={draft.method}
              onChange={(v) => v && setDraft((d) => ({ ...d, method: v, source: v === 'estimated' ? 'user_estimate' : d.source === 'user_estimate' ? 'range_device' : d.source }))}
            />
            <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
              <TextField label="Distance" value={draft.value} onChangeText={(v) => set('value', v)} keyboardType="decimal-pad" error={errors.value} style={{ flex: 1 }} testID="distance-value" />
              <View style={{ flex: 1 }}>
                <ChoiceChips label="Unit" options={[{ value: 'yards' as const, label: 'yd' }, { value: 'metres' as const, label: 'm' }]} value={draft.unit} onChange={(v) => v && set('unit', v)} />
              </View>
            </Row>
            <Row gap={space.sm} style={{ alignItems: 'flex-end' }}>
              <TextField label="Date (YYYY-MM-DD)" value={draft.observedOn} onChangeText={(v) => set('observedOn', v)} error={errors.observedOn} style={{ flex: 1 }} testID="distance-date" />
              <Button compact variant="secondary" label="Today" onPress={() => set('observedOn', todayLocal())} />
            </Row>
            <ChoiceChips
              label="Source"
              options={(Object.keys(DISTANCE_SOURCE_LABELS) as DistanceSource[])
                .filter((s) => (draft.method === 'estimated' ? s === 'user_estimate' : s !== 'user_estimate'))
                .map((s) => ({ value: s, label: DISTANCE_SOURCE_LABELS[s] }))}
              value={draft.source}
              onChange={(v) => v && set('source', v)}
            />
            {errors.source ? <AppText variant="caption">{errors.source}</AppText> : null}
            <ChoiceChips
              label="Where?"
              options={(Object.keys(DISTANCE_CONTEXT_LABELS) as DistanceContext[]).map((c) => ({ value: c, label: DISTANCE_CONTEXT_LABELS[c] }))}
              value={draft.context}
              onChange={(v) => v && set('context', v)}
            />
            <TextField label="Number of shots (optional)" value={draft.sampleCount} onChangeText={(v) => set('sampleCount', v)} keyboardType="number-pad" error={errors.sampleCount} />
            <TextField label="Notes (optional)" value={draft.notes} onChangeText={(v) => set('notes', v)} multiline />
            <Row gap={space.sm}>
              <Button label="Cancel" variant="secondary" onPress={() => { setAdding(false); setErrors({}); }} style={{ flex: 1 }} />
              <Button label="Save distance" onPress={save} style={{ flex: 1 }} testID="save-distance" />
            </Row>
          </Stack>
        ) : (
          <Button label="Add a distance record" variant="secondary" onPress={() => setAdding(true)} testID="add-distance" />
        )}
      </Stack>
    </Card>
  );
}
