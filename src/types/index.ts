export type UserRole = 'admin' | 'guru_piket' | 'wali_kelas';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  classId?: string; // If role === 'wali_kelas'
  className?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  level: 'X' | 'XI' | 'XII';
  teacherName: string;
  totalStudents: number;
}

export interface Student {
  id: string;
  nisn: string;
  rfidId: string;
  name: string;
  classId: string;
  className: string;
  gender: 'L' | 'P';
  parentPhone: string;
  status: 'aktif' | 'nonaktif';
  photoUrl: string;
  createdAt: string;
}

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpa';

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  nisn: string;
  className: string;
  rfidId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: AttendanceStatus;
  type: 'rfid' | 'manual';
  notes?: string;
  photoUrl?: string;
  inToleranceWindow?: boolean; // Whether scanned inside the tolerance window
  lateMinutes?: number; // How many minutes late if status === 'terlambat'
}

export interface SchoolSettings {
  schoolName: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  principalName: string;
  principalNip: string;
  timeInStart: string;    // e.g. "06:00" (Gerbang dibuka / mulai scan masuk)
  timeInNormal: string;   // e.g. "07:00" (Jam Bel Masuk Sekolah)
  toleranceMinutes: number; // e.g. 15 (Toleransi Keterlambatan dalam menit)
  timeInLate: string;     // e.g. "07:15" (Batas Akhir Toleransi: timeInNormal + toleranceMinutes)
  timeOutStart: string;   // e.g. "14:30" (Jam Mulai Absen Pulang)
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastChecked?: string;
}

export interface ScanResult {
  student?: Student;
  status: 'success' | 'late' | 'unknown' | 'already';
  message: string;
  timestamp: string;
  timeString: string;
}
