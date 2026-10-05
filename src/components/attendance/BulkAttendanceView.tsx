import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus } from '../../types';
import { getTodayDateString } from '../../lib/initialData';
import {
  CalendarCheck2,
  Calendar,
  Filter,
  CheckCheck,
  Save,
  CheckCircle,
  HelpCircle,
  ClockAlert,
  HeartPulse,
  UserX,
  FileText,
} from 'lucide-react';

export const BulkAttendanceView: React.FC = () => {
  const { students, classes, attendanceLogs, recordBulkAttendance, currentUser } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (currentUser.role === 'wali_kelas' && currentUser.classId) {
      return currentUser.classId;
    }
    return classes[0]?.id || 'cls-1';
  });

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Map of studentId -> { status: AttendanceStatus, notes: string }
  const [attendanceGrid, setAttendanceGrid] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});

  // Class students
  const classStudents = useMemo(() => {
    return students.filter((s) => s.classId === selectedClassId && s.status === 'aktif');
  }, [students, selectedClassId]);

  // Load existing records for this class & date when class or date changes
  useEffect(() => {
    const grid: Record<string, { status: AttendanceStatus; notes: string }> = {};

    classStudents.forEach((student) => {
      const existing = attendanceLogs.find(
        (l) => l.studentId === student.id && l.date === selectedDate
      );
      if (existing) {
        grid[student.id] = {
          status: existing.status,
          notes: existing.notes || '',
        };
      } else {
        grid[student.id] = {
          status: 'hadir',
          notes: '',
        };
      }
    });

    setAttendanceGrid(grid);
  }, [selectedClassId, selectedDate, classStudents, attendanceLogs]);

  // Set all students to a single status (PRD 3.4)
  const handleSetAll = (status: AttendanceStatus) => {
    const updated = { ...attendanceGrid };
    classStudents.forEach((s) => {
      updated[s.id] = {
        status,
        notes: updated[s.id]?.notes || '',
      };
    });
    setAttendanceGrid(updated);
  };

  const handleUpdateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceGrid((prev) => ({
      ...prev,
      [studentId]: {
        status,
        notes: prev[studentId]?.notes || '',
      },
    }));
  };

  const handleUpdateStudentNotes = (studentId: string, notes: string) => {
    setAttendanceGrid((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'hadir',
        notes,
      },
    }));
  };

  const handleSaveBulk = () => {
    const records = Object.entries(attendanceGrid).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      notes: data.notes,
    }));

    recordBulkAttendance(selectedClassId, selectedDate, records);
    setSuccessToast(`Berhasil menyimpan data absensi untuk ${records.length} siswa!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Status counts for current grid
  const currentCounts = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    Object.values(attendanceGrid).forEach((item) => {
      if (item.status === 'hadir') hadir++;
      else if (item.status === 'terlambat') terlambat++;
      else if (item.status === 'izin') izin++;
      else if (item.status === 'sakit') sakit++;
      else if (item.status === 'alpa') alpa++;
    });

    return { hadir, terlambat, izin, sakit, alpa };
  }, [attendanceGrid]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-indigo-400" />
            Absensi Manual (Bulk Input)
          </h2>
          <p className="text-xs text-slate-400">
            Pencatatan kehadiran massal per kelas untuk situasi siswa tanpa kartu RFID, izin, atau sakit.
          </p>
        </div>

        <button
          onClick={handleSaveBulk}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 self-start"
        >
          <Save className="w-4 h-4" />
          Simpan Absensi Massal
        </button>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Parameter Filter Bar: Kelas & Tanggal (PRD 3.4) */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Class Select */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Pilih Kelas:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={currentUser.role === 'wali_kelas' && !!currentUser.classId}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.teacherName})
                </option>
              ))}
            </select>
          </div>

          {/* Date Select */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Tanggal Absensi:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Set All Fast Action Buttons (PRD 3.4) */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
            Set All:
          </span>
          <button
            onClick={() => handleSetAll('hadir')}
            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors"
          >
            Semua Hadir
          </button>
          <button
            onClick={() => handleSetAll('izin')}
            className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors"
          >
            Semua Izin
          </button>
          <button
            onClick={() => handleSetAll('sakit')}
            className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold transition-colors"
          >
            Semua Sakit
          </button>
          <button
            onClick={() => handleSetAll('alpa')}
            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors"
          >
            Semua Alpa
          </button>
        </div>
      </div>

      {/* Summary Badge counter */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Rangkuman input kelas ini:</span>
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
          Hadir: {currentCounts.hadir}
        </span>
        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
          Terlambat: {currentCounts.terlambat}
        </span>
        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
          Izin: {currentCounts.izin}
        </span>
        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
          Sakit: {currentCounts.sakit}
        </span>
        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
          Alpa: {currentCounts.alpa}
        </span>
      </div>

      {/* Bulk Table (PRD 3.4) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NISN / RFID</th>
                <th className="py-3 px-4 text-center">Pilihan Status Presensi</th>
                <th className="py-3 px-4 w-72">Catatan / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Tidak ada siswa aktif terdaftar pada kelas ini.
                  </td>
                </tr>
              ) : (
                classStudents.map((std, idx) => {
                  const studentData = attendanceGrid[std.id] || { status: 'hadir', notes: '' };
                  const currentStatus = studentData.status;

                  return (
                    <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                            {std.photoUrl ? (
                              <img src={std.photoUrl} alt={std.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-indigo-400 text-xs">
                                {std.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white">{std.name}</div>
                            <div className="text-[10px] text-slate-400">
                              Kelamin: <span className="font-semibold text-slate-300">{std.gender}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-300">{std.nisn}</div>
                        <div className="font-mono text-[10px] text-indigo-400 font-semibold">{std.rfidId}</div>
                      </td>

                      {/* Fast Status Radio Group Buttons (PRD 3.4) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 gap-1">
                          {/* Hadir */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(std.id, 'hadir')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              currentStatus === 'hadir'
                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Hadir
                          </button>

                          {/* Terlambat */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(std.id, 'terlambat')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              currentStatus === 'terlambat'
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Terlambat
                          </button>

                          {/* Izin */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(std.id, 'izin')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              currentStatus === 'izin'
                                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Izin
                          </button>

                          {/* Sakit */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(std.id, 'sakit')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              currentStatus === 'sakit'
                                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Sakit
                          </button>

                          {/* Alpa */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(std.id, 'alpa')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              currentStatus === 'alpa'
                                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Alpa
                          </button>
                        </div>
                      </td>

                      {/* Catatan Input (PRD 3.4) */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Keterangan tambahan..."
                          value={studentData.notes}
                          onChange={(e) => handleUpdateStudentNotes(std.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Total {classStudents.length} siswa siap dicatat.
          </span>
          <button
            onClick={handleSaveBulk}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Simpan Absensi Massal
          </button>
        </div>
      </div>
    </div>
  );
};
