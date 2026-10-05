/**
 * SUPABASE EDGE FUNCTION CODE TEMPLATE: /functions/scan-rfid/index.ts
 *
 * Menerima payload: { rfid_tag: "XXXXX" }
 * Mengembalikan data absensi, status kehadiran (hadir/terlambat/pulang),
 * dan data siswa untuk dikonsumsi antarmuka Kiosk Mode secara real-time.
 */

export const SUPABASE_EDGE_FUNCTION_CODE = `import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { rfid_tag } = await req.json();

    if (!rfid_tag || typeof rfid_tag !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'error',
          message: 'Parameter rfid_tag wajib diisi.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const cleanTag = rfid_tag.trim().toLowerCase();

    // 1. Query cepat data siswa
    const { data: siswa, error: siswaErr } = await supabaseClient
      .from('siswa')
      .select('id, rfid_tag, nisn, nis, nama_lengkap, status, foto_url, kelas:kelas_id(id, nama_kelas)')
      .ilike('rfid_tag', cleanTag)
      .maybeSingle();

    if (siswaErr || !siswa) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'unknown',
          message: 'Kartu RFID Tidak Terdaftar di Database!',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (siswa.status === 'nonaktif') {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'inactive',
          message: 'Status siswa Non-Aktif.',
          siswa: {
            id: siswa.id,
            nama_lengkap: siswa.nama_lengkap,
            nisn: siswa.nisn,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 2. Ambil aturan jam operasional hari berjalan
    const now = new Date();
    const namaHariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const hariIni = namaHariList[now.getDay()];

    const { data: jamOp } = await supabaseClient
      .from('jam_operasional')
      .select('*')
      .eq('hari', hariIni)
      .maybeSingle();

    const todayDate = now.toISOString().split('T')[0];
    const timeNowStr = now.toTimeString().split(' ')[0]; // HH:mm:ss

    if (jamOp?.is_libur) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'holiday',
          message: \`Hari ini (\${hariIni}) adalah hari libur sekolah.\`,
          siswa: {
            nama_lengkap: siswa.nama_lengkap,
            nisn: siswa.nisn,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cek apakah siswa sudah absen hari ini
    const { data: existingAbsensi } = await supabaseClient
      .from('absensi')
      .select('*')
      .eq('siswa_id', siswa.id)
      .eq('tanggal', todayDate)
      .maybeSingle();

    let resultStatus = 'hadir';
    let scanType = 'masuk';
    let message = '';
    let absensiData = null;

    if (!existingAbsensi) {
      // SCAN PERTAMA (ABSEN MASUK)
      const batasTerlambat = jamOp?.jam_terlambat || '07:00:00';
      const isLate = timeNowStr > batasTerlambat;
      resultStatus = isLate ? 'terlambat' : 'hadir';
      message = isLate
        ? \`Absen Masuk: Terlambat (\${timeNowStr.substring(0, 5)})\`
        : \`Absen Masuk: Tepat Waktu (\${timeNowStr.substring(0, 5)})\`;

      const { data: newAbsen, error: insertErr } = await supabaseClient
        .from('absensi')
        .insert({
          siswa_id: siswa.id,
          tanggal: todayDate,
          waktu_masuk: timeNowStr,
          status: resultStatus,
          metode: 'rfid',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      absensiData = newAbsen;
      scanType = 'masuk';
    } else {
      // SCAN KEDUA (ABSEN PULANG)
      const jamPulang = jamOp?.jam_pulang || '14:30:00';
      if (timeNowStr < jamPulang) {
        return new Response(
          JSON.stringify({
            success: true,
            status: 'already_scanned',
            scan_type: 'already',
            message: \`Sudah absen masuk (\${existingAbsensi.waktu_masuk.substring(0, 5)}). Belum jam pulang (\${jamPulang.substring(0, 5)}).\`,
            siswa: {
              nama_lengkap: siswa.nama_lengkap,
              nisn: siswa.nisn,
              kelas: siswa.kelas?.nama_kelas || 'Kelas',
              foto_url: siswa.foto_url,
            },
            absensi: existingAbsensi,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update waktu pulang
      const { data: updatedAbsen, error: updateErr } = await supabaseClient
        .from('absensi')
        .update({
          waktu_pulang: timeNowStr,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAbsensi.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      absensiData = updatedAbsen;
      scanType = 'pulang';
      resultStatus = existingAbsensi.status;
      message = \`Absen Pulang Berhasil (\${timeNowStr.substring(0, 5)}). Selamat beristirahat!\`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: resultStatus,
        scan_type: scanType,
        message,
        timestamp: now.toISOString(),
        siswa: {
          id: siswa.id,
          nama_lengkap: siswa.nama_lengkap,
          nisn: siswa.nisn,
          rfid_tag: siswa.rfid_tag,
          kelas: siswa.kelas?.nama_kelas || 'Kelas',
          foto_url: siswa.foto_url,
        },
        absensi: absensiData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal Server Error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
`;
