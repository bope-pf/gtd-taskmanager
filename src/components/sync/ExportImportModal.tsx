import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { db } from '../../db/database';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ExportImportModal({ isOpen, onClose, onImportComplete }: ExportImportModalProps) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    const tasks = await db.tasks.toArray();
    const projects = await db.projects.toArray();
    const reviews = await db.reviews.toArray();
    const tags = await db.customTags.toArray();

    const data = {
      tasks,
      projects,
      reviews,
      tags,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gtd-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setImporting(true);
    setError('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await db.transaction('rw', [db.tasks, db.projects, db.reviews, db.customTags], async () => {
        await db.tasks.clear();
        await db.projects.clear();
        await db.reviews.clear();
        await db.customTags.clear();

        if (data.tasks) {
          for (const task of data.tasks) {
            // Convert date strings back to Date objects
            if (task.deadline) task.deadline = new Date(task.deadline);
            if (task.calendarSlotStart) task.calendarSlotStart = new Date(task.calendarSlotStart);
            if (task.calendarSlotEnd) task.calendarSlotEnd = new Date(task.calendarSlotEnd);
            if (task.completedAt) task.completedAt = new Date(task.completedAt);
            if (task.createdAt) task.createdAt = new Date(task.createdAt);
            if (task.updatedAt) task.updatedAt = new Date(task.updatedAt);
            if (task.deletedAt) task.deletedAt = new Date(task.deletedAt);
            await db.tasks.put(task);
          }
        }

        if (data.projects) {
          for (const project of data.projects) {
            if (project.deadline) project.deadline = new Date(project.deadline);
            if (project.completedAt) project.completedAt = new Date(project.completedAt);
            if (project.createdAt) project.createdAt = new Date(project.createdAt);
            if (project.updatedAt) project.updatedAt = new Date(project.updatedAt);
            if (project.deletedAt) project.deletedAt = new Date(project.deletedAt);
            await db.projects.put(project);
          }
        }

        if (data.reviews) {
          for (const review of data.reviews) {
            if (review.completedAt) review.completedAt = new Date(review.completedAt);
            await db.reviews.add(review);
          }
        }

        if (data.tags) {
          for (const tag of data.tags) {
            if (tag.createdAt) tag.createdAt = new Date(tag.createdAt);
            await db.customTags.add(tag);
          }
        }
      });

      onImportComplete();
    } catch (e) {
      setError('ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="データのエクスポート / インポート" size="sm">
      <div className="space-y-4">
        {/* Export */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">エクスポート（バックアップ）</h3>
          <p className="text-xs text-gray-500 mb-3">
            すべてのタスク・プロジェクト・レビューデータをJSONファイルとしてダウンロードします。
          </p>
          <button
            onClick={handleExport}
            className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            エクスポート
          </button>
        </div>

        {/* Import */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">インポート（復元）</h3>
          <p className="text-xs text-gray-500 mb-3">
            JSONファイルからデータを復元します。現在のデータは上書きされます。
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            {importing ? 'インポート中...' : 'JSONファイルを選択'}
          </button>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}
