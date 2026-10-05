import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ScanResult, Student } from '../../types';
import {
  Scan,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CreditCard,
  Wifi,
  Sparkles,
  School,
  Volume2,
} from 'lucide-react';

export const KioskView: React.FC = () => {
  const { settings, recordRfidAttendance, attendanceLogs, students, setActiveTab } = useApp();

  // Real-time clock states
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Kiosk Scan state: 'standby' | 'success' | 'late' | 'unknown' | 'already'
  const [scanState, setScanState] = useState<'standby' | 'success' | 'late' | 'unknown' | 'already'>('standby');
  const [activeResult, setActiveResult] = useState<ScanResult | null>(null);
  const [resetCountdown, setResetCountdown] = useState<number>(100);

  // Hidden RFID input for USB Scanners (Keyboard Emulation)
  const [rfidBuffer, setRfidBuffer] = useState('');
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Real-time clock updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Format: 06:45:12
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      // Format: Senin, 05 Oktober 2026
      const dateStr = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ensure hidden input is always focused for physical USB RFID reader
  useEffect(() => {
    const keepFocus = () => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    };

    keepFocus();
    const focusInterval = setInterval(keepFocus, 1500);

    const handleWindowClick = () => keepFocus();
    window.addEventListener('click', handleWindowClick);

    return () => {
      clearInterval(focusInterval);
      window.removeEventListener('click', handleWindowClick);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Triggered when an RFID card tag is detected (either via USB reader Enter key or on-screen tap)
  const processCardScan = (tag: string) => {
    if (!tag.trim()) return;

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    const result = recordRfidAttendance(tag);
    setActiveResult(result);
    setScanState(result.status);
    setResetCountdown(100);

    // Auto-Reset Countdown Progress (PRD 4.0: 3-5 detik)
    const totalDurationMs = 4000;
    const stepIntervalMs = 50;
    let elapsed = 0;

    countdownIntervalRef.current = setInterval(() => {
      elapsed += stepIntervalMs;
      const remainingPercent = Math.max(0, 100 - (elapsed / totalDurationMs) * 100);
      setResetCountdown(remainingPercent);
    }, stepIntervalMs);

    // Auto-Reset to Standby
    resetTimerRef.current = setTimeout(() => {
      setScanState('standby');
      setActiveResult(null);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, totalDurationMs);
  };

  // Keyboard Emulation handler for physical USB RFID Scanner
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rfidBuffer.trim()) {
        processCardScan(rfidBuffer);
        setRfidBuffer('');
      }
    }
  };

  // 3-5 Most recent scans for the ticker feed
  const recentFeed = [...attendanceLogs]
    .sort((a, b) => {
      const timeA = `${a.date} ${a.time}`;
      const timeB = `${b.date} ${b.time}`;
      return timeB.localeCompare(timeA);
    })
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Hidden input to catch USB RFID Scanner keyboard strokes */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={rfidBuffer}
        onChange={(e) => setRfidBuffer(e.target.value)}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute -top-96 left-0 pointer-events-none"
        autoFocus
      />

      {/* Decorative futuristic glow elements */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER (PRD Section 4.0) */}
      {/* ========================================================================= */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <School className="w-6 h-6 text-indigo-400" />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide text-white uppercase font-sans">
              {settings.schoolName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold text-cyan-400 tracking-wider">
                SISTEM ABSENSI RFID MANDIRI
              </span>
              <span className="text-[10px] text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded-full bg-slate-800/60 font-mono">
                Jam Masuk: <strong className="text-white">{settings.timeInNormal || '07:00'}</strong> (Toleransi: <strong className="text-indigo-300">{settings.toleranceMinutes ?? 15} mnt</strong>) &bull; Batas: <strong className="text-amber-400">{settings.timeInLate || '07:15'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Clock & Action Controls */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-2xl lg:text-3xl font-black font-mono tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
              {currentTime || '00:00:00'}
            </div>
            <div className="text-xs font-medium text-slate-400 flex items-center justify-end gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentDate || 'Tanggal'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
              title="Kembali ke Dashboard Admin"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CENTER STAGE (PRD Section 4.0: Frame Foto 300x400, Status, Card Info) */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
        {/* STANDBY STATE */}
        {scanState === 'standby' ? (
          <div className="text-center space-y-6 max-w-xl animate-in fade-in duration-300">
            {/* Animated RFID Reader Graphic */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping opacity-25" />
              <div className="absolute inset-4 rounded-full border border-cyan-500/30 animate-pulse" />
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-indigo-900/60 to-slate-900 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 flex flex-col items-center justify-center gap-2 backdrop-blur-md">
                <Wifi className="w-10 h-10 text-cyan-400 rotate-90 animate-pulse" />
                <CreditCard className="w-6 h-6 text-indigo-300" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-wide text-white">
                SILAKAN TEMPELKAN KARTU RFID ANDA
              </h2>
              <p className="text-sm text-slate-400">
                Posisikan kartu siswa di depan sensor RFID reader untuk mencatat kehadiran otomatis.
              </p>
            </div>

            {/* Quick Card Testing Dock for browser interaction */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-2.5">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-indigo-400" />
                <span>Simulasi Tap Kartu RFID (Cepat Tanpa Scanner Fisik):</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {students.slice(0, 4).map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => processCardScan(s.rfidId)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-xs text-slate-200 hover:text-white font-semibold border border-slate-700 hover:border-indigo-400 transition-all flex items-center gap-1.5 transform active:scale-95"
                  >
                    <span>{s.name.split(' ')[0]}</span>
                    <span className="font-mono text-[10px] text-cyan-300">({s.rfidId})</span>
                  </button>
                ))}
                <button
                  onClick={() => processCardScan('RFID-UNKNOWN-99')}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-xs text-rose-300 font-semibold border border-rose-500/30 transition-all"
                  title="Simulasi Kartu Tidak Dikenal"
                >
                  Kartu Tak Terdaftar
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* SCANNED ACTIVE STATE (Photo 300x400, Dynamic Glow Status Card) */
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Auto-reset progress indicator bar */}
            <div
              style={{ width: `${resetCountdown}%` }}
              className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-75"
            />

            {/* Student Photo Frame (300px x 400px aspect ratio as per PRD) */}
            <div className="relative">
              <div
                className={`w-[195px] h-[260px] rounded-2xl overflow-hidden border-4 shadow-2xl bg-slate-950 relative flex items-center justify-center ${
                  scanState === 'success'
                    ? 'border-emerald-500 shadow-emerald-500/30'
                    : scanState === 'late'
                    ? 'border-amber-400 shadow-amber-500/30'
                    : 'border-rose-500 shadow-rose-500/30'
                }`}
              >
                {activeResult?.student?.photoUrl ? (
                  <img
                    src={activeResult.student.photoUrl}
                    alt={activeResult.student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-2 opacity-80" />
                    <span className="text-xs font-mono text-slate-400">Tidak Ada Foto</span>
                  </div>
                )}
              </div>

              {/* Status Icon Badge */}
              <div
                className={`absolute -bottom-3 -right-3 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                  scanState === 'success'
                    ? 'bg-emerald-500 text-slate-950'
                    : scanState === 'late'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {scanState === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                ) : scanState === 'late' ? (
                  <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                ) : (
                  <XCircle className="w-6 h-6 stroke-[2.5]" />
                )}
              </div>
            </div>

            {/* Student Identity Information */}
            <div className="space-y-1">
              <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-wide">
                {activeResult?.student?.name || 'KARTU TIDAK TERDAFTAR'}
              </h3>
              {activeResult?.student && (
                <div className="flex items-center justify-center gap-3 text-sm text-slate-300 font-mono">
                  <span>NISN: <strong className="text-cyan-300">{activeResult.student.nisn}</strong></span>
                  <span>•</span>
                  <span>KELAS: <strong className="text-white">{activeResult.student.className}</strong></span>
                </div>
              )}
            </div>

            {/* Dynamic Status Banner Card (PRD 4.0: Hijau / Kuning / Merah) */}
            <div
              className={`w-full max-w-lg py-3.5 px-6 rounded-2xl border text-center font-extrabold text-sm lg:text-base tracking-wider uppercase shadow-xl ${
                scanState === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-emerald-500/20'
                  : scanState === 'late'
                  ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-amber-500/20'
                  : scanState === 'already'
                  ? 'bg-blue-950/80 border-blue-400 text-blue-300 shadow-blue-500/20'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-rose-500/20'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{activeResult?.message}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Layar kembali otomatis dalam hitungan detik...
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. SECTION FOOTER: LIVE ACTIVITY LOG / TICKER (PRD Section 4.0) */}
      {/* ========================================================================= */}
      <footer className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-xl z-20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0 uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>TERAKHIR ABSEN:</span>
        </div>

        {/* Horizontal Ticker with 3-5 students */}
        <div className="flex-1 flex items-center gap-3 overflow-x-auto justify-start sm:justify-center w-full">
          {recentFeed.length === 0 ? (
            <span className="text-xs text-slate-500 italic">Belum ada siswa yang melakukan absensi hari ini.</span>
          ) : (
            recentFeed.map((item) => {
              const isHadir = item.status === 'hadir';
              const dotColor = isHadir ? 'bg-emerald-400' : 'bg-amber-400';
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 shrink-0 text-xs"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt={item.studentName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-indigo-400">
                        {item.studentName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-white truncate max-w-[120px]">{item.studentName}</span>
                  <span className="font-mono text-slate-400 text-[11px]">({item.time.substring(0, 5)})</span>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span className={`text-[11px] font-bold capitalize ${isHadir ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {item.status}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:block shrink-0">
          USB RFID Keypad Emulation: <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>
      </footer>
    </div>
  );
};
