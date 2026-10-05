-- ==============================================================================
-- STRUKTUR BACKEND SUPABASE (POSTGRESQL) - APLIKASI ABSENSI SEKOLAH BERBASIS RFID
-- ==============================================================================

-- 1. EKSTENSI & ENUM
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Role Pengguna
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'guru_piket', 'wali_kelas');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum Status Kehadiran
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('hadir', 'terlambat', 'sakit', 'izin', 'alpa');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum Metode Absensi
DO $$ BEGIN
    CREATE TYPE attendance_method AS ENUM ('rfid', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum Jenis Kelamin
DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('L', 'P');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABEL: SEKOLAH
CREATE TABLE IF NOT EXISTS public.sekolah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_sekolah VARCHAR(255) NOT NULL DEFAULT 'SMA NEGERI 1 NUSANTARA',
    npsn VARCHAR(20) NOT NULL UNIQUE DEFAULT '20104567',
    alamat TEXT NOT NULL DEFAULT 'Jl. Pendidikan Merdeka No. 45, Gambir, Jakarta Pusat',
    telepon VARCHAR(50) DEFAULT '(021) 3840123',
    email VARCHAR(100) DEFAULT 'info@sman1nusantara.sch.id',
    website VARCHAR(100) DEFAULT 'www.sman1nusantara.sch.id',
    logo_url TEXT,
    nama_kepsek VARCHAR(150) DEFAULT 'Drs. H. Mulyadi, M.Pd.',
    nip_kepsek VARCHAR(50) DEFAULT '19680512 199303 1 004',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL: JAM OPERASIONAL PER HARI
CREATE TABLE IF NOT EXISTS public.jam_operasional (
    id SERIAL PRIMARY KEY,
    hari VARCHAR(20) NOT NULL UNIQUE, -- 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
    urutan_hari INT NOT NULL, -- 1 = Senin, 7 = Minggu
    jam_masuk TIME NOT NULL DEFAULT '06:30:00',
    jam_terlambat TIME NOT NULL DEFAULT '07:00:00',
    jam_pulang TIME NOT NULL DEFAULT '14:30:00',
    is_libur BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Data Jam Operasional Default
INSERT INTO public.jam_operasional (hari, urutan_hari, jam_masuk, jam_terlambat, jam_pulang, is_libur)
VALUES
    ('Senin', 1, '06:30:00', '07:00:00', '15:00:00', false),
    ('Selasa', 2, '06:30:00', '07:00:00', '15:00:00', false),
    ('Rabu', 3, '06:30:00', '07:00:00', '15:00:00', false),
    ('Kamis', 4, '06:30:00', '07:00:00', '15:00:00', false),
    ('Jumat', 5, '06:30:00', '07:00:00', '11:45:00', false),
    ('Sabtu', 6, '06:30:00', '07:00:00', '13:00:00', false),
    ('Minggu', 7, '07:00:00', '07:30:00', '12:00:00', true)
ON CONFLICT (hari) DO NOTHING;

-- 4. TABEL: PROFILES (Terhubung ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_lengkap VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'guru_piket',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABEL: KELAS
CREATE TABLE IF NOT EXISTS public.kelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_kelas VARCHAR(50) NOT NULL UNIQUE,
    tingkat VARCHAR(10) NOT NULL, -- 'X', 'XI', 'XII'
    wali_kelas_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABEL: SISWA
CREATE TABLE IF NOT EXISTS public.siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfid_tag VARCHAR(100) NOT NULL UNIQUE,
    nisn VARCHAR(20) NOT NULL UNIQUE,
    nis VARCHAR(20),
    nama_lengkap VARCHAR(150) NOT NULL,
    jenis_kelamin gender_type NOT NULL DEFAULT 'L',
    kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
    no_hp_ortu VARCHAR(30),
    foto_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index Kecepatan Baca Kartu RFID di Mode Kiosk
CREATE INDEX IF NOT EXISTS idx_siswa_rfid_tag ON public.siswa(rfid_tag);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn ON public.siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_siswa_kelas_id ON public.siswa(kelas_id);

-- 7. TABEL: ABSENSI
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_masuk TIME NOT NULL DEFAULT CURRENT_TIME,
    waktu_pulang TIME,
    status attendance_status NOT NULL DEFAULT 'hadir',
    metode attendance_method NOT NULL DEFAULT 'rfid',
    keterangan TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_absensi_siswa_hari UNIQUE (siswa_id, tanggal)
);

-- Index Pencarian Rekap Kehadiran
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON public.absensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_status ON public.absensi(status);
CREATE INDEX IF NOT EXISTS idx_absensi_siswa ON public.absensi(siswa_id);

-- Aktifkan Realtime Replication untuk tabel absensi
ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jam_operasional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

-- Helper Function: Dapatkan Role User Saat Ini
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 8.1. POLICIES: SEKOLAH & JAM OPERASIONAL
CREATE POLICY "Public & All authenticated can read sekolah"
    ON public.sekolah FOR SELECT USING (true);

CREATE POLICY "Only admin can update sekolah"
    ON public.sekolah FOR ALL
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Public & All authenticated can read jam_operasional"
    ON public.jam_operasional FOR SELECT USING (true);

CREATE POLICY "Only admin can update jam_operasional"
    ON public.jam_operasional FOR ALL
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- 8.2. POLICIES: PROFILES
CREATE POLICY "Users can read all profiles"
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Only admin can modify profiles"
    ON public.profiles FOR ALL
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- 8.3. POLICIES: KELAS
CREATE POLICY "All authenticated users can read kelas"
    ON public.kelas FOR SELECT USING (true);

CREATE POLICY "Only admin can modify kelas"
    ON public.kelas FOR ALL
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- 8.4. POLICIES: SISWA
-- Admin: Full Access
CREATE POLICY "Admin has full access to siswa"
    ON public.siswa FOR ALL
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- Guru Piket: Can Read All Siswa
CREATE POLICY "Guru piket can read all siswa"
    ON public.siswa FOR SELECT
    USING (public.get_current_user_role() = 'guru_piket');

-- Wali Kelas: Read HANYA siswa di kelas yang diampu
CREATE POLICY "Wali kelas can only read students of their class"
    ON public.siswa FOR SELECT
    USING (
        public.get_current_user_role() = 'wali_kelas'
        AND kelas_id IN (SELECT id FROM public.kelas WHERE wali_kelas_id = auth.uid())
    );

-- Public / Kiosk: Read Siswa untuk verifikasi kartu RFID
CREATE POLICY "Public kiosk can read active students for RFID tap"
    ON public.siswa FOR SELECT
    USING (status = 'aktif');

-- 8.5. POLICIES: ABSENSI
-- Admin: Full Access
CREATE POLICY "Admin has full access to absensi"
    ON public.absensi FOR ALL
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- Guru Piket: READ seluruh data, INSERT/UPDATE tabel absensi
CREATE POLICY "Guru piket can read all absensi"
    ON public.absensi FOR SELECT
    USING (public.get_current_user_role() = 'guru_piket');

CREATE POLICY "Guru piket can insert and update absensi"
    ON public.absensi FOR INSERT
    WITH CHECK (public.get_current_user_role() = 'guru_piket');

CREATE POLICY "Guru piket can update absensi"
    ON public.absensi FOR UPDATE
    USING (public.get_current_user_role() = 'guru_piket')
    WITH CHECK (public.get_current_user_role() = 'guru_piket');

-- Wali Kelas: READ data absensi HANYA untuk siswa kelas binaannya
CREATE POLICY "Wali kelas can read absensi of their students"
    ON public.absensi FOR SELECT
    USING (
        public.get_current_user_role() = 'wali_kelas'
        AND siswa_id IN (
            SELECT s.id FROM public.siswa s
            JOIN public.kelas k ON s.kelas_id = k.id
            WHERE k.wali_kelas_id = auth.uid()
        )
    );

-- Public Kiosk Mode: Boleh Insert/Update via RPC atau Kiosk Key
CREATE POLICY "Public kiosk can read today absensi"
    ON public.absensi FOR SELECT
    USING (tanggal = CURRENT_DATE);

CREATE POLICY "Public kiosk can insert absensi"
    ON public.absensi FOR INSERT
    WITH CHECK (metode = 'rfid');

CREATE POLICY "Public kiosk can update waktu_pulang"
    ON public.absensi FOR UPDATE
    USING (tanggal = CURRENT_DATE);

-- ==============================================================================
-- 9. STORED PROCEDURE / RPC: SCAN RFID CEPAT (DIGUNAKAN OLEH KIOSK & EDGE FUNCTION)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.scan_rfid_card(p_rfid_tag TEXT)
RETURNS JSONB AS $$
DECLARE
    v_siswa RECORD;
    v_jam_op RECORD;
    v_absensi RECORD;
    v_nama_hari TEXT;
    v_current_time TIME := CURRENT_TIME;
    v_current_date DATE := CURRENT_DATE;
    v_status attendance_status;
    v_scan_type TEXT;
    v_message TEXT;
BEGIN
    -- 1. Cari Siswa berdasarkan rfid_tag
    SELECT s.*, k.nama_kelas INTO v_siswa
    FROM public.siswa s
    LEFT JOIN public.kelas k ON s.kelas_id = k.id
    WHERE LOWER(s.rfid_tag) = LOWER(TRIM(p_rfid_tag));

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'unknown',
            'message', 'Kartu RFID tidak terdaftar!',
            'data', NULL
        );
    END IF;

    IF v_siswa.status = 'nonaktif' THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'inactive',
            'message', 'Status siswa non-aktif, hubungi tata usaha.',
            'siswa', row_to_json(v_siswa)
        );
    END IF;

    -- 2. Tentukan nama hari ini dalam Bahasa Indonesia
    v_nama_hari := CASE EXTRACT(DOW FROM v_current_date)
        WHEN 0 THEN 'Minggu'
        WHEN 1 THEN 'Senin'
        WHEN 2 THEN 'Selasa'
        WHEN 3 THEN 'Rabu'
        WHEN 4 THEN 'Kamis'
        WHEN 5 THEN 'Jumat'
        WHEN 6 THEN 'Sabtu'
    END;

    -- 3. Ambil aturan jam operasional hari berjalan
    SELECT * INTO v_jam_op
    FROM public.jam_operasional
    WHERE hari = v_nama_hari;

    IF FOUND AND v_jam_op.is_libur THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'holiday',
            'message', 'Hari ini adalah hari libur (' || v_nama_hari || ').',
            'siswa', row_to_json(v_siswa)
        );
    END IF;

    -- 4. Cek apakah sudah absen hari ini
    SELECT * INTO v_absensi
    FROM public.absensi
    WHERE siswa_id = v_siswa.id AND tanggal = v_current_date;

    IF NOT FOUND THEN
        -- SCAN PERTAMA (ABSEN MASUK)
        IF v_jam_op.jam_terlambat IS NOT NULL AND v_current_time > v_jam_op.jam_terlambat THEN
            v_status := 'terlambat';
            v_message := 'Absen Masuk Berhasil: Terlambat (' || to_char(v_current_time, 'HH24:MI') || ')';
        ELSE
            v_status := 'hadir';
            v_message := 'Absen Masuk Berhasil: Tepat Waktu (' || to_char(v_current_time, 'HH24:MI') || ')';
        END IF;

        INSERT INTO public.absensi (
            siswa_id, tanggal, waktu_masuk, status, metode
        ) VALUES (
            v_siswa.id, v_current_date, v_current_time, v_status, 'rfid'
        ) RETURNING * INTO v_absensi;

        v_scan_type := 'masuk';
    ELSE
        -- SCAN KEDUA (ABSEN PULANG)
        IF v_jam_op.jam_pulang IS NOT NULL AND v_current_time < v_jam_op.jam_pulang THEN
            -- Belum jam pulang
            RETURN jsonb_build_object(
                'success', true,
                'status', 'already_scanned',
                'scan_type', 'already',
                'message', 'Sudah absen masuk (' || to_char(v_absensi.waktu_masuk, 'HH24:MI') || '). Belum waktunya jam pulang (' || to_char(v_jam_op.jam_pulang, 'HH24:MI') || ').',
                'siswa', row_to_json(v_siswa),
                'absensi', row_to_json(v_absensi)
            );
        END IF;

        -- Update waktu pulang
        UPDATE public.absensi
        SET waktu_pulang = v_current_time,
            updated_at = NOW()
        WHERE id = v_absensi.id
        RETURNING * INTO v_absensi;

        v_scan_type := 'pulang';
        v_status := v_absensi.status;
        v_message := 'Absen Pulang Berhasil (' || to_char(v_current_time, 'HH24:MI') || '). Hati-hati di jalan!';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'scan_type', v_scan_type,
        'message', v_message,
        'siswa', jsonb_build_object(
            'id', v_siswa.id,
            'nama_lengkap', v_siswa.nama_lengkap,
            'nisn', v_siswa.nisn,
            'rfid_tag', v_siswa.rfid_tag,
            'kelas', v_siswa.nama_kelas,
            'foto_url', v_siswa.foto_url
        ),
        'absensi', jsonb_build_object(
            'id', v_absensi.id,
            'tanggal', v_absensi.tanggal,
            'waktu_masuk', v_absensi.waktu_masuk,
            'waktu_pulang', v_absensi.waktu_pulang,
            'status', v_absensi.status
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
