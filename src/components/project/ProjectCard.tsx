import { useState } from 'react';
import type { Project } from '../../types/project';
import type { Task } from '../../types/task';
import { getPriorityConfig } from '../../constants/priorities';
import { formatDate } from '../../utils/dateUtils';

interface ProjectCardProps {
  project: Project;
  subTasks: Task[];
  onEdit: (project: Project) => void;
  onTaskClick: (task: Task) => void;
  onAddSubTask: (projectId: string) => void;
  onToggleTaskComplete: (task: Task) => void;
}

export function ProjectCard({
  project,
  subTasks,
  onEdit,
  onTaskClick,
  onAddSubTask,
  onToggleTaskComplete,
}: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = subTasks.filter(t => t.isCompleted).length;
  const totalCount = subTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Project header */}
      <div
        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <h3 className="text-sm font-medium text-gray-800 truncate">{project.title}</h3>
          </div>
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
            style={{ backgroundColor: `var(--color-priority-${project.priority})` }}
            title={getPriorityConfig(project.priority).name}
          />
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{completedCount}/{totalCount} タスク完了</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {project.deadline && (
          <div className="text-xs text-gray-500 mt-1">
            期限: {formatDate(project.deadline)}
          </div>
        )}
      </div>

      {/* Accordion: sub-tasks */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="p-2 space-y-1">
            {subTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 group"
              >
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  onChange={() => onToggleTaskComplete(task)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span
                  className={`text-sm flex-1 cursor-pointer ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}
                  onClick={() => onTaskClick(task)}
                >
                  {task.title}
                </span>
                {task.deadline && (
                  <span className="text-xs text-gray-400">{formatDate(task.deadline)}</span>
                )}
              </div>
            ))}

            {subTasks.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">サブタスクがありません</p>
            )}
          </div>

          <div className="border-t border-gray-100 p-2 flex justify-between">
            <button
              onClick={() => onAddSubTask(project.id)}
              className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1"
            >
              + サブタスクを追加
            </button>
            <button
              onClick={() => onEdit(project)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              編集
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
