import Dexie, { type Table } from 'dexie';
import type { Task } from '../types/task';
import type { Project } from '../types/project';
import type { WeeklyReview } from '../types/review';
import type { SyncOperation, CustomTag } from '../types/sync';

export interface SentNotification {
  id?: number;
  taskId: string;
  daysBefore: number;
  sentAt: Date;
}

export class GtdDatabase extends Dexie {
  tasks!: Table<Task, string>;
  projects!: Table<Project, string>;
  reviews!: Table<WeeklyReview, number>;
  syncQueue!: Table<SyncOperation, number>;
  customTags!: Table<CustomTag, number>;
  sentNotifications!: Table<SentNotification, number>;

  constructor() {
    super('GtdTaskManager');
    this.version(1).stores({
      tasks: 'id, gtdList, projectId, deadline, priority, updatedAt, [gtdList+sortOrder]',
      projects: 'id, sortOrder, updatedAt',
      reviews: '++id, completedAt',
      syncQueue: '++id, synced, entityType, entityId',
      customTags: '++id, name',
      sentNotifications: '++id, taskId, [taskId+daysBefore]',
    });
    // v2: calendarSlots配列をTaskに追加
    this.version(2).stores({
      tasks: 'id, gtdList, projectId, deadline, priority, updatedAt, [gtdList+sortOrder]',
      projects: 'id, sortOrder, updatedAt',
      reviews: '++id, completedAt',
      syncQueue: '++id, synced, entityType, entityId',
      customTags: '++id, name',
      sentNotifications: '++id, taskId, [taskId+daysBefore]',
    }).upgrade(tx => {
      return tx.table('tasks').toCollection().modify(task => {
        if (!task.calendarSlots) {
          task.calendarSlots = [];
        }
      });
    });
  }
}

export const db = new GtdDatabase();
