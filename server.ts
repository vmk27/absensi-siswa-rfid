import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

// In-memory fallback database for students and attendance when Supabase is not configured yet
let mockStudents = [
  {
    id: 'std-1',
    rfid_tag: 'RFID-1001',
    nisn: '0061234501',
    nama_lengkap: 'Muhammad Rizky Pratama',
    kelas: 'X IPA 1',
    status: 'aktif',
    foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=533&fit=crop&q=80',
  },
  {
    id: 'std-2',
    rfid_tag: 'RFID-1002',
    nisn: '0061234502',
    nama_lengkap: 'Aisyah Putri Azzahra',
    kelas: 'X IPA 1',
    status: 'aktif',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=533&fit=crop&q=80',
  },
  {
    id: 'std-3',
    rfid_tag: 'RFID-1003',
    nisn: '0061234503',
    nama_lengkap: 'Dimas Aditya Nugraha',
    kelas: 'X IPA 1',
    status: 'aktif',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=533&fit=crop&q=80',
  },
];

let mockAttendanceLogs: any[] = [];

// ==============================================================================
// 1. SUPABASE EDGE FUNCTION / API ENDPOINT: /api/scan-rfid (PRD Backend Spec)
// ==============================================================================
app.post('/api/scan-rfid', async (req, res) => {
  const { rfid_tag } = req.body;

  if (!rfid_tag || typeof rfid_tag !== 'string') {
    return res.status(400).json({
      success: false,
      status: 'error',
      message: 'Parameter rfid_tag wajib disertakan.',
    });
  }

  const cleanTag = rfid_tag.trim().toLowerCase();
  const now = new Date();
  const timeNowStr = now.toTimeString().split(' ')[0]; // "06:45:12"
  const todayDate = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
  const timeInNormal = '07:00:00';
  const toleranceMinutes = 15;
  const batasTerlambat = '07:15:00'; // Jam masuk 07:00 + toleransi 15 menit
  const jamPulang = '14:30:00';

  // Check Supabase if configured in env
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Call Supabase RPC
      const { data, error } = await supabase.rpc('scan_rfid_card', { p_rfid_tag: cleanTag });
      if (!error && data) {
        return res.json(data);
      }
    } catch (e) {
      console.warn('Supabase RPC call failed, falling back to local handler:', e);
    }
  }

  // Local Handler fallback (works immediately without waiting for Supabase credentials)
  const student = mockStudents.find((s) => s.rfid_tag.toLowerCase() === cleanTag);

  if (!student) {
    return res.status(404).json({
      success: false,
      status: 'unknown',
      message: 'Kartu RFID Tidak Terdaftar di Database!',
      data: null,
    });
  }

  if (student.status === 'nonaktif') {
    return res.status(403).json({
      success: false,
      status: 'inactive',
      message: 'Status siswa non-aktif.',
      siswa: student,
    });
  }

  // Check if already scanned today
  const existingAbsensi = mockAttendanceLogs.find(
    (a) => a.siswa_id === student.id && a.tanggal === todayDate
  );

  let status: 'hadir' | 'terlambat' = 'hadir';
  let scanType: 'masuk' | 'pulang' = 'masuk';
  let message = '';
  let absensiRecord = null;

  if (!existingAbsensi) {
    // Scan Masuk
    if (timeNowStr > batasTerlambat) {
      status = 'terlambat';
      message = `Absen Masuk: Terlambat (${timeNowStr.substring(0, 5)})`;
    } else if (timeNowStr > timeInNormal) {
      status = 'hadir';
      message = `Absen Masuk: Hadir (Masa Toleransi: ${timeNowStr.substring(0, 5)})`;
    } else {
      status = 'hadir';
      message = `Absen Masuk: Tepat Waktu (${timeNowStr.substring(0, 5)})`;
    }

    absensiRecord = {
      id: `att-${Date.now()}`,
      siswa_id: student.id,
      tanggal: todayDate,
      waktu_masuk: timeNowStr,
      waktu_pulang: null,
      status,
      metode: 'rfid',
    };
    mockAttendanceLogs.push(absensiRecord);
  } else {
    // Scan Pulang
    if (timeNowStr < jamPulang) {
      return res.json({
        success: true,
        status: 'already_scanned',
        scan_type: 'already',
        message: `Sudah absen masuk (${existingAbsensi.waktu_masuk.substring(0, 5)}). Belum jam pulang (${jamPulang.substring(0, 5)}).`,
        siswa: student,
        absensi: existingAbsensi,
      });
    }

    existingAbsensi.waktu_pulang = timeNowStr;
    absensiRecord = existingAbsensi;
    scanType = 'pulang';
    status = existingAbsensi.status;
    message = `Absen Pulang Berhasil (${timeNowStr.substring(0, 5)}). Selamat beristirahat!`;
  }

  return res.json({
    success: true,
    status,
    scan_type: scanType,
    message,
    timestamp: now.toISOString(),
    siswa: student,
    absensi: absensiRecord,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
