import { useLiveQuery } from 'dexie-react-hooks';
import * as reviewRepo from '../db/reviewRepository';
import { WEEKLY_REVIEW_WARNING_DAYS } from '../constants/config';

export function useWeeklyReview() {
  const latestReview = useLiveQuery(
    () => reviewRepo.getLatestReview(),
    [],
  );

  const lastReviewDate = latestReview?.completedAt || null;

  const daysSinceReview = lastReviewDate
    ? Math.floor((Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const needsReview = daysSinceReview === null || daysSinceReview >= WEEKLY_REVIEW_WARNING_DAYS;

  return {
    lastReviewDate,
    daysSinceReview,
    needsReview,
  };
}
