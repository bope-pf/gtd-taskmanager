import { db } from './database';
import type { SyncOperation, SyncAction, SyncEntityType } from '../types/sync';

export async function enqueue(
  entityType: SyncEntityType,
  entityId: string,
  action: SyncAction,
  data: Record<string, unknown>,
): Promise<void> {
  await db.syncQueue.add({
    entityType,
    entityId,
    action,
    data,
    timestamp: Date.now(),
    synced: false,
  });
}

export async function getPending(): Promise<SyncOperation[]> {
  return db.syncQueue.where('synced').equals(0).toArray();
}

export async function markSynced(ids: number[]): Promise<void> {
  await db.transaction('rw', db.syncQueue, async () => {
    for (const id of ids) {
      await db.syncQueue.update(id, { synced: true });
    }
  });
}

export async function clearSynced(): Promise<void> {
  await db.syncQueue.where('synced').equals(1).delete();
}
