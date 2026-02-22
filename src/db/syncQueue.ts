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
    synced: 0,
  });
}

export async function getPending(): Promise<SyncOperation[]> {
  // Filter handles both legacy boolean false and number 0
  return db.syncQueue.filter(item => !item.synced).toArray();
}

export async function markSynced(ids: number[]): Promise<void> {
  await db.transaction('rw', db.syncQueue, async () => {
    for (const id of ids) {
      await db.syncQueue.update(id, { synced: 1 });
    }
  });
}

export async function clearSynced(): Promise<void> {
  // Filter handles both legacy boolean true and number 1
  await db.syncQueue.filter(item => !!item.synced).delete();
}
