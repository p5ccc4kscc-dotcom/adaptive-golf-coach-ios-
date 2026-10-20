import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Share } from 'react-native';

import { LATEST_SCHEMA_VERSION } from '@/data/db/migrations';
import { DistanceUnit, HeightUnit, LengthUnit } from '@/domain/units';
import { useQuery, useServices, useUnits } from '@/services/AppServices';
import { localOnlySyncProvider, SYNC_STATUS_LABELS } from '@/domain/sync';
import { AppText, Badge, Button, Card, ChoiceChips, Dialog, DialogAction, Loading, NotAvailable, Row, Screen, SectionHeader, Stack } from '@/ui/components';
import { FeatureStatusList } from '@/ui/FeatureStatusList';
import { space } from '@/ui/theme';

export function SettingsScreen() {
  const { repos, ownerId, invalidate, storageLabel, persistent } = useServices();
  const units = useUnits();
  const router = useRouter();
  const sync = useQuery(() => localOnlySyncProvider(Platform.OS).getState()).data;
  const [dialog, setDialog] = useState<{ title: string; message: string; actions: DialogAction[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!units) return <Loading />;

  const saveUnits = async (patch: Partial<{ distanceUnit: DistanceUnit; clubLengthUnit: LengthUnit; heightUnit: HeightUnit }>) => {
    await repos.preferences.setUnits(ownerId, { distanceUnit: units.distanceUnit, clubLengthUnit: units.clubLengthUnit, heightUnit: units.heightUnit, ...patch });
    invalidate();
  };

  const exportData = async () => {
    const data = await repos.exportAll(ownerId);
    const text = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web') {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `badgolfer-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Export downloaded.');
    } else {
      await Share.share({ message: text, title: 'BadGolfer export' });
    }
  };

  return (
    <Screen testID="settings">
      <SectionHeader title="Units" />
      <Card>
        <Stack gap={space.md}>
          <ChoiceChips label="Distances" options={[{ value: 'yards' as const, label: 'Yards' }, { value: 'metres' as const, label: 'Metres' }]} value={units.distanceUnit} onChange={(v) => v && saveUnits({ distanceUnit: v })} />
          <ChoiceChips label="Height" options={[{ value: 'ft_in' as const, label: 'Feet & inches' }, { value: 'cm' as const, label: 'Centimetres' }]} value={units.heightUnit} onChange={(v) => v && saveUnits({ heightUnit: v })} />
          <ChoiceChips label="Club length" options={[{ value: 'in' as const, label: 'Inches' }, { value: 'cm' as const, label: 'Centimetres' }]} value={units.clubLengthUnit} onChange={(v) => v && saveUnits({ clubLengthUnit: v })} />
          {!units.confirmed ? <AppText variant="caption" muted>Currently suggested from your phone’s region settings.</AppText> : null}
        </Stack>
      </Card>

      <SectionHeader title="Your data" />
      <Card tone={persistent ? 'info' : 'warning'}>
        <AppText variant="caption" testID="storage-label">
          {storageLabel}
        </AppText>
      </Card>
      <Card testID="sync-status">
        <Stack gap={space.xs}>
          <Row gap={space.sm}>
            <AppText variant="label">Backup & sync:</AppText>
            <Badge label={sync ? SYNC_STATUS_LABELS[sync.status] : '…'} tone="warning" />
          </Row>
          <AppText variant="caption">{sync?.message ?? ''}</AppText>
        </Stack>
      </Card>
      <NotAvailable title="Private cloud backup and sync" detail="Not active. Planned for M4; until then, Export keeps a copy." milestone="M4" />
      {Platform.OS === 'web' ? (
        <Card tone="warning" testID="home-screen-note">
          <AppText variant="caption">
            Browser preview: data lives in this browser only. If you add BadGolfer to your Home Screen and iOS opens it as a web app, that copy has its own,
            separate storage and will start empty. Your Safari data is not lost; open the preview in Safari to see it.
          </AppText>
        </Card>
      ) : null}
      <Button label="Export all my data (JSON)" variant="secondary" onPress={exportData} testID="export-data" />
      <NotAvailable title="Import from a backup file" detail="Restoring an export arrives with rounds and practice logging in M3." milestone="M3" />
      {message ? <AppText variant="caption">{message}</AppText> : null}
      <Button
        label="Delete all my data"
        variant="danger"
        testID="delete-all"
        onPress={() =>
          setDialog({
            title: 'Delete all your data?',
            message: 'This permanently removes your profile, goals, clubs, bags, distances, past rounds, range sessions and coach notes from this device. It cannot be undone. Export first if you want a copy.',
            actions: [
              {
                label: 'Delete everything',
                variant: 'danger',
                testID: 'dialog-delete-all',
                onPress: async () => {
                  await repos.deleteAllData(ownerId);
                  setDialog(null);
                  invalidate();
                  router.replace('/');
                },
              },
              { label: 'Cancel', onPress: () => setDialog(null) },
            ],
          })
        }
      />

      <SectionHeader title="What works today" />
      <Card>
        <FeatureStatusList testID="feature-status" />
      </Card>

      <SectionHeader title="About" />
      <Card>
        <Stack gap={space.xs}>
          <AppText variant="caption">BadGolfer · version {Constants.expoConfig?.version ?? 'unknown'} · data schema v{LATEST_SCHEMA_VERSION}</AppText>
          <AppText variant="caption" muted>
            Not affiliated with or endorsed by any golf organisation, coach, equipment maker or Apple. Coaching here supports, and does not replace, a qualified professional.
          </AppText>
        </Stack>
      </Card>
      <Dialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} actions={dialog?.actions ?? []} onDismiss={() => setDialog(null)} />
    </Screen>
  );
}
