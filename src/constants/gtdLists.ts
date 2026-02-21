import type { GtdList } from '../types/task';

export interface GtdListConfig {
  id: GtdList;
  name: string;
  icon: string;
  colorClass: string;
  isMainColumn: boolean;
}

export const GTD_LISTS: GtdListConfig[] = [
  { id: 'inbox', name: 'インボックス', icon: '📥', colorClass: 'bg-inbox', isMainColumn: true },
  { id: 'next_actions', name: '次にとるべき行動', icon: '⚡', colorClass: 'bg-next-actions', isMainColumn: true },
  { id: 'waiting_for', name: '連絡待ち', icon: '⏳', colorClass: 'bg-waiting-for', isMainColumn: true },
  { id: 'calendar', name: 'カレンダー', icon: '📅', colorClass: 'bg-calendar', isMainColumn: false },
  { id: 'someday_maybe', name: 'いつかやる／多分やる', icon: '💭', colorClass: 'bg-someday-maybe', isMainColumn: false },
  { id: 'reference', name: '資料', icon: '📂', colorClass: 'bg-reference', isMainColumn: false },
  { id: 'trash', name: 'ゴミ箱', icon: '🗑️', colorClass: 'bg-trash', isMainColumn: false },
  { id: 'completed', name: '完了済み', icon: '✅', colorClass: 'bg-completed', isMainColumn: false },
];

export const MAIN_COLUMNS: GtdList[] = ['inbox', 'next_actions', 'waiting_for'];
export const SIDEBAR_LISTS: GtdList[] = ['someday_maybe', 'reference', 'trash', 'completed'];

export function getListConfig(listId: GtdList): GtdListConfig {
  return GTD_LISTS.find(l => l.id === listId)!;
}
