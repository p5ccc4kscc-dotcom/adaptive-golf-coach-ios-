import { useState } from 'react';
import { View } from 'react-native';

import { validateCoachNote } from '@/domain/baseline';
import { formatLocalDate } from '@/domain/dates';
import { useQuery, useServices } from '@/services/AppServices';
import { AppText, Badge, Button, Card, Divider, Row, Stack, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

/** Dated coach notes (GolfCoachNote). Typed in by the golfer, so recorded as self-reported. */
export function CoachNotesSection({ defaultCoachName }: { defaultCoachName: string | null }) {
  const { repos, ownerId, invalidate, todayLocal } = useServices();
  const notes = useQuery((s) => s.repos.coachNotes.list(s.ownerId)).data ?? [];
  const [text, setText] = useState('');
  const [notedOn, setNotedOn] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const add = async () => {
    const e = validateCoachNote({ notedOn, text }, todayLocal());
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    await repos.coachNotes.add(ownerId, { coachName: defaultCoachName, notedOn, text, clubInstanceId: null });
    setText('');
    setNotedOn('');
    invalidate();
  };

  return (
    <Card testID="coach-notes">
      <Stack gap={space.md}>
        <AppText variant="subheading">Notes from your coach (optional, private)</AppText>
        <AppText variant="caption" muted>
          Each note is dated. Notes you type in are recorded as your own record of the advice, not as confirmed by the coach.
        </AppText>
        {notes.length === 0 ? <AppText muted>No coach notes.</AppText> : null}
        {notes.map((n) => (
          <View key={n.id} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText variant="label">
                {formatLocalDate(n.notedOn)}
                {n.coachName ? ` · ${n.coachName}` : ''}
              </AppText>
              <Button compact variant="ghost" label="Remove" accessibilityLabel={`Remove coach note from ${n.notedOn}`} onPress={async () => { await repos.coachNotes.archive(n.id); invalidate(); }} />
            </Row>
            <AppText>{n.text}</AppText>
            <Badge label="Self-reported" />
            <Divider />
          </View>
        ))}
        <TextField label="New coach note" value={text} onChangeText={setText} multiline maxLength={2000} error={errors.text} testID="coach-note-text" />
        <Row gap={space.sm} style={{ alignItems: 'flex-end' }}>
          <TextField label="Date of advice (YYYY-MM-DD)" value={notedOn} onChangeText={setNotedOn} error={errors.notedOn} style={{ flex: 1 }} testID="coach-note-date" />
          <Button compact variant="secondary" label="Today" accessibilityLabel="Set coach note date to today" onPress={() => setNotedOn(todayLocal())} testID="coach-note-today" />
        </Row>
        <Button label="Add coach note" variant="secondary" onPress={add} testID="add-coach-note" />
      </Stack>
    </Card>
  );
}
