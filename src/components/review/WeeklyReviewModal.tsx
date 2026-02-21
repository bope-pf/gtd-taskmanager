import { useState } from 'react';
import { Modal } from '../ui/Modal';
import type { ReviewChecklist } from '../../types/review';
import * as reviewRepo from '../../db/reviewRepository';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  lastReviewDate: Date | null;
}

const REVIEW_ITEMS: { key: keyof ReviewChecklist; label: string; description: string; icon: string }[] = [
  { key: 'inboxCleared', label: 'インボックスを空にする', description: '未処理のタスクをすべて振り分けましたか？', icon: '📥' },
  { key: 'nextActionsReviewed', label: '次にとるべき行動を見直す', description: 'アクションリストは最新の状態ですか？', icon: '⚡' },
  { key: 'waitingForChecked', label: '連絡待ちを確認する', description: '待ちの項目にフォローアップは必要ですか？', icon: '⏳' },
  { key: 'projectsReviewed', label: 'プロジェクトの進捗を確認', description: '各プロジェクトの次のアクションは明確ですか？', icon: '📋' },
  { key: 'somedayMaybeReviewed', label: 'いつかやるリストを見直す', description: '今すぐ着手するものはありますか？', icon: '💭' },
  { key: 'calendarChecked', label: 'カレンダーの予定を確認', description: '来週の予定に漏れはありませんか？', icon: '📅' },
];

export function WeeklyReviewModal({ isOpen, onClose, onComplete, lastReviewDate }: WeeklyReviewModalProps) {
  const [checklist, setChecklist] = useState<ReviewChecklist>({
    inboxCleared: false,
    nextActionsReviewed: false,
    waitingForChecked: false,
    projectsReviewed: false,
    somedayMaybeReviewed: false,
    calendarChecked: false,
  });

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const allChecked = checkedCount === totalCount;
  const progressPercent = Math.round((checkedCount / totalCount) * 100);

  function toggleItem(key: keyof ReviewChecklist) {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleComplete() {
    await reviewRepo.saveReview(checklist);
    setChecklist({
      inboxCleared: false,
      nextActionsReviewed: false,
      waitingForChecked: false,
      projectsReviewed: false,
      somedayMaybeReviewed: false,
      calendarChecked: false,
    });
    onComplete();
  }

  const daysSinceLastReview = lastReviewDate
    ? Math.floor((Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📝 週次レビュー" size="lg">
      <div className="space-y-6">
        {/* Header section */}
        <div className="text-center">
          <p className="text-lg text-gray-600">
            GTDシステムを最新の状態に保ちましょう
          </p>
        </div>

        {/* Last review info */}
        {daysSinceLastReview !== null ? (
          <div className={`flex items-center gap-4 px-5 py-4 rounded-xl ${
            daysSinceLastReview > 7
              ? 'bg-orange-50 border-2 border-orange-200'
              : 'bg-green-50 border-2 border-green-200'
          }`}>
            <span className="text-3xl">{daysSinceLastReview > 7 ? '⚠️' : '✅'}</span>
            <div>
              <div className={`text-lg font-semibold ${
                daysSinceLastReview > 7 ? 'text-orange-800' : 'text-green-800'
              }`}>
                前回のレビュー: {daysSinceLastReview}日前
              </div>
              {daysSinceLastReview > 7 && (
                <div className="text-base text-orange-600 mt-1">
                  7日以上経過しています。レビューを行いましょう！
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-blue-50 border-2 border-blue-200">
            <span className="text-3xl">🆕</span>
            <div className="text-lg text-blue-800 font-medium">
              初めての週次レビューです。始めましょう！
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-base font-medium text-gray-700">進捗</span>
            <span className="text-base font-bold text-blue-600">{checkedCount} / {totalCount} 完了</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: allChecked ? '#16a34a' : '#3b82f6',
              }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-3">
          {REVIEW_ITEMS.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleItem(item.key)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all duration-200 text-left ${
                checklist[item.key]
                  ? 'bg-green-50 border-green-300 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-base font-semibold ${
                  checklist[item.key] ? 'text-green-700 line-through' : 'text-gray-800'
                }`}>
                  {item.label}
                </div>
                <div className={`text-sm mt-0.5 ${
                  checklist[item.key] ? 'text-green-500' : 'text-gray-500'
                }`}>
                  {item.description}
                </div>
              </div>
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                checklist[item.key]
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300'
              }`}>
                {checklist[item.key] && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 text-base font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            閉じる
          </button>
          <button
            onClick={handleComplete}
            disabled={!allChecked}
            className={`px-8 py-3 text-base font-bold rounded-xl transition-all duration-200 ${
              allChecked
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {allChecked ? '🎉 レビュー完了！' : 'レビュー完了'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
