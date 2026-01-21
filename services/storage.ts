import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeekDay, TimetableEntry } from '../types/timetable';

type WorkingDayStatus = 'attended' | 'missed';

export type SemesterStats = {
  totalWorkingDays: number;
  attendedDays: number;
  percentage: number;
};

const TIMETABLE_KEY = 'TIMETABLE';
const ATTENDANCE_KEY = 'ATTENDANCE';
const WORKING_DAYS_KEY = 'WORKING_DAYS';
const SEMESTER_STATS_KEY = 'SEMESTER_STATS';

export const getTimetable = async (): Promise<TimetableEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(TIMETABLE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveTimetable = async (timetable: TimetableEntry[]) => {
  await AsyncStorage.setItem(TIMETABLE_KEY, JSON.stringify(timetable));
};

export const getAttendance = async (): Promise<Record<string, Record<string, boolean>>> => {
  try {
    const data = await AsyncStorage.getItem(ATTENDANCE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const saveAttendance = async (date: string, subjects: Record<string, boolean>) => {
  try {
    const attendance = await getAttendance();
    attendance[date] = subjects;
    await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
  } catch (error) {
    console.log('Save attendance error:', error);
  }
};

export const getTodayAttendance = async (date: string): Promise<Record<string, boolean>> => {
  const attendance = await getAttendance();
  return attendance[date] || {};
};

export const getWorkingDays = async (): Promise<Record<string, WorkingDayStatus>> => {
  try {
    const data = await AsyncStorage.getItem(WORKING_DAYS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const saveWorkingDays = async (days: Record<string, WorkingDayStatus>) => {
  await AsyncStorage.setItem(WORKING_DAYS_KEY, JSON.stringify(days));
};

export const getSemesterStats = async (): Promise<SemesterStats | null> => {
  try {
    const data = await AsyncStorage.getItem(SEMESTER_STATS_KEY);
    return data ? (JSON.parse(data) as SemesterStats) : null;
  } catch {
    return null;
  }
};

export const saveSemesterStats = async (stats: SemesterStats) => {
  await AsyncStorage.setItem(SEMESTER_STATS_KEY, JSON.stringify(stats));
};

export { TimetableEntry };
export type { WeekDay };

