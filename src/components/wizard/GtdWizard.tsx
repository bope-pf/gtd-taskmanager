import { useState } from 'react';
import type { Task, GtdList } from '../../types/task';
import type { Project } from '../../types/project';
import { Modal } from '../ui/Modal';
import { getNode, type WizardOption } from './gtdFlowConfig';

interface GtdWizardProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onDecision: (task: Task, destination: GtdList, projectId?: string) => void;
  projects?: Project[];
  onCreateProject?: (title: string) => Promise<Project>;
}

export function GtdWizard({ isOpen, task, onClose, onDecision, projects = [], onCreateProject }: GtdWizardProps) {
  const [currentNodeId, setCurrentNodeId] = useState('actionable');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultDestination, setResultDestination] = useState<GtdList | null>(null);
  const [isProjectResult, setIsProjectResult] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const currentNode = getNode(currentNodeId);

  function handleReset() {
    setCurrentNodeId('actionable');
    setResultMessage(null);
    setResultDestination(null);
    setIsProjectResult(false);
    setSelectedProjectId(null);
    setShowNewProjectInput(false);
    setNewProjectTitle('');
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  function handleOptionClick(option: WizardOption) {
    if (option.destination) {
      setResultMessage(option.message || null);
      setResultDestination(option.destination);
      if (option.isProject) {
        setIsProjectResult(true);
        const active = projects.filter(p => !p.isCompleted && !p.deletedAt);
        if (active.length > 0) {
          setSelectedProjectId(active[0].id);
        }
      }
    } else if (option.nextNodeId) {
      setCurrentNodeId(option.nextNodeId);
    }
  }

  async function handleCreateNewProject() {
    if (!newProjectTitle.trim() || !onCreateProject) return;
    setCreatingProject(true);
    try {
      const newProject = await onCreateProject(newProjectTitle.trim());
      setSelectedProjectId(newProject.id);
      setShowNewProjectInput(false);
      setNewProjectTitle('');
    } finally {
      setCreatingProject(false);
    }
  }

  function handleConfirm() {
    if (task && resultDestination) {
      onDecision(task, resultDestination, isProjectResult ? (selectedProjectId || undefined) : undefined);
    }
    handleReset();
  }

  if (!task) return null;

  const activeProjects = projects.filter(p => !p.isCompleted && !p.deletedAt);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="GTD 振り分けウィザード" size="md">
      <div className="space-y-4">
        {/* Task being processed */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 mb-1">処理するタスク:</p>
          <p className="text-sm font-medium text-blue-800">{task.title}</p>
        </div>

        {/* Result or Question */}
        {resultDestination ? (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-700">{resultMessage}</p>
            </div>

            {/* Project selector - shown when isProject result */}
            {isProjectResult && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  プロジェクトを選択:
                </label>

                {/* Existing projects */}
                {activeProjects.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {activeProjects.map(project => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setShowNewProjectInput(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all text-sm flex items-center gap-2
                          ${selectedProjectId === project.id && !showNewProjectInput
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                      >
                        <span>📁</span>
                        <span className="flex-1 truncate">{project.title}</span>
                        {selectedProjectId === project.id && !showNewProjectInput && <span className="text-blue-500">✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* New project creation */}
                {onCreateProject && (
                  <>
                    {!showNewProjectInput ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewProjectInput(true);
                          setSelectedProjectId(null);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-2 transition-all"
                      >
                        <span>➕</span>
                        <span>新しいプロジェクトを作成</span>
                      </button>
                    ) : (
                      <div className="border-2 border-blue-400 rounded-lg p-3 bg-blue-50/50 space-y-2">
                        <div className="text-xs text-blue-600 font-medium">新しいプロジェクト:</div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newProjectTitle}
                            onChange={(e) => setNewProjectTitle(e.target.value)}
                            placeholder="プロジェクト名を入力..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateNewProject();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleCreateNewProject}
                            disabled={!newProjectTitle.trim() || creatingProject}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {creatingProject ? '...' : '作成'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewProjectInput(false);
                            setNewProjectTitle('');
                            if (activeProjects.length > 0) {
                              setSelectedProjectId(activeProjects[0].id);
                            }
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          キャンセル
                        </button>
                      </div>
                    )}
                  </>
                )}

                {activeProjects.length === 0 && !onCreateProject && (
                  <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-3">
                    プロジェクトがありません。サイドバーからプロジェクトを作成してください。
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                やり直す
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProjectResult && !selectedProjectId}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                確定する
              </button>
            </div>
          </div>
        ) : currentNode ? (
          <div className="space-y-3">
            <h3 className="text-base font-medium text-gray-800">{currentNode.question}</h3>
            <div className="space-y-2">
              {currentNode.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionClick(option)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {currentNodeId !== 'actionable' && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 mt-2"
              >
                最初からやり直す
              </button>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
