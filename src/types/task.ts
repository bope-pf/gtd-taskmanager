export type GtdList =
  | 'inbox'
  | 'next_actions'
  | 'waiting_for'
  | 'calendar'
  | 'someday_maybe'
  | 'reference'
  | 'trash'
  | 'completed';

export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface CalendarSlot {
  id: string;
  start: Date;
  end: Date;
}

export interface Task {
  id: string;
  title: string;
  memo: string;
  gtdList: GtdList;
  priority: Priority;
  deadline: Date | null;
  calendarSlotStart: Date | null;
  calendarSlotEnd: Date | null;
  calendarSlots: CalendarSlot[];
  tags: string[];
  projectId: string | null;
  sortOrder: number;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'completedAt' | 'isCompleted' | 'sortOrder'>;
