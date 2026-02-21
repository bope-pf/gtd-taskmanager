import { useEffect, useRef, useState, useCallback } from 'react';
import type { Task, CalendarSlot } from '../../types/task';
import { CALENDAR_START_HOUR, CALENDAR_END_HOUR, CALENDAR_SLOT_MINUTES, CALENDAR_DAY_START_HOUR } from '../../constants/config';
import { getWeekDates, isSameDay } from '../../utils/dateUtils';

interface WeeklyCalendarProps {
  baseDate: Date;
  tasks: Task[];
  allTasks: Task[];
  onTaskClick: (task: Task) => void;
  onSlotClick: (date: Date, hour: number, minute: number) => void;
  onScheduleTask: (taskId: string, start: Date, end: Date) => void;
  onUpdateSlot: (taskId: string, slotId: string, start: Date, end: Date) => void;
  onRemoveSlot: (taskId: string, slotId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];
const DEFAULT_SCROLL_HOUR = 9;
const SLOT_HEIGHT = 40; // h-10 = 40px
const SLOTS_PER_HOUR = 60 / CALENDAR_SLOT_MINUTES;

interface DragState {
  taskId: string;
  type: 'external' | 'move' | 'resize';
  slotId?: string;
  originalStart?: Date;
  originalEnd?: Date;
}

interface SlotDisplay {
  task: Task;
  slot: CalendarSlot;
  topPx: number;
  heightPx: number;
  dayIndex: number;
}

export function WeeklyCalendar({
  baseDate,
  tasks,
  allTasks,
  onTaskClick,
  onSlotClick,
  onScheduleTask,
  onUpdateSlot,
  onRemoveSlot,
  onCompleteTask,
}: WeeklyCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const weekDates = getWeekDates(baseDate);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ dayIndex: number; hour: number; minute: number } | null>(null);
  const [showNightHours, setShowNightHours] = useState(false);

  const totalSlots = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * SLOTS_PER_HOUR;
  const visibleStartHour = showNightHours ? CALENDAR_START_HOUR : CALENDAR_DAY_START_HOUR;

  useEffect(() => {
    if (containerRef.current) {
      const scrollOffset = (DEFAULT_SCROLL_HOUR - visibleStartHour) * SLOTS_PER_HOUR * SLOT_HEIGHT;
      containerRef.current.scrollTop = scrollOffset;
    }
  }, []);

  // Compute all slot displays for the week
  const slotDisplays: SlotDisplay[] = [];
  const allScheduledTasks = allTasks.filter(t => !t.isCompleted && t.deletedAt === null && t.calendarSlots && t.calendarSlots.length > 0);

  for (const task of allScheduledTasks) {
    for (const slot of task.calendarSlots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const dayIndex = weekDates.findIndex(d => isSameDay(d, start));
      if (dayIndex === -1) continue;

      const startMinutes = (start.getHours() - CALENDAR_START_HOUR) * 60 + start.getMinutes();
      const endMinutes = (end.getHours() - CALENDAR_START_HOUR) * 60 + end.getMinutes();
      const topPx = (startMinutes / CALENDAR_SLOT_MINUTES) * SLOT_HEIGHT;
      const heightPx = Math.max(((endMinutes - startMinutes) / CALENDAR_SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT);

      slotDisplays.push({ task, slot, topPx, heightPx, dayIndex });
    }
  }

  // Also show tasks with deadlines on the calendar
  const deadlineTasks = tasks.filter(t => t.deadline && !t.calendarSlots?.length);
  for (const task of deadlineTasks) {
    if (!task.deadline) continue;
    const d = new Date(task.deadline);
    const dayIndex = weekDates.findIndex(dd => isSameDay(dd, d));
    if (dayIndex === -1) continue;
    const startMinutes = (d.getHours() - CALENDAR_START_HOUR) * 60 + d.getMinutes();
    const topPx = (startMinutes / CALENDAR_SLOT_MINUTES) * SLOT_HEIGHT;
    slotDisplays.push({
      task,
      slot: { id: `deadline-${task.id}`, start: d, end: new Date(d.getTime() + 30 * 60000) },
      topPx,
      heightPx: SLOT_HEIGHT,
      dayIndex,
    });
  }

  function dateFromSlot(dayIndex: number, hour: number, minute: number): Date {
    const d = new Date(weekDates[dayIndex]);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  // Handle drag over for external drops
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from kanban
  const handleDrop = useCallback((e: React.DragEvent, dayIndex: number, hour: number, minute: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const start = dateFromSlot(dayIndex, hour, minute);
    const end = new Date(start.getTime() + 30 * 60000); // 30min default
    onScheduleTask(taskId, start, end);
    setDragState(null);
  }, [weekDates, onScheduleTask]);

  // Internal drag for moving scheduled tasks
  const handleMoveStart = useCallback((taskId: string, slotId: string, slot: CalendarSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({ taskId, type: 'move', slotId, originalStart: new Date(slot.start), originalEnd: new Date(slot.end) });
  }, []);

  // Internal drag for resizing
  const handleResizeStart = useCallback((taskId: string, slotId: string, slot: CalendarSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({ taskId, type: 'resize', slotId, originalStart: new Date(slot.start), originalEnd: new Date(slot.end) });
  }, []);

  // Mouse move handler for internal drag
  useEffect(() => {
    if (!dragState || (dragState.type !== 'move' && dragState.type !== 'resize')) return;

    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = containerRef.current.scrollTop;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top + scrollTop - 48; // subtract header height

      const timeColWidth = 60;
      const dayWidth = (rect.width - timeColWidth) / 7;
      const dayIndex = Math.max(0, Math.min(6, Math.floor((x - timeColWidth) / dayWidth)));

      const slotIndex = Math.max(0, Math.min(totalSlots - 1, Math.floor(y / SLOT_HEIGHT)));
      const hour = CALENDAR_START_HOUR + Math.floor(slotIndex / SLOTS_PER_HOUR);
      const minute = (slotIndex % SLOTS_PER_HOUR) * CALENDAR_SLOT_MINUTES;

      setHoverSlot({ dayIndex, hour, minute });
    }

    function handleMouseUp() {
      if (!dragState || !hoverSlot || !dragState.slotId) {
        setDragState(null);
        setHoverSlot(null);
        return;
      }

      const { dayIndex, hour, minute } = hoverSlot;

      if (dragState.type === 'move') {
        const newStart = dateFromSlot(dayIndex, hour, minute);
        const duration = dragState.originalEnd!.getTime() - dragState.originalStart!.getTime();
        const newEnd = new Date(newStart.getTime() + duration);
        onUpdateSlot(dragState.taskId, dragState.slotId, newStart, newEnd);
      } else if (dragState.type === 'resize') {
        const newEnd = dateFromSlot(dayIndex, hour, minute + CALENDAR_SLOT_MINUTES);
        if (newEnd.getTime() > dragState.originalStart!.getTime()) {
          onUpdateSlot(dragState.taskId, dragState.slotId, dragState.originalStart!, newEnd);
        }
      }
      setDragState(null);
      setHoverSlot(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, hoverSlot, weekDates, onUpdateSlot, totalSlots]);

  const today = new Date();

  // Night hours offset: when night hours are hidden, shift topPx for slot displays
  const nightHoursOffset = showNightHours ? 0 : (CALENDAR_DAY_START_HOUR - CALENDAR_START_HOUR) * SLOTS_PER_HOUR * SLOT_HEIGHT;

  const slots: { hour: number; minute: number }[] = [];
  for (let h = visibleStartHour; h < CALENDAR_END_HOUR; h++) {
    for (let m = 0; m < 60; m += CALENDAR_SLOT_MINUTES) {
      slots.push({ hour: h, minute: m });
    }
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto bg-white rounded-lg shadow-sm border border-gray-200 select-none"
      style={{ maxHeight: 'calc(100vh - 140px)' }}
    >
      {/* Header row with day names */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 bg-white z-20 border-b border-gray-200">
        <div className="p-2 text-xs text-gray-400 text-center border-r border-gray-100" />
        {weekDates.map((date, i) => {
          const isToday = isSameDay(date, today);
          return (
            <div
              key={i}
              className={`p-2 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}
            >
              <div className="text-xs text-gray-500">{DAY_LABELS[i]}</div>
              <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Night hours toggle */}
      {!showNightHours && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
          <div className="border-r border-gray-100" />
          <div className="col-span-7">
            <button
              onClick={() => setShowNightHours(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              0:00 - 6:00 を表示
            </button>
          </div>
        </div>
      )}
      {showNightHours && visibleStartHour === CALENDAR_START_HOUR && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="border-r border-gray-100" />
          <div className="col-span-7">
            <button
              onClick={() => setShowNightHours(false)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              0:00 - 6:00 を非表示
            </button>
          </div>
        </div>
      )}

      {/* Time grid body */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
        {/* Time labels + grid cells */}
        {slots.map(({ hour, minute }) => (
          <div key={`${hour}-${minute}`} className="contents">
            <div className="p-1 text-xs text-gray-400 text-right pr-2 border-r border-gray-100 h-10 flex items-start justify-end -mt-[1px]">
              {minute === 0 ? `${hour}:00` : ''}
            </div>
            {weekDates.map((_date, dayIndex) => (
              <div
                key={dayIndex}
                className={`h-10 border-b border-r border-gray-50 last:border-r-0 cursor-pointer relative
                  ${hoverSlot && hoverSlot.dayIndex === dayIndex && hoverSlot.hour === hour && hoverSlot.minute === minute ? 'bg-blue-100/50' : 'hover:bg-blue-50/30'}
                  ${minute === 0 ? 'border-t border-t-gray-200' : ''}
                `}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dayIndex, hour, minute)}
                onClick={() => onSlotClick(weekDates[dayIndex], hour, minute)}
              />
            ))}
          </div>
        ))}

        {/* Scheduled task overlays */}
        {slotDisplays.map(({ task, slot, topPx, heightPx, dayIndex }) => {
          const isDeadlineOnly = slot.id.startsWith('deadline-');
          const isBeingDragged = dragState?.slotId === slot.id;
          const adjustedTop = topPx - nightHoursOffset;
          // Hide slots that are entirely in the hidden night hours range
          if (adjustedTop + heightPx <= 0) return null;

          return (
            <div
              key={`${task.id}-${slot.id}`}
              className={`absolute rounded-lg shadow-sm border-l-4 px-2 py-1 overflow-hidden z-10 group
                ${isBeingDragged ? 'opacity-40' : 'opacity-95'}
                ${isDeadlineOnly ? 'bg-gray-100 border-gray-400' : 'bg-blue-50 hover:bg-blue-100'}
              `}
              style={{
                top: `${Math.max(0, adjustedTop)}px`,
                height: `${heightPx - Math.max(0, -adjustedTop)}px`,
                left: `calc(60px + ${dayIndex} * ((100% - 60px) / 7) + 2px)`,
                width: `calc((100% - 60px) / 7 - 6px)`,
                borderLeftColor: `var(--color-priority-${task.priority})`,
              }}
              onMouseDown={(e) => !isDeadlineOnly && handleMoveStart(task.id, slot.id, slot, e)}
            >
              <div className="flex items-start justify-between gap-1">
                <div
                  className="text-xs font-medium text-gray-800 truncate flex-1 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                >
                  {task.title}
                </div>
                {/* Action buttons - visible on hover */}
                {!isDeadlineOnly && (
                  <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                    <button
                      className="w-5 h-5 flex items-center justify-center rounded bg-green-100 text-green-700 hover:bg-green-200 text-xs"
                      title="完了"
                      onClick={(e) => { e.stopPropagation(); onCompleteTask(task.id); }}
                    >
                      ✓
                    </button>
                    <button
                      className="w-5 h-5 flex items-center justify-center rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs"
                      title="スケジュール解除"
                      onClick={(e) => { e.stopPropagation(); onRemoveSlot(task.id, slot.id); }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              {heightPx > SLOT_HEIGHT && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(slot.start).getHours()}:{String(new Date(slot.start).getMinutes()).padStart(2, '0')}
                  {' - '}
                  {new Date(slot.end).getHours()}:{String(new Date(slot.end).getMinutes()).padStart(2, '0')}
                </div>
              )}
              {/* Resize handle */}
              {!isDeadlineOnly && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize bg-transparent hover:bg-blue-300/30 rounded-b-lg"
                  onMouseDown={(e) => handleResizeStart(task.id, slot.id, slot, e)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
