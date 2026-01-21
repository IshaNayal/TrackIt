// types/timetable.ts
export type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface TimetableEntry {
  id: string;
  name: string;
  day: WeekDay;
  startTime: string;
  endTime: string;
  notificationId?: string;
}


