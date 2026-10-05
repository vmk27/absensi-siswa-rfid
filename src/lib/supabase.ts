import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SchoolSettings, Student, SchoolClass, AttendanceLog, User } from '../types';

const SUPABASE_URL_KEY = 'rfid_school_supabase_url';
const SUPABASE_KEY_KEY = 'rfid_school_supabase_key';

let cachedClient: SupabaseClient | null = null;

export function getSavedSupabaseConfig(): { url: string; anonKey: string } {
  if (typeof window === 'undefined') {
    return { url: '', anonKey: '' };
  }
  const url = localStorage.getItem(SUPABASE_URL_KEY) || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const anonKey = localStorage.getItem(SUPABASE_KEY_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_KEY_KEY, anonKey.trim());
    cachedClient = null; // reset client
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = getSavedSupabaseConfig();
  if (url && anonKey && url.startsWith('http')) {
    try {
      cachedClient = createClient(url, anonKey);
      return cachedClient;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return null;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL dan Public Anon Key tidak boleh kosong.' };
  }
  try {
    const tempClient = createClient(url, anonKey);
    // Try pinging or querying a table
    const { error } = await tempClient.from('classes').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, it's still connected to Supabase
      if (error.message.includes('relation "public.classes" does not exist') || error.code === '42P01') {
        return {
          success: true,
          message: 'Berhasil terhubung ke Supabase! (Catatan: Tabel belum dibuat, silakan jalankan skrip SQL).'
        };
      }
      return { success: false, message: `Error Supabase: ${error.message}` };
    }
    return { success: true, message: 'Koneksi ke Supabase berhasil dan siap digunakan!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal menyambung ke server Supabase.' };
  }
}

/**
 * SQL migration schema generator for Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- SKRIP SKEMA DATABASE ABSENSI SEKOLAH RFID UNTUK SUPABASE
-- Salin dan jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query

-- 1. Tabel Konfigurasi Sekolah
CREATE TABLE IF NOT EXISTS public.school_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  school_name TEXT NOT NULL DEFAULT 'SMA NEGERI 1 NUSANTARA',
  npsn TEXT DEFAULT '20104567',
  address TEXT DEFAULT 'Jl. Pendidikan Merdeka No. 45, Jakarta Pusat',
  phone TEXT DEFAULT '(021) 3840123',
  email TEXT DEFAULT 'info@sman1nusantara.sch.id',
  website TEXT DEFAULT 'www.sman1nusantara.sch.id',
  logo_url TEXT,
  principal_name TEXT DEFAULT 'Drs. H. Mulyadi, M.Pd.',
  principal_nip TEXT DEFAULT '19680512 199303 1 004',
  time_in_start TEXT DEFAULT '06:30',
  time_in_late TEXT DEFAULT '07:00',
  time_out_start TEXT DEFAULT '14:30',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Kelas
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  total_students INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Siswa
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  nisn TEXT NOT NULL UNIQUE,
  rfid_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  class_id TEXT REFERENCES public.classes(id) ON DELETE SET NULL,
  class_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('L', 'P')),
  parent_phone TEXT,
  status TEXT DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing untuk pencarian cepat kartu RFID saat scan di Kiosk
CREATE INDEX IF NOT EXISTS idx_students_rfid ON public.students(rfid_id);
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);

-- 4. Tabel Absensi (Attendance Logs)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  nisn TEXT NOT NULL,
  class_name TEXT NOT NULL,
  rfid_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  status TEXT NOT NULL CHECK (status IN ('hadir', 'terlambat', 'izin', 'sakit', 'alpa')),
  type TEXT DEFAULT 'rfid' CHECK (type IN ('rfid', 'manual')),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_logs(student_id);

-- 5. Tabel User Pengguna
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru_piket', 'wali_kelas')),
  class_id TEXT REFERENCES public.classes(id) ON DELETE SET NULL,
  class_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security (RLS) dan buat kebijakan akses publik anon untuk demo
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Kebijakan read/write untuk anon key
CREATE POLICY "Allow public read/write school_settings" ON public.school_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write attendance_logs" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write users" ON public.users FOR ALL USING (true) WITH CHECK (true);
`;
