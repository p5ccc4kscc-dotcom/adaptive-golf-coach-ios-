import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BagKind, COMPETITION_BAG_LIMIT, bagCountLabel, bagLimitMessage } from '@/domain/bag';
import { ClubInstance, clubDisplayName } from '@/domain/clubs';
import { useQuery, useServices } from '@/services/AppServices';
import {
  AppText,
  Badge,
  Button,
  Card,
  ChoiceChips,
  Dialog,
  Disclosure,
  DialogAction,
  ProgressBar,
  Row,
  SectionHeader,
  Stack,
  TextField,
} from '@/ui/components';
import { space } from '@/ui/theme';

import { ClubCard } from './ClubCard';

type SwapState = { outId: string | null } | null;

export function BuildMyBag() {
  const { repos, ownerId, invalidate } = useServices();
  const router = useRouter();
  const data = useQuery(async (s) => {
    const active = await s.repos.bags.ensureDefault(s.ownerId);
    const [presets, owned, memberIds] = await Promise.all([s.repos.bags.list(s.ownerId), s.repos.clubs.list(s.ownerId), s.repos.bags.memberIds(active.id)]);
    const counts = new Map(await Promise.all(presets.map(async (p) => [p.id, (await s.repos.bags.memberIds(p.id)).length] as const)));
    return { active, presets, owned, memberIds: new Set(memberIds), counts };
  }).data;
  const [dialog, setDialog] = useState<{ title: string; message: string; actions: DialogAction[] } | null>(null);
  const [swap, setSwap] = useState<SwapState>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<BagKind>('competition');
  const [copyCurrent, setCopyCurrent] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Club waiting to go in when the golfer chose "swap" from the bag-full dialog.
  const [swapIn, setSwapIn] = useState<string | null>(null);

  if (!data) return null;
  const { active, presets, owned, memberIds, counts } = data;
  const inBag = owned.filter((c) => memberIds.has(c.id));
  const outOfBag = owned.filter((c) => !memberIds.has(c.id));
  const count = inBag.length;
  const isCompetition = active.kind === 'competition';
  const full = isCompetition && count >= COMPETITION_BAG_LIMIT;

  const showLimit = (club: ClubInstance) =>
    setDialog({
      title: `${active.name} is full (${COMPETITION_BAG_LIMIT} / ${COMPETITION_BAG_LIMIT})`,
      message: `${clubDisplayName(club)} was not added. ${bagLimitMessage()}`,
      actions: [
        { label: `Swap a club for ${clubDisplayName(club)}`, variant: 'primary', testID: 'dialog-swap', onPress: () => { setDialog(null); setSwap({ outId: null }); setSwapIn(club.id); } },
        { label: 'Cancel', onPress: () => setDialog(null), testID: 'dialog-cancel' },
      ],
    });

  const toggle = async (club: ClubInstance) => {
    setMessage(null);
    if (memberIds.has(club.id)) {
      await repos.bags.removeClub(active.id, club.id);
    } else {
      const res = await repos.bags.addClub(active.id, club.id);
      if (!res.ok && res.reason === 'limit_reached') {
        showLimit(club);
        return;
      }
    }
    invalidate();
  };

  const doSwap = async (outId: string, inId: string) => {
    const r = await repos.bags.swap(active.id, outId, inId);
    setSwap(null);
    setSwapIn(null);
    setMessage(r.ok ? 'Swapped.' : 'That swap was not possible.');
    invalidate();
  };

  return (
    <Stack gap={space.md}>
      <Card>
        <Stack gap={space.sm}>
          <ChoiceChips
            label="Bag setup in use"
            options={presets.map((p) => ({
              value: p.id,
              label: `${p.name} · ${p.kind === 'practice' ? `${counts.get(p.id) ?? 0} (practice)` : `${counts.get(p.id) ?? 0}/${COMPETITION_BAG_LIMIT}`}`,
            }))}
            value={active.id}
            onChange={async (id) => {
              if (!id || id === active.id) return;
              await repos.bags.setActive(ownerId, id);
              setSwap(null);
              invalidate();
            }}
            testIDPrefix="preset"
          />
          <AppText variant="heading" testID="bag-count">
            {bagCountLabel(active.kind, count)}
          </AppText>
          {isCompetition ? <ProgressBar value={count} max={COMPETITION_BAG_LIMIT} label={`${count} of ${COMPETITION_BAG_LIMIT} clubs in bag`} /> : <Badge label="Practice selection" tone="info" />}
          <Disclosure label="How bags work" openLabel="Hide" testID="bag-help">
            <AppText variant="caption" muted>
              My Clubs holds everything you own. A bag setup is the set you take out. Ticking a club saves straight away; “Save Setup…” keeps a named copy
              (e.g. Everyday, Par-3). Switching setups never changes your clubs.
            </AppText>
            {isCompetition ? (
              <AppText variant="caption" muted>
                An on-course bag holds up to {COMPETITION_BAG_LIMIT} clubs, under the current Rules of Golf (check randa.org). Any number from 0 to {COMPETITION_BAG_LIMIT} is fine.
              </AppText>
            ) : null}
          </Disclosure>
        </Stack>
      </Card>

      <Row wrap gap={space.sm}>
        <Button compact variant="secondary" label="Swap" disabled={count === 0 || outOfBag.length === 0} onPress={() => setSwap({ outId: null })} testID="swap" />
        <Button
          compact
          variant="secondary"
          label="Clear bag"
          disabled={count === 0}
          testID="clear-bag"
          onPress={() =>
            setDialog({
              title: `Clear ${active.name}?`,
              message: 'All clubs will be taken out of this bag. They stay in My Clubs.',
              actions: [
                { label: 'Clear bag', variant: 'danger', testID: 'dialog-clear', onPress: async () => { await repos.bags.clear(active.id); setDialog(null); invalidate(); } },
                { label: 'Cancel', onPress: () => setDialog(null) },
              ],
            })
          }
        />
        <Button
          compact
          variant="secondary"
          label="Save Setup…"
          accessibilityHint="Bag changes are saved automatically. This saves the current setup as a new named bag."
          onPress={() => { setCreating(true); setNewName(''); }}
          testID="new-preset"
        />
        <Button compact variant="ghost" label="Rename" onPress={() => { setRenaming(active.name); }} />
        <Button
          compact
          variant="ghost"
          label={isCompetition ? 'Make practice selection' : 'Make competition bag'}
          onPress={async () => {
            const err = await repos.bags.setKind(active.id, isCompetition ? 'practice' : 'competition');
            setMessage(err);
            invalidate();
          }}
          testID="toggle-kind"
        />
        {presets.length > 1 ? (
          <Button
            compact
            variant="ghost"
            label="Remove this bag"
            onPress={() =>
              setDialog({
                title: `Remove ${active.name}?`,
                message: 'The bag setup is archived. Your clubs are not affected.',
                actions: [
                  { label: 'Remove bag', variant: 'danger', onPress: async () => { setMessage(await repos.bags.archive(ownerId, active.id)); setDialog(null); invalidate(); } },
                  { label: 'Cancel', onPress: () => setDialog(null) },
                ],
              })
            }
          />
        ) : null}
      </Row>
      {message ? <AppText variant="caption" testID="bag-message">{message}</AppText> : null}

      {renaming !== null ? (
        <Card>
          <Stack gap={space.sm}>
            <TextField label="Bag name" value={renaming} onChangeText={setRenaming} maxLength={40} />
            <Row gap={space.sm}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setRenaming(null)} />
              <Button label="Save name" style={{ flex: 1 }} onPress={async () => { const err = await repos.bags.rename(active.id, renaming); setMessage(err); if (!err) setRenaming(null); invalidate(); }} />
            </Row>
          </Stack>
        </Card>
      ) : null}

      {creating ? (
        <Card testID="new-preset-form">
          <Stack gap={space.md}>
            <TextField label="New bag name" value={newName} onChangeText={setNewName} placeholder="e.g. Everyday, Par-3, Practice" maxLength={40} testID="new-preset-name" />
            <ChoiceChips
              label="Type"
              options={[
                { value: 'competition' as const, label: 'On-course bag (max 14)' },
                { value: 'practice' as const, label: 'Practice selection' },
              ]}
              value={newKind}
              onChange={(v) => v && setNewKind(v)}
              testIDPrefix="new-kind"
            />
            <ChoiceChips
              label="Start with"
              options={[
                { value: 'copy' as const, label: `A copy of ${active.name}` },
                { value: 'empty' as const, label: 'An empty bag' },
              ]}
              value={copyCurrent ? 'copy' : 'empty'}
              onChange={(v) => setCopyCurrent(v !== 'empty')}
              testIDPrefix="new-start"
            />
            <Row gap={space.sm}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setCreating(false)} />
              <Button
                label="Create & switch"
                style={{ flex: 1 }}
                testID="create-preset"
                onPress={async () => {
                  const res = await repos.bags.create(ownerId, newName, newKind, copyCurrent ? active.id : null);
                  if (!res.ok) {
                    setMessage(res.error);
                    return;
                  }
                  await repos.bags.setActive(ownerId, res.preset.id);
                  setCreating(false);
                  setMessage(`Created ${res.preset.name}.`);
                  invalidate();
                }}
              />
            </Row>
          </Stack>
        </Card>
      ) : null}

      {swap ? (
        <Card tone="info" testID="swap-panel">
          <Stack gap={space.sm}>
            <AppText variant="subheading">Swap clubs</AppText>
            {!swap.outId ? (
              <>
                <AppText>1. Choose a club to take out:</AppText>
                {inBag.map((c) => (
                  <Button key={c.id} compact variant="secondary" label={`Take out ${clubDisplayName(c)}${c.brand ? ` (${c.brand})` : ''}`} onPress={() => (swapIn ? doSwap(c.id, swapIn) : setSwap({ outId: c.id }))} testID={`swap-out-${c.id}`} />
                ))}
              </>
            ) : (
              <>
                <AppText>2. Choose a club to put in:</AppText>
                {outOfBag.map((c) => (
                  <Button key={c.id} compact variant="secondary" label={`Put in ${clubDisplayName(c)}${c.brand ? ` (${c.brand})` : ''}`} onPress={() => doSwap(swap.outId!, c.id)} testID={`swap-in-${c.id}`} />
                ))}
              </>
            )}
            <Button compact variant="ghost" label="Cancel swap" onPress={() => { setSwap(null); setSwapIn(null); }} />
          </Stack>
        </Card>
      ) : null}

      {owned.length === 0 ? (
        <Card>
          <Stack gap={space.sm}>
            <AppText variant="subheading">No clubs yet</AppText>
            <AppText muted>Add your first club to start building a bag. Nothing is added for you.</AppText>
            <Button label="Add your first club" onPress={() => router.push('/clubs/catalogue')} testID="add-first-club" />
          </Stack>
        </Card>
      ) : null}

      {inBag.length > 0 ? <SectionHeader title={`In ${active.name} (${inBag.length})`} /> : null}
      {inBag.map((c) => (
        <ClubCard key={c.id} club={c} inBag onToggleBag={() => toggle(c)} onPress={() => router.push(`/clubs/${c.id}`)} />
      ))}
      {outOfBag.length > 0 ? <SectionHeader title={`Not in this bag (${outOfBag.length})`} /> : null}
      {full && outOfBag.length > 0 ? (
        <AppText variant="caption" muted>
          The bag is full. Tick a club below to see swap options, or use Swap.
        </AppText>
      ) : null}
      {outOfBag.map((c) => (
        <ClubCard key={c.id} club={c} inBag={false} onToggleBag={() => toggle(c)} onPress={() => router.push(`/clubs/${c.id}`)} />
      ))}
      {owned.length > 0 ? <Button label="Add another club" variant="secondary" onPress={() => router.push('/clubs/catalogue')} /> : null}

      <Dialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} actions={dialog?.actions ?? []} onDismiss={() => setDialog(null)} />
    </Stack>
  );
}
