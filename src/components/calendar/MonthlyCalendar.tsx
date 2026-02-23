import { useState } from 'react';
import type { Task } from '../../types/task';
import { getMonthDates, isSameDay } from '../../utils/dateUtils';

interface MonthlyCalendarProps {
  year: number;
  month: number;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateClick: (date: Date) => void;
  onScheduleTask?: (taskId: string, start: Date, end: Date) => void;
  // Mobile props
  isMobile?: boolean;
  selectedTaskId?: string | null;
  onClearSelection?: () => void;
}

const DAY_HEADERS = ['月', '火', '水', '木', '金', '土', '日'];

// Time picker popup for scheduling
function TimePickerPopup({
  date,
  taskId,
  onConfirm,
  onCancel,
}: {
  date: Date;
  taskId: string;
  onConfirm: (taskId: string, start: Date, end: Date) => void;
  onCancel: () => void;
}) {
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(10);
  const [endMinute, setEndMinute] = useState(0);

  function handleSubmit() {
    const start = new Date(date);
    start.setHours(startHour, startMinute, 0, 0);
    const end = new Date(date);
    end.setHours(endHour, endMinute, 0, 0);
    if (end.getTime() <= start.getTime()) {
      end.setTime(start.getTime() + 30 * 60000);
    }
    onConfirm(taskId, start, end);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl p-5 min-w-[300px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-800 mb-1">スケジュール時間を設定</h3>
        <p className="text-sm text-gray-500 mb-4">
          {date.getFullYear()}/{date.getMonth() + 1}/{date.getDate()}
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">開始時間</label>
            <div className="flex items-center gap-2">
              <select
                value={startHour}
                onChange={e => setStartHour(Number(e.target.value))}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-gray-500 font-bold">:</span>
              <select
                value={startMinute}
                onChange={e => setStartMinute(Number(e.target.value))}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">終了時間</label>
            <div className="flex items-center gap-2">
              <select
                value={endHour}
                onChange={e => setEndHour(Number(e.target.value))}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-gray-500 font-bold">:</span>
              <select
                value={endMinute}
                onChange={e => setEndMinute(Number(e.target.value))}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            スケジュール
          </button>
        </div>
      </div>
    </div>
  );
}

export function MonthlyCalendar({
  year,
  month,
  tasks,
  onTaskClick,
  onDateClick,
  onScheduleTask,
  isMobile = false,
  selectedTaskId = null,
  onClearSelection,
}: MonthlyCalendarProps) {
  const weeks = getMonthDates(year, month);
  const today = new Date();
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [timePickerState, setTimePickerState] = useState<{ date: Date; taskId: string } | null>(null);

  const isSchedulingMode = isMobile && !!selectedTaskId;

  function getTasksForDate(date: Date): { task: Task; label: string }[] {
    const results: { task: Task; label: string }[] = [];
    const seen = new Set<string>();

    for (const t of tasks) {
      if (t.calendarSlots && t.calendarSlots.length > 0) {
        for (const slot of t.calendarSlots) {
          const slotDate = new Date(slot.start);
          if (isSameDay(slotDate, date)) {
            const key = `${t.id}-${slot.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              const timeStr = `${slotDate.getHours()}:${String(slotDate.getMinutes()).padStart(2, '0')}`;
              results.push({ task: t, label: `${timeStr} ${t.title}` });
            }
          }
        }
      }

      if (t.calendarSlotStart && !t.calendarSlots?.length) {
        const slotDate = new Date(t.calendarSlotStart);
        if (isSameDay(slotDate, date) && !seen.has(t.id)) {
          seen.add(t.id);
          const timeStr = `${slotDate.getHours()}:${String(slotDate.getMinutes()).padStart(2, '0')}`;
          results.push({ task: t, label: `${timeStr} ${t.title}` });
        }
      }

      if (t.deadline) {
        const deadlineDate = new Date(t.deadline);
        if (isSameDay(deadlineDate, date) && !seen.has(t.id)) {
          seen.add(t.id);
          results.push({ task: t, label: t.title });
        }
      }
    }

    results.sort((a, b) => a.label.localeCompare(b.label));
    return results;
  }

  function handleDragOver(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
  }

  function handleDragLeave() {
    setDragOverDate(null);
  }

  function handleDrop(e: React.DragEvent, date: Date) {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || !onScheduleTask) return;
    setTimePickerState({ date, taskId });
  }

  function handleDateCellClick(date: Date) {
    if (isSchedulingMode && selectedTaskId && onScheduleTask) {
      setTimePickerState({ date, taskId: selectedTaskId });
      onClearSelection?.();
    } else {
      onDateClick(date);
    }
  }

  function handleTimeConfirm(taskId: string, start: Date, end: Date) {
    onScheduleTask?.(taskId, start, end);
    setTimePickerState(null);
  }

  const maxTasksToShow = isMobile ? 2 : 3;

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAY_HEADERS.map(day => (
            <div key={day} className={`text-center text-xs font-medium text-gray-500 border-r border-gray-100 last:border-r-0 ${isMobile ? 'p-1' : 'p-2'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
            {week.map((date, dayIndex) => {
              if (!date) {
                return (
                  <div key={dayIndex} className={`p-1 bg-gray-50 border-r border-gray-100 last:border-r-0 ${isMobile ? 'min-h-[56px]' : 'min-h-[80px]'}`} />
                );
              }
              const isToday = isSameDay(date, today);
              const dateTasks = getTasksForDate(date);
              const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const isOver = dragOverDate === dateKey;

              return (
                <div
                  key={dayIndex}
                  className={`p-1 border-r border-gray-100 last:border-r-0 cursor-pointer transition-colors
                    ${isMobile ? 'min-h-[56px]' : 'min-h-[80px]'}
                    ${isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    ${isOver ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''}
                    ${isSchedulingMode ? 'ring-1 ring-blue-200 ring-inset hover:bg-blue-50' : ''}
                  `}
                  onClick={() => handleDateCellClick(date)}
                  onDragOver={(e) => handleDragOver(e, dateKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, date)}
                >
                  <div className={`text-xs mb-0.5 ${isToday ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dateTasks.slice(0, maxTasksToShow).map(({ task, label }, idx) => (
                      <div
                        key={`${task.id}-${idx}`}
                        className={`px-1 py-0.5 rounded truncate cursor-pointer ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                        style={{
                          backgroundColor: `var(--color-priority-${task.priority})`,
                          color: 'white',
                          opacity: 0.85,
                        }}
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                      >
                        {isMobile ? task.title : label}
                      </div>
                    ))}
                    {dateTasks.length > maxTasksToShow && (
                      <div className="text-[10px] text-gray-400 px-1">+{dateTasks.length - maxTasksToShow}件</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Time picker popup */}
      {timePickerState && (
        <TimePickerPopup
          date={timePickerState.date}
          taskId={timePickerState.taskId}
          onConfirm={handleTimeConfirm}
          onCancel={() => setTimePickerState(null)}
        />
      )}
    </>
  );
}
