import { useState, useEffect } from 'react';
import { syncService } from '../../services/syncService';
import type { SyncStatus } from '../../types/sync';

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    return syncService.subscribe(setStatus);
  }, []);

  const config: Record<SyncStatus, { color: string; label: string }> = {
    synced: { color: 'bg-green-500', label: '同期済み' },
    syncing: { color: 'bg-yellow-500', label: '同期中...' },
    offline: { color: 'bg-gray-400', label: 'オフライン' },
    error: { color: 'bg-red-500', label: '同期エラー' },
  };

  const { color, label } = config[status];

  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
