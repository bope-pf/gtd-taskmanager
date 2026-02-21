import { useState, useRef } from 'react';
import type { Task, GtdList, Priority } from '../../types/task';
import type { TaskInput } from '../../types/task';
import type { Project } from '../../types/project';
import { PRIORITIES } from '../../constants/priorities';
import { DEFAULT_TAGS } from '../../constants/defaultTags';
import { GTD_LISTS } from '../../constants/gtdLists';
import { toDateTimeInputValue } from '../../utils/dateUtils';

interface TaskFormProps {
  initialTask?: Task;
  targetList: GtdList;
  onSubmit: (input: TaskInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
  onMoveToList?: (taskId: string, destination: GtdList) => void;
  onStartWizard?: (task: Task) => void;
  onAssignProject?: (taskId: string, projectId: string | null) => void;
  onCreateProject?: (title: string) => Promise<Project>;
  projects?: Project[];
  customTags?: string[];
}

export function TaskForm({
  initialTask,
  targetList,
  onSubmit,
  onCancel,
  onDelete,
  onComplete,
  onMoveToList,
  onStartWizard,
  onAssignProject,
  onCreateProject,
  projects = [],
  customTags = [],
}: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [memo, setMemo] = useState(initialTask?.memo || '');
  const [priority, setPriority] = useState<Priority>(initialTask?.priority || 'medium');
  const [deadline, setDeadline] = useState(
    initialTask?.deadline ? toDateTimeInputValue(initialTask.deadline) : '',
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTask?.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showProjectSubmenu, setShowProjectSubmenu] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const allTags = [
    ...DEFAULT_TAGS.map(t => t.name),
    ...customTags.filter(t => !DEFAULT_TAGS.some(d => d.name === t)),
    ...selectedTags.filter(t =>
      !DEFAULT_TAGS.some(d => d.name === t) && !customTags.includes(t)
    ),
  ];
  const uniqueTags = [...new Set(allTags)];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      memo,
      gtdList: targetList,
      priority,
      deadline: deadline ? new Date(deadline) : null,
      calendarSlotStart: null,
      calendarSlotEnd: null,
      calendarSlots: initialTask?.calendarSlots || [],
      tags: selectedTags,
      projectId: initialTask?.projectId || null,
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  }

  function handleAddCustomTag() {
    const trimmed = newTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags(prev => [...prev, trimmed]);
      setNewTagInput('');
      tagInputRef.current?.focus();
    }
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomTag();
    }
  }

  async function handleCreateNewProject() {
    if (!newProjectName.trim() || !onCreateProject || !initialTask || !onAssignProject) return;
    setIsCreatingProject(true);
    try {
      const project = await onCreateProject(newProjectName.trim());
      onAssignProject(initialTask.id, project.id);
      setShowProjectSubmenu(false);
      setShowMoveMenu(false);
      setNewProjectName('');
    } finally {
      setIsCreatingProject(false);
    }
  }

  // Move destinations (all lists except current)
  const moveDestinations = GTD_LISTS.filter(l => l.id !== targetList && l.id !== 'completed');
  const activeProjects = projects.filter(p => !p.isCompleted && !p.deletedAt);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-base font-semibold text-gray-700 mb-2">タスク名 *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="タスクを入力..."
          autoFocus
          required
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-base font-semibold text-gray-700 mb-2">優先度</label>
        <div className="flex gap-2">
          {PRIORITIES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPriority(p.id)}
              className={`px-4 py-2 text-sm font-medium rounded-xl border-2 transition-all ${
                priority === p.id
                  ? 'border-current font-bold shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              style={priority === p.id ? { color: `var(--color-priority-${p.id})`, borderColor: `var(--color-priority-${p.id})` } : {}}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Deadline */}
      <div>
        <label className="block text-base font-semibold text-gray-700 mb-2">締め切り</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-base font-semibold text-gray-700 mb-2">コンテキストタグ</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {uniqueTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 text-sm font-medium rounded-xl border-2 transition-all ${
                selectedTags.includes(tag)
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        {/* Custom tag input */}
        <div className="flex gap-2">
          <input
            ref={tagInputRef}
            type="text"
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="カスタムタグを入力..."
          />
          <button
            type="button"
            onClick={handleAddCustomTag}
            disabled={!newTagInput.trim()}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              newTagInput.trim()
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            追加
          </button>
        </div>
      </div>

      {/* Memo */}
      <div>
        <label className="block text-base font-semibold text-gray-700 mb-2">メモ</label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={4}
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="メモ（任意）"
        />
      </div>

      {/* Meta info (edit mode) */}
      {initialTask && (
        <div className="text-sm text-gray-400 space-y-1 bg-gray-50 rounded-xl px-4 py-3">
          <div>作成日: {initialTask.createdAt.toLocaleString('ja-JP')}</div>
          <div>更新日: {initialTask.updatedAt.toLocaleString('ja-JP')}</div>
        </div>
      )}

      {/* Move to list / Wizard / Project (edit mode only) */}
      {initialTask && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {/* GTD Wizard button (only for inbox tasks) */}
            {initialTask.gtdList === 'inbox' && onStartWizard && (
              <button
                type="button"
                onClick={() => onStartWizard(initialTask)}
                className="px-4 py-2 text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                🧭 GTD振り分けウィザード
              </button>
            )}

            {/* Move to list button */}
            {onMoveToList && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setShowMoveMenu(prev => !prev); setShowProjectSubmenu(false); }}
                  className="px-4 py-2 text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  📦 リストを移動
                  <svg className={`w-3.5 h-3.5 transition-transform ${showMoveMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMoveMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 min-w-[260px] py-1 max-h-96 overflow-y-auto">
                    {moveDestinations.map(dest => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => {
                          onMoveToList(initialTask.id, dest.id);
                          setShowMoveMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <span>{dest.icon}</span>
                        <span>{dest.name}</span>
                      </button>
                    ))}

                    {/* Project button */}
                    {onAssignProject && (
                      <>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setShowProjectSubmenu(prev => !prev);
                            setTimeout(() => projectInputRef.current?.focus(), 100);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors
                            ${showProjectSubmenu ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                          <span>📁</span>
                          <span>プロジェクト</span>
                          <svg className={`w-3.5 h-3.5 ml-auto transition-transform ${showProjectSubmenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {showProjectSubmenu && (
                          <div className="border-t border-gray-100 bg-gray-50/50">
                            {/* New project creation */}
                            {onCreateProject && (
                              <div className="px-3 py-2 border-b border-gray-100">
                                <div className="text-xs text-gray-400 font-medium mb-1.5 px-1">新しいプロジェクトを作成</div>
                                <div className="flex gap-1.5">
                                  <input
                                    ref={projectInputRef}
                                    type="text"
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateNewProject(); } }}
                                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="プロジェクト名..."
                                    disabled={isCreatingProject}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCreateNewProject}
                                    disabled={!newProjectName.trim() || isCreatingProject}
                                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    作成
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Existing projects */}
                            {activeProjects.length > 0 && (
                              <div className="py-1">
                                <div className="px-4 py-1.5 text-xs text-gray-400 font-medium">既存のプロジェクトを選択</div>
                                {activeProjects.map(project => (
                                  <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => {
                                      onAssignProject(initialTask.id, project.id);
                                      setShowMoveMenu(false);
                                      setShowProjectSubmenu(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors
                                      ${initialTask.projectId === project.id ? 'bg-blue-50 text-blue-700' : ''}`}
                                  >
                                    <span>📁</span>
                                    <span className="truncate">{project.title}</span>
                                    {initialTask.projectId === project.id && <span className="text-blue-500 text-xs ml-auto">✓ 所属中</span>}
                                  </button>
                                ))}
                              </div>
                            )}

                            {activeProjects.length === 0 && !onCreateProject && (
                              <div className="px-4 py-3 text-xs text-gray-400 italic text-center">
                                プロジェクトがありません
                              </div>
                            )}

                            {/* Remove from project */}
                            {initialTask.projectId && (
                              <>
                                <div className="border-t border-gray-200 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAssignProject(initialTask.id, null);
                                    setShowMoveMenu(false);
                                    setShowProjectSubmenu(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
                                >
                                  <span>🚫</span>
                                  <span>プロジェクトから外す</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current project info */}
          {initialTask.projectId && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <span>📁</span>
              <span>プロジェクト: {activeProjects.find(p => p.id === initialTask.projectId)?.title || '不明'}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t-2 border-gray-100">
        <div className="flex gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              削除
            </button>
          )}
          {onComplete && (
            <button
              type="button"
              onClick={onComplete}
              className="px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-xl transition-colors"
            >
              ✅ 完了にする
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            {initialTask ? '更新' : '作成'}
          </button>
        </div>
      </div>
    </form>
  );
}
