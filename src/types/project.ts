import type { Priority } from './task';

export interface Project {
  id: string;
  title: string;
  memo: string;
  tags: string[];
  priority: Priority;
  deadline: Date | null;
  sortOrder: number;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'completedAt' | 'isCompleted' | 'sortOrder'>;
