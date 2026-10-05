import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  Settings,
  Filter,
  CreditCard,
  Table as TableIcon,
  Maximize2,
  FileCheck,
  QrCode,
  Sparkles,
  School,
} from 'lucide-react';

export const StudentPrintView: React.FC = () => {
  const { students, classes, settings, currentUser } = useApp();

  // Print format option: 'table' (Daftar Siswa) or 'card' (Kartu Absensi RFID)
  const [printFormat, setPrintFormat] = useState<'table' | 'card'>('table');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // Paper and layout settings as per PRD 3.2.C
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter' | 'F4' | 'Custom'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [marginTop, setMarginTop] = useState<number>(15);
  const [marginBottom, setMarginBottom] = useState<number>(15);
  const [marginLeft, setMarginLeft] = useState<number>(15);
  const [marginRight, setMarginRight] = useState<number>(15);

  // If currentUser is Wali Kelas, default to their assigned class
  const filteredStudents = useMemo(() => {
    return students.filter((std) => {
      if (currentUser.role === 'wali_kelas' && currentUser.classId && std.classId !== currentUser.classId) {
        return false;
      }
      if (selectedClassId === 'ALL') return true;
      return std.classId === selectedClassId;
    });
  }, [students, selectedClassId, currentUser]);

  const selectedClassName =
    selectedClassId === 'ALL'
      ? 'Seluruh Kelas'
      : classes.find((c) => c.id === selectedClassId)?.name || 'Kelas';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Configuration Controls Bar (Hidden during print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-400" />
              Cetak Data Siswa & Kartu RFID
            </h2>
            <p className="text-xs text-slate-400">
              Live preview dokumen cetak dengan kop surat resmi dan pengaturan tata letak kertas.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 self-start"
          >
            <Printer className="w-4 h-4" />
            Cetak Dokumen Sekarang (Print)
          </button>
        </div>

        {/* Setting Toolbar */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Format selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <span>Format Cetak:</span>
            </label>
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setPrintFormat('table')}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  printFormat === 'table' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Daftar (Tabel)
              </button>
              <button
                onClick={() => setPrintFormat('card')}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  printFormat === 'card' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Kartu RFID
              </button>
            </div>
          </div>

          {/* Filter Class */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Filter Kelas:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={currentUser.role === 'wali_kelas' && !!currentUser.classId}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              {currentUser.role !== 'wali_kelas' && <option value="ALL">Cetak Semua Kelas ({students.length} Siswa)</option>}
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Paper Size & Orientation */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Ukuran & Orientasi Kertas:</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-xs focus:outline-none"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="F4">F4 / Folio</option>
                <option value="Custom">Custom</option>
              </select>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white text-xs focus:outline-none"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          {/* Margins */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Margin Kertas (mm):
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              <div>
                <span className="text-slate-500 text-[10px] block">Top</span>
                <input
                  type="number"
                  value={marginTop}
                  onChange={(e) => setMarginTop(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center font-mono text-xs"
                />
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Btm</span>
                <input
                  type="number"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center font-mono text-xs"
                />
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Left</span>
                <input
                  type="number"
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center font-mono text-xs"
                />
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Right</span>
                <input
                  type="number"
                  value={marginRight}
                  onChange={(e) => setMarginRight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white text-center font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Paper Container */}
      <div className="flex justify-center overflow-x-auto pb-10">
        <div
          style={{
            paddingTop: `${marginTop}mm`,
            paddingBottom: `${marginBottom}mm`,
            paddingLeft: `${marginLeft}mm`,
            paddingRight: `${marginRight}mm`,
          }}
          className={`bg-white text-slate-900 shadow-2xl transition-all duration-300 print:shadow-none print:w-full ${
            orientation === 'landscape' ? 'w-[297mm] min-h-[210mm]' : 'w-[210mm] min-h-[297mm]'
          }`}
        >
          {/* Format 1: Daftar Siswa (Tabel Resmi) */}
          {printFormat === 'table' ? (
            <div className="space-y-4">
              {/* Kop Surat Sekolah Resmi */}
              <div className="border-b-4 border-double border-slate-900 pb-3 flex items-center gap-4 text-center">
                <div className="w-20 h-20 shrink-0 overflow-hidden flex items-center justify-center">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
                  ) : (
                    <School className="w-12 h-12 text-slate-800" />
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="text-xs uppercase tracking-widest font-semibold text-slate-600">
                    PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA
                  </div>
                  <div className="text-xs uppercase tracking-widest font-semibold text-slate-600">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </div>
                  <h1 className="text-xl font-extrabold text-slate-950 tracking-wide uppercase font-serif">
                    {settings.schoolName}
                  </h1>
                  <p className="text-[11px] text-slate-700 leading-tight">
                    {settings.address} • Telp: {settings.phone} • Email: {settings.email}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    NPSN: {settings.npsn} • Website: {settings.website}
                  </p>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center py-2 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950 underline underline-offset-4">
                  DAFTAR SISWA & ALOKASI KARTU IDENTITAS RFID
                </h2>
                <div className="text-xs font-semibold text-slate-700">
                  Tingkat / Rombel: <span className="font-bold">{selectedClassName}</span> • Tahun Ajaran 2026/2027
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-900 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                      <th className="py-2 px-2 border-r border-slate-900 w-10">NO</th>
                      <th className="py-2 px-3 border-r border-slate-900 w-28">NIS / NISN</th>
                      <th className="py-2 px-3 border-r border-slate-900 w-28">ID RFID</th>
                      <th className="py-2 px-3 border-r border-slate-900 text-left">NAMA LENGKAP SISWA</th>
                      <th className="py-2 px-2 border-r border-slate-900 w-12">L/P</th>
                      <th className="py-2 px-2 border-r border-slate-900 w-20">KELAS</th>
                      <th className="py-2 px-3 border-r border-slate-900 w-28">NO. HP ORTU</th>
                      <th className="py-2 px-2 w-16">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                          Tidak ada data siswa untuk kelas ini.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((std, idx) => (
                        <tr key={std.id} className="border-b border-slate-300">
                          <td className="py-1.5 px-2 text-center border-r border-slate-300 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 font-mono text-[11px] font-semibold">
                            {std.nisn}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 font-mono text-[11px] font-bold">
                            {std.rfidId}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 font-medium">{std.name}</td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-300 font-mono">
                            {std.gender}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-300 font-semibold">
                            {std.className}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 font-mono text-[11px]">
                            {std.parentPhone || '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center uppercase text-[10px] font-bold">
                            {std.status}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan Resmi Kepala Sekolah (PRD 3.5 & 3.2.C) */}
              <div className="pt-8 flex justify-end">
                <div className="text-center w-64 space-y-1 text-xs">
                  <div>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div>Kepala Sekolah,</div>
                  <div className="h-16 flex items-center justify-center font-serif italic text-slate-400">
                    ( Tanda Tangan & Cap Sekolah )
                  </div>
                  <div className="font-bold underline text-slate-950">{settings.principalName}</div>
                  <div className="text-[11px] font-mono text-slate-700">NIP. {settings.principalNip}</div>
                </div>
              </div>
            </div>
          ) : (
            /* Format 2: Kartu Absensi RFID Siswa (ID Cards Grid) */
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-300 no-print">
                <h2 className="text-sm font-bold uppercase text-slate-900">
                  LEMBAR CETAK KARTU PRESENSI RFID SISWA
                </h2>
                <p className="text-xs text-slate-500">
                  Potong sesuai garis putus-putus. Standar ukuran kartu ID Card ISO/IEC 7810 ID-1.
                </p>
              </div>

              {/* 2x4 Grid of Student ID Cards */}
              <div className="grid grid-cols-2 gap-4">
                {filteredStudents.map((std) => (
                  <div
                    key={std.id}
                    className="w-[85.6mm] h-[53.98mm] border border-dashed border-slate-400 rounded-xl p-3 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white relative overflow-hidden flex flex-col justify-between shadow-md print:shadow-none"
                  >
                    {/* Decorative Background lines */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />

                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-indigo-500/30 pb-1.5 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-white p-0.5 overflow-hidden">
                          {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <School className="w-full h-full text-indigo-900" />
                          )}
                        </div>
                        <div>
                          <div className="text-[9px] font-extrabold tracking-wider leading-tight">
                            {settings.schoolName}
                          </div>
                          <div className="text-[7px] text-cyan-300 font-mono leading-none">
                            KARTU ABSENSI RFID SISWA
                          </div>
                        </div>
                      </div>

                      {/* Contactless Chip Symbol */}
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-3 bg-amber-400/80 rounded-[2px] border border-amber-300 flex items-center justify-center">
                          <div className="w-2.5 h-1.5 border border-amber-600 rounded-[1px]" />
                        </div>
                        <CreditCard className="w-3.5 h-3.5 text-cyan-300" />
                      </div>
                    </div>

                    {/* Card Body: Photo & Student Info */}
                    <div className="flex gap-2.5 items-center my-1 relative z-10">
                      <div className="w-14 h-18 rounded-md bg-slate-800 overflow-hidden border border-indigo-400/50 shrink-0">
                        {std.photoUrl ? (
                          <img src={std.photoUrl} alt={std.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                            {std.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-xs font-bold text-white truncate leading-tight">{std.name}</div>
                        <div className="text-[10px] text-cyan-300 font-mono font-semibold">
                          NISN: {std.nisn}
                        </div>
                        <div className="text-[9px] text-slate-300">
                          Kelas: <span className="font-semibold text-white">{std.className}</span>
                        </div>
                        <div className="text-[8px] font-mono text-emerald-400 pt-0.5 flex items-center gap-1">
                          <span>RFID:</span>
                          <span className="font-bold tracking-wider">{std.rfidId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Barcode / QR Simulation */}
                    <div className="pt-1 border-t border-indigo-500/30 flex items-center justify-between text-[7px] text-slate-400 relative z-10 font-mono">
                      <span>NPSN: {settings.npsn}</span>
                      <div className="flex items-center gap-1 text-[8px] text-slate-300">
                        <QrCode className="w-3 h-3 text-cyan-300" />
                        <span>SMART-CARD</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
