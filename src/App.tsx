import { useState, useCallback, useEffect } from 'react';
import type { Task, GtdList } from './types/task';
import type { TaskInput } from './types/task';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { CalendarView } from './components/calendar/CalendarView';
import { TaskForm } from './components/task/TaskForm';
import { GtdWizard } from './components/wizard/GtdWizard';
import { WeeklyReviewModal } from './components/review/WeeklyReviewModal';
import { PinAuthModal } from './components/sync/PinAuthModal';
import { ExportImportModal } from './components/sync/ExportImportModal';
import { Modal } from './components/ui/Modal';
import { Toast } from './components/ui/Toast';
import { useAllTasks } from './hooks/useTasks';
import { useProjects } from './hooks/useProjects';
import { useWeeklyReview } from './hooks/useWeeklyReview';
import { syncService } from './services/syncService';
import { notificationService } from './services/notificationService';
import * as taskRepo from './db/taskRepository';
import type { Project } from './types/project';

type ViewMode = 'kanban' | 'calendar';

function App() {
  const [view, setView] = useState<ViewMode>('kanban');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarActiveList, setSidebarActiveList] = useState<GtdList | null>(null);

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormList, setTaskFormList] = useState<GtdList>('inbox');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // GTD Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardTask, setWizardTask] = useState<Task | null>(null);

  // Weekly review state
  const [showReview, setShowReview] = useState(false);

  // PIN auth state
  const [showPinAuth, setShowPinAuth] = useState(() => !localStorage.getItem('gtd_pin'));

  // Export/Import state
  const [showExportImport, setShowExportImport] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Project form state
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectMemo, setProjectMemo] = useState('');
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);

  const { tasks } = useAllTasks();
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const { lastReviewDate, needsReview } = useWeeklyReview();

  // Initialize services
  useEffect(() => {
    syncService.init();
    notificationService.init();
    notificationService.setWeeklyReviewCallback(() => {
      setShowReview(true);
    });
    return () => notificationService.stop();
  }, []);

  // Task counts for sidebar
  const taskCounts: Record<string, number> = {};
  for (const t of tasks) {
    if (t.deletedAt !== null) {
      taskCounts['trash'] = (taskCounts['trash'] || 0) + 1;
    } else if (t.isCompleted) {
      taskCounts['completed'] = (taskCounts['completed'] || 0) + 1;
    } else {
      taskCounts[t.gtdList] = (taskCounts[t.gtdList] || 0) + 1;
    }
  }

  // Handlers
  const handleAddTask = useCallback((listId: GtdList) => {
    setTaskFormList(listId);
    setEditingTask(null);
    setShowTaskForm(true);
  }, []);

  const handleCardClick = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskFormList(task.gtdList);
    setShowTaskForm(true);
  }, []);

  const handleWizardDecision = useCallback(async (task: Task, destination: GtdList, projectId?: string) => {
    await taskRepo.moveTask(task.id, destination);
    if (projectId) {
      await taskRepo.updateTask(task.id, { projectId });
    }
    setWizardOpen(false);
    setWizardTask(null);
    setShowTaskForm(false);
    setEditingTask(null);
    setToast({ message: projectId ? 'プロジェクトに追加しました' : 'タスクを移動しました', type: 'success' });
  }, []);

  const handleTaskSubmit = useCallback(async (input: TaskInput) => {
    if (editingTask) {
      await taskRepo.updateTask(editingTask.id, {
        title: input.title,
        memo: input.memo,
        priority: input.priority,
        deadline: input.deadline,
        tags: input.tags,
      });
      setToast({ message: 'タスクを更新しました', type: 'success' });
    } else {
      // If creating within a project, assign projectId
      const taskInput = newTaskProjectId
        ? { ...input, projectId: newTaskProjectId }
        : input;
      await taskRepo.createTask(taskInput);
      setToast({ message: newTaskProjectId ? 'プロジェクトにタスクを追加しました' : 'タスクを作成しました', type: 'success' });
    }
    setShowTaskForm(false);
    setEditingTask(null);
    setNewTaskProjectId(null);
  }, [editingTask, newTaskProjectId]);

  const handleTaskDelete = useCallback(async () => {
    if (editingTask) {
      await taskRepo.deleteTask(editingTask.id);
      setShowTaskForm(false);
      setEditingTask(null);
      setToast({ message: 'タスクを削除しました', type: 'info' });
    }
  }, [editingTask]);

  const handleTaskComplete = useCallback(async () => {
    if (editingTask) {
      await taskRepo.completeTask(editingTask.id);
      setShowTaskForm(false);
      setEditingTask(null);
      setToast({ message: 'タスクを完了にしました', type: 'success' });
    }
  }, [editingTask]);

  // Move task to a different list (from TaskForm)
  const handleMoveToList = useCallback(async (taskId: string, destination: GtdList) => {
    await taskRepo.moveTask(taskId, destination);
    setShowTaskForm(false);
    setEditingTask(null);
    setToast({ message: 'タスクを移動しました', type: 'success' });
  }, []);

  // Start GTD wizard from TaskForm (for inbox tasks)
  const handleStartWizard = useCallback((task: Task) => {
    setWizardTask(task);
    setWizardOpen(true);
    setShowTaskForm(false);
  }, []);

  // Assign/unassign task to project
  const handleAssignProject = useCallback(async (taskId: string, projectId: string | null) => {
    await taskRepo.updateTask(taskId, { projectId });
    setShowTaskForm(false);
    setEditingTask(null);
    setToast({ message: projectId ? 'プロジェクトに追加しました' : 'プロジェクトから外しました', type: 'success' });
  }, []);

  // Calendar operations
  const handleScheduleTask = useCallback(async (taskId: string, start: Date, end: Date) => {
    await taskRepo.addCalendarSlot(taskId, start, end);
    setToast({ message: 'カレンダーにスケジュールしました', type: 'success' });
  }, []);

  const handleUpdateSlot = useCallback(async (taskId: string, slotId: string, start: Date, end: Date) => {
    await taskRepo.updateCalendarSlot(taskId, slotId, start, end);
  }, []);

  const handleRemoveSlot = useCallback(async (taskId: string, slotId: string) => {
    await taskRepo.removeCalendarSlot(taskId, slotId);
    setToast({ message: 'スケジュールを解除しました', type: 'info' });
  }, []);

  const handleCompleteTaskFromCalendar = useCallback(async (taskId: string) => {
    await taskRepo.completeTask(taskId);
    setToast({ message: 'タスクを完了にしました', type: 'success' });
  }, []);

  const handleSidebarListClick = useCallback((listId: GtdList) => {
    setSidebarActiveList(prev => prev === listId ? null : listId);
  }, []);

  // Project handlers
  const handleAddProject = useCallback(() => {
    setEditingProject(null);
    setProjectTitle('');
    setProjectMemo('');
    setShowProjectForm(true);
  }, []);

  // Add a new task within a project
  const handleAddTaskToProject = useCallback((projectId: string) => {
    setTaskFormList('next_actions');
    setEditingTask(null);
    // Store project id to assign after creation
    setNewTaskProjectId(projectId);
    setShowTaskForm(true);
  }, []);

  // Assign a task to a project (from D&D)
  const handleAssignTaskToProject = useCallback(async (taskId: string, projectId: string) => {
    await taskRepo.updateTask(taskId, { projectId });
    setToast({ message: 'プロジェクトに追加しました', type: 'success' });
  }, []);

  // Empty trash (permanently delete all trashed tasks)
  const handleEmptyTrash = useCallback(async () => {
    const count = await taskRepo.emptyTrash();
    setToast({ message: `ゴミ箱を空にしました（${count}件削除）`, type: 'info' });
  }, []);

  // Clear completed (permanently delete all completed tasks)
  const handleClearCompleted = useCallback(async () => {
    const count = await taskRepo.clearCompleted();
    setToast({ message: `完了済みを削除しました（${count}件削除）`, type: 'info' });
  }, []);

  const handleProjectClick = useCallback((project: Project) => {
    setEditingProject(project);
    setProjectTitle(project.title);
    setProjectMemo(project.memo);
    setShowProjectForm(true);
  }, []);

  const handleProjectSubmit = useCallback(async () => {
    if (!projectTitle.trim()) return;
    if (editingProject) {
      await updateProject(editingProject.id, { title: projectTitle.trim(), memo: projectMemo });
      setToast({ message: 'プロジェクトを更新しました', type: 'success' });
    } else {
      await createProject({ title: projectTitle.trim(), memo: projectMemo, tags: [], priority: 'medium', deadline: null });
      setToast({ message: 'プロジェクトを作成しました', type: 'success' });
    }
    setShowProjectForm(false);
    setEditingProject(null);
    setConfirmDeleteProject(false);
  }, [projectTitle, projectMemo, editingProject, createProject, updateProject]);

  const handleDeleteProject = useCallback(async () => {
    if (!editingProject) return;
    await deleteProject(editingProject.id);
    setShowProjectForm(false);
    setEditingProject(null);
    setConfirmDeleteProject(false);
    setToast({ message: 'プロジェクトを削除しました', type: 'info' });
  }, [editingProject, deleteProject]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header
        currentView={view}
        onViewChange={setView}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        onStartReview={() => setShowReview(true)}
        onOpenExportImport={() => setShowExportImport(true)}
        reviewWarning={needsReview}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          taskCounts={taskCounts}
          onListClick={handleSidebarListClick}
          activeList={sidebarActiveList}
          tasks={tasks}
          onTaskClick={handleCardClick}
          projects={projects}
          onProjectClick={handleProjectClick}
          onAddProject={handleAddProject}
          onAddTaskToProject={handleAddTaskToProject}
          onAssignTaskToProject={handleAssignTaskToProject}
          onEmptyTrash={handleEmptyTrash}
          onClearCompleted={handleClearCompleted}
        />

        <main className="flex-1 p-4 overflow-auto">
          {view === 'kanban' ? (
            <KanbanBoard
              onCardClick={handleCardClick}
              onAddTask={handleAddTask}
            />
          ) : (
            <CalendarView
              tasks={tasks}
              onTaskClick={handleCardClick}
              onScheduleTask={handleScheduleTask}
              onUpdateSlot={handleUpdateSlot}
              onRemoveSlot={handleRemoveSlot}
              onCompleteTask={handleCompleteTaskFromCalendar}
            />
          )}
        </main>
      </div>

      {/* Task Form Modal */}
      <Modal
        isOpen={showTaskForm}
        onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
        title={editingTask ? 'タスクを編集' : 'タスクを追加'}
        size="lg"
      >
        <TaskForm
          initialTask={editingTask || undefined}
          targetList={taskFormList}
          onSubmit={handleTaskSubmit}
          onCancel={() => { setShowTaskForm(false); setEditingTask(null); }}
          onDelete={editingTask ? handleTaskDelete : undefined}
          onComplete={editingTask && !editingTask.isCompleted ? handleTaskComplete : undefined}
          onMoveToList={editingTask ? handleMoveToList : undefined}
          onStartWizard={editingTask ? handleStartWizard : undefined}
          onAssignProject={editingTask ? handleAssignProject : undefined}
          onCreateProject={async (title: string) => {
            const project = await createProject({ title, memo: '', tags: [], priority: 'medium', deadline: null });
            return project;
          }}
          projects={projects}
        />
      </Modal>

      {/* GTD Wizard */}
      <GtdWizard
        isOpen={wizardOpen}
        task={wizardTask}
        onClose={() => { setWizardOpen(false); setWizardTask(null); }}
        onDecision={handleWizardDecision}
        projects={projects}
        onCreateProject={async (title: string) => {
          const project = await createProject({ title, memo: '', tags: [], priority: 'medium', deadline: null });
          return project;
        }}
      />

      {/* Weekly Review Modal */}
      <WeeklyReviewModal
        isOpen={showReview}
        onClose={() => setShowReview(false)}
        onComplete={() => {
          setShowReview(false);
          setToast({ message: '週次レビューを完了しました！', type: 'success' });
        }}
        lastReviewDate={lastReviewDate}
      />

      {/* PIN Auth Modal */}
      <PinAuthModal
        isOpen={showPinAuth}
        onAuthenticated={() => {
          setShowPinAuth(false);
          syncService.init();
          syncService.syncNow();
          setToast({ message: 'PIN認証が完了しました', type: 'success' });
        }}
        onSkip={() => setShowPinAuth(false)}
      />

      {/* Export/Import Modal */}
      <ExportImportModal
        isOpen={showExportImport}
        onClose={() => setShowExportImport(false)}
        onImportComplete={() => {
          setShowExportImport(false);
          setToast({ message: 'データをインポートしました', type: 'success' });
        }}
      />

      {/* Project Form Modal */}
      <Modal
        isOpen={showProjectForm}
        onClose={() => { setShowProjectForm(false); setEditingProject(null); }}
        title={editingProject ? 'プロジェクトを編集' : 'プロジェクトを作成'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">プロジェクト名 *</label>
            <input
              type="text"
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="プロジェクト名を入力..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">メモ</label>
            <textarea
              value={projectMemo}
              onChange={e => setProjectMemo(e.target.value)}
              rows={3}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="プロジェクトのメモ（任意）"
            />
          </div>
          {/* Delete project */}
          {editingProject && (
            <div className="border-t border-gray-200 pt-3">
              {confirmDeleteProject ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700 font-medium mb-2">
                    このプロジェクトと紐づくタスクを全てゴミ箱に移動します。
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteProject}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                    >
                      削除する
                    </button>
                    <button
                      onClick={() => setConfirmDeleteProject(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteProject(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  プロジェクトを削除
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setShowProjectForm(false); setEditingProject(null); setConfirmDeleteProject(false); }}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              キャンセル
            </button>
            <button
              onClick={handleProjectSubmit}
              disabled={!projectTitle.trim()}
              className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingProject ? '更新' : '作成'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
