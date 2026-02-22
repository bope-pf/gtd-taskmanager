export type SyncAction = 'create' | 'update' | 'delete';
export type SyncEntityType = 'task' | 'project' | 'review' | 'tag';

export interface SyncOperation {
  id?: number;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  data: Record<string, unknown>;
  timestamp: number;
  synced: number; // 0 = pending, 1 = synced (IndexedDB indexes require numbers)
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface CustomTag {
  id?: number;
  name: string;
  color: string;
  createdAt: Date;
}
