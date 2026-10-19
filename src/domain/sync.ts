/**
 * Sync status model (spec §8). Local persistence works without any cloud
 * account. A data item is never described as backed up unless a provider has
 * confirmed it remotely.
 */
export type SyncStatus = 'local_only' | 'icloud_not_configured' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';

export interface SyncState {
  status: SyncStatus;
  /** When the provider last confirmed a remote copy; null if never. */
  lastConfirmedAt: string | null;
  message: string;
}

export interface SyncProvider {
  readonly name: string;
  getState(): Promise<SyncState>;
}

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  local_only: 'Local only',
  icloud_not_configured: 'iCloud not configured',
  syncing: 'Syncing…',
  synced: 'Synced',
  sync_failed: 'Sync failed',
  conflict: 'Needs attention: conflicting changes',
};

/** The only provider in this release: nothing leaves the device. */
export function localOnlySyncProvider(platform: 'ios' | 'android' | 'web' | string): SyncProvider {
  return {
    name: 'local',
    async getState() {
      if (platform === 'ios') {
        return {
          status: 'icloud_not_configured',
          lastConfirmedAt: null,
          message: 'Your data is stored only on this iPhone. iCloud backup needs extra setup and arrives in a later version (M4). Nothing is backed up yet.',
        };
      }
      return {
        status: 'local_only',
        lastConfirmedAt: null,
        message: 'Your data is stored only in this browser on this device. Nothing is backed up or synced.',
      };
    },
  };
}

export function isBackedUp(state: SyncState): boolean {
  return state.status === 'synced' && state.lastConfirmedAt !== null;
}
