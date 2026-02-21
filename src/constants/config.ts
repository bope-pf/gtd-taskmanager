export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const NOTIFICATION_CHECK_INTERVAL = 15 * 60 * 1000; // 15分
export const NOTIFICATION_DAYS_BEFORE = [3, 1]; // 3日前と1日前

export const WEEKLY_REVIEW_WARNING_DAYS = 7;

export const CALENDAR_START_HOUR = 0;
export const CALENDAR_DAY_START_HOUR = 6;
export const CALENDAR_END_HOUR = 24;
export const CALENDAR_SLOT_MINUTES = 30;
