import { useState } from 'react';
import type { Task, GtdList } from '../../types/task';
import type { CalendarViewMode } from '../../types/calendar';
import { WeeklyCalendar } from './WeeklyCalendar';
import { MonthlyCalendar } from './MonthlyCalendar';
import { getPriorityConfig } from '../../constants/priorities';
import { getListConfig } from '../../constants/gtdLists';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onScheduleTask: (taskId: string, start: Date, end: Date) => void;
  onUpdateSlot: (taskId: string, slotId: string, start: Date, end: Date) => void;
  onRemoveSlot: (taskId: string, slotId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

const SCHEDULABLE_LISTS: GtdList[] = ['next_actions', 'inbox', 'waiting_for', 'someday_maybe'];

export function CalendarView({ tasks, onTaskClick, onScheduleTask, onUpdateSlot, onRemoveSlot, onCompleteTask }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFilter, setSidebarFilter] = useState<GtdList | 'all'>('next_actions');

  const calendarTasks = tasks.filter(
    t => (t.deadline || (t.calendarSlots && t.calendarSlots.length > 0)) && !t.isCompleted && t.deletedAt === null,
  );

  // Tasks available for scheduling (not completed, not deleted, in schedulable lists)
  const schedulableTasks = tasks.filter(
    t => !t.isCompleted && t.deletedAt === null && SCHEDULABLE_LISTS.includes(t.gtdList),
  );

  const filteredTasks = sidebarFilter === 'all'
    ? schedulableTasks
    : schedulableTasks.filter(t => t.gtdList === sidebarFilter);

  function navigatePrev() {
    const d = new Date(currentDate);
    if (viewMode === 'weekly') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  }

  function navigateNext() {
    const d = new Date(currentDate);
    if (viewMode === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const headerLabel = viewMode === 'weekly'
    ? `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
    : `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-800 min-w-[140px] text-center">
            {headerLabel}
          </h2>
          <button
            onClick={navigateNext}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            今日
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Task sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className={`px-4 py-2 text-sm rounded-xl transition-colors flex items-center gap-1.5
              ${sidebarOpen
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            title="タスクパネルの表示切替"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            タスク
          </button>

          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-white shadow-sm text-gray-800 font-semibold'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              週間
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-white shadow-sm text-gray-800 font-semibold'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              月間
            </button>
          </div>
        </div>
      </div>

      {/* Main content: sidebar + calendar */}
      <div className="flex gap-4">
        {/* Task sidebar panel */}
        {sidebarOpen && (
          <div className="w-72 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
            {/* Sidebar header */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-700">📋 タスクをドラッグ</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filteredTasks.length}件
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">カレンダーにドラッグしてスケジュール</p>

              {/* Filter by list */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSidebarFilter('all')}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    sidebarFilter === 'all'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  すべて
                </button>
                {SCHEDULABLE_LISTS.map(listId => {
                  const config = getListConfig(listId);
                  const count = schedulableTasks.filter(t => t.gtdList === listId).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={listId}
                      onClick={() => setSidebarFilter(listId)}
                      className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                        sidebarFilter === listId
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {config.icon} {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredTasks.length === 0 ? (
                <div className="text-sm text-gray-400 italic text-center py-8">
                  タスクがありません
                </div>
              ) : (
                filteredTasks.map(task => (
                  <CalendarTaskCard
                    key={task.id}
                    task={task}
                    onTaskClick={onTaskClick}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="flex-1 min-w-0">
          {viewMode === 'weekly' ? (
            <WeeklyCalendar
              baseDate={currentDate}
              tasks={calendarTasks}
              allTasks={tasks}
              onTaskClick={onTaskClick}
              onSlotClick={() => {}}
              onScheduleTask={onScheduleTask}
              onUpdateSlot={onUpdateSlot}
              onRemoveSlot={onRemoveSlot}
              onCompleteTask={onCompleteTask}
            />
          ) : (
            <MonthlyCalendar
              year={currentDate.getFullYear()}
              month={currentDate.getMonth()}
              tasks={calendarTasks}
              onTaskClick={onTaskClick}
              onDateClick={() => {}}
              onScheduleTask={onScheduleTask}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Draggable task card for calendar sidebar
function CalendarTaskCard({ task, onTaskClick }: { task: Task; onTaskClick: (task: Task) => void }) {
  const priorityConfig = getPriorityConfig(task.priority);
  const listConfig = getListConfig(task.gtdList);
  const hasSchedule = task.calendarSlots && task.calendarSlots.length > 0;

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onTaskClick(task)}
      className={`px-3 py-2.5 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all
        hover:shadow-md hover:border-blue-300
        ${hasSchedule
          ? 'bg-blue-50/50 border-blue-200'
          : 'bg-white border-gray-200'
        }
      `}
    >
      <div className="flex items-start gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: `var(--color-priority-${task.priority})` }}
          title={priorityConfig.name}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">
            {task.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-gray-400">
              {listConfig.icon} {listConfig.name}
            </span>
          </div>
          {hasSchedule && (
            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
              <span>📅 {task.calendarSlots.length}件スケジュール済み</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
