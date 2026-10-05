import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  SchoolClass,
  Student,
  AttendanceLog,
  AttendanceStatus,
  SchoolSettings,
  SupabaseConfig,
  ScanResult,
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_USERS,
  INITIAL_ATTENDANCE_LOGS,
  getTodayDateString,
} from '../lib/initialData';
import {
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
  testSupabaseConnection,
} from '../lib/supabase';
import { sounds } from '../lib/audio';

interface AppContextType {
  // Navigation & Role
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;

  // Data
  settings: SchoolSettings;
  updateSettings: (newSettings: Partial<SchoolSettings>) => void;
  classes: SchoolClass[];
  addClass: (cls: Omit<SchoolClass, 'id' | 'totalStudents'>) => void;
  updateClass: (id: string, cls: Partial<SchoolClass>) => void;
  deleteClass: (id: string) => void;

  students: Student[];
  addStudent: (std: Omit<Student, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  updateStudent: (id: string, std: Partial<Student>) => { success: boolean; error?: string };
  deleteStudent: (id: string) => void;
  bulkImportStudents: (newStudents: Omit<Student, 'id' | 'createdAt'>[]) => {
    success: boolean;
    importedCount: number;
    errors: string[];
  };

  users: User[];
  addUser: (usr: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, usr: Partial<User>) => void;
  deleteUser: (id: string) => void;
  resetUserPassword: (id: string) => string;

  attendanceLogs: AttendanceLog[];
  recordRfidAttendance: (rfidTag: string) => ScanResult;
  recordBulkAttendance: (
    classId: string,
    date: string,
    records: { studentId: string; status: AttendanceStatus; notes?: string }[]
  ) => void;

  // Supabase
  supabaseConfig: SupabaseConfig;
  saveSupabaseCredentials: (url: string, anonKey: string) => Promise<{ success: boolean; message: string }>;
  isSyncing: boolean;
  syncWithSupabase: () => Promise<void>;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local storage keys
  const SETTINGS_KEY = 'rfid_school_settings_v1';
  const CLASSES_KEY = 'rfid_school_classes_v1';
  const STUDENTS_KEY = 'rfid_school_students_v1';
  const USERS_KEY = 'rfid_school_users_v1';
  const ATTENDANCE_KEY = 'rfid_school_attendance_v1';

  // Load from LocalStorage or fall back to InitialData
  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
  });

  const [classes, setClasses] = useState<SchoolClass[]>(() => {
    const saved = localStorage.getItem(CLASSES_KEY);
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STUDENTS_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    const saved = localStorage.getItem(ATTENDANCE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE_LOGS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => INITIAL_USERS[0]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const { url, anonKey } = getSavedSupabaseConfig();
    return {
      url,
      anonKey,
      isConnected: false,
    };
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
    // recalculate class student count
    setClasses((prev) =>
      prev.map((c) => ({
        ...c,
        totalStudents: students.filter((s) => s.classId === c.id && s.status === 'aktif').length,
      }))
    );
  }, [students]);

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceLogs));
  }, [attendanceLogs]);

  // Check Supabase connection on mount if credentials exist
  useEffect(() => {
    if (supabaseConfig.url && supabaseConfig.anonKey) {
      testSupabaseConnection(supabaseConfig.url, supabaseConfig.anonKey).then((res) => {
        setSupabaseConfig((prev) => ({
          ...prev,
          isConnected: res.success,
          lastChecked: new Date().toLocaleTimeString(),
        }));
      });
    }
  }, []);

  const updateSettings = (newSettings: Partial<SchoolSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addClass = (cls: Omit<SchoolClass, 'id' | 'totalStudents'>) => {
    const newClass: SchoolClass = {
      ...cls,
      id: `cls-${Date.now()}`,
      totalStudents: 0,
    };
    setClasses((prev) => [...prev, newClass]);
  };

  const updateClass = (id: string, updated: Partial<SchoolClass>) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
    // Update className in students if name changed
    if (updated.name) {
      setStudents((prev) =>
        prev.map((s) => (s.classId === id ? { ...s, className: updated.name! } : s))
      );
    }
  };

  const deleteClass = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  const addStudent = (std: Omit<Student, 'id' | 'createdAt'>): { success: boolean; error?: string } => {
    // Validate duplicate NISN
    const existNisn = students.some((s) => s.nisn.trim().toLowerCase() === std.nisn.trim().toLowerCase());
    if (existNisn) {
      return { success: false, error: `NISN "${std.nisn}" sudah terdaftar pada siswa lain!` };
    }
    // Validate duplicate RFID
    const existRfid = students.some((s) => s.rfidId.trim().toLowerCase() === std.rfidId.trim().toLowerCase());
    if (existRfid) {
      return { success: false, error: `ID Card RFID "${std.rfidId}" sudah terdaftar pada siswa lain!` };
    }

    const cls = classes.find((c) => c.id === std.classId);
    const newStudent: Student = {
      ...std,
      id: `std-${Date.now()}`,
      className: cls ? cls.name : std.className || 'Tanpa Kelas',
      createdAt: new Date().toISOString(),
    };
    setStudents((prev) => [newStudent, ...prev]);
    return { success: true };
  };

  const updateStudent = (id: string, updated: Partial<Student>): { success: boolean; error?: string } => {
    if (updated.nisn) {
      const existNisn = students.some(
        (s) => s.id !== id && s.nisn.trim().toLowerCase() === updated.nisn!.trim().toLowerCase()
      );
      if (existNisn) return { success: false, error: `NISN "${updated.nisn}" sudah terdaftar!` };
    }
    if (updated.rfidId) {
      const existRfid = students.some(
        (s) => s.id !== id && s.rfidId.trim().toLowerCase() === updated.rfidId!.trim().toLowerCase()
      );
      if (existRfid) return { success: false, error: `ID Card RFID "${updated.rfidId}" sudah terdaftar!` };
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const next = { ...s, ...updated };
          if (updated.classId && updated.classId !== s.classId) {
            const cls = classes.find((c) => c.id === updated.classId);
            if (cls) next.className = cls.name;
          }
          return next;
        }
        return s;
      })
    );
    return { success: true };
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const bulkImportStudents = (newStudentsList: Omit<Student, 'id' | 'createdAt'>[]) => {
    const errors: string[] = [];
    let imported = 0;
    const currentStudents = [...students];

    for (let i = 0; i < newStudentsList.length; i++) {
      const item = newStudentsList[i];
      const rowNum = i + 2; // header is row 1

      if (!item.name || !item.nisn || !item.rfidId) {
        errors.push(`Baris ${rowNum}: Nama, NISN, dan RFID wajib diisi.`);
        continue;
      }

      // Check duplicates in existing or incoming
      const duplicateNisn = currentStudents.some((s) => s.nisn.toLowerCase() === item.nisn.toLowerCase());
      if (duplicateNisn) {
        errors.push(`Baris ${rowNum}: NISN "${item.nisn}" sudah digunakan.`);
        continue;
      }

      const duplicateRfid = currentStudents.some((s) => s.rfidId.toLowerCase() === item.rfidId.toLowerCase());
      if (duplicateRfid) {
        errors.push(`Baris ${rowNum}: ID RFID "${item.rfidId}" sudah digunakan.`);
        continue;
      }

      const matchedClass = classes.find(
        (c) => c.name.toLowerCase() === (item.className || '').toLowerCase() || c.id === item.classId
      );

      const added: Student = {
        ...item,
        id: `std-${Date.now()}-${i}`,
        classId: matchedClass ? matchedClass.id : classes[0]?.id || 'cls-1',
        className: matchedClass ? matchedClass.name : classes[0]?.name || 'Umum',
        createdAt: new Date().toISOString(),
      };

      currentStudents.push(added);
      imported++;
    }

    if (imported > 0) {
      setStudents(currentStudents);
    }

    return {
      success: imported > 0,
      importedCount: imported,
      errors,
    };
  };

  const addUser = (usr: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...usr,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, updated: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const resetUserPassword = (id: string): string => {
    // Generate temporary 8-char secure password
    const tempPass = 'Absen#' + Math.floor(1000 + Math.random() * 9000);
    return tempPass;
  };

  /**
   * Central RFID Scan Logic for Kiosk & Reader
   */
  const recordRfidAttendance = (rfidRaw: string): ScanResult => {
    const cleanTag = rfidRaw.trim();
    const now = new Date();
    const today = getTodayDateString();
    const timeString = now.toTimeString().split(' ')[0]; // "07:15:30"
    const [currHours, currMinutes] = [now.getHours(), now.getMinutes()];
    const currentMinutesFromMidnight = currHours * 60 + currMinutes;

    // Parse normal arrival time & tolerance window
    const normalTimeStr = settings.timeInNormal || '07:00';
    const toleranceMins = Number(settings.toleranceMinutes ?? 15);
    const [normH, normM] = normalTimeStr.split(':').map(Number);
    const normalMinutesFromMidnight = normH * 60 + normM;

    // Effective late threshold: Jam Masuk + Toleransi Keterlambatan
    const effectiveLateMinutesFromMidnight = normalMinutesFromMidnight + toleranceMins;

    // Find student matching RFID
    const student = students.find(
      (s) => s.rfidId.trim().toLowerCase() === cleanTag.toLowerCase()
    );

    if (!student) {
      sounds.playError();
      return {
        status: 'unknown',
        message: 'KARTU RFID TIDAK TERDAFTAR!',
        timestamp: now.toISOString(),
        timeString,
      };
    }

    if (student.status === 'nonaktif') {
      sounds.playError();
      return {
        student,
        status: 'unknown',
        message: 'STATUS SISWA TIDAK AKTIF!',
        timestamp: now.toISOString(),
        timeString,
      };
    }

    // Check if already scanned today
    const existingLog = attendanceLogs.find(
      (l) => l.studentId === student.id && l.date === today
    );

    // Evaluate attendance status considering tolerance
    const isPastTolerance = currentMinutesFromMidnight > effectiveLateMinutesFromMidnight;
    const isWithinTolerance =
      currentMinutesFromMidnight > normalMinutesFromMidnight &&
      currentMinutesFromMidnight <= effectiveLateMinutesFromMidnight;

    const finalStatus: AttendanceStatus = isPastTolerance ? 'terlambat' : 'hadir';

    let displayMessage = '';
    if (isPastTolerance) {
      const lateMins = currentMinutesFromMidnight - normalMinutesFromMidnight;
      displayMessage = `TERLAMBAT (+${lateMins} MNT)`;
    } else if (isWithinTolerance) {
      const overMins = currentMinutesFromMidnight - normalMinutesFromMidnight;
      displayMessage = `HADIR (TOLERANSI: +${overMins} MNT)`;
    } else {
      displayMessage = `HADIR TEPAT WAKTU (${timeString.substring(0, 5)})`;
    }

    if (existingLog) {
      // Check interval: if already recorded today, notify user
      sounds.playWarning();
      return {
        student,
        status: 'already',
        message: `SUDAH ABSEN HARI INI (${existingLog.time.substring(0, 5)}) - ${existingLog.status.toUpperCase()}`,
        timestamp: now.toISOString(),
        timeString,
      };
    }

    // New Attendance Log
    const newLog: AttendanceLog = {
      id: `att-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn,
      className: student.className,
      rfidId: student.rfidId,
      date: today,
      time: timeString,
      status: finalStatus,
      type: 'rfid',
      photoUrl: student.photoUrl,
      inToleranceWindow: isWithinTolerance,
      lateMinutes: isPastTolerance ? currentMinutesFromMidnight - normalMinutesFromMidnight : 0,
    };

    setAttendanceLogs((prev) => [newLog, ...prev]);

    // Play appropriate sound
    if (finalStatus === 'hadir') {
      sounds.playSuccess();
    } else {
      sounds.playWarning();
    }

    // If Supabase is connected, optionally push to Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('attendance_logs').insert([
        {
          id: newLog.id,
          student_id: newLog.studentId,
          student_name: newLog.studentName,
          nisn: newLog.nisn,
          class_name: newLog.className,
          rfid_id: newLog.rfidId,
          date: newLog.date,
          time: newLog.time,
          status: newLog.status,
          type: newLog.type,
          photo_url: newLog.photoUrl,
        },
      ]).then(() => {});
    }

    return {
      student,
      status: isPastTolerance ? 'late' : 'success',
      message: displayMessage,
      timestamp: now.toISOString(),
      timeString,
    };
  };

  /**
   * Bulk Manual Attendance Commit
   */
  const recordBulkAttendance = (
    classId: string,
    date: string,
    records: { studentId: string; status: AttendanceStatus; notes?: string }[]
  ) => {
    const timeNow = new Date().toTimeString().split(' ')[0];
    const newLogs: AttendanceLog[] = [];

    // Filter out existing logs for these students on this date so we overwrite/update them
    const studentIds = new Set(records.map((r) => r.studentId));
    const filteredExisting = attendanceLogs.filter(
      (l) => !(l.date === date && studentIds.has(l.studentId))
    );

    records.forEach((rec) => {
      const student = students.find((s) => s.id === rec.studentId);
      if (student) {
        newLogs.push({
          id: `att-manual-${Date.now()}-${rec.studentId}`,
          studentId: student.id,
          studentName: student.name,
          nisn: student.nisn,
          className: student.className,
          rfidId: student.rfidId,
          date: date,
          time: timeNow,
          status: rec.status,
          type: 'manual',
          notes: rec.notes,
          photoUrl: student.photoUrl,
        });
      }
    });

    setAttendanceLogs([...newLogs, ...filteredExisting]);
  };

  /**
   * Save and verify Supabase credentials
   */
  const saveSupabaseCredentials = async (url: string, anonKey: string) => {
    saveSupabaseConfig(url, anonKey);
    const result = await testSupabaseConnection(url, anonKey);
    setSupabaseConfig({
      url,
      anonKey,
      isConnected: result.success,
      lastChecked: new Date().toLocaleTimeString(),
    });
    return result;
  };

  /**
   * Sync data from Supabase if connected
   */
  const syncWithSupabase = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const [clsRes, stdRes, attRes] = await Promise.all([
        supabase.from('classes').select('*'),
        supabase.from('students').select('*'),
        supabase.from('attendance_logs').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      if (clsRes.data && clsRes.data.length > 0) {
        setClasses(clsRes.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          teacherName: c.teacher_name,
          totalStudents: c.total_students || 0,
        })));
      }
      if (stdRes.data && stdRes.data.length > 0) {
        setStudents(stdRes.data.map((s: any) => ({
          id: s.id,
          nisn: s.nisn,
          rfidId: s.rfid_id,
          name: s.name,
          classId: s.class_id,
          className: s.class_name,
          gender: s.gender,
          parentPhone: s.parent_phone,
          status: s.status,
          photoUrl: s.photo_url,
          createdAt: s.created_at,
        })));
      }
      if (attRes.data && attRes.data.length > 0) {
        setAttendanceLogs(attRes.data.map((a: any) => ({
          id: a.id,
          studentId: a.student_id,
          studentName: a.student_name,
          nisn: a.nisn,
          className: a.class_name,
          rfidId: a.rfid_id,
          date: a.date,
          time: a.time,
          status: a.status,
          type: a.type,
          notes: a.notes,
          photoUrl: a.photo_url,
        })));
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetToDefaultData = () => {
    if (confirm('Kembalikan semua data ke setelan demo awal?')) {
      localStorage.clear();
      setSettings(INITIAL_SETTINGS);
      setClasses(INITIAL_CLASSES);
      setStudents(INITIAL_STUDENTS);
      setUsers(INITIAL_USERS);
      setAttendanceLogs(INITIAL_ATTENDANCE_LOGS);
      window.location.reload();
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        settings,
        updateSettings,
        classes,
        addClass,
        updateClass,
        deleteClass,
        students,
        addStudent,
        updateStudent,
        deleteStudent,
        bulkImportStudents,
        users,
        addUser,
        updateUser,
        deleteUser,
        resetUserPassword,
        attendanceLogs,
        recordRfidAttendance,
        recordBulkAttendance,
        supabaseConfig,
        saveSupabaseCredentials,
        isSyncing,
        syncWithSupabase,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
