import type { ReactNode } from 'react';
import { SyncStatusIndicator } from '../sync/SyncStatusIndicator';

type ViewMode = 'kanban' | 'calendar';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onToggleSidebar: () => void;
  onStartReview: () => void;
  onOpenExportImport: () => void;
  reviewWarning: boolean;
  rightSlot?: ReactNode;
}

export function Header({
  currentView,
  onViewChange,
  onToggleSidebar,
  onStartReview,
  onOpenExportImport,
  reviewWarning,
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-gray-700 p-1.5"
          title="メニュー"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-800">GTD タスクマネージャー</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => onViewChange('kanban')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              currentView === 'kanban'
                ? 'bg-white shadow-sm text-gray-800 font-semibold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            カンバン
          </button>
          <button
            onClick={() => onViewChange('calendar')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              currentView === 'calendar'
                ? 'bg-white shadow-sm text-gray-800 font-semibold'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            カレンダー
          </button>
        </div>

        {/* Weekly review button */}
        <button
          onClick={onStartReview}
          className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
            reviewWarning
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="週次レビュー"
        >
          週次レビュー
          {reviewWarning && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full" />
          )}
        </button>

        {/* Export/Import button */}
        <button
          onClick={onOpenExportImport}
          className="px-2.5 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
          title="データ管理"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>

        {/* Sync status */}
        <SyncStatusIndicator />
      </div>
    </header>
  );
}
