import { db } from './database';
import type { WeeklyReview, ReviewChecklist } from '../types/review';

export async function saveReview(checklist: ReviewChecklist): Promise<WeeklyReview> {
  const review: WeeklyReview = {
    checklist,
    completedAt: new Date(),
  };
  const id = await db.reviews.add(review);
  return { ...review, id: id as number };
}

export async function getLatestReview(): Promise<WeeklyReview | undefined> {
  return db.reviews.orderBy('completedAt').last();
}

export async function getAllReviews(): Promise<WeeklyReview[]> {
  return db.reviews.orderBy('completedAt').reverse().toArray();
}
