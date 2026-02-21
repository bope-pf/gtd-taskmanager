import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types/task';
import { getPriorityConfig } from '../../constants/priorities';
import { formatDate, isOverdue } from '../../utils/dateUtils';

interface KanbanCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.15 : 1,
    pointerEvents: isDragging ? 'none' as const : 'auto' as const,
  };

  const priorityConfig = getPriorityConfig(task.priority);
  const overdue = task.deadline ? isOverdue(task.deadline) : false;
  const hasCalendarSlots = task.calendarSlots && task.calendarSlots.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200
        ${isDragging ? 'shadow-xl border-blue-300' : ''}
        ${hasCalendarSlots ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}
      `}
      onClick={() => onClick(task)}
    >
      {/* Priority bar at top */}
      <div
        className="w-full h-1.5 rounded-full mb-4"
        style={{ backgroundColor: `var(--color-priority-${task.priority})` }}
      />

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-800 flex-1 leading-relaxed line-clamp-3">{task.title}</h3>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
          style={{
            backgroundColor: `var(--color-priority-${task.priority})20`,
            color: `var(--color-priority-${task.priority})`,
          }}
        >
          {priorityConfig.name}
        </span>
      </div>

      {/* Calendar schedule indicator */}
      {hasCalendarSlots && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {task.calendarSlots.map(slot => {
            const start = new Date(slot.start);
            return (
              <span
                key={slot.id}
                className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {start.getMonth() + 1}/{start.getDate()} {start.getHours()}:{String(start.getMinutes()).padStart(2, '0')}
              </span>
            );
          })}
        </div>
      )}

      {/* Memo preview */}
      {task.memo && (
        <p className="text-sm text-gray-500 mt-3 line-clamp-4 leading-relaxed">
          {task.memo}
        </p>
      )}

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {task.tags.map(tag => (
            <span key={tag} className="text-sm bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {task.deadline && (
        <div className={`flex items-center gap-1.5 text-sm mt-4 ${overdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {overdue ? '期限切れ: ' : '期限: '}{formatDate(task.deadline)}
        </div>
      )}
    </div>
  );
}
