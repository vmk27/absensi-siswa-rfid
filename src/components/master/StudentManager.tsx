import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Pencil,
  Trash2,
  Scan,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle,
  CreditCard,
  Phone,
} from 'lucide-react';

export const StudentManager: React.FC = () => {
  const {
    students,
    classes,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkImportStudents,
    currentUser,
  } = useApp();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'aktif' | 'nonaktif'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isListeningRfid, setIsListeningRfid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nisn: '',
    rfidId: '',
    name: '',
    classId: '',
    gender: 'L' as 'L' | 'P',
    parentPhone: '',
    status: 'aktif' as 'aktif' | 'nonaktif',
    photoUrl: '',
  });

  // Bulk Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  // If currentUser is Wali Kelas, default or restrict view to their class as per PRD
  const allowedClasses = useMemo(() => {
    if (currentUser.role === 'wali_kelas' && currentUser.classId) {
      return classes.filter((c) => c.id === currentUser.classId);
    }
    return classes;
  }, [classes, currentUser]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((std) => {
      // Role restriction for wali kelas
      if (currentUser.role === 'wali_kelas' && currentUser.classId && std.classId !== currentUser.classId) {
        return false;
      }

      const matchSearch =
        std.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.nisn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.rfidId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchClass = classFilter === 'ALL' || std.classId === classFilter;
      const matchStatus = statusFilter === 'ALL' || std.status === statusFilter;

      return matchSearch && matchClass && matchStatus;
    });
  }, [students, searchTerm, classFilter, statusFilter, currentUser]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormError(null);
    setFormData({
      nisn: '',
      rfidId: '',
      name: '',
      classId: allowedClasses[0]?.id || 'cls-1',
      gender: 'L',
      parentPhone: '',
      status: 'aktif',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=533&fit=crop&q=80',
    });
    setIsListeningRfid(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (std: Student) => {
    setEditingStudent(std);
    setFormError(null);
    setFormData({
      nisn: std.nisn,
      rfidId: std.rfidId,
      name: std.name,
      classId: std.classId,
      gender: std.gender,
      parentPhone: std.parentPhone,
      status: std.status,
      photoUrl: std.photoUrl,
    });
    setIsListeningRfid(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const selectedClass = classes.find((c) => c.id === formData.classId);

    if (editingStudent) {
      const res = updateStudent(editingStudent.id, {
        ...formData,
        className: selectedClass?.name || 'Umum',
      });
      if (!res.success) {
        setFormError(res.error || 'Gagal menyimpan data.');
        return;
      }
    } else {
      const res = addStudent({
        ...formData,
        className: selectedClass?.name || 'Umum',
      });
      if (!res.success) {
        setFormError(res.error || 'Gagal menambahkan data.');
        return;
      }
    }

    setIsModalOpen(false);
  };

  // Simulate or capture hardware tap in form
  const handleSimulateCardTap = () => {
    setIsListeningRfid(true);
    // Generate or read tag
    setTimeout(() => {
      const generatedTag = 'RFID-' + Math.floor(1000 + Math.random() * 9000);
      setFormData((prev) => ({ ...prev, rfidId: generatedTag }));
      setIsListeningRfid(false);
    }, 1200);
  };

  // Download Excel / CSV template
  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'NISN,ID_RFID,Nama_Siswa,Kelas,Jenis_Kelamin(L/P),No_HP_Orang_Tua\n' +
      '0061234599,RFID-9001,Ahmad Santoso,X IPA 1,L,081234567890\n' +
      '0061234598,RFID-9002,Siti Nurhaliza,X IPA 1,P,081234567891\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'template_import_siswa_rfid.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        setImportErrors(['File CSV kosong atau hanya memiliki baris header.']);
        return;
      }

      const parsedStudents: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 4) {
          const [nisn, rfidId, name, className, gender, parentPhone] = cols;
          parsedStudents.push({
            nisn: nisn || '',
            rfidId: rfidId || '',
            name: name || '',
            className: className || 'X IPA 1',
            gender: (gender?.toUpperCase() === 'P' ? 'P' : 'L') as 'L' | 'P',
            parentPhone: parentPhone || '',
            status: 'aktif' as const,
            photoUrl: `https://images.unsplash.com/photo-${1534528741775 + i}?w=400&h=533&fit=crop&q=80`,
          });
        }
      }

      const result = bulkImportStudents(parsedStudents);
      if (result.success) {
        setImportSuccessMessage(`Berhasil mengimpor ${result.importedCount} data siswa!`);
      }
      if (result.errors.length > 0) {
        setImportErrors(result.errors);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Data Siswa & Kartu RFID
          </h2>
          <p className="text-xs text-slate-400">
            Daftar lengkap siswa, nomor identitas RFID reader, dan nomor kontak wali murid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Upload Massal (CSV)
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tambah Siswa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Nama, NISN, atau ID RFID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Class filter */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Kelas:</span>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Semua Kelas</option>
              {allowedClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-Aktif</option>
            </select>
          </div>

          {/* Page size */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Table (PRD 3.2.B) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Siswa</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">ID Card RFID</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-center">L/P</th>
                <th className="py-3 px-4">No. HP Ortu</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Tidak ditemukan data siswa yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((std, idx) => {
                  const isAktif = std.status === 'aktif';
                  return (
                    <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        {(currentPage - 1) * pageSize + idx + 1}
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
                            <div className="font-semibold text-white">{std.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 font-semibold">{std.nisn}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-[11px]">
                          <CreditCard className="w-3 h-3 text-indigo-400" />
                          {std.rfidId}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{std.className}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">
                        <span className={std.gender === 'L' ? 'text-blue-400' : 'text-pink-400'}>
                          {std.gender}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                        {std.parentPhone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {std.parentPhone}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isAktif
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {std.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(std)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="Edit Data Siswa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => setDeleteTarget(std)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Hapus Data Siswa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Menampilkan <span className="font-semibold text-white">{paginatedStudents.length}</span> dari{' '}
            <span className="font-semibold text-white">{filteredStudents.length}</span> siswa
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit Siswa (PRD 3.2.B) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa & Pasang Kartu RFID'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mx-4 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    NIS / NISN <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 0061234501"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* RFID Reader Input & Hardware Tap Simulator */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ID Card RFID <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Tempelkan kartu atau ketik..."
                      value={formData.rfidId}
                      onChange={(e) => setFormData({ ...formData, rfidId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleSimulateCardTap}
                      disabled={isListeningRfid}
                      className="px-2.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
                      title="Tap Kartu RFID Sekarang"
                    >
                      <Scan className={`w-3.5 h-3.5 ${isListeningRfid ? 'animate-spin text-cyan-400' : ''}`} />
                      {isListeningRfid ? 'Membaca...' : 'Tap'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap Siswa <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama sesuai akta lahir"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kelas <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Jenis Kelamin <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nomor WhatsApp / HP Orang Tua
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 08123456789"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Status Siswa
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL Foto Siswa (Pas Foto 300x400)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg shadow-lg shadow-indigo-600/20 transition-colors"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Daftarkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Massal (Import Excel/CSV) Modal (PRD 3.2.B) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Upload Massal Data Siswa (Excel / CSV)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1: Download Template */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-white">Langkah 1: Unduh Format Template</div>
                <p className="text-[11px] text-slate-400">
                  Gunakan format kolom template resmi agar validasi NISN dan RFID berjalan tepat.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Template CSV / Excel
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-white">Langkah 2: Pilih Berkas Hasil Pengisian</div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              {/* Success Notification */}
              {importSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              {/* Error messages */}
              {importErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1 max-h-36 overflow-y-auto">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Peringatan Validasi Import ({importErrors.length}):
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-400">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-slate-800">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition-colors"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-white">Hapus Data Siswa?</h3>
              <p className="text-xs text-slate-400">
                Apakah Anda yakin ingin menghapus data siswa{' '}
                <span className="text-white font-semibold">{deleteTarget.name}</span> (NISN: {deleteTarget.nisn})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteStudent(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white rounded-lg shadow-lg shadow-rose-600/20 transition-colors"
              >
                Ya, Hapus Siswa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
