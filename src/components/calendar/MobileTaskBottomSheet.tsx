import { useState, useRef } from 'react';
import type { Task, GtdList } from '../../types/task';
import { getPriorityConfig } from '../../constants/priorities';
import { getListConfig } from '../../constants/gtdLists';

const SCHEDULABLE_LISTS: GtdList[] = ['next_actions', 'inbox', 'waiting_for', 'someday_maybe'];

interface MobileTaskBottomSheetProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onClearSelection: () => void;
}

type SheetState = 'collapsed' | 'scheduling' | 'expanded';

export function MobileTaskBottomSheet({
  tasks,
  selectedTaskId,
  onSelectTask,
  onClearSelection,
}: MobileTaskBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [filter, setFilter] = useState<GtdList | 'all'>('next_actions');
  const touchStartY = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const schedulableTasks = tasks.filter(
    t => !t.isCompleted && t.deletedAt === null && SCHEDULABLE_LISTS.includes(t.gtdList),
  );

  const filteredTasks = filter === 'all'
    ? schedulableTasks
    : schedulableTasks.filter(t => t.gtdList === filter);

  const selectedTask = selectedTaskId
    ? tasks.find(t => t.id === selectedTaskId)
    : null;

  // When a task is selected, switch to scheduling mode
  function handleSelectTask(taskId: string) {
    onSelectTask(taskId);
    setSheetState('scheduling');
  }

  function handleCancel() {
    onClearSelection();
    setSheetState('collapsed');
  }

  function handleToggle() {
    if (sheetState === 'expanded') {
      setSheetState(selectedTaskId ? 'scheduling' : 'collapsed');
    } else {
      setSheetState('expanded');
    }
  }

  // Touch drag to expand/collapse
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY < -50) {
      // Swipe up → expand
      setSheetState('expanded');
    } else if (deltaY > 50) {
      // Swipe down → collapse
      setSheetState(selectedTaskId ? 'scheduling' : 'collapsed');
    }
  }

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out"
      style={{
        height: sheetState === 'expanded' ? '55vh' : sheetState === 'scheduling' ? '72px' : '52px',
      }}
    >
      {/* Handle bar */}
      <div
        className="flex justify-center py-2 cursor-pointer"
        onClick={handleToggle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Collapsed: show task count */}
      {sheetState === 'collapsed' && (
        <div className="px-4 pb-2 flex items-center justify-between" onClick={handleToggle}>
          <span className="text-sm font-medium text-gray-600">
            📋 {schedulableTasks.length}件のタスク
          </span>
          <span className="text-xs text-gray-400">タップで展開</span>
        </div>
      )}

      {/* Scheduling mode: show selected task + guide */}
      {sheetState === 'scheduling' && selectedTask && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: `var(--color-priority-${selectedTask.priority})` }}
          />
          <span className="text-sm font-medium text-gray-800 truncate flex-1">
            {selectedTask.title}
          </span>
          <span className="text-xs text-blue-600 flex-shrink-0 animate-pulse">
            カレンダーをタップ
          </span>
          <button
            onClick={handleCancel}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg bg-gray-100 flex-shrink-0"
          >
            取消
          </button>
        </div>
      )}

      {/* Expanded: full task list */}
      {sheetState === 'expanded' && (
        <div className="flex flex-col overflow-hidden" style={{ height: 'calc(55vh - 36px)' }}>
          {/* Header */}
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-700">タスクを選択してスケジュール</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {filteredTasks.length}件
              </span>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-500'
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
                    onClick={() => setFilter(listId)}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      filter === listId
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {config.icon} {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
            {filteredTasks.length === 0 ? (
              <div className="text-sm text-gray-400 italic text-center py-8">
                タスクがありません
              </div>
            ) : (
              filteredTasks.map(task => {
                const priorityConfig = getPriorityConfig(task.priority);
                const listConfig = getListConfig(task.gtdList);
                const isSelected = selectedTaskId === task.id;
                const hasSchedule = task.calendarSlots && task.calendarSlots.length > 0;

                return (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task.id)}
                    className={`px-3 py-2.5 rounded-lg border-2 transition-all active:scale-[0.98]
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : hasSchedule
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
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-400">
                            {listConfig.icon} {listConfig.name}
                          </span>
                        </div>
                        {hasSchedule && (
                          <div className="text-xs text-blue-600 mt-0.5">
                            📅 {task.calendarSlots.length}件スケジュール済み
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-blue-600 text-xs font-medium flex-shrink-0">選択中</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
