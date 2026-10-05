import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Printer,
  CalendarCheck2,
  UserCog,
  Settings,
  Scan,
  Database,
  ShieldCheck,
  LogOut,
  ChevronRight,
  School,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../../types';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    setCurrentUser,
    users,
    settings,
    supabaseConfig,
  } = useApp();

  // Role permissions as per PRD Section 2:
  // - Admin: Akses penuh ke seluruh menu
  // - Guru Piket: Monitoring absensi harian (Dashboard), Absensi Manual, Laporan harian
  // - Wali Kelas: Data/Rekap absensi & Cetak data khusus kelasnya
  const canAccessMasterData = currentUser.role === 'admin';
  const canAccessUsers = currentUser.role === 'admin';
  const canAccessSettings = currentUser.role === 'admin';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true,
      description: 'Statistik & Log Real-time',
    },
    {
      header: 'MASTER DATA',
      allowed: canAccessMasterData || currentUser.role === 'wali_kelas',
    },
    {
      id: 'classes',
      label: 'Data Kelas',
      icon: GraduationCap,
      allowed: canAccessMasterData,
      description: 'Tingkat & Wali Kelas',
    },
    {
      id: 'students',
      label: 'Data Siswa',
      icon: Users,
      allowed: canAccessMasterData || currentUser.role === 'wali_kelas',
      description: 'Pendaftaran & RFID Card',
    },
    {
      id: 'print',
      label: 'Cetak Data Siswa',
      icon: Printer,
      allowed: canAccessMasterData || currentUser.role === 'wali_kelas',
      description: 'Daftar & Kartu RFID',
    },
    {
      header: 'OPERASIONAL',
      allowed: true,
    },
    {
      id: 'bulk_attendance',
      label: 'Absensi Manual',
      icon: CalendarCheck2,
      allowed: currentUser.role === 'admin' || currentUser.role === 'guru_piket',
      description: 'Input Kehadiran Massal',
    },
    {
      header: 'SISTEM',
      allowed: canAccessUsers || canAccessSettings,
    },
    {
      id: 'users',
      label: 'Manajemen User',
      icon: UserCog,
      allowed: canAccessUsers,
      description: 'Hak Akses & Role',
    },
    {
      id: 'settings',
      label: 'Pengaturan Sekolah',
      icon: Settings,
      allowed: canAccessSettings,
      description: 'Profil, Jam & Supabase',
    },
  ];

  const handleRoleChange = (role: UserRole) => {
    const userForRole = users.find((u) => u.role === role);
    if (userForRole) {
      setCurrentUser(userForRole);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Bar Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <School className="w-5 h-5 text-indigo-400" />
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">{settings.schoolName}</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                NPSN: {settings.npsn}
              </span>
            </div>
            <p className="text-xs text-slate-400">Sistem Presensi Kartu RFID & Antarmuka Kiosk</p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Supabase Status Indicator */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              supabaseConfig.isConnected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
            }`}
            title="Klik untuk membuka konfigurasi Supabase di Pengaturan"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Database:</span>
            <span className="font-semibold">{supabaseConfig.isConnected ? 'Supabase Connected' : 'Local Storage Mode'}</span>
            <span className={`w-2 h-2 rounded-full ${supabaseConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          {/* Quick Role Switcher for PRD Verification */}
          <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">Role:</span>
            </span>
            {(['admin', 'guru_piket', 'wali_kelas'] as UserRole[]).map((r) => {
              const label = r === 'admin' ? 'Admin' : r === 'guru_piket' ? 'Guru Piket' : 'Wali Kelas';
              const isActive = currentUser.role === r;
              return (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`px-2 py-1 rounded text-xs transition-all font-medium ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                  title={`Ganti peran simulasi ke ${label}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Launch Kiosk Mode Button */}
          <button
            onClick={() => setActiveTab('kiosk')}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
            title="Buka Mode Kiosk Scan RFID Layar Penuh"
          >
            <Scan className="w-4 h-4" />
            <span className="font-bold tracking-wider">MODE KIOSK</span>
          </button>
        </div>
      </header>

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col justify-between shrink-0 no-print">
          <div className="p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item, idx) => {
              if (item.header) {
                if (!item.allowed) return null;
                return (
                  <div key={idx} className="pt-4 pb-1 px-3 text-[11px] font-bold tracking-wider text-slate-400">
                    {item.header}
                  </div>
                );
              }

              if (!item.allowed) return null;
              const Icon = item.icon!;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id!)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                    <div className="text-left">
                      <div>{item.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal leading-tight">{item.description}</div>
                    </div>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* User Profile Card */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
                <div className="text-[11px] text-indigo-400 capitalize truncate flex items-center gap-1">
                  <span>{currentUser.role.replace('_', ' ')}</span>
                  {currentUser.className && <span className="text-slate-400">({currentUser.className})</span>}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
