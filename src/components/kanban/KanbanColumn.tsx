import { useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, GtdList } from '../../types/task';
import { getListConfig } from '../../constants/gtdLists';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  listId: GtdList;
  tasks: Task[];
  onCardClick: (task: Task) => void;
  onAddTask: (listId: GtdList) => void;
  onHtml5Drop?: (taskId: string, targetList: GtdList) => void;
}

export function KanbanColumn({ listId, tasks, onCardClick, onAddTask, onHtml5Drop }: KanbanColumnProps) {
  const config = getListConfig(listId);
  const { setNodeRef, isOver } = useDroppable({ id: listId });
  const [html5IsOver, setHtml5IsOver] = useState(false);

  // Only accept HTML5 drops that are flagged as sidebar tasks
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-sidebar-task')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setHtml5IsOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      setHtml5IsOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    // Only process sidebar-flagged drops
    if (!e.dataTransfer.types.includes('application/x-sidebar-task')) return;
    e.preventDefault();
    setHtml5IsOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onHtml5Drop) {
      onHtml5Drop(taskId, listId);
    }
  }, [listId, onHtml5Drop]);

  const highlighted = isOver || html5IsOver;

  return (
    <div
      className={`flex flex-col bg-gray-50 rounded-lg min-h-[200px] transition-all
        ${highlighted ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span>{config.icon}</span>
          <h2 className="text-sm font-semibold text-gray-700">{config.name}</h2>
          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(listId)}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          title="タスクを追加"
        >
          +
        </button>
      </div>

      {html5IsOver && (
        <div className="mx-2 mt-2 px-3 py-2 bg-blue-100 border-2 border-blue-400 border-dashed rounded-lg text-center text-sm font-medium text-blue-700">
          {config.icon} ここにドロップ
        </div>
      )}

      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} onClick={onCardClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !html5IsOver && (
          <div className="text-center text-gray-400 text-sm py-8">
            タスクがありません
          </div>
        )}
      </div>
    </div>
  );
}
