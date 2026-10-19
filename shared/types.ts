export type Role = "owner" | "admin" | "teacher" | "accountant";
export interface User {
  id: string;
  login: string;
  first_name: string;
  last_name: string;
  position: string;
  role: Role;
  branch_id: string | null;
  avatar_id: string | null;
  status: string;
  must_change_password: boolean;
  hourly_rate?: string;
}
export interface Branch {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  max_accuracy_m: number;
}
export interface Lesson {
  id: string;
  teacher_id: string;
  branch_id: string;
  subject: string;
  group_name: string;
  room: string;
  starts_at: string;
  ends_at: string;
  status: string;
  first_name?: string;
  last_name?: string;
}
export interface Attendance {
  id: string;
  teacher_id: string;
  lesson_id: string;
  state: string;
  approval: string;
  started_at: string;
  ended_at: string | null;
  breaks: Array<{ start: string; end: string | null }>;
  subject?: string;
  group_name?: string;
  room?: string;
  first_name?: string;
  last_name?: string;
  planned_start: string;
  planned_end: string;
  hourly_rate: string;
  reason: string | null;
}
