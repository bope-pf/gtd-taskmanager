import { db } from './database';
import type { Project, ProjectInput } from '../types/project';
import { generateId } from '../utils/idGenerator';

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.filter(p => p.deletedAt === null).sortBy('sortOrder');
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const now = new Date();
  const count = await db.projects.count();
  const project: Project = {
    id: generateId(),
    ...input,
    sortOrder: count,
    isCompleted: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.projects.add(project);
  return project;
}

export async function updateProject(id: string, changes: Partial<Project>): Promise<void> {
  await db.projects.update(id, {
    ...changes,
    updatedAt: new Date(),
  });
}

export async function deleteProject(id: string): Promise<void> {
  const now = new Date();
  await db.transaction('rw', [db.projects, db.tasks], async () => {
    await db.projects.update(id, { deletedAt: now, updatedAt: now });
    const subTasks = await db.tasks.where('projectId').equals(id).toArray();
    for (const task of subTasks) {
      await db.tasks.update(task.id, { deletedAt: now, updatedAt: now });
    }
  });
}

export async function checkAndAutoCompleteProject(projectId: string): Promise<boolean> {
  const subTasks = await db.tasks
    .where('projectId')
    .equals(projectId)
    .filter(t => t.deletedAt === null)
    .toArray();

  if (subTasks.length === 0) return false;

  const allCompleted = subTasks.every(t => t.isCompleted);
  if (allCompleted) {
    const now = new Date();
    await db.projects.update(projectId, {
      isCompleted: true,
      completedAt: now,
      updatedAt: now,
    });
    return true;
  }
  return false;
}
