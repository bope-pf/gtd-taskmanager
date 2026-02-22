import { db } from './database';
import type { Task, GtdList, TaskInput, CalendarSlot } from '../types/task';
import { generateId } from '../utils/idGenerator';
import * as syncQueue from './syncQueue';
import { syncService } from '../services/syncService';

function taskToSyncData(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    memo: task.memo,
    gtd_list: task.gtdList,
    priority: task.priority,
    deadline: task.deadline?.toISOString() ?? null,
    calendar_slot_start: task.calendarSlotStart?.toISOString() ?? null,
    calendar_slot_end: task.calendarSlotEnd?.toISOString() ?? null,
    calendar_slots: (task.calendarSlots || []).map(s => ({ id: s.id, start: s.start.toISOString(), end: s.end.toISOString() })),
    tags: task.tags,
    project_id: task.projectId,
    sort_order: task.sortOrder,
    is_completed: task.isCompleted,
    completed_at: task.completedAt?.toISOString() ?? null,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
    deleted_at: task.deletedAt?.toISOString() ?? null,
  };
}

async function enqueueTask(task: Task, action: 'create' | 'update' | 'delete') {
  await syncQueue.enqueue('task', task.id, action, taskToSyncData(task));
  syncService.syncNow();
}

export async function getAllTasks(listFilter?: GtdList): Promise<Task[]> {
  let collection = db.tasks.filter(t => t.deletedAt === null);
  if (listFilter) {
    collection = db.tasks.where('gtdList').equals(listFilter).filter(t => t.deletedAt === null);
  }
  return collection.sortBy('sortOrder');
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  return db.tasks.get(id);
}

export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
  return db.tasks
    .where('projectId')
    .equals(projectId)
    .filter(t => t.deletedAt === null)
    .sortBy('sortOrder');
}

export async function createTask(input: TaskInput): Promise<Task> {
  const now = new Date();
  const count = await db.tasks.where('gtdList').equals(input.gtdList).count();
  const task: Task = {
    id: generateId(),
    ...input,
    sortOrder: count,
    isCompleted: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.tasks.add(task);
  await enqueueTask(task, 'create');
  return task;
}

export async function updateTask(id: string, changes: Partial<Task>): Promise<void> {
  await db.tasks.update(id, {
    ...changes,
    updatedAt: new Date(),
  });
  const updated = await db.tasks.get(id);
  if (updated) await enqueueTask(updated, 'update');
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.update(id, {
    deletedAt: new Date(),
    updatedAt: new Date(),
  });
  const updated = await db.tasks.get(id);
  if (updated) await enqueueTask(updated, 'delete');
}

export async function completeTask(id: string): Promise<void> {
  const now = new Date();
  await db.tasks.update(id, {
    isCompleted: true,
    completedAt: now,
    gtdList: 'completed' as GtdList,
    updatedAt: now,
  });
  const updated = await db.tasks.get(id);
  if (updated) await enqueueTask(updated, 'update');
}

export async function uncompleteTask(id: string, targetList: GtdList): Promise<void> {
  await db.tasks.update(id, {
    isCompleted: false,
    completedAt: null,
    gtdList: targetList,
    updatedAt: new Date(),
  });
  const updated = await db.tasks.get(id);
  if (updated) await enqueueTask(updated, 'update');
}

export async function moveTask(id: string, targetList: GtdList, sortOrder?: number): Promise<void> {
  const order = sortOrder ?? await db.tasks.where('gtdList').equals(targetList).count();
  await db.tasks.update(id, {
    gtdList: targetList,
    sortOrder: order,
    updatedAt: new Date(),
  });
  const updated = await db.tasks.get(id);
  if (updated) await enqueueTask(updated, 'update');
}

export async function reorderTasks(_listId: GtdList, orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.tasks.update(orderedIds[i], {
        sortOrder: i,
        updatedAt: new Date(),
      });
    }
  });
}

export async function permanentlyDeleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

/** ゴミ箱のタスクを全て完全削除 */
export async function emptyTrash(): Promise<number> {
  const trashTasks = await db.tasks.filter(t => t.deletedAt !== null).toArray();
  const ids = trashTasks.map(t => t.id);
  await db.tasks.bulkDelete(ids);
  return ids.length;
}

/** 完了済みタスクを全て完全削除 */
export async function clearCompleted(): Promise<number> {
  const completedTasks = await db.tasks
    .filter(t => t.isCompleted && t.deletedAt === null)
    .toArray();
  const ids = completedTasks.map(t => t.id);
  await db.tasks.bulkDelete(ids);
  return ids.length;
}

// Calendar slot operations
export async function addCalendarSlot(taskId: string, start: Date, end: Date): Promise<CalendarSlot> {
  const slot: CalendarSlot = {
    id: generateId(),
    start,
    end,
  };
  const task = await db.tasks.get(taskId);
  if (!task) throw new Error('Task not found');
  const slots = task.calendarSlots || [];
  slots.push(slot);
  await db.tasks.update(taskId, {
    calendarSlots: slots,
    updatedAt: new Date(),
  });
  const updated = await db.tasks.get(taskId);
  if (updated) await enqueueTask(updated, 'update');
  return slot;
}

export async function updateCalendarSlot(taskId: string, slotId: string, start: Date, end: Date): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) throw new Error('Task not found');
  const slots = (task.calendarSlots || []).map(s =>
    s.id === slotId ? { ...s, start, end } : s
  );
  await db.tasks.update(taskId, {
    calendarSlots: slots,
    updatedAt: new Date(),
  });
  const updated = await db.tasks.get(taskId);
  if (updated) await enqueueTask(updated, 'update');
}

export async function removeCalendarSlot(taskId: string, slotId: string): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) throw new Error('Task not found');
  const slots = (task.calendarSlots || []).filter(s => s.id !== slotId);
  await db.tasks.update(taskId, {
    calendarSlots: slots,
    updatedAt: new Date(),
  });
  const updated = await db.tasks.get(taskId);
  if (updated) await enqueueTask(updated, 'update');
}

export async function removeAllCalendarSlots(taskId: string): Promise<void> {
  await db.tasks.update(taskId, {
    calendarSlots: [],
    updatedAt: new Date(),
  });
  const updated = await db.tasks.get(taskId);
  if (updated) await enqueueTask(updated, 'update');
}
