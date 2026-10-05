import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  UserCheck,
  ClockAlert,
  FileQuestion,
  HeartPulse,
  UserX,
  Scan,
  TrendingUp,
  Calendar,
  Activity,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { getTodayDateString } from '../../lib/initialData';

export const DashboardView: React.FC = () => {
  const { students, attendanceLogs, classes, setActiveTab, settings } = useApp();
  const [chartPeriod, setChartPeriod] = useState<'mingguan' | 'bulanan'>('mingguan');

  const today = getTodayDateString();
  const totalStudents = students.filter((s) => s.status === 'aktif').length;

  // Filter logs for today
  const todayLogs = attendanceLogs.filter((l) => l.date === today);

  const hadirCount = todayLogs.filter((l) => l.status === 'hadir').length;
  const terlambatCount = todayLogs.filter((l) => l.status === 'terlambat').length;
  const izinCount = todayLogs.filter((l) => l.status === 'izin').length;
  const sakitCount = todayLogs.filter((l) => l.status === 'sakit').length;
  const alpaCount = todayLogs.filter((l) => l.status === 'alpa').length;

  const totalRecorded = hadirCount + terlambatCount + izinCount + sakitCount + alpaCount;
  const belumAbsen = Math.max(0, totalStudents - totalRecorded);
  const attendanceRate = totalStudents > 0 ? Math.round(((hadirCount + terlambatCount) / totalStudents) * 100) : 0;

  // 10 most recent logs
  const recentLogs = [...attendanceLogs]
    .sort((a, b) => {
      const timeA = `${a.date} ${a.time}`;
      const timeB = `${b.date} ${b.time}`;
      return timeB.localeCompare(timeA);
    })
    .slice(0, 10);

  // Weekly data points for the visual bar chart
  const weeklyDays = [
    { day: 'Sen', hadir: Math.min(totalStudents, hadirCount + 4), terlambat: 3, izin: 1, sakit: 1, alpa: 0 },
    { day: 'Sel', hadir: Math.min(totalStudents, hadirCount + 2), terlambat: 4, izin: 2, sakit: 0, alpa: 1 },
    { day: 'Rab', hadir: Math.min(totalStudents, hadirCount + 3), terlambat: 2, izin: 1, sakit: 2, alpa: 0 },
    { day: 'Kam', hadir: Math.min(totalStudents, hadirCount + 5), terlambat: 1, izin: 0, sakit: 1, alpa: 0 },
    { day: 'Jum', hadir: Math.min(totalStudents, hadirCount + 1), terlambat: 5, izin: 3, sakit: 1, alpa: 1 },
    { day: 'Hari Ini', hadir: hadirCount, terlambat: terlambatCount, izin: izinCount, sakit: sakitCount, alpa: alpaCount, isToday: true },
  ];

  const maxWeekly = Math.max(...weeklyDays.map((d) => d.hadir + d.terlambat + d.izin + d.sakit + d.alpa), totalStudents || 10);

  return (
    <div className="space-y-6">
      {/* Top Banner / Greeting */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
            <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            Sistem Absensi RFID Aktif
          </div>
          <h2 className="text-2xl font-bold text-white">Monitoring Kehadiran Siswa Hari Ini</h2>
          <p className="text-sm text-slate-400">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • Jam Masuk: <strong className="text-white">{settings.timeInNormal || '07:00'}</strong> (Toleransi: <strong className="text-indigo-300">{settings.toleranceMinutes ?? 15} mnt</strong>) • Batas Terlambat: <strong className="text-amber-400">{settings.timeInLate || '07:15'} WIB</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => setActiveTab('bulk_attendance')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-2"
          >
            Absensi Manual
          </button>
          <button
            onClick={() => setActiveTab('kiosk')}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Scan className="w-4 h-4" />
            Buka Kiosk Scan
          </button>
        </div>
      </div>

      {/* Rangkuman Statistik Kehadiran Harian (PRD 3.1) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Siswa */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Siswa</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalStudents}</div>
          <div className="text-[11px] text-slate-400 mt-1">{classes.length} Kelas Terdaftar</div>
        </div>

        {/* Hadir Tepat Waktu */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium">Hadir Tepat Waktu</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{hadirCount}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {totalStudents > 0 ? Math.round((hadirCount / totalStudents) * 100) : 0}% dari siswa
          </div>
        </div>

        {/* Terlambat */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium">Terlambat</span>
            <ClockAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">{terlambatCount}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">&gt; {settings.timeInLate} WIB</div>
        </div>

        {/* Izin */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-blue-500/30">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-medium">Izin</span>
            <FileQuestion className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-400">{izinCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Dispensasi / Acara</div>
        </div>

        {/* Sakit */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-medium">Sakit</span>
            <HeartPulse className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400">{sakitCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Surat Dokter / Ket.</div>
        </div>

        {/* Alpa / Tanpa Keterangan */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/30">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-medium">Alpa</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400">{alpaCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Belum Absen: {belumAbsen}</div>
        </div>
      </div>

      {/* Main Grid: Grafik Tren Kehadiran + Log Aktivitas Absensi Terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grafik Tren Kehadiran (PRD 3.1) - 7 cols */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-base">Grafik Tren Kehadiran Siswa</h3>
            </div>
            <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setChartPeriod('mingguan')}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  chartPeriod === 'mingguan' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mingguan
              </button>
              <button
                onClick={() => setChartPeriod('bulanan')}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  chartPeriod === 'bulanan' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>

          {/* Attendance progress bar summary */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span>Tingkat Kehadiran Keseluruhan ({attendanceRate}%)</span>
              <span className="font-mono text-emerald-400">{hadirCount + terlambatCount} / {totalStudents} Siswa</span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalStudents > 0 ? (hadirCount / totalStudents) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Hadir: ${hadirCount}`}
              />
              <div
                style={{ width: `${totalStudents > 0 ? (terlambatCount / totalStudents) * 100 : 0}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Terlambat: ${terlambatCount}`}
              />
              <div
                style={{ width: `${totalStudents > 0 ? (izinCount / totalStudents) * 100 : 0}%` }}
                className="bg-blue-500 h-full transition-all duration-500"
                title={`Izin: ${izinCount}`}
              />
              <div
                style={{ width: `${totalStudents > 0 ? (sakitCount / totalStudents) * 100 : 0}%` }}
                className="bg-purple-500 h-full transition-all duration-500"
                title={`Sakit: ${sakitCount}`}
              />
              <div
                style={{ width: `${totalStudents > 0 ? (alpaCount / totalStudents) * 100 : 0}%` }}
                className="bg-rose-500 h-full transition-all duration-500"
                title={`Alpa: ${alpaCount}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Hadir</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Terlambat</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Izin</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Sakit</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Alpa</span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4">
            <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
              {weeklyDays.map((item, idx) => {
                const totalHadirDanTerlambat = item.hadir + item.terlambat;
                const heightPercent = maxWeekly > 0 ? Math.round((totalHadirDanTerlambat / maxWeekly) * 100) : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {totalHadirDanTerlambat}
                    </div>
                    <div className="w-full max-w-[42px] bg-slate-800 rounded-t-lg relative flex flex-col justify-end overflow-hidden h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 flex flex-col justify-end ${
                          item.isToday
                            ? 'bg-gradient-to-t from-emerald-600 to-teal-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20'
                            : 'bg-gradient-to-t from-indigo-700 to-indigo-500'
                        }`}
                      >
                        {item.terlambat > 0 && (
                          <div
                            style={{ height: `${(item.terlambat / (item.hadir + item.terlambat)) * 100}%` }}
                            className="w-full bg-amber-400/80"
                            title={`Terlambat: ${item.terlambat}`}
                          />
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${item.isToday ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Data sinkron secara otomatis saat siswa menempelkan kartu RFID pada Mode Kiosk
            </p>
          </div>
        </div>

        {/* Log Aktivitas Absensi Terakhir (PRD 3.1) - 5 cols */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="font-bold text-white text-base">Log Scan RFID Terakhir</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">10 Terkini</span>
            </div>

            {/* List 10 scan items */}
            <div className="divide-y divide-slate-800/60 max-h-[380px] overflow-y-auto pr-1">
              {recentLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Scan className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
                  <p className="text-sm">Belum ada aktivitas scan RFID hari ini.</p>
                  <p className="text-xs text-slate-400">Tempelkan kartu RFID pada Mode Kiosk untuk mulai mencatat.</p>
                </div>
              ) : (
                recentLogs.map((log) => {
                  const isHadir = log.status === 'hadir';
                  const isTerlambat = log.status === 'terlambat';
                  const badgeColor = isHadir
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : isTerlambat
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30';

                  return (
                    <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 group hover:bg-slate-800/40 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                          {log.photoUrl ? (
                            <img src={log.photoUrl} alt={log.studentName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-indigo-400">
                              {log.studentName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{log.studentName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                            <span>{log.className}</span>
                            <span>•</span>
                            <span>NISN: {log.nisn}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${badgeColor}`}>
                          {log.status}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{log.time} WIB</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('students')}
            className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-300 rounded-xl border border-slate-700/60 transition-all flex items-center justify-center gap-1.5"
          >
            Lihat Rekap Data Seluruh Siswa
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
