import type { GtdList } from '../../types/task';

export interface WizardNode {
  id: string;
  question: string;
  options: WizardOption[];
}

export interface WizardOption {
  label: string;
  nextNodeId?: string;       // If present, go to next question
  destination?: GtdList;      // If present, this is a final destination
  message?: string;           // Optional message to show
  isProject?: boolean;        // If true, this should be handled as a project assignment
}

export const GTD_FLOW: WizardNode[] = [
  {
    id: 'actionable',
    question: 'これは行動を起こせるものですか？',
    options: [
      { label: 'はい、行動が必要', nextNodeId: 'two_minutes' },
      { label: 'いいえ、行動不要', nextNodeId: 'not_actionable' },
    ],
  },
  {
    id: 'not_actionable',
    question: 'この項目はどうしますか？',
    options: [
      { label: 'いつかやるかもしれない', destination: 'someday_maybe', message: '「いつかやる／多分やる」リストに移動します' },
      { label: '参考資料として保存', destination: 'reference', message: '「資料」に移動します' },
      { label: '不要なので捨てる', destination: 'trash', message: '「ゴミ箱」に移動します' },
    ],
  },
  {
    id: 'two_minutes',
    question: '2分以内に完了できますか？',
    options: [
      { label: 'はい、すぐできる', destination: 'completed', message: '今すぐやりましょう！完了にします' },
      { label: 'いいえ、時間がかかる', nextNodeId: 'who_does' },
    ],
  },
  {
    id: 'who_does',
    question: '自分がやるべきことですか？',
    options: [
      { label: 'はい、自分でやる', nextNodeId: 'single_or_project' },
      { label: 'いいえ、誰かに依頼する', destination: 'waiting_for', message: '依頼して「連絡待ち」リストに移動します' },
    ],
  },
  {
    id: 'single_or_project',
    question: '1つの行動で完了しますか？',
    options: [
      { label: 'はい、1つの行動でOK', nextNodeId: 'has_deadline' },
      { label: 'いいえ、複数のステップが必要（プロジェクト）', destination: 'next_actions', message: 'プロジェクトに追加します。プロジェクトを選択してタスクを管理しましょう', isProject: true },
    ],
  },
  {
    id: 'has_deadline',
    question: '特定の日時にやる必要がありますか？',
    options: [
      { label: 'はい、日時が決まっている', destination: 'calendar', message: '「カレンダー」に移動します' },
      { label: 'いいえ、空き時間にやる', destination: 'next_actions', message: '「次にとるべき行動」リストに移動します' },
    ],
  },
];

export function getNode(id: string): WizardNode | undefined {
  return GTD_FLOW.find(n => n.id === id);
}
