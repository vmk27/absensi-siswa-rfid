import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardView } from './components/dashboard/DashboardView';
import { ClassManager } from './components/master/ClassManager';
import { StudentManager } from './components/master/StudentManager';
import { StudentPrintView } from './components/master/StudentPrintView';
import { UserManager } from './components/users/UserManager';
import { BulkAttendanceView } from './components/attendance/BulkAttendanceView';
import { SettingsView } from './components/settings/SettingsView';
import { KioskView } from './components/kiosk/KioskView';
import { getSupabaseClient } from './lib/supabase';

const MainApp: React.FC = () => {
  const { activeTab, syncWithSupabase, supabaseConfig } = useApp();

  // Supabase Realtime Subscription: supabase.channel('absensi-changes')
  // Automatically sync attendance updates when database records change
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !supabaseConfig.isConnected) return;

    try {
      const channel = supabase
        .channel('absensi-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'absensi' },
          (payload) => {
            console.log('Realtime change received from Supabase:', payload);
            syncWithSupabase();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Supabase realtime subscription failed:', e);
    }
  }, [supabaseConfig.isConnected]);

  // If in Kiosk Mode, show clean full screen interface without admin navbar
  if (activeTab === 'kiosk') {
    return <KioskView />;
  }

  return (
    <AdminLayout>
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'classes' && <ClassManager />}
      {activeTab === 'students' && <StudentManager />}
      {activeTab === 'print' && <StudentPrintView />}
      {activeTab === 'bulk_attendance' && <BulkAttendanceView />}
      {activeTab === 'users' && <UserManager />}
      {activeTab === 'settings' && <SettingsView />}
    </AdminLayout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
