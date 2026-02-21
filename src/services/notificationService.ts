import { db } from '../db/database';
import { NOTIFICATION_CHECK_INTERVAL, NOTIFICATION_DAYS_BEFORE } from '../constants/config';
import { daysUntil } from '../utils/dateUtils';

const WEEKLY_REVIEW_STORAGE_KEY = 'gtd_weekly_review_notified';

class NotificationService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onWeeklyReviewNeeded: (() => void) | null = null;

  async init() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    this.startChecking();
  }

  /** Register callback for when weekly review notification is triggered */
  setWeeklyReviewCallback(callback: () => void) {
    this.onWeeklyReviewNeeded = callback;
  }

  private startChecking() {
    // Check immediately
    this.checkDeadlines();
    this.checkWeeklyReview();

    // Then check periodically
    this.intervalId = setInterval(() => {
      this.checkDeadlines();
      this.checkWeeklyReview();
    }, NOTIFICATION_CHECK_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkDeadlines() {
    if (Notification.permission !== 'granted') return;

    const tasks = await db.tasks
      .filter(t => t.deadline !== null && !t.isCompleted && t.deletedAt === null)
      .toArray();

    for (const task of tasks) {
      if (!task.deadline) continue;
      const days = daysUntil(task.deadline);

      for (const daysBefore of NOTIFICATION_DAYS_BEFORE) {
        if (days <= daysBefore && days >= 0) {
          const alreadySent = await db.sentNotifications
            .where('[taskId+daysBefore]')
            .equals([task.id, daysBefore])
            .count();

          if (alreadySent === 0) {
            this.sendNotification(task.title, daysBefore);
            await db.sentNotifications.add({
              taskId: task.id,
              daysBefore,
              sentAt: new Date(),
            });
          }
        }
      }
    }
  }

  private checkWeeklyReview() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const hour = now.getHours();

    // Check if it's Sunday at 9:00 or later
    if (dayOfWeek !== 0 || hour < 9) return;

    // Check if we already notified this week
    const lastNotified = localStorage.getItem(WEEKLY_REVIEW_STORAGE_KEY);
    if (lastNotified) {
      const lastDate = new Date(lastNotified);
      // If notified today (same date), skip
      if (
        lastDate.getFullYear() === now.getFullYear() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getDate() === now.getDate()
      ) {
        return;
      }
    }

    // Mark as notified today
    localStorage.setItem(WEEKLY_REVIEW_STORAGE_KEY, now.toISOString());

    // Send browser notification
    if (Notification.permission === 'granted') {
      const notification = new Notification('GTD タスクマネージャー', {
        body: '週次レビューの時間です！タスクを見直して整理しましょう。',
        icon: '/claude-code/favicon.ico',
        tag: 'weekly-review',
      });

      notification.onclick = () => {
        window.focus();
        this.onWeeklyReviewNeeded?.();
        notification.close();
      };
    }

    // Also trigger in-app callback
    this.onWeeklyReviewNeeded?.();
  }

  private sendNotification(taskTitle: string, daysBefore: number) {
    const body = daysBefore === 0
      ? `「${taskTitle}」の期限は今日です！`
      : `「${taskTitle}」の期限まであと${daysBefore}日です`;

    new Notification('GTD タスクマネージャー', {
      body,
      icon: '/claude-code/favicon.ico',
      tag: `deadline-${taskTitle}-${daysBefore}`,
    });
  }
}

export const notificationService = new NotificationService();
