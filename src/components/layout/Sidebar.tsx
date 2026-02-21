import { useState } from 'react';
import type { Task, GtdList } from '../../types/task';
import type { Project } from '../../types/project';
import { SIDEBAR_LISTS, MAIN_COLUMNS, getListConfig } from '../../constants/gtdLists';
import { getPriorityConfig } from '../../constants/priorities';
import { formatDate, isOverdue } from '../../utils/dateUtils';
import * as taskRepo from '../../db/taskRepository';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  taskCounts: Record<string, number>;
  onListClick: (listId: GtdList) => void;
  activeList: GtdList | null;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMoved?: () => void;
  projects?: Project[];
  onProjectClick?: (project: Project) => void;
  onAddProject?: () => void;
  onAddTaskToProject?: (projectId: string) => void;
  onAssignTaskToProject?: (taskId: string, projectId: string) => void;
  onEmptyTrash?: () => void;
  onClearCompleted?: () => void;
}

// All sidebar lists including completed
const ALL_SIDEBAR_LISTS: GtdList[] = [...SIDEBAR_LISTS];
const SIDEBAR_DROP_LISTS: GtdList[] = [...SIDEBAR_LISTS];

export function Sidebar({ isOpen, onClose, taskCounts, onListClick, activeList, tasks, onTaskClick, onTaskMoved, projects = [], onProjectClick, onAddProject, onAddTaskToProject, onAssignTaskToProject, onEmptyTrash, onClearCompleted }: SidebarProps) {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<GtdList | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [externalDragOverList, setExternalDragOverList] = useState<GtdList | null>(null);
  const [confirmingEmpty, setConfirmingEmpty] = useState<'trash' | 'completed' | null>(null);

  // Handle HTML5 drop on sidebar list buttons (from both kanban cards and sidebar tasks)
  async function handleListButtonDrop(e: React.DragEvent, targetList: GtdList) {
    e.preventDefault();
    e.stopPropagation();
    setExternalDragOverList(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.isCompleted) {
      await taskRepo.uncompleteTask(taskId, targetList);
    } else if (task.deletedAt) {
      await taskRepo.updateTask(taskId, { deletedAt: null, gtdList: targetList });
    } else if (targetList === 'completed') {
      await taskRepo.completeTask(taskId);
    } else if (targetList === 'trash') {
      await taskRepo.deleteTask(taskId);
    } else {
      await taskRepo.moveTask(taskId, targetList);
    }

    setDraggingTask(null);
    setDragOverTarget(null);
    onTaskMoved?.();
  }

  function getTasksForList(listId: GtdList): Task[] {
    if (listId === 'completed') {
      return tasks
        .filter(t => t.isCompleted && t.deletedAt === null)
        .sort((a, b) => {
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bTime - aTime;
        });
    }
    if (listId === 'trash') {
      return tasks
        .filter(t => t.deletedAt !== null)
        .sort((a, b) => {
          const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
          const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
          return bTime - aTime;
        });
    }
    return tasks
      .filter(t => t.gtdList === listId && !t.isCompleted && t.deletedAt === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function handleDragStart(e: React.DragEvent, task: Task) {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.setData('application/x-sidebar-task', 'true');
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTask(task);
  }

  function handleDragEnd() {
    setDraggingTask(null);
    setDragOverTarget(null);
  }

  async function handleDropOnTarget(e: React.DragEvent, targetList: GtdList) {
    e.preventDefault();
    e.stopPropagation();

    // Get task info from dataTransfer (more reliable than React state)
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.isCompleted) {
      await taskRepo.uncompleteTask(task.id, targetList);
    } else if (task.deletedAt) {
      await taskRepo.updateTask(task.id, {
        deletedAt: null,
        gtdList: targetList,
      });
    } else if (targetList === 'completed') {
      await taskRepo.completeTask(task.id);
    } else if (targetList === 'trash') {
      await taskRepo.deleteTask(task.id);
    } else {
      await taskRepo.moveTask(task.id, targetList);
    }

    setDraggingTask(null);
    setDragOverTarget(null);
    onTaskMoved?.();
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-80 bg-white shadow-lg transform transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200 ${isOpen ? '' : 'lg:-translate-x-full'}`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 text-base">その他のリスト</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 lg:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 65px)' }}>
          {/* Drop zones for main columns - shown during drag */}
          {draggingTask && (
            <div className="mb-3 p-2 bg-blue-50/50 rounded-xl border border-blue-200">
              <div className="text-xs text-blue-600 font-medium mb-2 px-1">ドロップして移動：</div>
              <div className="space-y-1.5">
                {MAIN_COLUMNS.map(listId => {
                  const config = getListConfig(listId);
                  const isOver = dragOverTarget === listId;
                  return (
                    <div
                      key={listId}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed transition-all text-sm font-medium
                        ${isOver
                          ? 'border-blue-400 bg-blue-100 text-blue-700 scale-[1.02] shadow-md'
                          : 'border-blue-300 bg-white text-blue-600 hover:bg-blue-50'
                        }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTarget(listId); }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => handleDropOnTarget(e, listId)}
                    >
                      <span className="text-base">{config.icon}</span>
                      <span>{config.name}</span>
                    </div>
                  );
                })}
                {/* Also show sidebar drop targets (e.g. from completed to someday_maybe) */}
                {SIDEBAR_DROP_LISTS.filter(id => id !== draggingTask?.gtdList).map(listId => {
                  const config = getListConfig(listId);
                  const isOver = dragOverTarget === listId;
                  return (
                    <div
                      key={listId}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed transition-all text-sm font-medium
                        ${isOver
                          ? 'border-gray-400 bg-gray-100 text-gray-700 scale-[1.02] shadow-md'
                          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTarget(listId); }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => handleDropOnTarget(e, listId)}
                    >
                      <span className="text-base">{config.icon}</span>
                      <span>{config.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Projects section */}
          <div className="mb-3">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📁</span>
                <span className="text-sm font-semibold text-gray-700">プロジェクト</span>
                {projects.length > 0 && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {projects.filter(p => !p.isCompleted).length}
                  </span>
                )}
              </div>
              {onAddProject && (
                <button
                  onClick={onAddProject}
                  className="text-gray-400 hover:text-blue-600 text-lg leading-none px-1"
                  title="プロジェクトを追加"
                >
                  +
                </button>
              )}
            </div>

            <div className="space-y-1 ml-2 mr-1">
              {projects.filter(p => !p.isCompleted && !p.deletedAt).map(project => {
                const isExpanded = expandedProjectId === project.id;
                const projectTasks = tasks.filter(t => t.projectId === project.id && t.deletedAt === null);
                const activeTasks = projectTasks.filter(t => !t.isCompleted);
                const completedCount = projectTasks.filter(t => t.isCompleted).length;
                const progress = projectTasks.length > 0 ? (completedCount / projectTasks.length) * 100 : 0;
                const isDragOverProject = dragOverProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className={`rounded-lg border bg-white overflow-hidden transition-all
                      ${isDragOverProject ? 'border-blue-400 bg-blue-50/50 shadow-md' : 'border-gray-200'}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverProjectId(project.id);
                    }}
                    onDragLeave={() => setDragOverProjectId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const taskId = e.dataTransfer.getData('text/plain');
                      if (taskId && onAssignTaskToProject) {
                        onAssignTaskToProject(taskId, project.id);
                      }
                      setDragOverProjectId(null);
                    }}
                  >
                    <div
                      className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `var(--color-priority-${project.priority})` }}
                        />
                        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{project.title}</span>
                        <span className="text-xs text-gray-400">{activeTasks.length}</span>
                      </div>
                      {projectTasks.length > 0 && (
                        <div className="mt-1.5 ml-5">
                          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {isDragOverProject && !isExpanded && (
                      <div className="px-3 py-2 text-xs text-blue-600 font-medium text-center border-t border-blue-200 bg-blue-50">
                        ドロップしてプロジェクトに追加
                      </div>
                    )}

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-2 py-2 space-y-1">
                        {project.memo && (
                          <div className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded mb-1">
                            {project.memo}
                          </div>
                        )}
                        {projectTasks.map(task => {
                          const pConfig = getPriorityConfig(task.priority);
                          const listConfig = task.gtdList !== 'completed' ? getListConfig(task.gtdList) : null;
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onDragEnd={handleDragEnd}
                              onClick={() => onTaskClick(task)}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-grab active:cursor-grabbing group text-left"
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `var(--color-priority-${task.priority})` }}
                                title={pConfig.name}
                              />
                              <span className={`text-xs flex-1 truncate ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {task.title}
                              </span>
                              {listConfig && (
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {listConfig.icon}
                                </span>
                              )}
                              {task.isCompleted && (
                                <span className="text-xs text-green-500 flex-shrink-0">✓</span>
                              )}
                            </div>
                          );
                        })}
                        {projectTasks.length === 0 && (
                          <div className="text-xs text-gray-400 text-center py-2">タスクがありません</div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-gray-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); onProjectClick?.(project); }}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                          >
                            編集
                          </button>
                          {onAddTaskToProject && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onAddTaskToProject(project.id); }}
                              className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 flex items-center gap-1"
                            >
                              <span>+</span> タスク追加
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {projects.filter(p => !p.isCompleted && !p.deletedAt).length === 0 && (
                <div className="text-xs text-gray-400 italic px-3 py-2">プロジェクトがありません</div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 my-2" />

          {ALL_SIDEBAR_LISTS.map(listId => {
            const config = getListConfig(listId);
            const count = taskCounts[listId] || 0;
            const isActive = activeList === listId;
            const listTasks = isActive ? getTasksForList(listId) : [];
            const isExternalDragOver = externalDragOverList === listId;

            return (
              <div
                key={listId}
                className="mb-1"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setExternalDragOverList(listId);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setExternalDragOverList(null);
                  }
                }}
                onDrop={(e) => handleListButtonDrop(e, listId)}
              >
                <button
                  onClick={() => onListClick(listId)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors
                    ${isExternalDragOver ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' :
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className="text-lg">{config.icon}</span>
                  <span className="flex-1 text-sm font-semibold">{config.name}</span>
                  {isExternalDragOver && (
                    <span className="text-xs text-blue-600 font-medium">ドロップ</span>
                  )}
                  {!isExternalDragOver && count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Expanded task list */}
                {isActive && (
                  <div className="ml-2 mr-1 mt-1 mb-2 space-y-1">
                    {listTasks.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400 italic">
                        タスクがありません
                      </div>
                    ) : (
                      <>
                        {listTasks.map(task => {
                          const priorityConfig = getPriorityConfig(task.priority);
                          const overdue = task.deadline ? isOverdue(task.deadline) : false;
                          const isDragging = draggingTask?.id === task.id;

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onDragEnd={handleDragEnd}
                              onClick={() => onTaskClick(task)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group
                                ${isDragging ? 'opacity-30' : ''}
                              `}
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                                  style={{ backgroundColor: `var(--color-priority-${task.priority})` }}
                                  title={priorityConfig.name}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-medium truncate ${
                                    task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'
                                  }`}>
                                    {task.title}
                                  </div>
                                  {task.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {task.tags.map(tag => (
                                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {task.deadline && (
                                    <div className={`text-xs mt-1 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                      {overdue ? '期限切れ: ' : '期限: '}{formatDate(task.deadline)}
                                    </div>
                                  )}
                                </div>
                                {/* Drag hint */}
                                <span className="text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Empty trash / Clear completed buttons */}
                        {(listId === 'trash' && onEmptyTrash) && (
                          <div className="pt-2 border-t border-gray-200 mt-2">
                            {confirmingEmpty === 'trash' ? (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-xs text-red-700 font-medium mb-2">
                                  ゴミ箱のタスクを全て完全に削除します。この操作は取り消せません。
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      onEmptyTrash();
                                      setConfirmingEmpty(null);
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                  >
                                    削除する
                                  </button>
                                  <button
                                    onClick={() => setConfirmingEmpty(null)}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingEmpty('trash')}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                ゴミ箱を空にする
                              </button>
                            )}
                          </div>
                        )}

                        {(listId === 'completed' && onClearCompleted) && (
                          <div className="pt-2 border-t border-gray-200 mt-2">
                            {confirmingEmpty === 'completed' ? (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <p className="text-xs text-orange-700 font-medium mb-2">
                                  完了済みのタスクを全て完全に削除します。この操作は取り消せません。
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      onClearCompleted();
                                      setConfirmingEmpty(null);
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                  >
                                    削除する
                                  </button>
                                  <button
                                    onClick={() => setConfirmingEmpty(null)}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingEmpty('completed')}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                完了済みを全て削除
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
