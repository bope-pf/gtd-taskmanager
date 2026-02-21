import type { Priority } from '../types/task';

export interface PriorityConfig {
  id: Priority;
  name: string;
  colorClass: string;
  bgClass: string;
}

export const PRIORITIES: PriorityConfig[] = [
  { id: 'urgent', name: '緊急', colorClass: 'text-priority-urgent', bgClass: 'bg-priority-urgent' },
  { id: 'high', name: '高', colorClass: 'text-priority-high', bgClass: 'bg-priority-high' },
  { id: 'medium', name: '中', colorClass: 'text-priority-medium', bgClass: 'bg-priority-medium' },
  { id: 'low', name: '低', colorClass: 'text-priority-low', bgClass: 'bg-priority-low' },
];

export function getPriorityConfig(id: Priority): PriorityConfig {
  return PRIORITIES.find(p => p.id === id)!;
}
