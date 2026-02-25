import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Task, GtdList } from '../../types/task';
import { MAIN_COLUMNS, SIDEBAR_LISTS, getListConfig } from '../../constants/gtdLists';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useAllTasks } from '../../hooks/useTasks';
import { useResponsive } from '../../hooks/useResponsive';
import * as taskRepo from '../../db/taskRepository';

interface KanbanBoardProps {
  onCardClick: (task: Task) => void;
  onAddTask: (listId: GtdList) => void;
}

const BOARD_COLUMNS: GtdList[] = [...MAIN_COLUMNS];
const ALL_DROP_TARGETS: GtdList[] = [...MAIN_COLUMNS, ...SIDEBAR_LISTS];

// The sidebar lists shown as drop zones at the bottom (including completed for "complete task" action)
const SIDEBAR_DROP_LISTS: GtdList[] = [...SIDEBAR_LISTS];

// Drop zone component for extra lists (@dnd-kit based, for kanban internal drags)
function DropZone({ listId, isActive }: { listId: GtdList; isActive: boolean }) {
  const config = getListConfig(listId);
  const { setNodeRef, isOver } = useDroppable({ id: `dropzone-${listId}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all text-sm font-medium
        ${isOver
          ? 'border-blue-400 bg-blue-50 text-blue-700 scale-105 shadow-md'
          : isActive
            ? 'border-gray-300 bg-gray-50 text-gray-600'
            : 'border-transparent bg-transparent text-gray-400'
        }
      `}
    >
      <span className="text-base">{config.icon}</span>
      <span>{config.name}</span>
    </div>
  );
}

export function KanbanBoard({ onCardClick, onAddTask }: KanbanBoardProps) {
  const { tasks } = useAllTasks();
  const { isMobile } = useResponsive();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [mobileColumnIndex, setMobileColumnIndex] = useState(0);

  // Handle drop from sidebar HTML5 drag onto a kanban column
  const handleHtml5Drop = useCallback(async (taskId: string, targetList: GtdList) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.isCompleted) {
      await taskRepo.uncompleteTask(taskId, targetList);
    } else if (task.deletedAt) {
      await taskRepo.updateTask(taskId, { deletedAt: null, gtdList: targetList });
    } else {
      await taskRepo.moveTask(taskId, targetList);
    }
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function getTasksForColumn(listId: GtdList): Task[] {
    return tasks
      .filter(t => t.gtdList === listId && !t.isCompleted && t.deletedAt === null)
      .filter(t => listId !== 'inbox' || !t.projectId) // プロジェクト所属タスクはインボックスに表示しない
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  }

  function handleDragOver(_event: DragOverEvent) {
    // Visual feedback handled by useDroppable isOver
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find(t => t.id === activeId);
    if (!task) return;

    // Check if dropped on a dropzone-* target
    let targetList: GtdList | undefined;
    if (overId.startsWith('dropzone-')) {
      targetList = overId.replace('dropzone-', '') as GtdList;
    } else if (ALL_DROP_TARGETS.includes(overId as GtdList)) {
      targetList = overId as GtdList;
    } else {
      targetList = tasks.find(t => t.id === overId)?.gtdList;
    }

    if (!targetList) return;

    const sourceList = task.gtdList;

    if (sourceList === targetList) {
      // Reorder within same column
      const columnTasks = getTasksForColumn(targetList);
      const oldIndex = columnTasks.findIndex(t => t.id === activeId);
      const newIndex = columnTasks.findIndex(t => t.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        await taskRepo.reorderTasks(targetList, reordered.map(t => t.id));
      }
    } else if (targetList === 'completed') {
      // Complete the task
      await taskRepo.completeTask(activeId);
    } else if (targetList === 'trash') {
      // Delete the task (soft delete)
      await taskRepo.deleteTask(activeId);
    } else {
      // Move to different list
      await taskRepo.moveTask(activeId, targetList);
    }
  }

  const isDragging = activeTask !== null;
  const sourceIsSidebar = activeTask ? SIDEBAR_DROP_LISTS.includes(activeTask.gtdList) : false;

  if (isMobile) {
    const allColumns: { id: GtdList; label: string }[] = [
      { id: 'inbox', label: 'インボックス' },
      { id: 'next_actions', label: '次の行動' },
      { id: 'waiting_for', label: '連絡待ち' },
    ];
    const currentColumn = allColumns[mobileColumnIndex];

    return (
      <div className="flex flex-col h-full">
        <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
          {allColumns.map((col, i) => (
            <button
              key={col.id}
              onClick={() => setMobileColumnIndex(i)}
              className={`flex-1 min-w-0 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors
                ${i === mobileColumnIndex ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              {col.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <KanbanColumn
              listId={currentColumn.id}
              tasks={getTasksForColumn(currentColumn.id)}
              onCardClick={onCardClick}
              onAddTask={onAddTask}
              onHtml5Drop={handleHtml5Drop}
            />
            {isDragging && (
              <div className="flex flex-wrap gap-2 p-3 mt-2 bg-gray-50/80 rounded-xl border border-gray-200">
                <div className="w-full text-xs text-gray-400 font-medium mb-1 px-1">ドロップして移動：</div>
                {sourceIsSidebar && BOARD_COLUMNS.filter(id => id !== activeTask?.gtdList).map(listId => (
                  <DropZone key={listId} listId={listId} isActive={isDragging} />
                ))}
                {SIDEBAR_DROP_LISTS.filter(id => id !== activeTask?.gtdList).map(listId => (
                  <DropZone key={listId} listId={listId} isActive={isDragging} />
                ))}
              </div>
            )}
            <DragOverlay>
              {activeTask && <KanbanCard task={activeTask} onClick={() => {}} />}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4 h-full">
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
          {BOARD_COLUMNS.map(listId => (
            <KanbanColumn
              key={listId}
              listId={listId}
              tasks={getTasksForColumn(listId)}
              onCardClick={onCardClick}
              onAddTask={onAddTask}
              onHtml5Drop={handleHtml5Drop}
            />
          ))}
        </div>
        {isDragging && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 rounded-xl border border-gray-200">
            <div className="text-xs text-gray-400 font-medium whitespace-nowrap">ドロップして移動 →</div>
            {sourceIsSidebar && BOARD_COLUMNS.filter(id => id !== activeTask?.gtdList).map(listId => (
              <DropZone key={listId} listId={listId} isActive={isDragging} />
            ))}
            {SIDEBAR_DROP_LISTS.filter(id => id !== activeTask?.gtdList).map(listId => (
              <DropZone key={listId} listId={listId} isActive={isDragging} />
            ))}
          </div>
        )}
      </div>
      <DragOverlay>
        {activeTask && <KanbanCard task={activeTask} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
