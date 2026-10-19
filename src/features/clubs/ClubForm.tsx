import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { UnitPreferences } from '@/data/repositories/profileRepository';
import { bagLimitMessage } from '@/domain/bag';
import { CLUB_CATEGORIES, PUTTER_SUBTYPES, getClubType } from '@/domain/clubCatalog';
import {
  CONDITION_OPTIONS,
  ClubDraft,
  ClubInstance,
  SHAFT_FLEX_OPTIONS,
  SHAFT_MATERIAL_OPTIONS,
  WEDGE_LOFT_SUGGESTIONS,
  clubBadge,
  clubDisplayName,
  draftFromClub,
  emptyClubDraft,
  validateClubDraft,
} from '@/domain/clubs';
import { useServices } from '@/services/AppServices';
import { ClubArt } from '@/ui/ClubArt';
import { AppText, Badge, Button, Card, ChoiceChips, Dialog, DialogAction, NotAvailable, Row, Stack, TextField, ToggleRow } from '@/ui/components';
import { goBackOr } from '@/ui/navigation';
import { space } from '@/ui/theme';

import { DistanceSection } from './DistanceSection';

const asOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

export function ClubForm({ typeCode, club, inBag, units }: { typeCode: string; club: ClubInstance | null; inBag: boolean; units: UnitPreferences }) {
  const { repos, ownerId, invalidate } = useServices();
  const router = useRouter();
  const type = getClubType(typeCode);
  const [draft, setDraft] = useState<ClubDraft>(() => (club ? draftFromClub(club) : emptyClubDraft(typeCode, units.clubLengthUnit)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string; actions: DialogAction[] } | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!type) return <NotAvailable title="Unknown club type" detail={`The club type “${typeCode}” is not in this version of the catalogue.`} />;

  const set = <K extends keyof ClubDraft>(key: K, value: ClubDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const label = clubDisplayName({ typeCode, customName: draft.customName.trim() || null, loftDeg: Number(draft.loft) || null });
  const archived = club?.status === 'archived';

  const validate = () => {
    const r = validateClubDraft(draft, new Date().getFullYear());
    setErrors(r.ok ? {} : r.errors);
    if (!r.ok) setStatus('Please fix the highlighted fields.');
    return r;
  };

  const addToActiveBag = async (clubId: string, name: string): Promise<boolean> => {
    const bag = await repos.bags.ensureDefault(ownerId);
    const res = await repos.bags.addClub(bag.id, clubId);
    if (res.ok || res.reason === 'already_in_bag') return true;
    if (res.reason === 'limit_reached') {
      setDialog({
        title: `${bag.name} is full`,
        message: `${name} is saved in My Clubs but was not added. ${bagLimitMessage()}`,
        actions: [
          { label: 'Swap a club in Build My Bag', variant: 'primary', onPress: () => { setDialog(null); router.replace('/bag'); }, testID: 'dialog-open-bag' },
          { label: 'Keep it out of the bag', onPress: () => { setDialog(null); goBackOr(router, '/clubs'); }, testID: 'dialog-keep-out' },
        ],
      });
      return false;
    }
    setStatus('Archived clubs cannot be added to a bag. Restore it first.');
    return false;
  };

  const saveNew = async (andAddToBag: boolean) => {
    const r = validate();
    if (!r.ok) return;
    const created = await repos.clubs.create(ownerId, r.value);
    invalidate();
    if (andAddToBag && !(await addToActiveBag(created.id, clubDisplayName(created)))) {
      invalidate();
      return;
    }
    invalidate();
    goBackOr(router, '/clubs');
  };

  const saveEdit = async () => {
    if (!club) return;
    const r = validate();
    if (!r.ok) return;
    await repos.clubs.update(club.id, r.value);
    invalidate();
    setStatus('Saved.');
  };

  const confirmDelete = () => {
    if (!club) return;
    setDialog({
      title: `Delete ${clubDisplayName(club)}?`,
      message:
        'If this club has any history (distances, past bag use or photos) it will be archived instead, so your records stay linked. A club with no history is deleted permanently.',
      actions: [
        {
          label: 'Delete club',
          variant: 'danger',
          testID: 'dialog-confirm-delete',
          onPress: async () => {
            const outcome = await repos.clubs.deleteOrArchive(club.id);
            // Refresh other screens only once the golfer dismisses the result,
            // otherwise this screen re-renders without the club and loses the message.
            setDialog({
              title: outcome === 'archived' ? 'Club archived' : 'Club deleted',
              message:
                outcome === 'archived'
                  ? 'It has been removed from every bag and moved to Archived clubs in My Clubs. Its history is kept.'
                  : 'The club has been removed.',
              actions: [{ label: 'OK', variant: 'primary', onPress: () => { setDialog(null); invalidate(); goBackOr(router, '/clubs'); }, testID: 'dialog-ok' }],
            });
          },
        },
        { label: 'Cancel', onPress: () => setDialog(null) },
      ],
    });
  };

  return (
    <Stack gap={space.lg}>
      <Row gap={space.md}>
        <ClubArt artwork={type.artwork} badge={clubBadge({ typeCode, customName: draft.customName || null, loftDeg: Number(draft.loft) || null })} size={96} putterSubtype={draft.putterSubtype || null} />
        <View style={{ flex: 1, gap: space.xs }}>
          <AppText variant="heading">{label}</AppText>
          <AppText variant="caption" muted>
            {CLUB_CATEGORIES.find((c) => c.category === type.category)?.label}
          </AppText>
          {club ? <Badge label={archived ? 'Archived' : inBag ? 'In My Bag' : 'In My Clubs · not in bag'} tone={archived ? 'warning' : inBag ? 'primary' : 'default'} /> : null}
        </View>
      </Row>
      {type.note ? (
        <AppText variant="caption" muted>
          {type.note}
        </AppText>
      ) : null}

      {type.isCustomTemplate ? (
        <TextField
          label={type.code === 'custom' ? 'Club name' : 'Name or number stamped on the club'}
          value={draft.customName}
          onChangeText={(v) => set('customName', v)}
          error={errors.customName}
          maxLength={40}
          testID="custom-name"
        />
      ) : null}
      {type.code === 'custom' ? (
        <>
          <ChoiceChips
            label="Behaves most like (optional)"
            options={CLUB_CATEGORIES.filter((c) => c.category !== 'custom').map((c) => ({ value: c.category, label: c.label }))}
            value={draft.customCategory || null}
            onChange={(v) => set('customCategory', v ?? '')}
          />
          <TextField label="Description (optional)" value={draft.customDescription} onChangeText={(v) => set('customDescription', v)} multiline maxLength={500} />
        </>
      ) : null}

      <TextField
        label="Brand"
        value={draft.brand}
        onChangeText={(v) => set('brand', v)}
        placeholder="Enter brand"
        helper="Leave blank if you don’t know."
        accessibilityLabel={`Brand for selected ${label}`}
        maxLength={80}
        testID="brand"
      />
      <TextField
        label="Model / series"
        value={draft.model}
        onChangeText={(v) => set('model', v)}
        placeholder="Enter model (optional)"
        accessibilityLabel={`Model for selected ${label}`}
        maxLength={80}
        testID="model"
      />

      <Card>
        <Stack gap={space.md}>
          <TextField
            label={type.requiresLoft ? 'Loft (degrees, required)' : 'Loft (degrees, optional)'}
            helper="Only enter a loft you know (e.g. stamped on the club). The app never guesses it."
            value={draft.loft}
            onChangeText={(v) => setDraft((d) => ({ ...d, loft: v, loftNotKnown: false }))}
            keyboardType="decimal-pad"
            error={errors.loft}
            accessibilityLabel={`Loft in degrees for selected ${label}`}
            testID="loft"
          />
          {type.requiresLoft ? (
            <Row wrap gap={space.sm}>
              {WEDGE_LOFT_SUGGESTIONS.map((l) => (
                <Button key={l} compact variant={draft.loft === String(l) ? 'primary' : 'secondary'} label={`${l}°`} accessibilityLabel={`Set loft to ${l} degrees`} onPress={() => setDraft((d) => ({ ...d, loft: String(l), loftNotKnown: false }))} />
              ))}
            </Row>
          ) : (
            <ToggleRow label="Loft not known" value={draft.loftNotKnown} onChange={(v) => setDraft((d) => ({ ...d, loftNotKnown: v, loft: v ? '' : d.loft }))} testID="loft-unknown" />
          )}
        </Stack>
      </Card>

      {type.category === 'putter' ? (
        <ChoiceChips label="Putter style (optional)" options={PUTTER_SUBTYPES.map((p) => ({ value: p, label: p[0]!.toUpperCase() + p.slice(1) }))} value={draft.putterSubtype || null} onChange={(v) => set('putterSubtype', v ?? '')} />
      ) : null}

      <Button label={advanced ? 'Hide advanced details' : 'Show advanced details (length, lie, shaft…)'} variant="ghost" onPress={() => setAdvanced((a) => !a)} testID="toggle-advanced" />
      {advanced ? (
        <Card>
          <Stack gap={space.md}>
            <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
              <TextField label={`Length (${draft.lengthUnit})`} value={draft.length} onChangeText={(v) => set('length', v)} keyboardType="decimal-pad" error={errors.length} style={{ flex: 1 }} />
              <View style={{ flex: 1 }}>
                <ChoiceChips label="Unit" options={[{ value: 'in' as const, label: 'in' }, { value: 'cm' as const, label: 'cm' }]} value={draft.lengthUnit} onChange={(v) => v && set('lengthUnit', v)} />
              </View>
            </Row>
            <TextField label="Lie (degrees)" value={draft.lie} onChangeText={(v) => set('lie', v)} keyboardType="decimal-pad" error={errors.lie} />
            <TextField label="Shaft brand" value={draft.shaftBrand} onChangeText={(v) => set('shaftBrand', v)} maxLength={80} />
            <TextField label="Shaft model" value={draft.shaftModel} onChangeText={(v) => set('shaftModel', v)} maxLength={80} />
            <ChoiceChips label="Shaft flex" options={asOptions(SHAFT_FLEX_OPTIONS)} value={draft.shaftFlex || null} onChange={(v) => set('shaftFlex', v ?? '')} />
            <ChoiceChips label="Shaft material" options={asOptions(SHAFT_MATERIAL_OPTIONS)} value={draft.shaftMaterial || null} onChange={(v) => set('shaftMaterial', v ?? '')} />
            <TextField label="Grip" value={draft.grip} onChangeText={(v) => set('grip', v)} maxLength={80} />
            <ChoiceChips label="Condition" options={asOptions(CONDITION_OPTIONS)} value={draft.condition || null} onChange={(v) => set('condition', v ?? '')} />
            <TextField label="Purchase year" value={draft.purchaseYear} onChangeText={(v) => set('purchaseYear', v)} keyboardType="number-pad" error={errors.purchaseYear} />
            <ChoiceChips
              label="Handedness for this club (only if different from you)"
              options={[
                { value: 'right' as const, label: 'Right-handed club' },
                { value: 'left' as const, label: 'Left-handed club' },
              ]}
              value={draft.handednessOverride || null}
              onChange={(v) => set('handednessOverride', v ?? '')}
            />
            <TextField label="Notes" value={draft.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={1000} />
            <NotAvailable title="Club photo" detail="Adding your own photo of this club arrives with media import in M1." milestone="M1" />
          </Stack>
        </Card>
      ) : null}

      {status ? <AppText variant="caption" testID="form-status">{status}</AppText> : null}

      {!club ? (
        <Stack gap={space.sm}>
          <Button label="Save & add to My Bag" onPress={() => saveNew(true)} testID="save-add-bag" />
          <Button label="Save to My Clubs only" variant="secondary" onPress={() => saveNew(false)} accessibilityHint="Saves the club without putting it in your current bag." testID="save-clubs-only" />
        </Stack>
      ) : (
        <Stack gap={space.sm}>
          {archived ? (
            <Button label="Restore to My Clubs" onPress={async () => { await repos.clubs.restore(club.id); invalidate(); setStatus('Restored.'); }} testID="restore" />
          ) : (
            <>
              <Button label="Save changes" onPress={saveEdit} testID="save-changes" />
              {inBag ? (
                <Button
                  label="Remove from My Bag"
                  variant="secondary"
                  testID="remove-from-bag"
                  onPress={async () => {
                    const bag = await repos.bags.ensureDefault(ownerId);
                    await repos.bags.removeClub(bag.id, club.id);
                    invalidate();
                  }}
                />
              ) : (
                <Button label="Add to My Bag" variant="secondary" testID="add-to-bag" onPress={async () => { if (await addToActiveBag(club.id, clubDisplayName(club))) invalidate(); }} />
              )}
              <Button
                label="Duplicate"
                variant="secondary"
                accessibilityHint="Creates a separate copy you can edit, for example a second club of the same type."
                onPress={async () => {
                  const copy = await repos.clubs.duplicate(club.id);
                  invalidate();
                  router.replace(`/clubs/${copy.id}`);
                }}
              />
            </>
          )}
          <Button label="Delete club" variant="danger" onPress={confirmDelete} testID="delete-club" />
        </Stack>
      )}

      {club ? <DistanceSection club={club} units={units} /> : <AppText variant="caption" muted>Save the club first to add carry or total distances.</AppText>}

      <Dialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} actions={dialog?.actions ?? []} onDismiss={() => setDialog(null)} />
    </Stack>
  );
}
