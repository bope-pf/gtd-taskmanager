import { apiClient } from './client';
import type { SyncOperation } from '../types/sync';

interface SyncResponse {
  server_changes: Array<{
    entity_type: string;
    action: string;
    data: Record<string, unknown>;
  }>;
  sync_at: string;
}

export async function syncWithServer(
  lastSyncAt: string,
  pendingChanges: SyncOperation[],
) {
  const changes = pendingChanges.map(op => ({
    entity_type: op.entityType,
    action: op.action,
    data: op.data,
  }));

  return apiClient.post<SyncResponse>('/sync', {
    last_sync_at: lastSyncAt,
    changes,
  });
}

export async function registerPin(pin: string) {
  return apiClient.post<{ user_id: number }>('/auth/register', { pin });
}

export async function verifyPin(pin: string) {
  return apiClient.post<{ user_id: number; valid: boolean }>('/auth/verify', { pin });
}
