import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import * as taskRepo from '../db/taskRepository';
import type { Task, GtdList } from '../types/task';

export function useTasks(listFilter?: GtdList) {
  const tasks = useLiveQuery(
    () => taskRepo.getAllTasks(listFilter),
    [listFilter],
    [] as Task[],
  );

  return {
    tasks,
    createTask: taskRepo.createTask,
    updateTask: taskRepo.updateTask,
    deleteTask: taskRepo.deleteTask,
    completeTask: taskRepo.completeTask,
    uncompleteTask: taskRepo.uncompleteTask,
    moveTask: taskRepo.moveTask,
    reorderTasks: taskRepo.reorderTasks,
    permanentlyDeleteTask: taskRepo.permanentlyDeleteTask,
  };
}

export function useTasksByProject(projectId: string | null) {
  const tasks = useLiveQuery(
    () => projectId ? taskRepo.getTasksByProjectId(projectId) : Promise.resolve([]),
    [projectId],
    [] as Task[],
  );

  return { tasks };
}

export function useAllTasks() {
  const tasks = useLiveQuery(
    () => db.tasks.toArray(),
    [],
    [] as Task[],
  );

  return { tasks };
}
