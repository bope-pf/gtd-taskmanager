import { db } from '../db/database';
import * as syncQueue from '../db/syncQueue';
import { syncWithServer } from '../api/syncApi';
import type { SyncStatus } from '../types/sync';
import type { GtdList, Priority } from '../types/task';

type SyncListener = (status: SyncStatus) => void;

class SyncService {
  private listeners: SyncListener[] = [];
  private status: SyncStatus = 'offline';
  private isOnline = navigator.onLine;

  init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.setStatus('offline');
    });

    if (this.isOnline && this.hasPinConfigured()) {
      this.setStatus('synced');
    }
  }

  private hasPinConfigured(): boolean {
    return !!localStorage.getItem('gtd_pin');
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach(l => l(status));
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  async syncNow(): Promise<void> {
    if (!this.isOnline || !this.hasPinConfigured()) return;

    this.setStatus('syncing');

    try {
      const pending = await syncQueue.getPending();
      const lastSyncAt = localStorage.getItem('gtd_last_sync_at') || '1970-01-01T00:00:00Z';

      const result = await syncWithServer(lastSyncAt, pending);

      if (result.success && result.data) {
        // Mark pending items as synced
        const pendingIds = pending.map(p => p.id!).filter(Boolean);
        if (pendingIds.length > 0) {
          await syncQueue.markSynced(pendingIds);
          await syncQueue.clearSynced();
        }

        // Apply server changes to local DB
        for (const change of result.data.server_changes) {
          await this.applyServerChange(change);
        }

        // Update last sync timestamp
        localStorage.setItem('gtd_last_sync_at', result.data.sync_at);
        this.setStatus('synced');
      } else {
        this.setStatus('error');
      }
    } catch {
      this.setStatus('error');
    }
  }

  async flushQueue(): Promise<void> {
    await this.syncNow();
  }

  private async applyServerChange(change: {
    entity_type: string;
    action: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { entity_type, data } = change;

    if (entity_type === 'task') {
      const taskData = {
        id: data.id as string,
        title: data.title as string,
        memo: (data.memo as string) || '',
        gtdList: data.gtd_list as GtdList,
        priority: data.priority as Priority,
        deadline: data.deadline ? new Date(data.deadline as string) : null,
        calendarSlotStart: data.calendar_slot_start ? new Date(data.calendar_slot_start as string) : null,
        calendarSlotEnd: data.calendar_slot_end ? new Date(data.calendar_slot_end as string) : null,
        calendarSlots: Array.isArray(data.calendar_slots) ? (data.calendar_slots as Array<{ id: string; start: string; end: string }>).map(s => ({ id: s.id, start: new Date(s.start), end: new Date(s.end) })) : [],
        tags: (data.tags as string[]) || [],
        projectId: (data.project_id as string) || null,
        sortOrder: (data.sort_order as number) || 0,
        isCompleted: !!data.is_completed,
        completedAt: data.completed_at ? new Date(data.completed_at as string) : null,
        createdAt: new Date(data.created_at as string),
        updatedAt: new Date(data.updated_at as string),
        deletedAt: data.deleted_at ? new Date(data.deleted_at as string) : null,
      };

      await db.tasks.put(taskData);
    } else if (entity_type === 'project') {
      const projectData = {
        id: data.id as string,
        title: data.title as string,
        memo: (data.memo as string) || '',
        tags: (data.tags as string[]) || [],
        priority: data.priority as Priority,
        deadline: data.deadline ? new Date(data.deadline as string) : null,
        sortOrder: (data.sort_order as number) || 0,
        isCompleted: !!data.is_completed,
        completedAt: data.completed_at ? new Date(data.completed_at as string) : null,
        createdAt: new Date(data.created_at as string),
        updatedAt: new Date(data.updated_at as string),
        deletedAt: data.deleted_at ? new Date(data.deleted_at as string) : null,
      };

      await db.projects.put(projectData);
    }
  }
}

export const syncService = new SyncService();
