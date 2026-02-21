export interface ReviewChecklist {
  inboxCleared: boolean;
  nextActionsReviewed: boolean;
  waitingForChecked: boolean;
  projectsReviewed: boolean;
  somedayMaybeReviewed: boolean;
  calendarChecked: boolean;
}

export interface WeeklyReview {
  id?: number;
  checklist: ReviewChecklist;
  completedAt: Date;
}
