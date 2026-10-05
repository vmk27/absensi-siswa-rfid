import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SUPABASE_SQL_SCHEMA } from '../../lib/supabase';
import {
  Settings,
  School,
  Clock,
  Database,
  Save,
  CheckCircle,
  Copy,
  AlertTriangle,
  Upload,
  RefreshCw,
  Code2,
  Download,
  ShieldCheck,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    supabaseConfig,
    saveSupabaseCredentials,
    syncWithSupabase,
    isSyncing,
    resetToDefaultData,
  } = useApp();

  const [formSettings, setFormSettings] = useState({
    ...settings,
    timeInNormal: settings.timeInNormal || '07:00',
    toleranceMinutes: settings.toleranceMinutes ?? 15,
  });
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(supabaseConfig.anonKey);

  // Helper to calculate effective late time: Jam Masuk + Toleransi
  const calculateEffectiveLate = (normalStr: string, tolerance: number): string => {
    try {
      const [h, m] = normalStr.split(':').map(Number);
      const totalMins = (h || 7) * 60 + (m || 0) + Number(tolerance || 0);
      const newH = Math.floor(totalMins / 60) % 24;
      const newM = totalMins % 60;
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    } catch {
      return '07:15';
    }
  };

  const handleNormalTimeChange = (newNormal: string) => {
    const computedLate = calculateEffectiveLate(newNormal, formSettings.toleranceMinutes);
    setFormSettings((prev) => ({
      ...prev,
      timeInNormal: newNormal,
      timeInLate: computedLate,
    }));
  };

  const handleToleranceChange = (newTolerance: number) => {
    const computedLate = calculateEffectiveLate(formSettings.timeInNormal, newTolerance);
    setFormSettings((prev) => ({
      ...prev,
      toleranceMinutes: newTolerance,
      timeInLate: computedLate,
    }));
  };

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);

  // Operational hours per day table state
  const [dailyHours, setDailyHours] = useState([
    { hari: 'Senin', masuk: '06:30', batas: '07:00', pulang: '15:00', libur: false },
    { hari: 'Selasa', masuk: '06:30', batas: '07:00', pulang: '15:00', libur: false },
    { hari: 'Rabu', masuk: '06:30', batas: '07:00', pulang: '15:00', libur: false },
    { hari: 'Kamis', masuk: '06:30', batas: '07:00', pulang: '15:00', libur: false },
    { hari: 'Jumat', masuk: '06:30', batas: '07:00', pulang: '11:45', libur: false },
    { hari: 'Sabtu', masuk: '06:30', batas: '07:00', pulang: '13:00', libur: false },
  ]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  const handleTestAndSaveSupabase = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadSqlFile = () => {
    const element = document.createElement('a');
    const file = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'schema_absensi_rfid_supabase.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Pengaturan Aplikasi & Konfigurasi Supabase
        </h2>
        <p className="text-xs text-slate-400">
          Kelola profil identitas sekolah, aturan jam operasional gerbang absensi, dan integrasi database Supabase.
        </p>
      </div>

      {savedSettingsNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">Perubahan pengaturan sekolah berhasil disimpan!</span>
        </div>
      )}

      {/* Grid: School Info & Operational Hours */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Profil Sekolah & Identitas (PRD 3.5) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <School className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Informasi Sekolah & Kop Surat</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nama Resmi Sekolah <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formSettings.schoolName}
                onChange={(e) => setFormSettings({ ...formSettings, schoolName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nomor Pokok Sekolah Nasional (NPSN) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formSettings.npsn}
                  onChange={(e) => setFormSettings({ ...formSettings, npsn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  value={formSettings.phone}
                  onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Alamat Lengkap</label>
              <textarea
                rows={2}
                value={formSettings.address}
                onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Sekolah</label>
                <input
                  type="email"
                  value={formSettings.email}
                  onChange={(e) => setFormSettings({ ...formSettings, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Website</label>
                <input
                  type="text"
                  value={formSettings.website}
                  onChange={(e) => setFormSettings({ ...formSettings, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">URL Logo Sekolah</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formSettings.logoUrl}
                  onChange={(e) => setFormSettings({ ...formSettings, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  placeholder="https://..."
                />
                {formSettings.logoUrl && (
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                    <img src={formSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Kepala Sekolah <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formSettings.principalName}
                  onChange={(e) => setFormSettings({ ...formSettings, principalName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={formSettings.principalNip}
                  onChange={(e) => setFormSettings({ ...formSettings, principalNip: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Jam Operasional & Toleransi Keterlambatan (PRD 3.5) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Jam Masuk & Toleransi Keterlambatan</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                Aturan Presensi
              </span>
            </div>

            {/* Core Settings: Jam Masuk & Toleransi Keterlambatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Jam Masuk Normal */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-400">
                    Jam Masuk Sekolah (Bel Masuk)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">WIB</span>
                </div>
                <input
                  type="time"
                  required
                  value={formSettings.timeInNormal || '07:00'}
                  onChange={(e) => handleNormalTimeChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-lg font-extrabold focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400">
                  Waktu dimulainya jam belajar / bel berbunyi.
                </p>
              </div>

              {/* Toleransi Keterlambatan */}
              <div className="p-3.5 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-indigo-300">
                    Toleransi Keterlambatan
                  </label>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">
                    {formSettings.toleranceMinutes} Menit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={formSettings.toleranceMinutes}
                    onChange={(e) => handleToleranceChange(Math.max(0, Number(e.target.value)))}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm font-bold text-center focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400 font-semibold">Menit</span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[0, 5, 10, 15, 20, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleToleranceChange(mins)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        formSettings.toleranceMinutes === mins
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      +{mins} mnt
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Effective Late Threshold Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Batas Akhir Toleransi (Mulai Dinyatakan Terlambat):</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Jam Masuk <strong className="text-white">{formSettings.timeInNormal || '07:00'}</strong> + Toleransi <strong className="text-indigo-300">{formSettings.toleranceMinutes} menit</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xl font-black text-amber-400 tracking-wider">
                  {formSettings.timeInLate || calculateEffectiveLate(formSettings.timeInNormal || '07:00', formSettings.toleranceMinutes)}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">WIB</span>
              </div>
            </div>

            {/* Gate Open & Pulang Settings */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <label className="block text-[11px] font-semibold text-cyan-400">
                  Jam Buka Gerbang (Mulai Scan Masuk)
                </label>
                <input
                  type="time"
                  value={formSettings.timeInStart}
                  onChange={(e) => setFormSettings({ ...formSettings, timeInStart: e.target.value })}
                  className="w-full bg-transparent text-white font-mono text-base font-bold focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block">Mulai menerima presensi</span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <label className="block text-[11px] font-semibold text-purple-400">
                  Jam Mulai Absen Pulang
                </label>
                <input
                  type="time"
                  value={formSettings.timeOutStart}
                  onChange={(e) => setFormSettings({ ...formSettings, timeOutStart: e.target.value })}
                  className="w-full bg-transparent text-white font-mono text-base font-bold focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block">Scan ke-2 dihitung pulang</span>
              </div>
            </div>

            {/* Visual Logic Timeline Rule */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-[11px]">
              <div className="font-semibold text-slate-300">Skema Penilaian Status Kehadiran Otomatis:</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                  <div className="font-bold">1. Hadir Tepat Waktu</div>
                  <div className="font-mono text-[10px] mt-0.5">&le; {formSettings.timeInNormal || '07:00'}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Status: Hadir</div>
                </div>

                <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                  <div className="font-bold">2. Masa Toleransi</div>
                  <div className="font-mono text-[10px] mt-0.5">
                    {formSettings.timeInNormal || '07:00'} - {formSettings.timeInLate || '07:15'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Status: Hadir (+catatan)</div>
                </div>

                <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                  <div className="font-bold">3. Terlambat</div>
                  <div className="font-mono text-[10px] mt-0.5">&gt; {formSettings.timeInLate || '07:15'}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Status: Terlambat</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Simpan Profil & Aturan Jam Masuk
            </button>
          </div>
        </div>
      </form>

      {/* Panel 3: Konfigurasi Supabase PostgreSQL Backend */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Konfigurasi Database Supabase (PostgreSQL)</h3>
              <p className="text-xs text-slate-400">
                Hubungkan aplikasi dengan database Supabase Cloud atau uji coba dengan mode penyimpanan lokal bawaan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                supabaseConfig.isConnected
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-950/40 text-amber-400 border-amber-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${supabaseConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {supabaseConfig.isConnected ? 'Supabase Terhubung' : 'Penyimpanan Lokal Aktif'}
            </span>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Dapat ditemukan di: Project Settings &rarr; API &rarr; Project URL
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Supabase Anon / Public Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Dapat ditemukan di: Project Settings &rarr; API &rarr; Project API Keys (anon public)
            </span>
          </div>
        </div>

        {/* Connection status result */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Action bar for database */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestAndSaveSupabase}
              disabled={isTesting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Menguji...' : 'Uji & Simpan Koneksi'}
            </button>

            {supabaseConfig.isConnected && (
              <button
                type="button"
                onClick={syncWithSupabase}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
                Tarik Data dari Supabase
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSqlViewer(!showSqlViewer)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              {showSqlViewer ? 'Sembunyikan Skrip SQL' : 'Lihat Skrip SQL Supabase'}
            </button>
            <button
              type="button"
              onClick={handleDownloadSqlFile}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Unduh file .sql"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Download .sql
            </button>
            <button
              type="button"
              onClick={resetToDefaultData}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/20 transition-colors"
            >
              Reset Data Demo
            </button>
          </div>
        </div>

        {/* SQL Script Viewer */}
        {showSqlViewer && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-emerald-400" />
                Skrip Skema Tabel, RLS Policies & Stored Procedure (Siap Jalankan di SQL Editor Supabase):
              </span>
              <button
                onClick={handleCopySql}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                {copiedSql ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'Tersalin!' : 'Salin Semua SQL'}
              </button>
            </div>
            <pre className="text-[11px] font-mono text-emerald-400/90 bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-72 border border-slate-800/80">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
