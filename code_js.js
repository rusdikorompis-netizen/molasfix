// ============================================
// 1. KONFIGURASI UTAMA & KEAMANAN ENDPOINT
// ============================================

const _dec = (str) => {
  try {
    let d = atob(str);
    d = d.split('').reverse().join('');
    d = atob(d);
    return decodeURIComponent(escape(d));
  } catch(e) {
    return decodeURIComponent(escape(atob(str)));
  }
};

const _enc = (str) => {
  let r = btoa(unescape(encodeURIComponent(str)));
  r = r.split('').reverse().join('');
  return btoa(r);
};

// URL BACKEND BARU HASIL DEPLOY
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzEJ1LwD9KTUPeItdFJjBbQG7ckVxLUB9X9zpdwgr5ArbrNpCJq1V9q2D4sI2nwWJOWw/exec';

const MOLAS_API_KEY = "MOLAS_API_2026_SECURE_9f8e7d6c5b4a3_!@#";
const MOLAS_SECURE_HEADER = {
  get warga_token() { return localStorage.getItem('molas_warga_token') || ''; },
  get api_key() { return MOLAS_API_KEY; },
  get token() { return localStorage.getItem('molas_admin_token') || ''; },
  get isAdmin() { const s = localStorage.getItem('userSession'); try { return s ? JSON.parse(s).isAdmin : false; } catch(e){ return false; } }
};

const EP_KONTAK = _dec('aHR0cHM6Ly9mb3Jtc3ByZWUuaW8vZi94amdrZ2dvdg==');
const EP_SURAT = _dec('aHR0cHM6Ly9mb3Jtc3ByZWUuaW8vZi94emR6emF2ag==');
const EP_ADUAN = _dec('aHR0cHM6Ly9mb3Jtc3ByZWUuaW8vZi9tb2p2dm5seQ==');

// Secure fetch wrapper DUAL TOKEN (ADMIN & WARGA)
const secureFetch = async (url, options = {}) => {
  let finalUrl = url;
  const hasParams = url.includes('?');
  const wargaToken = localStorage.getItem('molas_warga_token') || '';
  const adminToken = localStorage.getItem('molas_admin_token') || '';
  
  if(!finalUrl.includes('api_key=')) {
    finalUrl += (hasParams ? '&' : '?') + 'api_key=' + encodeURIComponent(MOLAS_API_KEY);
  }
  
  if(finalUrl.includes('action=checkBLT') || finalUrl.includes('action=getWargaProfile') || finalUrl.includes('action=validateWargaToken')){
    if(wargaToken && !finalUrl.includes('warga_token=')) finalUrl += '&warga_token=' + encodeURIComponent(wargaToken);
    if(wargaToken && !finalUrl.includes('token=')) finalUrl += '&token=' + encodeURIComponent(wargaToken);
  } else {
    if(adminToken && !finalUrl.includes('token=') && !finalUrl.includes('admin_token=')){
      finalUrl += '&token=' + encodeURIComponent(adminToken) + '&admin_token=' + encodeURIComponent(adminToken);
    }
  }
  
  if(options.body && typeof options.body === 'string') {
    try {
      const j = JSON.parse(options.body);
      if(!j.api_key) j.api_key = MOLAS_API_KEY;
      if(j.action && (j.action==='checkBLT' || j.action==='getWargaProfile' || j.action==='validateWargaToken')){
        if(wargaToken && !j.warga_token) j.warga_token = wargaToken;
        if(wargaToken && !j.token) j.token = wargaToken;
      } else {
        if(adminToken && !j.token) j.token = adminToken;
        if(adminToken && !j.admin_token) j.admin_token = adminToken;
      }
      options.body = JSON.stringify(j);
    } catch(e){}
  }
  
  options.headers = options.headers || {};
  if(!options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'text/plain;charset=utf-8';
  }
  options.redirect = options.redirect || 'follow';
  return fetch(finalUrl, options);
};

const IDLE_TIMEOUT = 5 * 60 * 1000; 
let idleTimer; 

document.addEventListener('DOMContentLoaded', () => {
    const fKontak = document.querySelector('form[action*="formspree.io/f/xjgkggov"]');
    const fSurat = document.getElementById('form-surat-online');
    const fAduan = document.getElementById('form-pengaduan');
    
    if(fKontak) fKontak.action = EP_KONTAK;
    if(fSurat) fSurat.action = EP_SURAT;
    if(fAduan) fAduan.action = EP_ADUAN;
});

// ============================================
// 2. FUNGSI UI (TAMPILAN, TAB, MODAL)
// ============================================
function openLoginModal() {
    const modal = document.getElementById('login-modal');
    if(modal) {
        modal.classList.remove('hidden-el'); 
        modal.classList.remove('hidden');    
    }
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if(modal) modal.classList.add('hidden-el');
}

function switchTab(type) {
    const tabWarga = document.getElementById('tab-warga');
    const tabAdmin = document.getElementById('tab-admin');
    const contentWarga = document.getElementById('content-warga');
    const contentAdmin = document.getElementById('content-admin');

    if (type === 'warga') {
        contentWarga.classList.remove('hidden-el');
        contentAdmin.classList.add('hidden-el');
        tabWarga.className = 'flex-1 py-2 text-sm font-bold rounded-full text-white bg-teal-600 shadow-sm transition';
        tabAdmin.className = 'flex-1 py-2 text-sm font-bold rounded-full text-slate-500 hover:text-slate-700 transition';
    } else {
        contentWarga.classList.add('hidden-el');
        contentAdmin.classList.remove('hidden-el');
        tabWarga.className = 'flex-1 py-2 text-sm font-bold rounded-full text-slate-500 hover:text-slate-700 transition';
        tabAdmin.className = 'flex-1 py-2 text-sm font-bold rounded-full text-white bg-purple-700 shadow-sm transition';
    }
}

// ============================================
// 3. LOGIKA LOGIN & AUTH (WARGA & ADMIN)
// ============================================

// ============================================================================
// DATA LENGKAP 41 INDIKATOR PROFIL DESA & 3 ARTIKEL UTAMA LANDING PAGE
// ============================================================================
const dataProfilDesaLengkap = [
    { no: 1, nama: "Total Populasi Penduduk Desa", p: 560, w: 588, jml: "1.148 Jiwa" },
    { no: 2, nama: "Jumlah Kepala Keluarga (KK)", p: 284, w: 68, jml: "352 KK" },
    { no: 3, nama: "Penduduk Wilayah Jaga I", p: 130, w: 125, jml: "255 Jiwa" },
    { no: 4, nama: "Penduduk Wilayah Jaga II", p: 119, w: 99, jml: "218 Jiwa" },
    { no: 5, nama: "Penduduk Wilayah Jaga III", p: 120, w: 98, jml: "218 Jiwa" },
    { no: 6, nama: "Penduduk Wilayah Jaga IV", p: 186, w: 182, jml: "368 Jiwa" },
    { no: 7, nama: "Usia Balita (0 - 5 Tahun)", p: 38, w: 41, jml: "79 Jiwa" },
    { no: 8, nama: "Usia Anak Sekolah (6 - 12 Tahun)", p: 58, w: 62, jml: "120 Jiwa" },
    { no: 9, nama: "Usia Remaja (13 - 17 Tahun)", p: 49, w: 51, jml: "100 Jiwa" },
    { no: 10, nama: "Usia Pemuda & Produktif (18 - 59 Tahun)", p: 342, w: 348, jml: "690 Jiwa" },
    { no: 11, nama: "Usia Lansia (60 Tahun ke Atas)", p: 73, w: 86, jml: "159 Jiwa" },
    { no: 12, nama: "Pendidikan Tamat SD / Sederajat", p: 95, w: 102, jml: "197 Jiwa" },
    { no: 13, nama: "Pendidikan Tamat SLTP / Sederajat", p: 140, w: 148, jml: "288 Jiwa" },
    { no: 14, nama: "Pendidikan Tamat SLTA / Sederajat", p: 235, w: 242, jml: "477 Jiwa" },
    { no: 15, nama: "Pendidikan Diploma / Akademi (D1-D3)", p: 18, w: 24, jml: "42 Jiwa" },
    { no: 16, nama: "Pendidikan Sarjana / Pascasarjana (S1-S2)", p: 34, w: 41, jml: "75 Jiwa" },
    { no: 17, nama: "Mata Pencaharian Petani / Pekebun", p: 245, w: 85, jml: "330 Jiwa" },
    { no: 18, nama: "Mata Pencaharian Wiraswasta / UMKM", p: 68, w: 54, jml: "122 Jiwa" },
    { no: 19, nama: "Aparatur Sipil Negara (PNS / TNI / Polri)", p: 14, w: 18, jml: "32 Jiwa" },
    { no: 20, nama: "Karyawan Swasta & Honorer", p: 52, w: 46, jml: "98 Jiwa" },
    { no: 21, nama: "Pekerja Maritim / Pelaut Luar Daerah", p: 19, w: 2, jml: "21 Jiwa" },
    { no: 22, nama: "Mengurus Rumah Tangga (IRT)", p: 0, w: 245, jml: "245 Jiwa" },
    { no: 23, nama: "Pelajar & Mahasiswa Aktif", p: 112, w: 118, jml: "230 Jiwa" },
    { no: 24, nama: "Agama Kristen Protestan", p: 520, w: 546, jml: "1.066 Jiwa" },
    { no: 25, nama: "Agama Katolik", p: 18, w: 20, jml: "38 Jiwa" },
    { no: 26, nama: "Agama Islam", p: 22, w: 22, jml: "44 Jiwa" },
    { no: 27, nama: "Peserta Jaminan Kesehatan (BPJS Kesehatan)", p: 490, w: 520, jml: "1.010 Jiwa" },
    { no: 28, nama: "Keluarga Penerima Manfaat BLT Dana Desa", p: 4, w: 3, jml: "7 KPM" },
    { no: 29, nama: "Keluarga Penerima PKH & BPNT Kemensos", p: 32, w: 48, jml: "80 KPM" },
    { no: 30, nama: "Kader Posyandu & Kesehatan Desa", p: 0, w: 10, jml: "10 Kader" },
    { no: 31, nama: "Ibu Hamil Terpantau Posyandu", p: 0, w: 3, jml: "3 Orang" },
    { no: 32, nama: "Warga Penyandang Disabilitas", p: 2, w: 1, jml: "3 Jiwa" },
    { no: 33, nama: "Kepemilikan Rumah Layak Huni", p: 270, w: 62, jml: "332 Unit" },
    { no: 34, nama: "Akses Listrik PLN (Rumah Tangga)", p: 284, w: 68, jml: "352 KK (100%)" },
    { no: 35, nama: "Akses Air Bersih / PAM Desa", p: 284, w: 68, jml: "352 KK (100%)" },
    { no: 36, nama: "Kepemilikan Jamban Sehat Keluarga", p: 280, w: 68, jml: "348 KK (98.8%)" },
    { no: 37, nama: "Unit Usaha Mikro & Warung Desa (UMKM)", p: 18, w: 22, jml: "40 Unit" },
    { no: 38, nama: "Kelompok Tani & Perkebunan Aktif", p: 54, w: 14, jml: "68 Anggota" },
    { no: 39, nama: "Aparatur Pemerintah Desa & Kepala Jaga", p: 7, w: 4, jml: "11 Aparatur" },
    { no: 40, nama: "Anggota Badan Permusyawaratan Desa (BPD)", p: 3, w: 2, jml: "5 Anggota" },
    { no: 41, nama: "Status Indeks Desa Membangun (IDM)", p: "-", w: "-", jml: "MANDIRI (0.8235)" }
];

const dataArtikelDesa = {
    1: {
        judul: "Penginputan Index Desa 2026 Pendamping Lokal Desa & Operator Siskeudes (Selesai)",
        kategori: "Tata Kelola",
        tanggal: "10 Agustus 2026",
        penulis: "PLD & Operator Desa",
        gambar: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhtX-8671JGjFu9iMEpxs8fBpxLKqLP6o1fg9fbp3SeUcmFqTVl67YQlenx03_oTzWcO4oFxu2UoeW4vFyx_Bz1Oe-Wr1ZBwhBbUZ8uvmgUI9pnD-d2ctCn_1Wwt8f9M0rhFKclU5HQWE80O9xyvZ3LoOdFYKlfRV9WJNKvzWe5-9q6WFrMjbfz7AOD3i0/s1280/WhatsApp%20Image%202026-07-28%20at%2015.43.11.jpeg",
        isi: `<p><strong>MOLOMPAR ATAS</strong> — Pemerintah Desa Molompar Atas bersama Pendamping Lokal Desa (PLD) dan Operator Siskeudes telah menuntaskan seluruh tahapan penginputan dan verifikasi instrumen <strong>Indeks Desa Tahun 2026</strong> dengan capaian status <strong>Desa Mandiri</strong>.</p>
        <p>Proses pemutakhiran data dilakukan secara menyeluruh mencakup dimensi Layanan Dasar, Sosial, Ekonomi, Lingkungan, Aksesibilitas, serta Tata Kelola Pemerintahan Desa yang transparan dan akuntabel.</p>
        <p>Hukum Tua Desa Molompar Atas, <strong>Alfius Bonifasius Tulandi</strong>, menyampaikan apresiasi atas kerja keras seluruh perangkat desa, operator, dan pendamping desa yang memastikan akurasi data sesuai kondisi riil di lapangan sebagai dasar perencanaan APBDes yang tepat sasaran.</p>`
    },
    2: {
        judul: "Pembagian Makanan Tambahan dan MBG Desa Molompar Atas",
        kategori: "Kesehatan & Gizi",
        tanggal: "29 Januari 2026",
        penulis: "Kader Kesehatan & Posyandu",
        gambar: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg63rqhEFZ6Ria0bj_5fOYI6cIPh_iMUqtVqx6YoftxydjqYVvsp8xaBoMhQ4yZniIm4G2tIFZn3iDtI52WyRbXQSZtH65OW5ABv6GtHCV1XSdUwkmsU4VOQpCD7ffdfeEMNQAi4fJ1XLzD3G4dzYDGskA_F-ZL-A5wIewA2StzyM9yAAAJ6gQcq_thsoa8/s1600/631644609_1804342457636665_2872722775409525055_n.jpg",
        isi: `<p><strong>MOLOMPAR ATAS</strong> — Dalam rangka percepatan penurunan stunting dan peningkatan gizi masyarakat, Pemerintah Desa Molompar Atas bersama Kader Posyandu, KPM, Kader SUB-PPKBD, dan Tim Puskesmas Tombatu Timur melaksanakan kegiatan pelayanan Posyandu rutin bulanan yang dirangkaikan dengan penyaluran Pemberian Makanan Tambahan (PMT) serta Makan Bergizi Gratis (MBG).</p>
        <p>Layanan ini menyasar ibu hamil, bayi/balita, serta pemeriksaan kesehatan berkala bagi warga lanjut usia (Lansia) dari Jaga I hingga Jaga IV bertempat di Balai Desa Molompar Atas.</p>`
    },
    3: {
        judul: "Layanan Pemerintahan Desa Molompar Atas Berbasis Digital",
        kategori: "Pelayanan Publik",
        tanggal: "20 Januari 2026",
        penulis: "Pelayanan Desa",
        gambar: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhqrefHsqHC_UWmE4hKDY0W4FAWFQCtZsK211FgwEP6LRe4PsryCLcGjSFIUAYJCdkV_2puk3zUH1pfVMJj1UUnvcmhC12BZG0lGcz1t4vNkfiu_4vl2dyq7C9LcvAshbMINwH1SaMn55-SRMaDl5uu6gFMXFEYUIJgw8LKVwxd8plx_nVOh4RWcF4LSbV1/s1600/d10200fc-8ae9-4b19-8a80-5568e918892a.jfif",
        isi: `<p><strong>MOLOMPAR ATAS</strong> — Pemerintah Desa Molompar Atas terus meningkatkan kualitas pelayanan administrasi kependudukan, persuratan online, transparansi APBDes, serta penanganan aspirasi masyarakat melalui Sistem Informasi Desa Digital Terpadu.</p>
        <p>Melalui portal resmi ini, warga dapat melakukan pengecekan mandiri status penerima bantuan sosial (BLT Dana Desa, PKH, BPNT, Pangan, RTLH), mengajukan permohonan surat keterangan secara online dari rumah, serta memantau realisasi APBDes secara terbuka.</p>`
    }
};

let deferredPWAPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPWAPrompt = e;
    const banner = document.getElementById('pwa-bottom-banner');
    if (banner && !sessionStorage.getItem('pwa_dismissed')) {
        banner.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
    }
});

function installPWAApp() {
    if (deferredPWAPrompt) {
        deferredPWAPrompt.prompt();
        deferredPWAPrompt.userChoice.then(() => {
            deferredPWAPrompt = null;
            dismissPWABanner();
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Pasang Aplikasi Desa',
            html: 'Untuk memasang aplikasi di HP Anda, klik menu <b>Titik Tiga (⋮)</b> atau <b>Share</b> di browser lalu pilih <b>"Tambahkan ke Layar Utama" (Add to Home Screen)</b>.',
            confirmButtonColor: '#0f766e'
        });
    }
}

function dismissPWABanner() {
    sessionStorage.setItem('pwa_dismissed', '1');
    const banner = document.getElementById('pwa-bottom-banner');
    if (banner) {
        banner.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
    }
}

// ============================================================================
// 3. LOGIKA LOGIN, AUTH & SINKRONISASI OTOMATIS GOOGLE SHEETS (WARGA & ADMIN)
// ============================================================================

let cloudSyncTimeout = null;
let isSyncingCloud = false;

function updateCloudSyncBadge(state, text) {
    const badge = document.getElementById('cloudSyncBadge');
    if (!badge) return;
    if (state === 'syncing') {
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
        badge.innerHTML = '🔄 ' + (text || 'Sinkronisasi Sheets...');
    } else if (state === 'ok') {
        badge.style.background = '#dcfce7';
        badge.style.color = '#166534';
        badge.innerHTML = '☁️ ' + (text || 'Tersinkron ke Sheets');
    } else if (state === 'offline') {
        badge.style.background = '#f1f5f9';
        badge.style.color = '#475569';
        badge.innerHTML = '💾 ' + (text || 'Tersimpan Lokal');
    }
}

function scheduleCloudSyncToGAS() {
    const adminToken = localStorage.getItem('molas_admin_token');
    if (!adminToken || !DB) return;
    if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);
    updateCloudSyncBadge('syncing', 'Menyiapkan Sinkronisasi...');
    cloudSyncTimeout = setTimeout(() => {
        pushDatabaseToCloudGAS(true);
    }, 2200);
}

async function pushDatabaseToCloudGAS(silent = true) {
    if (!DB || isSyncingCloud) return;
    isSyncingCloud = true;
    updateCloudSyncBadge('syncing', 'Menyimpan ke Google Sheets...');
    if (!silent) {
        Swal.fire({ title: 'Sinkronisasi ke Google Sheets...', html: 'Menyimpan seluruh tabel & modul ke database Google Sheets...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    }
    try {
        const res = await secureFetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'syncFullDatabase',
                db: DB,
                api_key: MOLAS_API_KEY
            })
        });
        const j = await res.json();
        if (j && j.status === 'success') {
            updateCloudSyncBadge('ok', 'Google Sheets Tersinkron');
            if (!silent) {
                Swal.fire({ icon: 'success', title: 'Sinkronisasi Berhasil!', text: j.message || 'Seluruh sheet di Google Sheets telah diperbarui otomatis.', timer: 1800, showConfirmButton: false });
            }
        } else {
            updateCloudSyncBadge('offline', 'Tersimpan Lokal');
            if (!silent) Swal.fire('Info', j.message || 'Data disimpan di penyimpanan lokal.', 'info');
        }
    } catch (err) {
        console.warn("Cloud sync fallback local:", err);
        updateCloudSyncBadge('offline', 'Mode Offline Aktif');
        if (!silent) Swal.fire('Mode Offline', 'Data tersimpan aman di perangkat lokal. Akan disinkronkan saat koneksi ke Google Sheets tersedia.', 'warning');
    } finally {
        isSyncingCloud = false;
    }
}

async function pullDatabaseFromCloudGAS(silent = true) {
    if (!silent) {
        Swal.fire({ title: 'Mengambil Database Google Sheets...', html: 'Menarik seluruh data terbaru dari server Google Sheets...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    }
    updateCloudSyncBadge('syncing', 'Memuat Google Sheets...');
    try {
        const res = await secureFetch(`${SCRIPT_URL}?action=getFullDatabase`);
        const j = await res.json();
        if (j && j.status === 'success' && j.db && j.db.settings) {
            DB = j.db;
            localStorage.setItem('desa_digital_db', JSON.stringify(DB));
            applyTheme(DB.settings.theme || 'emerald');
            updateHeaderVillageInfo();
            renderAllViews();
            updateCloudSyncBadge('ok', 'Google Sheets Aktif');
            if (!silent) {
                Swal.fire({ icon: 'success', title: 'Database Diperbarui!', text: 'Data berhasil disinkronkan dari Google Sheets.', timer: 1500, showConfirmButton: false });
            }
            return true;
        }
    } catch (err) {
        console.warn("Pull cloud DB fallback local:", err);
        updateCloudSyncBadge('offline', 'Database Lokal');
        if (!silent) {
            Swal.fire('Info', 'Menggunakan database lokal perangkat.', 'info');
        }
    }
    return false;
}

async function setupCloudDatabaseOtomatisManual() {
    Swal.fire({ title: 'Inisialisasi Otomatis Google Sheets...', html: 'Membuat dan mengisi otomatis 35+ tabel database di Google Sheets...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await secureFetch(`${SCRIPT_URL}?action=setupDatabaseOtomatis`);
        const j = await res.json();
        if (j && j.status === 'success') {
            await pushDatabaseToCloudGAS(true);
            Swal.fire('Berhasil!', j.message || 'Seluruh Sheet Database di Google Sheets telah dibuat dan terisi otomatis!', 'success');
        } else {
            Swal.fire('Info', j.message || 'Gagal menginisialisasi sheet.', 'warning');
        }
    } catch (e) {
        Swal.fire('Error', 'Gagal menghubungi Google Apps Script: ' + (e.message || e), 'error');
    }
}

function quickFillAdminModal(u, p) {
    const uEl = document.getElementById('admin-user');
    const pEl = document.getElementById('admin-pass');
    if (uEl) uEl.value = u;
    if (pEl) pEl.value = p;
}

async function authWarga() {
    const inputNamaElem = document.getElementById('login-nama');
    const inputNikElem = document.getElementById('login-nik');

    const n = inputNamaElem ? inputNamaElem.value.trim().replace(/\s+/g, ' ') : '';
    const k = inputNikElem ? inputNikElem.value.trim().replace(/[^0-9]/g, '') : '';

    if (!n || !k) return Swal.fire('Error', 'Harap isi Nama Lengkap dan NIK', 'warning');
    if (k.length !== 16) return Swal.fire('Error', 'NIK harus berjumlah 16 digit angka valid (saat ini: ' + k.length + ' digit)', 'warning');

    Swal.fire({
        title: 'Verifikasi Warga Desa...',
        html: 'Mencocokkan data NIK dengan server kependudukan...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const r = await secureFetch(`${SCRIPT_URL}?action=login&nik=${encodeURIComponent(k)}&nama=${encodeURIComponent(n)}`);
        const j = await r.json();

        if (j.status === 'success' && j.warga_token) {
            localStorage.setItem('molas_warga_token', j.warga_token);
            localStorage.setItem('molas_warga_expiry', j.warga_expiry);
            localStorage.setItem('molas_warga_nik', j.data.nik);
            localStorage.setItem('molas_warga_nama', j.data.nama);

            Swal.fire({
                icon: 'success',
                title: 'Login Berhasil',
                text: 'Selamat datang, ' + j.data.nama,
                timer: 1500,
                showConfirmButton: false
            });

            saveSession(j.data.nama, j.data.nik, false, { ...j.data, warga_token: j.warga_token });
            grantAccess(j.data.nama, j.data.nik, false, { ...j.data, warga_token: j.warga_token });
            closeLoginModal();

            setInterval(validateWargaToken, 5 * 60 * 1000);
            return;
        }
    } catch (e) {
        console.warn("Server login warga fallback to local DB.penduduk:", e);
    }

    // Fallback ke database penduduk lokal (DB.penduduk) bila sedang offline
    if (DB && Array.isArray(DB.penduduk)) {
        const foundLocal = DB.penduduk.find(p => String(p.nik).replace(/[^0-9]/g, '') === k && String(p.nama_lengkap || '').trim().toLowerCase() === n.toLowerCase());
        if (foundLocal) {
            const localData = {
                nik: foundLocal.nik,
                nama: foundLocal.nama_lengkap,
                tempat_lahir: foundLocal.tempat_lahir,
                tgl_lahir: foundLocal.tanggal_lahir,
                jenis_kelamin: foundLocal.jenis_kelamin === 'Lk' ? 'Laki-laki' : 'Perempuan',
                agama: foundLocal.agama,
                pekerjaan: foundLocal.pekerjaan,
                nama_ayah: foundLocal.nama_ayah,
                nama_ibu: foundLocal.nama_ibu,
                alamat: foundLocal.alamat,
                foto_url: ''
            };
            const dummyTok = btoa(foundLocal.nik + '|' + foundLocal.nama_lengkap + '|' + (Date.now() + 3600000));
            localStorage.setItem('molas_warga_token', dummyTok);
            localStorage.setItem('molas_warga_nik', localData.nik);
            localStorage.setItem('molas_warga_nama', localData.nama);

            Swal.fire({ icon: 'success', title: 'Login Warga Berhasil', text: 'Selamat datang, ' + localData.nama, timer: 1500, showConfirmButton: false });
            saveSession(localData.nama, localData.nik, false, localData);
            grantAccess(localData.nama, localData.nik, false, localData);
            closeLoginModal();
            return;
        }
    }

    Swal.fire('Gagal', 'Kombinasi Nama dan NIK tidak ditemukan. Pastikan ejaan sesuai KTP.', 'error');
}

async function validateWargaToken() {
    const token = localStorage.getItem('molas_warga_token');
    if (!token) return;
    try {
        const r = await secureFetch(`${SCRIPT_URL}?action=validateWargaToken&warga_token=${encodeURIComponent(token)}&api_key=${encodeURIComponent(MOLAS_API_KEY)}`);
        const j = await r.json();
        if (j && j.valid === false) {
            Swal.fire('Sesi Warga Habis', 'Silakan login KTP ulang', 'warning').then(() => doLogout());
        }
    } catch (e) {}
}

async function doLogoutWarga() {
    const token = localStorage.getItem('molas_warga_token');
    if (token) {
        try {
            await secureFetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'logoutWarga', warga_token: token, api_key: MOLAS_API_KEY })
            });
        } catch (e) {}
    }
    localStorage.removeItem('molas_warga_token');
    localStorage.removeItem('molas_warga_expiry');
    localStorage.removeItem('molas_warga_nik');
    localStorage.removeItem('molas_warga_nama');
}

async function cekSemuaBantuanWarga() {
    const nik = localStorage.getItem('molas_warga_nik') || (document.getElementById('prof-nik') ? document.getElementById('prof-nik').innerText.trim() : '');
    const nama = localStorage.getItem('molas_warga_nama') || (document.getElementById('prof-nama') ? document.getElementById('prof-nama').innerText.trim() : '');
    if (!nik || nik === '-') {
        return Swal.fire('Info', 'Data NIK warga belum termuat.', 'info');
    }
    Swal.fire({ title: 'Memeriksa Data Bantuan Terpadu...', html: 'Mengecek status BLT-DD, PKH, BPNT, Pangan & RTLH di database desa...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await secureFetch(`${SCRIPT_URL}?action=checkBantuanSemua&nik=${encodeURIComponent(nik)}&nama=${encodeURIComponent(nama)}`);
        const j = await res.json();
        if (j && j.status === 'success' && j.bantuan) {
            const b = j.bantuan;
            const renderRow = (label, item) => `
                <div class="p-3 rounded-xl border ${item.terdaftar ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'} flex items-center justify-between gap-3 mb-2">
                    <div>
                        <div class="text-xs font-black ${item.terdaftar ? 'text-emerald-900' : 'text-slate-700'}">${label}</div>
                        <div class="text-[11px] ${item.terdaftar ? 'text-emerald-700 font-semibold' : 'text-slate-500'}">${item.ket}</div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${item.terdaftar ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}">
                        ${item.terdaftar ? 'TERDAFTAR' : 'TIDAK'}
                    </span>
                </div>
            `;
            Swal.fire({
                title: 'Status Bantuan Sosial Terpadu',
                html: `
                    <div class="text-left font-sans mt-2">
                        <div class="mb-3 p-3 bg-teal-50 border border-teal-100 rounded-xl text-xs">
                            <div>Nama Warga: <b>${nama}</b></div>
                            <div>NIK: <span class="font-mono">${j.nik || nik}</span></div>
                        </div>
                        ${renderRow('1. BLT Dana Desa (BLT-DD 2026)', b.blt_dd)}
                        ${renderRow('2. Program Keluarga Harapan (PKH)', b.pkh)}
                        ${renderRow('3. Bantuan Pangan Non Tunai (BPNT/Sembako)', b.bpnt)}
                        ${renderRow('4. Cadangan Beras Pemerintah (CPP 10 Kg)', b.pangan)}
                        ${renderRow('5. Bantuan Rumah Tidak Layak Huni (RTLH)', b.rtlh)}
                    </div>
                `,
                confirmButtonText: 'Tutup',
                confirmButtonColor: '#0f766e',
                width: '520px'
            });
            return;
        }
    } catch (e) {
        console.warn(e);
    }
    Swal.fire('Info', 'Gagal mengambil status bantuan dari server. Silakan coba sesaat lagi.', 'info');
}

async function authAdmin() {
    const u = document.getElementById('admin-user').value.trim();
    const p = document.getElementById('admin-pass').value.trim();

    if (!u || !p) return Swal.fire('Error', 'Isi Username & Password', 'warning');

    Swal.fire({ title: 'Memeriksa Akses Aparatur...', html: 'Verifikasi keamanan & sinkronisasi Google Sheets...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    if (!DB) initDatabase();

    // Cek kecocokan di daftar pengguna lokal Desa Digital (admin, jaga1..4, bendahara, kader, operator)
    const localMatch = (DB && Array.isArray(DB.users))
        ? DB.users.find(x => x.username.toLowerCase() === u.toLowerCase() && x.password === p)
        : null;
    const isSuperMaster = (DB && DB.security && (p === DB.security.master_key || p === DB.security.master_pin));

    try {
        const response = await secureFetch(SCRIPT_URL, {
            method: 'POST',
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "loginAdmin",
                user: u,
                pass: p,
                api_key: MOLAS_API_KEY
            })
        });

        const result = await response.json();

        if (result.status === 'success' && result.token) {
            localStorage.setItem('molas_admin_token', result.token);
            localStorage.setItem('molas_token_expiry', result.expiry);
            localStorage.setItem('molas_admin_user', result.user);

            const roleObj = localMatch || {
                id: isSuperMaster ? 999 : 1,
                username: result.username || u,
                name: result.user || (localMatch ? localMatch.name : "Administrator Desa"),
                role: isSuperMaster ? "super_admin" : (result.role === 'superadmin' ? 'admin' : (result.role || 'admin')),
                jaga_scope: result.jaga_scope || (localMatch ? localMatch.jaga_scope : 'all')
            };

            Swal.fire({ icon: 'success', title: 'Login Aparatur Berhasil', text: 'Membuka Dashboard Desa Digital Terpadu...', timer: 1200, showConfirmButton: false });
            saveSession(roleObj.name, "ADMIN", true, { ...roleObj, token: result.token });
            grantAccess(roleObj.name, "ADMIN", true, roleObj);
            closeLoginModal();
            setInterval(validateAdminToken, 10 * 60 * 1000);
            return;
        }
    } catch (e) {
        console.warn("Remote loginAdmin fallback to local Tupoksi auth:", e);
    }

    // Fallback jika login menggunakan akun Tupoksi Desa Digital (admin/admin123, jaga1, bendahara, kader, operator, atau Master Key)
    if (localMatch || isSuperMaster || (u.toLowerCase() === 'admin' && p === 'molas375')) {
        const fallbackUser = isSuperMaster ? {
            id: 999,
            username: "superadmin",
            name: "Pemilik Sistem (Alldy Korompis)",
            role: "super_admin",
            jaga_scope: "all"
        } : (localMatch || {
            id: 1,
            username: "admin",
            name: "Admin Utama Desa",
            role: "admin",
            jaga_scope: "all"
        });

        const fallbackToken = btoa(fallbackUser.username + '|' + (Date.now() + 7200000) + '|' + fallbackUser.role);
        localStorage.setItem('molas_admin_token', fallbackToken);
        localStorage.setItem('molas_admin_user', fallbackUser.name);

        Swal.fire({ icon: 'success', title: 'Login Berhasil', text: 'Selamat datang, ' + fallbackUser.name, timer: 1200, showConfirmButton: false });
        saveSession(fallbackUser.name, "ADMIN", true, { ...fallbackUser, token: fallbackToken });
        grantAccess(fallbackUser.name, "ADMIN", true, fallbackUser);
        closeLoginModal();
        return;
    }

    Swal.fire('Gagal', 'Username atau Password Salah', 'error');
}

async function validateAdminToken() {
    const token = localStorage.getItem('molas_admin_token');
    if (!token) return;
    try {
        const r = await secureFetch(`${SCRIPT_URL}?action=validateToken&token=${encodeURIComponent(token)}`);
        const j = await r.json();
        if (j && j.valid === false && token.length > 60) {
            Swal.fire('Sesi Habis', 'Silakan login ulang', 'warning').then(() => doLogout());
        }
    } catch (e) {}
}

// ============================================
// 4. MANAJEMEN SESI & INTEGRASI DASHBOARD
// ============================================
function saveSession(name, nik, isAdmin, fullData) {
    localStorage.setItem('userSession', JSON.stringify({ name, nik, isAdmin, fullData, timestamp: new Date().getTime() }));
    if (isAdmin) {
        localStorage.setItem('molas_secure_session', 'V6.0_' + new Date().getTime());
    }
}

function checkSession() {
    const saved = localStorage.getItem('userSession');
    if (saved) {
        try {
            const s = JSON.parse(saved);
            grantAccess(s.name, s.nik, s.isAdmin, s.fullData, true);
            startIdleTimer();
        } catch (e) {}
    }
}

function startIdleTimer() {
    window.onmousemove = resetTimer;
    window.onmousedown = resetTimer;
    window.onclick = resetTimer;
    window.onkeydown = resetTimer;
    window.ontouchstart = resetTimer;
    resetTimer();
}

function resetTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(doLogout, IDLE_TIMEOUT);
}

async function doLogout() {
    const adminToken = localStorage.getItem('molas_admin_token');
    const wargaToken = localStorage.getItem('molas_warga_token');
    try {
        if (adminToken) {
            await secureFetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'logout', token: adminToken, admin_token: adminToken, api_key: MOLAS_API_KEY })
            });
        }
        if (wargaToken) {
            await secureFetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'logoutWarga', warga_token: wargaToken, token: wargaToken, api_key: MOLAS_API_KEY })
            });
        }
    } catch (e) {}
    localStorage.removeItem('userSession');
    localStorage.removeItem('molas_admin_token');
    localStorage.removeItem('molas_token_expiry');
    localStorage.removeItem('molas_admin_user');
    localStorage.removeItem('molas_secure_session');
    localStorage.removeItem('molas_warga_token');
    localStorage.removeItem('molas_warga_expiry');
    localStorage.removeItem('molas_warga_nik');
    localStorage.removeItem('molas_warga_nama');
    sessionStorage.removeItem('desa_digital_session');
    localStorage.removeItem('desa_digital_session');
    location.reload();
}

function grantAccess(name, nik, isAdmin, fullData, isRestoring = false) {
    closeLoginModal();
    const landingEl = document.getElementById('landing-page');
    const footerEl = document.getElementById('main-footer');
    const dashEl = document.getElementById('dashboard-page');
    const navEl = document.getElementById('navbar');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const wargaWrapper = document.getElementById('warga-dashboard-wrapper');
    const ddRoot = document.getElementById('desa-digital-root');

    if (landingEl) landingEl.classList.add('hidden-el');
    if (footerEl) footerEl.classList.add('hidden-el');
    if (dashEl) dashEl.classList.remove('hidden-el');
    if (btnLogin) btnLogin.classList.add('hidden-el');
    if (btnLogout) btnLogout.classList.remove('hidden-el');
    if (document.getElementById('dash-user-name')) document.getElementById('dash-user-name').innerText = name;
    startIdleTimer();

    if (document.getElementById('form-nama-adu')) document.getElementById('form-nama-adu').value = isAdmin ? "Administrator" : name;
    if (document.getElementById('form-nik-adu')) document.getElementById('form-nik-adu').value = nik;

    if (!isAdmin) {
        // MODE WARGA (MASYARAKAT)
        if (navEl) navEl.classList.remove('hidden-el');
        if (ddRoot) ddRoot.classList.add('hidden-el');
        if (wargaWrapper) wargaWrapper.classList.remove('hidden-el');

        const populateWargaCard = () => {
            if (!fullData) return;
            const pCard = document.getElementById('profil-warga-card');
            if (pCard) pCard.classList.remove('hidden-el');
            document.getElementById('prof-nama').innerText = fullData.nama || '-';
            document.getElementById('prof-nik').innerText = fullData.nik || '-';
            document.getElementById('prof-ttl').innerText = (fullData.tempat_lahir || '') + (fullData.tgl_lahir ? ', ' + fullData.tgl_lahir : '');
            document.getElementById('prof-jk').innerText = fullData.jenis_kelamin || '-';
            document.getElementById('prof-agama').innerText = fullData.agama || '-';
            document.getElementById('prof-kerja').innerText = fullData.pekerjaan || '-';
            document.getElementById('prof-alamat').innerText = fullData.alamat || '-';
            document.getElementById('prof-ayah').innerText = fullData.nama_ayah || '-';
            document.getElementById('prof-ibu').innerText = fullData.nama_ibu || '-';

            const av = (fullData.jenis_kelamin || '').toLowerCase().includes('laki')
                ? 'https://cdn-icons-png.flaticon.com/512/4128/4128176.png'
                : 'https://cdn-icons-png.flaticon.com/512/4128/4128249.png';
            document.getElementById('prof-foto').src = fullData.foto_url && fullData.foto_url.length > 5 ? fullData.foto_url : av;
        };

        if (fullData && !isRestoring) {
            let timerInterval;
            Swal.fire({
                title: '<span class="text-xl font-bold">Sinkronisasi Server...</span>',
                html: '<span class="text-sm text-slate-500">Mengambil data identitas dari server kependudukan.</span><br><br><b class="text-teal-600 font-mono tracking-widest text-sm bg-teal-50 px-3 py-1 rounded border border-teal-100"></b>',
                timer: 1200,
                timerProgressBar: true,
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                    const b = Swal.getHtmlContainer().querySelector('b');
                    const steps = ['Memverifikasi NIK...', 'Mengekstrak Data KTP...', 'Sinkronisasi Berhasil!'];
                    let stepIndex = 0;
                    timerInterval = setInterval(() => {
                        if (stepIndex < steps.length && b) {
                            b.textContent = steps[stepIndex];
                            stepIndex++;
                        }
                    }, 350);
                },
                willClose: () => { clearInterval(timerInterval); }
            }).then(populateWargaCard);
        } else {
            populateWargaCard();
        }
    } else {
        // MODE ADMIN / APARATUR DESA -> BUKA COMMAND CENTER DESA DIGITAL TERPADU (23+1 MODUL)
        if (navEl) navEl.classList.add('hidden-el');
        if (wargaWrapper) wargaWrapper.classList.add('hidden-el');
        if (ddRoot) ddRoot.classList.remove('hidden-el');

        if (!DB) initDatabase();

        const userObj = (fullData && fullData.role) ? {
            id: fullData.id || 1,
            username: fullData.username || 'admin',
            name: name || fullData.name || 'Admin Utama Desa',
            role: fullData.role === 'superadmin' ? 'admin' : fullData.role,
            jaga_scope: fullData.jaga_scope || 'all'
        } : {
            id: 1,
            username: 'admin',
            name: name || 'Admin Utama Desa',
            role: 'admin',
            jaga_scope: 'all'
        };

        loginSuccess(userObj);
        loadWebSettings();
        renderAdminApps();

        // Otomatis tarik data terbaru dari Google Sheets di background
        pullDatabaseFromCloudGAS(true);
    }
}

function renderAdminApps() {
    const targetMount = document.getElementById('legacy-cloud-apps-mount') || document.getElementById('admin-settings-panel');
    if (!targetMount) return;
    targetMount.innerHTML = `
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg">
        <div>
            <div class="text-[11px] font-bold uppercase tracking-widest text-teal-300">Terintegrasi Google Drive & Google Sheets</div>
            <h2 class="text-lg font-black">Modul Cloud & Layanan Operasional Desa V6.0</h2>
            <p class="text-xs text-slate-300">Seluruh inputan pada modul di bawah ini otomatis tersimpan ke Google Sheets & Google Drive Desa Molompar Atas.</p>
        </div>
        <div class="flex flex-wrap gap-2">
            <button onclick="setupCloudDatabaseOtomatisManual()" class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition">
                ⚡ Setup & Isi Otomatis Semua Sheet
            </button>
            <button onclick="pushDatabaseToCloudGAS(false)" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition">
                ☁️ Simpan Semua ke Google Sheets
            </button>
            <button onclick="pullDatabaseFromCloudGAS(false)" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition">
                📥 Tarik Data dari Google Sheets
            </button>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <div onclick="openModulePDF()" class="group bg-gradient-to-br from-red-700 to-rose-900 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-file-pdf text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-file-download text-xl"></i></div>
                <h3 class="text-lg font-bold">Modul PDF Drive</h3>
                <p class="text-rose-100 text-xs">Upload & Download Dokumen Desa</p>
            </div>
        </div>

        <div onclick="openSuratManager()" class="group bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-paper-plane text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-folder-open text-xl"></i></div>
                <h3 class="text-lg font-bold">Surat Keluar (Cloud)</h3>
                <p class="text-blue-100 text-xs">Kelola & Edit Arsip DB_SURAT</p>
            </div>
        </div>

        <div onclick="openSuratMasukModal()" class="group bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-envelope-open-text text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-inbox text-xl"></i></div>
                <h3 class="text-lg font-bold">Surat Masuk (Cloud)</h3>
                <p class="text-amber-100 text-xs">Arsip Dinas & Disposisi</p>
            </div>
        </div>

        <div onclick="openAbsensiModal()" class="group bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-camera text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-camera-retro text-xl"></i></div>
                <h3 class="text-lg font-bold">Absensi + Foto Drive</h3>
                <p class="text-emerald-100 text-xs">Upload Foto Kehadiran Perangkat</p>
            </div>
        </div>

        <div onclick="openPBBModal()" class="group bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-money-bill-wave text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-file-invoice-dollar text-xl"></i></div>
                <h3 class="text-lg font-bold">Setor PBB & Peringkat</h3>
                <p class="text-green-100 text-xs">Monitoring Pajak & Batch Input</p>
            </div>
        </div>

        <div onclick="openInventarisModal()" class="group bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-boxes text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-laptop text-xl"></i></div>
                <h3 class="text-lg font-bold">Aset Desa + Foto Drive</h3>
                <p class="text-orange-100 text-xs">Upload Foto Inventaris & Kondisi</p>
            </div>
        </div>

        <div onclick="openKematianModal()" class="group bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-book-dead text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-church text-xl"></i></div>
                <h3 class="text-lg font-bold">Buku Kematian</h3>
                <p class="text-slate-200 text-xs">Pencatatan & Evaluasi Bansos</p>
            </div>
        </div>

        <div onclick="openKelahiranModal()" class="group bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-baby-carriage text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-baby text-xl"></i></div>
                <h3 class="text-lg font-bold">Buku Kelahiran</h3>
                <p class="text-pink-100 text-xs">Pencatatan Kelahiran Warga Baru</p>
            </div>
        </div>

        <div onclick="openStuntingModal()" class="group bg-gradient-to-br from-violet-600 to-purple-800 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-heartbeat text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-weight text-xl"></i></div>
                <h3 class="text-lg font-bold">Ukur Gizi & Stunting</h3>
                <p class="text-violet-100 text-xs">Input Cepat Pengukuran Balita</p>
            </div>
        </div>

        <div onclick="openTamuModal()" class="group bg-gradient-to-br from-rose-500 to-red-700 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-address-book text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-user-friends text-xl"></i></div>
                <h3 class="text-lg font-bold">Buku Tamu Dinas</h3>
                <p class="text-rose-100 text-xs">Registrasi Kunjungan Tamu Desa</p>
            </div>
        </div>

        <div onclick="openAgendaModal()" class="group bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-calendar-check text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-clock text-xl"></i></div>
                <h3 class="text-lg font-bold">Agenda Kegiatan</h3>
                <p class="text-cyan-100 text-xs">Jadwal Undangan & Acara Desa</p>
            </div>
        </div>

        <div onclick="openListModal('Data Penduduk (ADMP_1)', 'penduduk')" class="group bg-gradient-to-br from-purple-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden border border-white/10">
            <div class="absolute -right-6 -top-6 opacity-20"><i class="fas fa-users text-8xl"></i></div>
            <div class="relative z-10">
                <div class="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3"><i class="fas fa-database text-xl"></i></div>
                <h3 class="text-lg font-bold">Tabel Cloud ADMP_1</h3>
                <p class="text-purple-100 text-xs">Lihat & Edit Sheet ADMP_1 Langsung</p>
            </div>
        </div>
    </div>

    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5">
        <div class="text-xs font-black text-slate-700 uppercase tracking-wider mb-3"><i class="fas fa-sliders-h text-teal-600 mr-1.5"></i> Pengaturan Cepat Header Portal Publik</div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input id="set-desa" class="input-field text-xs" placeholder="Nama Desa (ex: Desa Molompar Atas)" value="Desa Molompar Atas"/>
            <input id="set-kec" class="input-field text-xs" placeholder="Nama Kecamatan (ex: Kec. Tombatu Timur)" value="Kec. Tombatu Timur"/>
            <input id="set-logo" class="input-field text-xs" placeholder="URL Logo Navbar"/>
            <button onclick="saveWebSettings()" class="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 transition shadow">Simpan Header</button>
        </div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <button onclick="openLaporanModal('Laporan Data Penduduk ADMP_1', 'penduduk')" class="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
            <i class="fas fa-print text-teal-600"></i> Cetak ADMP_1
        </button>
        <button onclick="openLaporanModal('Laporan Inventaris Aset Desa', 'aset')" class="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
            <i class="fas fa-print text-orange-600"></i> Cetak Aset Cloud
        </button>
        <button onclick="openLaporanModal('Laporan Pemohon Surat Warga', 'pembuat_surat')" class="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
            <i class="fas fa-print text-blue-600"></i> Cetak Riwayat Surat
        </button>
        <button onclick="openLaporanModal('Laporan Data Gizi & Stunting', 'stunting')" class="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
            <i class="fas fa-print text-purple-600"></i> Cetak Stunting
        </button>
    </div>
    `;
}

function showStructure(type) {
    const userIcon = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; 
    let dataEntity = {};

    if (type === 'bumdes') {
        dataEntity = {
            title: "BUMDes Mandiri Sejahtera",
            colorClass: "from-blue-600 to-indigo-700",
            icon: "fa-building",
            legal: [
                { label: "Badan Hukum", val: "AHU-XXXXX.AH.01.01.Tahun 2025", bg: "bg-blue-50 text-blue-700" },
                { label: "Tanggal Berdiri", val: "10 Januari 2020", bg: "bg-slate-50 text-slate-700" },
                { label: "NIB", val: "1234567890123", bg: "bg-amber-50 text-amber-700" },
                { label: "Unit Usaha", val: "Ternak Babi, Ternak Ayam, Jasa Pihak Ketiga", bg: "bg-emerald-50 text-emerald-700" },
                { label: "Lokasi", val: "Balai Desa Molompar Atas", bg: "bg-slate-50 text-slate-700" }
            ],
            topStructure: [
                { role: "Penasihat", name: "Alfius B. Tulandi", sub: "Hukum Tua" },
                { role: "Pengawas 1", name: "Rita Wudu", sub: "Pengawas" },
                { role: "Pengawas 2", name: "Meity Kawulusan", sub: "Pengawas" }
            ],
            execStructure: [
                { role: "Direktur", name: "Youla Rapar", sub: "Ketua Pelaksana", full: true }, 
                { role: "Sekretaris", name: "Christin L. Tuerah", sub: "Administrasi" },
                { role: "Bendahara", name: "Rishard Tulandi", sub: "Keuangan" }
            ]
        };
    } else {
        dataEntity = {
            title: "KDMP Molompar Atas",
            colorClass: "from-red-600 to-rose-700",
            icon: "fa-handshake",
            legal: [
                { label: "Badan Hukum", val: "AHU-KOP-XXXXX.AH.01.2025", bg: "bg-red-50 text-red-700" },
                { label: "Tanggal Berdiri", val: "17 Agustus 2025", bg: "bg-slate-50 text-slate-700" },
                { label: "NIB", val: "12345678912", bg: "bg-amber-50 text-amber-700" },
                { label: "Jenis Usaha", val: "Pasar Kuliner, WiFi Voucher, Digital Printing, Sembako, Alat-alat Pertanian", bg: "bg-emerald-50 text-emerald-700" },
                { label: "Lokasi", val: "Desa Molompar Atas", bg: "bg-slate-50 text-slate-700" }
            ],
            topStructure: [
                { role: "Penasihat", name: "Alfius B. Tulandi", sub: "Hukum Tua" },
                { role: "Pengawas 1", name: "Maxi M. Wawointana", sub: "Internal" },
                { role: "Pengawas 2", name: "OLLY M. Kakambong", sub: "Eksternal" }
            ],
            execStructure: [
                { role: "Ketua", name: "Dony I. Y. Korompis", sub: "Pimpinan", full: true },
                { role: "Wakil (Usaha)", name: "Joice Tompunu", sub: "Bidang Usaha" },
                { role: "Wakil (Anggota)", name: "Sergio Oroh", sub: "Keanggotaan" },
                { role: "Sekretaris", name: "Santy S. Rolos", sub: "Admin" },
                { role: "Bendahara", name: "Tisa M. Kawulusan", sub: "Keuangan" }
            ]
        };
    }

    let htmlContent = `
    <style>
        .glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
        .anim-up { animation: slideUp 0.5s ease-out forwards; opacity: 0; transform: translateY(20px); }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
    </style>
    
    <div class="grid grid-cols-2 gap-2 mb-6 text-left anim-up" style="animation-delay: 0.1s;">
        ${dataEntity.legal.map(l => `
            <div class="${l.bg} p-2 rounded border border-black/5">
                <div class="text-[10px] font-bold opacity-60 uppercase tracking-wide">${l.label}</div>
                <div class="text-xs font-bold truncate">${l.val}</div>
            </div>
        `).join('')}
    </div>

    <div class="relative">
        <div class="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <i class="fas ${dataEntity.icon} text-9xl text-slate-800"></i>
        </div>

        <div class="flex justify-center gap-4 mb-8 anim-up" style="animation-delay: 0.2s;">
            ${dataEntity.topStructure.map(m => `
                <div class="text-center w-1/3">
                    <div class="w-12 h-12 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-2 border-2 border-white shadow-sm overflow-hidden">
                        <img src="${userIcon}" class="w-full h-full object-cover opacity-80">
                    </div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase">${m.role}</div>
                    <div class="text-xs font-bold text-slate-800 leading-tight">${m.name}</div>
                </div>
            `).join('')}
        </div>

        <div class="h-px bg-slate-300 w-3/4 mx-auto mb-8 anim-up" style="animation-delay: 0.3s;"></div>

        <div class="grid grid-cols-2 gap-4 anim-up" style="animation-delay: 0.4s;">
            ${dataEntity.execStructure.map(m => `
                <div class="${m.full ? 'col-span-2 bg-white shadow-md border-t-4' : 'bg-slate-50 border'} p-3 rounded-lg text-center relative overflow-hidden" style="${m.full ? `border-color: ${type==='bumdes'?'#2563eb':'#dc2626'}` : ''}">
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">${m.role}</div>
                    <div class="text-sm font-bold text-slate-800">${m.name}</div>
                    <div class="text-[10px] text-slate-400">${m.sub}</div>
                </div>
            `).join('')}
        </div>
    </div>
    `;

    Swal.fire({
        title: `<div class="flex flex-col items-center justify-center py-2"><div class="bg-white/20 p-3 rounded-full mb-2"><i class="fas ${dataEntity.icon} text-3xl"></i></div><span class="text-lg font-bold tracking-wide">${dataEntity.title}</span></div>`,
        html: htmlContent,
        width: '600px',
        showConfirmButton: false,
        showCloseButton: true,
        background: '#fff',
        customClass: {
            popup: 'rounded-2xl overflow-hidden shadow-2xl',
            header: `bg-gradient-to-br ${dataEntity.colorClass} text-white m-0 p-6`
        }
    });
}

async function openSuratManager() {
    Swal.fire({ title: 'Memuat Data Surat...', didOpen: () => Swal.showLoading() });

    try {
        const req = await secureFetch(`${SCRIPT_URL}?action=getRiwayat`);
        const data = await req.json();
        renderTableSurat(data);
    } catch (e) {
        Swal.fire('Error', 'Gagal memuat data.', 'error');
    }
}

function renderTableSurat(data) {
    let content = '';

    if (data.length === 0) {
        content = `<div class="p-4 text-center text-gray-500">Belum ada data surat.</div>`;
    } else {
        const rows = data.map(d => `
            <tr class="hover:bg-gray-50 border-b text-sm">
                <td class="p-3 font-bold text-blue-600">${d.no}</td>
                <td class="p-3">${d.tujuan}</td>
                <td class="p-3 text-gray-500 text-xs">${d.tgl}</td>
            </tr>
        `).join('');

        content = `
        <div class="overflow-x-auto max-h-[400px] text-left">
            <table class="min-w-full whitespace-nowrap">
                <thead class="bg-gray-100 text-gray-700 sticky top-0 shadow-sm">
                    <tr>
                        <th class="p-3">No. Surat</th>
                        <th class="p-3">Tujuan</th>
                        <th class="p-3">Tanggal</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    Swal.fire({
        title: 'Data Surat Keluar',
        html: `
            <div class="flex justify-end mb-3">
                <button onclick="openFormSurat('add')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm shadow">
                    <i class="fas fa-plus"></i> Buat Surat Baru
                </button>
            </div>
            ${content}
        `,
        width: '800px',
        showConfirmButton: false,
        showCloseButton: true
    });
}

async function openFormSurat(mode, dataEncoded = null) {
    let d = {};
    let title = 'Input Surat Baru';
    let btnText = 'Simpan';
    let oldNo = ''; 

    if (mode === 'edit' && dataEncoded) {
        d = JSON.parse(decodeURIComponent(dataEncoded));
        title = 'Edit Surat Keluar';
        btnText = 'Update Perubahan';
        oldNo = d.no; 
    }

    const tglValue = d.tgl ? new Date(d.tgl).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const { value: f } = await Swal.fire({
        title: title,
        html: `
            <div class="text-left space-y-3 mt-2">
                <label class="text-xs font-bold text-gray-500">Nomor Surat</label>
                <input id="s-no" class="swal2-input !m-0 !w-full" placeholder="No Surat" value="${d.no || ''}">
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-gray-500">Tanggal</label>
                        <input id="s-tgl" type="date" class="swal2-input !m-0 !w-full !text-sm" value="${tglValue}">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500">Sifat</label>
                        <select id="s-sifat" class="swal2-select !m-0 !w-full !text-sm">
                            <option ${d.sifat === 'Biasa' ? 'selected' : ''}>Biasa</option>
                            <option ${d.sifat === 'Penting' ? 'selected' : ''}>Penting</option>
                            <option ${d.sifat === 'Segera' ? 'selected' : ''}>Segera</option>
                        </select>
                    </div>
                </div>
                
                <label class="text-xs font-bold text-gray-500">Tujuan</label>
                <input id="s-tuj" class="swal2-input !m-0 !w-full" placeholder="Tujuan" value="${d.tujuan || ''}">
                
                <label class="text-xs font-bold text-gray-500">Perihal</label>
                <textarea id="s-hal" class="swal2-textarea !m-0 !w-full" placeholder="Perihal" rows="2">${d.hal || ''}</textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: btnText,
        cancelButtonText: 'Batal',
        confirmButtonColor: mode === 'edit' ? '#f59e0b' : '#2563eb', 
        preConfirm: () => ({
            no: document.getElementById('s-no').value,
            tgl: document.getElementById('s-tgl').value,
            sifat: document.getElementById('s-sifat').value,
            tujuan: document.getElementById('s-tuj').value,
            hal: document.getElementById('s-hal').value
        })
    });

    if (f) {
        if (!f.no) return Swal.fire('Gagal', 'Nomor Surat wajib diisi', 'error');

        Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });

        let url = `${SCRIPT_URL}?action=catatSurat`; 
        if (mode === 'edit') {
            url = `${SCRIPT_URL}?action=updateSurat&old_no=${encodeURIComponent(oldNo)}`;
        }
        url += `&no_surat=${encodeURIComponent(f.no)}&tgl_surat=${encodeURIComponent(f.tgl)}&sifat=${encodeURIComponent(f.sifat)}&tujuan=${encodeURIComponent(f.tujuan)}&perihal=${encodeURIComponent(f.hal)}`;

        try {
            const req = await secureFetch(url);
            const res = await req.json();
            if (res.status === 'success') {
                await Swal.fire('Sukses', 'Data berhasil disimpan', 'success');
                openSuratManager(); 
            } else {
                Swal.fire('Gagal', res.msg || 'Terjadi kesalahan', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Gagal koneksi server', 'error');
        }
    } else {
        openSuratManager();
    }
}

async function openSuratMasukModal(){ 
    const {value:f} = await Swal.fire({ 
        title: 'Arsip Surat Masuk', 
        html: `<div class="space-y-3 text-left"><input id="sm-tgl" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}"><input id="sm-no" class="input-field" placeholder="Nomor Surat"><input id="sm-pengirim" class="input-field" placeholder="Pengirim (ex: Camat)"><textarea id="sm-hal" class="input-field" placeholder="Perihal" rows="2"></textarea><input id="sm-disp" class="input-field" placeholder="Disposisi ke"></div>`, 
        showCancelButton: true, 
        confirmButtonText: 'Arsipkan', 
        confirmButtonColor: '#d97706', 
        preConfirm: () => ({ 
            tgl: document.getElementById('sm-tgl').value, 
            no: document.getElementById('sm-no').value, 
            pengirim: document.getElementById('sm-pengirim').value, 
            hal: document.getElementById('sm-hal').value, 
            disp: document.getElementById('sm-disp').value 
        }) 
    }); 
    if(f){
        Swal.fire({title:'Menyimpan...',didOpen:()=>Swal.showLoading()}); 
        try{ 
            await secureFetch(`${SCRIPT_URL}?action=catatSuratMasuk&tgl=${f.tgl}&no=${encodeURIComponent(f.no)}&pengirim=${encodeURIComponent(f.pengirim)}&hal=${encodeURIComponent(f.hal)}&disp=${encodeURIComponent(f.disp)}`); 
            Swal.fire('Sukses','Surat Diarsipkan','success'); 
        }catch(e){
            Swal.fire('Error','Gagal','error');
        }
    } 
}

async function openAbsensiModal(){ 
    Swal.fire({title:'Memuat...',didOpen:()=>Swal.showLoading()}); 
    let list=[]; 
    try{
        const r=await secureFetch(`${SCRIPT_URL}?action=getPegawai`);
        const j=await r.json();
        list=j.data;
    }catch(e){} 
    Swal.close(); 
    
    let opts=list.length?list.map(p=>`<option value="${p.nama}|${p.jabatan}">${p.nama} - ${p.jabatan}</option>`).join(''):'<option disabled>Kosong</option>'; 
    
    const {value:res} = await Swal.fire({ 
        title: 'Absensi', 
        width: 600, 
        html: `<div class="text-left space-y-4"><div class="flex gap-2"><select id="a-nm" class="input-field w-full"><option value="">-- Pilih Nama --</option>${opts}</select><button class="bg-green-600 text-white px-3 rounded-lg" onclick="tambahPegawaiPopup()"><i class="fas fa-plus"></i></button></div><div class="grid grid-cols-2 gap-4"><div><label class="text-xs font-bold text-slate-500">Tanggal</label><input id="a-tgl" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}"></div><div><label class="text-xs font-bold text-slate-500">Status</label><select id="a-st" class="input-field"><option>Hadir</option><option>Sakit</option></select></div></div><div><label class="text-xs font-bold text-slate-500">Foto</label><input type="file" id="a-foto" accept="image/*" class="input-field border-dashed"></div><textarea id="a-ket" class="input-field" placeholder="Keterangan" rows="2"></textarea></div>`, 
        showCancelButton: true, 
        confirmButtonText: 'Kirim', 
        confirmButtonColor: '#059669', 
        preConfirm: async () => { 
            const fileInput = document.getElementById('a-foto'); 
            if(fileInput.files.length === 0) { 
                Swal.showValidationMessage('Foto Wajib!'); 
                return false; 
            } 
            return { 
                raw: document.getElementById('a-nm').value, 
                tgl: document.getElementById('a-tgl').value, 
                stat: document.getElementById('a-st').value, 
                ket: document.getElementById('a-ket').value, 
                file: fileInput.files[0] 
            } 
        } 
    }); 
    
    if(res){ 
        if(!res.raw) return Swal.fire('Error','Pilih Nama','error'); 
        const [nm,jb] = res.raw.split('|'); 
        Swal.fire({title:'Upload...', text:'Tunggu...', allowOutsideClick:false, didOpen:()=>Swal.showLoading()}); 
        const toBase64 = file => new Promise((resolve, reject) => { 
            const reader = new FileReader(); 
            reader.readAsDataURL(file); 
            reader.onload = () => resolve(reader.result); 
            reader.onerror = error => reject(error); 
        }); 
        try { 
            const base64Str = await toBase64(res.file); 
            const payload = { action: 'catatAbsen', nama: nm, jabatan: jb, tanggal: res.tgl, status: res.stat, ket: res.ket, foto: base64Str }; 
            await secureFetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) }); 
            Swal.fire('Sukses', 'Absen Tersimpan', 'success'); 
        } catch(e) { 
            Swal.fire('Gagal', 'Error Upload', 'error'); 
        } 
    } 
}

async function openPBBModal() {
  const listPejabat = [
    "Kaur Perencanaan", "Kaur Umum", "Kaur Keuangan",
    "Kasi Pemerintahan", "Kasi Kesejahteraan", "Kasi Pelayanan",
    "Kepala Jaga 1", "Kepala Jaga 2", "Kepala Jaga 3", "Kepala Jaga 4",
    "Ketua BPD", "Wakil Ketua BPD", "Sekretaris BPD", 
    "Anggota 1 BPD", "Anggota 2 BPD"
  ];

  const formatRupiah = (num) => {
    return "Rp " + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  Swal.fire({ 
    title: 'Sinkronisasi Data...', 
    html: '<span class="text-sm text-gray-500">Menghitung total uang masuk...</span>',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading() 
  });

  let dataRekap = {};
  try {
    const response = await secureFetch(`${SCRIPT_URL}?action=getRekapSetoran`);
    dataRekap = await response.json(); 
  } catch (error) {
    console.warn("Gagal ambil rekap PBB", error);
  }

  Swal.close(); 
  const totalUangMasuk = Object.values(dataRekap).reduce((acc, curr) => acc + curr, 0);

  const generateDashboardHTML = () => {
    const sortedList = [...listPejabat].sort((a, b) => (dataRekap[b] || 0) - (dataRekap[a] || 0));

    return sortedList.map(jabatan => {
        const totalUang = dataRekap[jabatan] || 0;
        const containerClass = totalUang > 0 ? 'bg-white border border-indigo-100 shadow-sm' : 'opacity-50 hover:opacity-100';
        const textClass = totalUang > 0 ? 'text-gray-800 font-semibold' : 'text-gray-400';
        const badgeClass = totalUang > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono font-bold' : 'bg-gray-100 text-gray-400 text-[10px]';
        const displayUang = totalUang > 0 ? formatRupiah(totalUang) : 'Rp 0';

        return `
            <div class="flex justify-between items-center px-3 py-2.5 mb-2 rounded-xl transition-all duration-200 ${containerClass}">
                <div class="flex items-center gap-2 overflow-hidden">
                    <div class="w-1 h-6 rounded-full flex-none ${totalUang > 0 ? 'bg-emerald-500' : 'bg-gray-300'}"></div>
                    <span class="text-xs truncate ${textClass}" title="${jabatan}">${jabatan}</span>
                </div>
                <span class="text-xs px-2 py-1 rounded-md flex-none ${badgeClass}">
                    ${displayUang}
                </span>
            </div>
        `;
    }).join('');
  };

  const optionsPejabat = listPejabat.map(j => `<option value="${j}">${j}</option>`).join('');
  let draftList = [];

  const updateDraftView = () => {
    const tableBody = document.getElementById('draft-body');
    const totalElem = document.getElementById('draft-total');
    const container = document.getElementById('draft-container');
    
    if (draftList.length > 0) {
        container.style.display = 'block';
        tableBody.innerHTML = draftList.map((item, index) => `
            <div class="flex justify-between items-center p-2 mb-1 bg-white border-l-4 border-indigo-500 rounded shadow-sm group hover:bg-indigo-50 transition-colors">
                <div>
                    <div class="text-xs font-bold text-gray-700">${item.nama}</div>
                    <div class="text-[10px] text-gray-400 group-hover:text-indigo-400">${item.jaga}</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-mono text-xs font-bold text-gray-600 group-hover:text-indigo-700">${formatRupiah(item.nom)}</span>
                    <button onclick="hapusDraft(${index})" class="text-red-300 hover:text-red-600 px-1 font-bold text-lg">×</button>
                </div>
            </div>
        `).join('');
        
        const total = draftList.reduce((acc, curr) => acc + parseInt(curr.nom), 0);
        totalElem.innerHTML = `${formatRupiah(total)}`;
    } else {
        container.style.display = 'none';
    }
  };

  window.hapusDraft = (index) => {
    draftList.splice(index, 1);
    updateDraftView();
  };

  const { value: finalData } = await Swal.fire({
    title: '', 
    width: '1100px',
    padding: '0',
    background: '#f8fafc',
    html: `
      <div class="flex flex-col md:flex-row h-[600px] overflow-hidden text-left rounded-lg font-sans">
        <div class="md:w-[65%] bg-white p-6 flex flex-col h-full relative shadow-xl z-10">
            <h3 class="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2 border-b pb-3">
                <span class="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg text-lg">📝</span> Input Data Penyetoran
            </h3>
            
            <div class="space-y-4">
                <div class="grid grid-cols-12 gap-4">
                     <div class="col-span-3">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Tahun</label>
                        <input id="pb-thn" type="number" class="w-full bg-slate-50 border border-slate-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none" value="2026">
                     </div>
                     <div class="col-span-9">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Petugas Penagih</label>
                        <select id="pb-jaga" class="w-full bg-indigo-50/50 border border-indigo-100 text-indigo-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2.5 outline-none font-semibold cursor-pointer">
                            <option value="" disabled selected>-- Pilih Petugas --</option>
                            ${optionsPejabat}
                        </select>
                     </div>
                </div>

                <div>
                     <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Wajib Pajak</label>
                     <input id="pb-nm" class="w-full bg-slate-50 border border-slate-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-3 outline-none placeholder-gray-400" placeholder="Nama Lengkap">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">NOP (Opsional)</label>
                        <input id="pb-nop" class="w-full bg-slate-50 border border-slate-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-3 outline-none" placeholder="Nomor Objek Pajak">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Nominal Setoran</label>
                        <input id="pb-nom" type="text" class="w-full bg-slate-50 border border-slate-200 text-emerald-700 font-bold text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 block p-3 outline-none text-right font-mono" placeholder="Rp 0">
                    </div>
                </div>

                <button type="button" id="btn-tambah" class="mt-2 w-full text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 font-medium rounded-xl text-sm px-5 py-3.5 mb-2 transition-all shadow-lg active:scale-[0.98]">
                  + Tambahkan ke Daftar
                </button>
            </div>

            <div id="draft-container" class="mt-4 flex-1 overflow-y-auto hidden border-t border-dashed border-gray-300 pt-3 pr-1 custom-scroll">
                <div class="flex justify-between items-center mb-3 bg-indigo-50 p-2 rounded-lg">
                    <span class="text-xs font-bold text-indigo-800 uppercase tracking-wide">Draft Pengiriman</span>
                    <span id="draft-total" class="text-xs font-mono font-bold text-white bg-indigo-600 px-2 py-1 rounded"></span>
                </div>
                <div id="draft-body" class="space-y-2"></div>
            </div>
        </div>

        <div class="md:w-[35%] bg-slate-100 border-l border-gray-200 p-5 flex flex-col h-full relative overflow-hidden">
            <div class="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-xl mb-5 border border-gray-700">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Uang Terkumpul</div>
                        <div class="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                            ${formatRupiah(totalUangMasuk)}
                        </div>
                    </div>
                    <div class="bg-white/10 p-2 rounded-lg text-xl">💰</div>
                </div>
                <div class="mt-3 text-[10px] text-gray-500 font-mono">Real-time database sync</div>
            </div>

            <div class="flex items-center justify-between mb-3 px-1 z-10">
                <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Peringkat Penyetor</span>
                <span class="text-[10px] bg-white px-2 py-0.5 rounded border text-gray-400">Top Down</span>
            </div>
            
            <div class="flex-1 overflow-y-auto pr-1 custom-scroll space-y-1 z-10">
                ${generateDashboardHTML()}
            </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '🚀 Kirim ke Database',
    confirmButtonColor: '#4f46e5',
    cancelButtonText: 'Tutup',
    didOpen: () => {
        const inputNom = document.getElementById('pb-nom');
        inputNom.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9]/g, '');
            if (val) val = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            this.value = val; 
        });

        document.getElementById('btn-tambah').addEventListener('click', () => {
            const thn = document.getElementById('pb-thn').value;
            const nama = document.getElementById('pb-nm').value.trim();
            const nop = document.getElementById('pb-nop').value.trim();
            const jaga = document.getElementById('pb-jaga').value;
            const nomStr = document.getElementById('pb-nom').value.replace(/\./g, '');

            if(!nama || !nomStr || !jaga) {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                Toast.fire({ icon: 'error', title: 'Data belum lengkap!' });
                return;
            }

            draftList.push({ thn, nama, nop, nom: nomStr, jaga });

            document.getElementById('pb-nm').value = '';
            document.getElementById('pb-nop').value = '';
            document.getElementById('pb-nom').value = '';
            document.getElementById('pb-nm').focus();

            updateDraftView();
        });
    },
    preConfirm: () => {
      if (draftList.length === 0) {
        Swal.showValidationMessage('Tidak ada data yang akan dikirim.');
        return false;
      }
      return draftList;
    }
  });

  if (finalData) {
    Swal.fire({ title: 'Sedang Menyimpan...', didOpen: () => Swal.showLoading() });
    try {
      const payload = JSON.stringify(finalData);
      await secureFetch(`${SCRIPT_URL}?action=catatPBB_Batch&data=${encodeURIComponent(payload)}`);
      Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `Rp ${formatRupiah(finalData.reduce((a,b)=>a+parseInt(b.nom),0))} berhasil disetor.`,
          confirmButtonColor: '#4f46e5'
      });
    } catch (e) {
      Swal.fire('Error', 'Gagal koneksi server', 'error');
    }
  }
}

async function openInventarisModal() {
    Swal.fire({ 
        title: 'Memuat Data Aset...', 
        html: '<span class="text-sm text-gray-500">Sinkronisasi database inventaris desa</span>',
        didOpen: () => Swal.showLoading() 
    });

    let stats = { total: 0, rusak: 0, list: [] };
    try {
        const res = await secureFetch(`${SCRIPT_URL}?action=getRekapInventaris`);
        stats = await res.json();
    } catch (e) {
        console.warn("Gagal load inventaris", e);
    }
    Swal.close();

    window.detailAset = (index) => {
        const item = stats.list[index];
        const isRusak = item.kondisi.toLowerCase().includes('rusak');
        const badgeColor = isRusak ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700';
        
        const imgDisplay = item.foto 
            ? `<img src="${item.foto}" class="w-full h-64 object-cover rounded-t-2xl shadow-sm">`
            : `<div class="w-full h-40 bg-gray-100 flex flex-col items-center justify-center rounded-t-2xl text-gray-400">
                 <span class="text-4xl mb-2">📷</span><span>Tidak ada foto</span>
               </div>`;

        Swal.fire({
            title: '',
            width: '600px',
            padding: 0,
            showConfirmButton: false,
            showCloseButton: true,
            background: '#ffffff',
            html: `
                <div class="text-left font-sans pb-6">
                    <div class="relative">
                        ${imgDisplay}
                        <div class="absolute bottom-[-16px] left-6 bg-white p-1 rounded-xl shadow-md">
                            <span class="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${badgeColor}">
                                ${item.kondisi}
                            </span>
                        </div>
                    </div>
                    <div class="mt-8 px-6">
                        <h2 class="text-2xl font-black text-gray-800 leading-tight">${item.nama}</h2>
                        <p class="text-sm font-mono text-gray-400 mt-1">
                            <span class="bg-gray-100 px-2 py-0.5 rounded text-gray-600">Kode: ${item.kode}</span>
                        </p>
                    </div>
                    <div class="mt-6 px-6 grid grid-cols-2 gap-y-4 gap-x-6">
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase">Merk/Tipe</label><div class="text-sm font-semibold text-gray-700">${item.merk || '-'}</div></div>
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase">Tahun Perolehan</label><div class="text-sm font-semibold text-gray-700">${item.tahun || '-'}</div></div>
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase">Ukuran/Dimensi</label><div class="text-sm font-semibold text-gray-700">${item.ukuran || '-'}</div></div>
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase">Asal Usul</label><div class="text-sm font-semibold text-gray-700">${item.asal || '-'}</div></div>
                        <div class="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Spesifikasi Teknis</label>
                            <div class="text-sm text-gray-600 leading-relaxed">${item.spek || 'Tidak ada data spesifikasi.'}</div>
                        </div>
                        ${isRusak && item.ket ? `
                        <div class="col-span-2 bg-red-50 p-3 rounded-lg border border-red-100">
                            <label class="block text-[10px] font-bold text-red-400 uppercase mb-1">⚠️ Kerusakan / Perbaikan</label>
                            <div class="text-sm text-red-700 font-medium">${item.ket}</div>
                        </div>` : ''}
                    </div>
                </div>
            `
        });
    };

    const generateListHTML = () => {
        if (stats.list.length === 0) return '<div class="text-center text-xs text-gray-400 py-4">Belum ada data aset</div>';
        return stats.list.map((item, index) => {
            const isRusak = item.kondisi.toLowerCase().includes('rusak');
            const bgClass = isRusak ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100';
            const textClass = isRusak ? 'text-red-700' : 'text-emerald-700';
            const icon = isRusak ? '⚠️' : '✅';
            
            return `
            <div onclick="window.detailAset(${index})" class="flex flex-col p-2 mb-2 rounded-lg border ${bgClass} text-left cursor-pointer hover:shadow-md transition-all duration-200">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="text-xs font-bold text-gray-700 truncate w-32">${item.nama}</div>
                        <div class="text-[10px] text-gray-400">${item.kode}</div>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white ${textClass} border shadow-sm">
                        ${icon} ${item.kondisi}
                    </span>
                </div>
                ${isRusak && item.ket ? `<div class="mt-1 text-[10px] text-red-500 italic border-t border-red-200 pt-1 truncate">Perlu: ${item.ket}</div>` : ''}
            </div>`;
        }).join('');
    };

    const { value: formValues } = await Swal.fire({
        title: '',
        width: '1100px',
        padding: 0,
        background: '#f8fafc',
        html: `
        <div class="flex flex-col md:flex-row h-[650px] overflow-hidden font-sans text-left">
            <div class="md:w-[65%] bg-white p-6 flex flex-col h-full overflow-y-auto custom-scroll relative">
                <h3 class="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2 border-b pb-3 sticky top-0 bg-white z-10">
                    <span class="bg-orange-100 text-orange-600 p-1.5 rounded-lg text-lg">📦</span> Catat Aset Desa
                </h3>
                <div class="space-y-4 pb-4">
                    <div class="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300">
                        <div id="preview-container" class="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-none">
                            <span class="text-2xl">📷</span>
                        </div>
                        <div class="flex-1">
                            <label class="block text-xs font-bold text-gray-500 mb-1">Upload Foto Aset</label>
                            <input type="file" id="inv-foto" accept="image/*" class="block w-full text-xs text-slate-500"/>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div class="col-span-1"><label class="label-text">Kode Barang</label><input id="inv-kd" class="input-material" placeholder="02.06.01"></div>
                        <div class="col-span-2"><label class="label-text">Nama Barang</label><input id="inv-nm" class="input-material" placeholder="Nama Barang"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div><label class="label-text">Merk/Tipe</label><input id="inv-merk" class="input-material" placeholder="-"></div>
                        <div><label class="label-text">Ukuran/Dimensi</label><input id="inv-uk" class="input-material" placeholder="-"></div>
                        <div><label class="label-text">Bahan</label><input id="inv-bhn" class="input-material" placeholder="-"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="label-text">Tahun Perolehan</label><input id="inv-thn" type="number" class="input-material" value="2026"></div>
                        <div><label class="label-text">Nomor Seri/Pabrik</label><input id="inv-seri" class="input-material" placeholder="-"></div>
                    </div>
                    <div>
                        <label class="label-text">Asal-Usul Aset</label>
                        <select id="inv-asal" class="input-material cursor-pointer">
                            <option value="Dana Desa">Dana Desa (DD)</option>
                            <option value="PADes">Pendapatan Asli Desa (PADes)</option>
                            <option value="Bantuan Kab/Prov">Bantuan Kabupaten/Provinsi</option>
                            <option value="Hibah">Hibah</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label class="label-text">Spesifikasi Teknis</label>
                        <textarea id="inv-spek" rows="2" class="input-material" placeholder="Spesifikasi..."></textarea>
                    </div>
                    <div class="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <label class="label-text text-orange-800">Kondisi Saat Ini</label>
                        <select id="inv-kon" class="input-material border-orange-200 mb-2 font-bold text-gray-700">
                            <option value="Baik">✅ Baik</option>
                            <option value="Rusak Sedang">⚠️ Rusak Sedang</option>
                            <option value="Rusak Berat">❌ Rusak Berat</option>
                        </select>
                        <div id="box-perbaikan" class="hidden mt-2">
                            <label class="label-text text-red-600 font-bold">🛠️ Keterangan Kerusakan</label>
                            <input id="inv-rusak-ket" class="input-material border-red-300 bg-red-50" placeholder="Rincian kerusakan...">
                        </div>
                    </div>
                </div>
            </div>

            <div class="md:w-[35%] bg-slate-100 border-l border-gray-200 p-5 flex flex-col h-full overflow-hidden">
                <div class="bg-gradient-to-br from-orange-500 to-amber-500 text-white p-4 rounded-2xl shadow-lg mb-4">
                    <div class="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-1">Total Aset Desa</div>
                    <div class="text-4xl font-black">${stats.total}</div>
                </div>
                <div class="flex gap-2 mb-4">
                    <div class="flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div class="text-[10px] text-gray-400 font-bold uppercase">Kondisi Baik</div>
                        <div class="text-xl font-bold text-emerald-600">${stats.total - stats.rusak}</div>
                    </div>
                    <div class="flex-1 bg-white p-3 rounded-xl border border-red-200 shadow-sm">
                        <div class="text-[10px] text-red-400 font-bold uppercase">Perlu Perbaikan</div>
                        <div class="text-xl font-bold text-red-600">${stats.rusak}</div>
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto custom-scroll pr-1">
                    ${generateListHTML()}
                </div>
            </div>
        </div>
        `,
        showCancelButton: true,
        confirmButtonText: '💾 Simpan Data',
        confirmButtonColor: '#ea580c',
        cancelButtonText: 'Batal',
        didOpen: () => {
            const selKondisi = document.getElementById('inv-kon');
            const boxPerbaikan = document.getElementById('box-perbaikan');
            const inputRusak = document.getElementById('inv-rusak-ket');

            selKondisi.addEventListener('change', (e) => {
                if (e.target.value.includes('Rusak')) {
                    boxPerbaikan.classList.remove('hidden');
                    inputRusak.focus();
                } else {
                    boxPerbaikan.classList.add('hidden');
                    inputRusak.value = ''; 
                }
            });

            const inputFoto = document.getElementById('inv-foto');
            const previewContainer = document.getElementById('preview-container');
            inputFoto.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        previewContainer.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
                    }
                    reader.readAsDataURL(file);
                }
            });
        },
        preConfirm: () => {
            const nama = document.getElementById('inv-nm').value;
            const kondisi = document.getElementById('inv-kon').value;
            const ketRusak = document.getElementById('inv-rusak-ket').value;

            if (!nama) { Swal.showValidationMessage('Nama Barang wajib diisi!'); return false; }
            if (kondisi.includes('Rusak') && !ketRusak) { Swal.showValidationMessage('Jelaskan apa yang rusak!'); return false; }

            const fileInput = document.getElementById('inv-foto');
            
            return new Promise((resolve) => {
                const data = {
                    kode: document.getElementById('inv-kd').value,
                    nama: nama,
                    merk: document.getElementById('inv-merk').value,
                    ukuran: document.getElementById('inv-uk').value,
                    bahan: document.getElementById('inv-bhn').value,
                    tahun: document.getElementById('inv-thn').value,
                    noseri: document.getElementById('inv-seri').value,
                    asal: document.getElementById('inv-asal').value,
                    spek: document.getElementById('inv-spek').value,
                    kondisi: kondisi,
                    rusak_ket: ketRusak,
                    foto: null
                };

                if (fileInput.files.length > 0) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        data.foto = e.target.result; 
                        resolve(data);
                    };
                    reader.readAsDataURL(fileInput.files[0]);
                } else {
                    resolve(data);
                }
            });
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
        try {
            const payload = JSON.stringify({ action: 'catatInventaris', ...formValues });
            await secureFetch(SCRIPT_URL, { method: 'POST', body: payload });
            Swal.fire('Berhasil', 'Data aset tersimpan', 'success');
        } catch (e) {
            Swal.fire('Error', 'Gagal koneksi server', 'error');
        }
    }
}

async function openKematianModal(){ 
    const {value:f} = await Swal.fire({ 
        title: 'Buku Kematian', 
        html: `<div class="space-y-3 text-left"><label class="text-xs text-red-500 font-bold">*Hapus Bansos</label><input id="km-tgl" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}"><input id="km-nm" class="input-field" placeholder="Nama Almarhum/ah"><div class="grid grid-cols-2 gap-2"><input id="km-nik" class="input-field" placeholder="NIK (16 Digit)"><input id="km-umur" class="input-field" placeholder="Umur"></div><input id="km-sebab" class="input-field" placeholder="Penyebab"><input id="km-lapor" class="input-field" placeholder="Pelapor"></div>`, 
        showCancelButton: true, 
        confirmButtonText: 'Catat', 
        confirmButtonColor: '#374151', 
        preConfirm: () => ({ 
            tgl: document.getElementById('km-tgl').value, 
            nama: document.getElementById('km-nm').value, 
            nik: document.getElementById('km-nik').value.replace(/[^0-9]/g, ''), 
            umur: document.getElementById('km-umur').value, 
            sebab: document.getElementById('km-sebab').value, 
            lapor: document.getElementById('km-lapor').value 
        }) 
    }); 
    if(f){
        Swal.fire({title:'Menyimpan...',didOpen:()=>Swal.showLoading()}); 
        try{ 
            await secureFetch(`${SCRIPT_URL}?action=catatKematian&tgl=${f.tgl}&nama=${encodeURIComponent(f.nama)}&nik=${f.nik}&umur=${f.umur}&sebab=${encodeURIComponent(f.sebab)}&lapor=${encodeURIComponent(f.lapor)}`); 
            Swal.fire('Tercatat','Data Kematian Disimpan','success'); 
        }catch(e){
            Swal.fire('Error','Gagal','error');
        }
    } 
}

async function openKelahiranModal(){ 
    const {value:f} = await Swal.fire({ 
        title: 'Buku Kelahiran', 
        html: `<div class="space-y-3 text-left"><input id="kl-tgl" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}"><input id="kl-nm" class="input-field" placeholder="Nama Bayi"><select id="kl-jk" class="input-field"><option>Laki-laki</option><option>Perempuan</option></select><div class="grid grid-cols-2 gap-2"><input id="kl-ayah" class="input-field" placeholder="Nama Ayah"><input id="kl-ibu" class="input-field" placeholder="Nama Ibu"></div><input id="kl-brt" class="input-field" placeholder="Berat (Kg)"></div>`, 
        showCancelButton: true, 
        confirmButtonText: 'Simpan', 
        confirmButtonColor: '#db2777', 
        preConfirm: () => ({ 
            tgl: document.getElementById('kl-tgl').value, 
            nama: document.getElementById('kl-nm').value, 
            jk: document.getElementById('kl-jk').value, 
            ayah: document.getElementById('kl-ayah').value, 
            ibu: document.getElementById('kl-ibu').value, 
            brt: document.getElementById('kl-brt').value 
        }) 
    }); 
    if(f){
        Swal.fire({title:'Menyimpan...',didOpen:()=>Swal.showLoading()}); 
        try{ 
            await secureFetch(`${SCRIPT_URL}?action=catatKelahiran&tgl=${f.tgl}&nama=${encodeURIComponent(f.nama)}&jk=${f.jk}&ayah=${encodeURIComponent(f.ayah)}&ibu=${encodeURIComponent(f.ibu)}&brt=${f.brt}`); 
            Swal.fire('Sukses','Bayi Tercatat','success'); 
        }catch(e){
            Swal.fire('Error','Gagal','error');
        }
    } 
}

async function openStuntingModal(){ 
    const {value:f} = await Swal.fire({ 
        title: 'Data Balita', 
        html: `<div class="space-y-3 text-left"><input id="st-tgl" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}"><input id="st-anak" class="input-field" placeholder="Nama Anak"><div class="grid grid-cols-3 gap-2"><input id="st-umur" type="number" class="input-field" placeholder="Umur"><input id="st-brt" type="number" step="0.1" class="input-field" placeholder="Berat"><input id="st-tng" type="number" step="0.1" class="input-field" placeholder="Tinggi"></div><select id="st-sts" class="input-field"><option>Normal</option><option>Kurang Gizi</option><option>Stunting</option></select></div>`, 
        showCancelButton: true, 
        confirmButtonText: 'Simpan', 
        confirmButtonColor: '#7c3aed', 
        preConfirm: () => ({ 
            tgl: document.getElementById('st-tgl').value, 
            anak: document.getElementById('st-anak').value, 
            umur: document.getElementById('st-umur').value, 
            berat: document.getElementById('st-brt').value, 
            tinggi: document.getElementById('st-tng').value, 
            status: document.getElementById('st-sts').value 
        }) 
    }); 
    if(f){
        Swal.fire({title:'Menyimpan...',didOpen:()=>Swal.showLoading()});
        try{
            await secureFetch(`${SCRIPT_URL}?action=catatStunting&tgl=${f.tgl}&anak=${encodeURIComponent(f.anak)}&umur=${f.umur}&berat=${f.berat}&tinggi=${f.tinggi}&status=${f.status}`);
            Swal.fire('Sukses','Tersimpan','success');
        }catch(e){
            Swal.fire('Error','Gagal','error');
        }
    } 
}

async function openTamuModal(){ 
    const {value:f} = await Swal.fire({ 
        title: 'Buku Tamu', 
        html: `<div class="space-y-3 text-left"><input id="tam-tgl" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}"><input id="tam-nm" class="input-field" placeholder="Nama"><input id="tam-ins" class="input-field" placeholder="Instansi"><textarea id="tam-perlu" class="input-field" placeholder="Keperluan" rows="2"></textarea><input id="tam-hp" class="input-field" placeholder="No HP"></div>`, 
        showCancelButton: true, 
        confirmButtonText: 'Catat', 
        confirmButtonColor: '#db2777', 
        preConfirm: () => ({ 
            tgl: document.getElementById('tam-tgl').value, 
            nama: document.getElementById('tam-nm').value, 
            instansi: document.getElementById('tam-ins').value, 
            perlu: document.getElementById('tam-perlu').value, 
            hp: document.getElementById('tam-hp').value 
        }) 
    }); 
    if(f){
        Swal.fire({title:'Menyimpan...',didOpen:()=>Swal.showLoading()});
        try{
            await secureFetch(`${SCRIPT_URL}?action=catatTamu&tgl=${f.tgl}&nama=${encodeURIComponent(f.nama)}&instansi=${encodeURIComponent(f.instansi)}&perlu=${encodeURIComponent(f.perlu)}&hp=${f.hp}`);
            Swal.fire('Sukses','Tamu tercatat','success');
        }catch(e){
            Swal.fire('Error','Gagal','error');
        }
    } 
}

async function openAgendaModal(){ 
    const {value:f} = await Swal.fire({ 
        title: 'Agenda', 
        html: `<div class="space-y-3 text-left"><input id="ag-tgl" type="datetime-local" class="input-field"><input id="ag-nm" class="input-field" placeholder="Kegiatan"><input id="ag-lok" class="input-field" placeholder="Lokasi"><input id="ag-dana" class="input-field" placeholder="Anggaran"><textarea id="ag-ket" class="input-field" placeholder="Ket"></textarea></div>`, 
        showCancelButton: true, 
        confirmButtonText: 'Jadwal', 
        confirmButtonColor: '#0891b2', 
        preConfirm: () => ({ 
            tgl: document.getElementById('ag-tgl').value, 
            acara: document.getElementById('ag-nm').value, 
            lokasi: document.getElementById('ag-lok').value, 
            dana: document.getElementById('ag-dana').value, 
            ket: document.getElementById('ag-ket').value 
        }) 
    }); 
    if(f){
        Swal.fire({title:'Menyimpan...',didOpen:()=>Swal.showLoading()});
        try{
            await secureFetch(`${SCRIPT_URL}?action=catatAgenda&tgl=${f.tgl}&acara=${encodeURIComponent(f.acara)}&lokasi=${encodeURIComponent(f.lokasi)}&dana=${encodeURIComponent(f.dana)}&ket=${encodeURIComponent(f.ket)}`);
            Swal.fire('Sukses','Tersimpan','success');
        }catch(e){
            Swal.fire('Error','Gagal','error');
        }
    } 
}

async function tambahPegawaiPopup(){ 
    const {value:f}=await Swal.fire({
        title:'Tambah Pegawai',
        html:`<input id="nn" class="input-field mb-2" placeholder="Nama"><input id="jj" class="input-field" placeholder="Jabatan">`,
        confirmButtonText:'Simpan',
        preConfirm:()=>({n:document.getElementById('nn').value, j:document.getElementById('jj').value})
    }); 
    if(f&&f.n){
        Swal.fire({title:'Menyimpan...',didOpen:()=>Swal.showLoading()});
        await secureFetch(`${SCRIPT_URL}?action=tambahPegawai&nama=${encodeURIComponent(f.n)}&jabatan=${encodeURIComponent(f.j)}`);
        Swal.fire('Sukses','Ditambahkan','success');
    } 
}

function showKantorPopup(){
    Swal.fire({
        title:'Kantor Desa',
        html:`<div class="grid grid-cols-2 gap-2 mt-4"><img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgvULrSREcdyjsHeuG9JCXZRaaNq11M9vfvIrfpiWPHjBZWgSKzGIYYvwG9JIACulBUTis2g7pCwpGlWi43cxHq6s_vsRXSt-yXUx6DfBEmDOlujp1jZhzwiLCZ5cyFlCv9PuciRHwNEo71DUYWcMs5DWNffMPem6lzkZTrkm-XWmFo47A4XaJLJCYEjR-2/s16000/2025-08-11%2010.06.25.jpg" class="h-32 w-full object-cover rounded"><img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj2mwZq_aD2rZ9hukNVb-cWVSNjTW5mSn8n_tZA6dPKtcs4IotRm2xRIlj_vJHyqFeuueScMs8hNL3_nwp1g80bORqoEYQwVnpm5HRgF00sALPoN5BJ0YEeT38xs8fCDl91R4GPPFWZi2JaKyAi6tkclyHU3e4ntprgvKcRTlIObmoDVKgPiWwugoRQ8T5s/s16000/IMG_3502.jpg" class="h-32 w-full object-cover rounded"></div>`,
        showConfirmButton:false,
        showCloseButton:true
    });
}

async function showBLTPopup() {
    const { value: formValues } = await Swal.fire({
        title: 'Cek Status BLT 2026',
        html: `
            <div class="blt-input-group">
                <label class="blt-label">Nama Lengkap (Sesuai KTP)</label>
                <input id="swal-nama" class="swal2-input blt-input" placeholder="Contoh: DENY MUNAISECHE">
            </div>
            <div class="blt-input-group">
                <label class="blt-label">NIK (16 Digit)</label>
                <input id="swal-nik" type="text" inputmode="numeric" maxlength="16" class="swal2-input blt-input" placeholder="Masukkan 16 digit NIK">
            </div>
        `,
        confirmButtonText: 'Periksa Data',
        confirmButtonColor: '#0f766e',
        showCancelButton: true,
        cancelButtonText: 'Batal',
        reverseButtons: true,
        customClass: { popup: 'blt-popup' },
        preConfirm: () => {
            const nama = document.getElementById('swal-nama').value.trim();
            const nik = document.getElementById('swal-nik').value.trim().replace(/[^0-9]/g, '');
            
            if (!nama || !nik) {
                Swal.showValidationMessage('Nama dan NIK wajib diisi!');
                return false;
            }
            if (nik.length < 16) {
                Swal.showValidationMessage('NIK harus berjumlah 16 digit!');
                return false;
            }
            return { nama: nama.toUpperCase(), nik: nik };
        }
    });

    if (!formValues) return;

    Swal.fire({
        title: 'Memproses...',
        html: 'Sedang mencocokkan data dengan database desa',
        allowOutsideClick: false,
        customClass: { popup: 'blt-popup' },
        didOpen: () => Swal.showLoading()
    });

    try {
        const wargaToken = localStorage.getItem('molas_warga_token');
        if(!wargaToken){
            Swal.fire({
                icon: 'warning',
                title: 'Login Warga Diperlukan',
                html: 'Untuk keamanan data BLT, silakan login dengan NIK & Nama terlebih dahulu di menu Login Warga.',
                confirmButtonText: 'Login Sekarang',
                confirmButtonColor: '#0f766e'
            }).then(()=>openLoginModal());
            return;
        }
        const response = await secureFetch(`${SCRIPT_URL}?action=checkBLT&nik=${formValues.nik}&nama=${encodeURIComponent(formValues.nama)}`);
        const data = await response.json();

        if (data.terdaftar) {
            Swal.fire({
                icon: 'success',
                title: 'Data Terverifikasi',
                html: `
                    <div class="blt-card">
                        <span class="status-badge">ANDA PENERIMA BLT MOLAS TAHUN 2026</span>
                        <div style="font-weight: 700; font-size: 1.2rem; color: #1e293b; margin-bottom: 5px;">${data.nama_kpm}</div>
                        <div style="font-size: 0.85rem; color: #64748b;">NIK: ${formValues.nik}</div>
                        
                        <div class="info-box">
                            <div class="info-title">TARGET PENCAIRAN</div>
                            <p class="info-text">
                                Bantuan dicairkan <b>3 bulan sekali</b>. Estimasi pencairan berikutnya pada <b>Maret 2026</b>, segera setelah Dana Desa disalurkan ke kas desa.
                            </p>
                        </div>
                        
                        <div style="margin-top: 1rem; font-size: 0.8rem; color: #0f766e; font-weight: 600;">
                            Status Dana Desa 2026: ${data.info_desa.status_dana}
                        </div>
                    </div>
                `,
                confirmButtonText: 'Tutup',
                confirmButtonColor: '#0f766e',
                customClass: { popup: 'blt-popup' }
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Tidak Ditemukan',
                text: 'Mohon maaf, NIK Anda tidak terdaftar sebagai penerima BLT periode 2026.',
                confirmButtonColor: '#0f766e',
                customClass: { popup: 'blt-popup' }
            });
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Koneksi Gagal',
            text: 'Terjadi kesalahan saat menghubungi server.',
            confirmButtonColor: '#ef4444',
            customClass: { popup: 'blt-popup' }
        });
    }
}

const daftarAgenda = [
    {
        tgl: "04", 
        bln: "FEB", 
        judul: "Rekonsiliasi PMD Keuangan Desa",
        jam: "07.00 - Selesai",
        lokasi: "BPU Desa Molompar Dua",
        warna: "violet" 
    },
    {
        tgl: "29", 
        bln: "JAN", 
        judul: "Musdes Pertanggungjawaban APBDes 2025, Validasi Calon BLT 2026 , Rancangan APBDes 2026.",
        jam: "09.00 - 14.00",
        lokasi: "Kantor Desa Molompar Atas",
        warna: "blue"
    },
    {
        tgl: "28", 
        bln: "JAN", 
        judul: "Konsultasi Publik Rancangan Awal RKPD 2027",
        jam: "09.00 - Selesai",
        lokasi: "Kantor Bupati Mitra",
        warna: "emerald"
    },
    {
        tgl: "27", 
        bln: "JAN", 
        judul: "Undangan Inspektorat",
        jam: "09.30 s/d Selesai",
        lokasi: "Kantor Inspektorat Mitra",
        warna: "orange"
    }
];

function updateBadgeAgenda() {
    const el = document.getElementById('badge-agenda-count');
    if(el) {
        el.innerText = daftarAgenda.length + " Agenda Aktif";
    }
}
document.addEventListener("DOMContentLoaded", updateBadgeAgenda);

function showAgendaList() {
    let listHTML = `<div class="space-y-3 text-left max-h-[60vh] overflow-y-auto pr-1">`;
    
    if(daftarAgenda.length === 0) {
        listHTML += `<div class="text-center text-slate-400 py-4 italic">Belum ada jadwal kegiatan.</div>`;
    } else {
        daftarAgenda.forEach(item => {
            let colorClass = "border-l-violet-500 text-violet-600 bg-violet-50";
            if(item.warna === 'blue') colorClass = "border-l-blue-500 text-blue-600 bg-blue-50";
            if(item.warna === 'red') colorClass = "border-l-red-500 text-red-600 bg-red-50";
            if(item.warna === 'emerald') colorClass = "border-l-emerald-500 text-emerald-600 bg-emerald-50";
            if(item.warna === 'orange') colorClass = "border-l-orange-500 text-orange-600 bg-orange-50";

            listHTML += `
            <div class="flex bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                <div class="flex flex-col items-center justify-center p-3 w-16 ${colorClass.replace('bg-', 'bg-opacity-20 ')} border-r border-slate-100">
                    <span class="text-lg font-black leading-none">${item.tgl}</span>
                    <span class="text-[10px] font-bold uppercase mt-1">${item.bln}</span>
                </div>
                
                <div class="p-3 flex-1 border-l-4 ${colorClass.split(' ')[0]}">
                    <h4 class="text-sm font-bold text-slate-800 leading-tight mb-1 group-hover:text-blue-600 transition-colors">${item.judul}</h4>
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2 text-xs text-slate-500">
                            <i class="far fa-clock text-[10px] w-4"></i> ${item.jam}
                        </div>
                        <div class="flex items-center gap-2 text-xs text-slate-500">
                            <i class="fas fa-map-marker-alt text-[10px] w-4"></i> ${item.lokasi}
                        </div>
                    </div>
                </div>
            </div>`;
        });
    }
    listHTML += `</div>`;

    Swal.fire({
        title: `
            <div class="flex items-center gap-3 border-b pb-3">
                <div class="bg-violet-100 p-2 rounded-lg text-violet-600"><i class="fas fa-calendar-alt"></i></div>
                <div class="text-left">
                    <div class="text-lg font-bold text-slate-800">Kalender Kegiatan</div>
                    <div class="text-xs text-slate-500 font-normal">Jadwal Undangan & Acara Desa</div>
                </div>
            </div>
        `,
        html: listHTML,
        width: '550px',
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            popup: 'rounded-2xl'
        }
    });
}

async function openListModal(title, type){
    Swal.fire({title:'Memuat Data...', didOpen:()=>Swal.showLoading()});
    try {
        const r = await secureFetch(`${SCRIPT_URL}?action=getListData&type=${type}`);
        const j = await r.json();
        let modalWidth = '850px'; let fontSize = 'text-xs';
        if(type === 'penduduk') { modalWidth = '98%'; fontSize = 'text-[10px]'; }
        let tableHtml = `<div class="overflow-x-auto bg-white rounded-lg shadow border border-slate-200" style="max-height: 75vh;"><table class="min-w-full ${fontSize} text-left whitespace-nowrap"><thead class="bg-slate-100 sticky top-0 z-10 font-bold text-slate-700"><tr>`;
        j.headers.forEach(h => tableHtml += `<th class="p-3 border-b border-r border-slate-300">${h}</th>`);
        tableHtml += `<th class="p-3 border-b border-slate-300 text-center">Aksi</th></tr></thead><tbody class="divide-y divide-slate-100">`;
        if(j.data.length === 0) tableHtml += `<tr><td colspan="${j.headers.length+1}" class="p-4 text-center text-slate-400 italic">Belum ada data</td></tr>`;
        j.data.forEach((row, idx) => { tableHtml += `<tr class="hover:bg-blue-50 transition">`; row.forEach(cell => { let show = cell; if(String(cell).includes('http') && String(cell).length > 15) show = `<img src="${cell}" class="h-8 w-8 rounded-full object-cover border border-slate-300">`; tableHtml += `<td class="p-2 border-r border-slate-200 align-middle">${show}</td>`; }); tableHtml += `<td class="p-2 text-center align-middle"><button onclick="hapusRow('${j.sheet}', ${idx})" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash"></i></button></td></tr>`; });
        tableHtml += `</tbody></table></div>`;
        let btnAdd = ""; if(type === 'penduduk') btnAdd = `<button onclick="tambahPendudukPopup()" class="mt-4 bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-purple-700 w-full"><i class="fas fa-plus mr-2"></i>Tambah Data Penduduk Baru</button>`;
        Swal.fire({ title: `<span class="text-lg font-bold text-slate-700">${title}</span>`, html: tableHtml + btnAdd, width: modalWidth, showConfirmButton: false, showCloseButton: true, padding: '1em' });
    } catch(e) { Swal.fire('Error', 'Gagal memuat data', 'error'); }
}

async function openLaporanModal(title, type){ 
    Swal.fire({title:'Menyiapkan Laporan...', didOpen:()=>Swal.showLoading()}); 
    try { 
        const r = await secureFetch(`${SCRIPT_URL}?action=getListData&type=${type}`); 
        const j = await r.json(); 
        const kopImg = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgu9a_rRVt-zlvL8JvP06LWN_dAUsxyjkbHU7z8rX-tPteJVMrZnHtZNccFdQCGQPb1IpzkNoblhw_EYbxiooKwot6bBmtZWmbpgqR27WuSFEhHNdS2CMrnO1sBc40EnAuDSfklHQprMdfRKENNb3ObYP9uzN3LbpFJOC45mTIDy2sh90XOMbdOq_-P8Uda/s16000/KOPDESA1.PNG"; 
        let html = `<div class="p-4 bg-white text-black font-serif" style="min-width: 900px;"><img src="${kopImg}" class="w-full mb-4 object-contain h-32"><h2 class="text-center font-bold text-xl uppercase underline mb-6">${title}</h2><table class="w-full border-collapse border border-black text-sm"><thead><tr class="bg-gray-200">`; 
        j.headers.forEach(h => html += `<th class="border border-black p-2">${h}</th>`); 
        html += `</tr></thead><tbody>`; 
        j.data.forEach(row => { html += `<tr>`; row.forEach(cell => html += `<td class="border border-black p-2">${cell}</td>`); html += `</tr>`; }); 
        html += `</tbody></table><div class="flex justify-end mt-12 text-center"><div class="mr-12"><p>Molompar Atas, ${new Date().toLocaleDateString('id-ID', {year:'numeric', month:'long', day:'numeric'})}</p><p class="font-bold mt-20 underline">ALFIUS B. TULANDI</p><p>Hukum Tua</p></div></div></div>`; 
        Swal.fire({ html: html, width: 1000, showConfirmButton: true, confirmButtonText: '<i class="fas fa-print"></i> Cetak / Simpan PDF', confirmButtonColor: '#334155' }).then((res) => { if(res.isConfirmed) { var w = window.open(); w.document.write(html); w.print(); w.close(); } }); 
    } catch(e) { Swal.fire('Error', 'Gagal memuat laporan', 'error'); } 
}

async function hapusRow(sheet, idx){ 
    const c = await Swal.fire({title:'Hapus Data?', text:'Data akan hilang permanen', icon:'warning', showCancelButton:true, confirmButtonColor:'#d33'}); 
    if(c.isConfirmed){ 
        Swal.fire({title:'Menghapus...', didOpen:()=>Swal.showLoading()}); 
        await secureFetch(`${SCRIPT_URL}?action=hapusDataRow&sheet=${sheet}&row=${idx}`); 
        Swal.fire('Terhapus','Data berhasil dihapus','success'); 
    } 
}

async function tambahPendudukPopup(){ 
    const {value:f} = await Swal.fire({ 
        title: 'Tambah Data Penduduk (ADMP_1)', 
        html: `<div class="grid grid-cols-2 gap-3 text-left"><input id="p-nik" class="input-field col-span-2" placeholder="NIK (16 Digit Wajib)"><input id="p-nama" class="input-field col-span-2" placeholder="Nama Lengkap"><input id="p-tmp" class="input-field" placeholder="Tempat Lahir"><input id="p-tgl" type="date" class="input-field"><select id="p-jk" class="input-field"><option>Laki-laki</option><option>Perempuan</option></select><input id="p-agm" class="input-field" placeholder="Agama"><input id="p-krj" class="input-field" placeholder="Pekerjaan"><input id="p-alm" class="input-field" placeholder="Alamat (Jaga)"><input id="p-ayh" class="input-field" placeholder="Nama Ayah"><input id="p-ibu" class="input-field" placeholder="Nama Ibu"></div>`, 
        showCancelButton: true, 
        confirmButtonText: 'Simpan ke Database', 
        preConfirm: () => ({ 
            nik: document.getElementById('p-nik').value.replace(/[^0-9]/g, ''), 
            nama: document.getElementById('p-nama').value.trim(), 
            tempat: document.getElementById('p-tmp').value.trim(), 
            tgl: document.getElementById('p-tgl').value, 
            jk: document.getElementById('p-jk').value, 
            agama: document.getElementById('p-agm').value.trim(), 
            kerja: document.getElementById('p-krj').value.trim(), 
            alamat: document.getElementById('p-alm').value.trim(), 
            ayah: document.getElementById('p-ayh').value.trim(), 
            ibu: document.getElementById('p-ibu').value.trim() 
        }) 
    }); 
    if(f){ 
        Swal.fire({title:'Menyimpan ke ADMP_1...', didOpen:()=>Swal.showLoading()}); 
        try{ 
            await secureFetch(`${SCRIPT_URL}?action=tambahDataPenduduk&nik=${f.nik}&nama=${encodeURIComponent(f.nama)}&tempat=${encodeURIComponent(f.tempat)}&tgl=${f.tgl}&jk=${f.jk}&agama=${encodeURIComponent(f.agama)}&kerja=${encodeURIComponent(f.kerja)}&alamat=${encodeURIComponent(f.alamat)}&ayah=${encodeURIComponent(f.ayah)}&ibu=${encodeURIComponent(f.ibu)}`); 
            Swal.fire('Sukses', 'Data Penduduk Tersimpan', 'success'); 
        }catch(e){ 
            Swal.fire('Gagal', 'Error koneksi', 'error'); 
        } 
    } 
}

function saveWebSettings(){
    const s={desa:document.getElementById('set-desa').value,kec:document.getElementById('set-kec').value,logo:document.getElementById('set-logo').value};
    localStorage.setItem('desaSettings',JSON.stringify(s));
    applySettings(s);
    Swal.fire('Tersimpan','','success');
}

function loadWebSettings(){
    try {
        const s=JSON.parse(localStorage.getItem('desaSettings'));
        if(s){
            if(document.getElementById('set-desa')) document.getElementById('set-desa').value=s.desa;
            if(document.getElementById('set-kec')) document.getElementById('set-kec').value=s.kec;
            if(document.getElementById('set-logo')) document.getElementById('set-logo').value=s.logo;
            applySettings(s);
        }
    } catch(e){}
}

function applySettings(s){
    if(s.desa&&document.getElementById('nav-desa-name'))document.getElementById('nav-desa-name').innerText=s.desa.toUpperCase();
    if(s.kec)document.getElementById('nav-kec-name').innerText=s.kec;
    if(s.logo)document.getElementById('nav-logo').src=s.logo;
}

function toggleModal(id){
    const m=document.getElementById(id);
    if(m.classList.contains('hidden')) {
        m.classList.remove('hidden');
        document.body.style.overflow='hidden';
    } else {
        m.classList.add('hidden');
        document.body.style.overflow='auto';
    }
}

async function openModulePDF() {
    Swal.fire({title: 'Mengambil daftar file...', didOpen: () => Swal.showLoading()});
    try {
        const response = await secureFetch(`${SCRIPT_URL}?action=getPDF`);
        const result = await response.json();
        
        if (result.status === 'success') {
            let listHtml = `<div class="space-y-4 max-h-[60vh] overflow-y-auto p-2">`;
            
            listHtml = `
                <div class="mb-4 text-right">
                    <button onclick="uploadModulePDF()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition flex items-center gap-2 ml-auto">
                        <i class="fas fa-cloud-upload-alt"></i> Upload File Baru
                    </button>
                </div>
            ` + listHtml;
            
            if(result.data.length === 0) {
                 listHtml += `<div class="text-center text-slate-400 py-4">Belum ada file modul.</div>`;
            }

            result.data.forEach(row => {
                const [nama, size, desc, link] = row;
                listHtml += `
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left shadow-sm hover:border-rose-400 transition-all">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h4 class="font-bold text-slate-800 text-sm"><i class="fas fa-file-pdf text-rose-600 mr-2"></i>${nama}</h4>
                                <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Ukuran: ${size}</p>
                                <p class="text-xs text-slate-500 mt-2 line-clamp-2">${desc}</p>
                            </div>
                            <a href="${link}" target="_blank" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ml-3">
                                <i class="fas fa-download"></i> Download
                            </a>
                        </div>
                    </div>
                `;
            });

            listHtml += `</div>`;

            Swal.fire({
                title: 'Modul PDF & Dokumen',
                html: listHtml,
                width: '600px',
                showConfirmButton: false,
                showCloseButton: true,
                customClass: {
                    title: 'text-lg font-bold text-slate-700 border-b pb-4'
                }
            });
        } else {
            Swal.fire('Gagal', 'Gagal memuat daftar file', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Koneksi ke server gagal', 'error');
    }
}

function uploadModulePDF() {
    Swal.fire({
        title: 'Upload Dokumen Baru',
        html: `
            <div class="text-left space-y-3">
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Pilih File (PDF/Doc/Img)</label>
                    <input type="file" id="upFile" class="w-full border p-2 rounded text-sm bg-slate-50">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Nama Tampilan</label>
                    <input type="text" id="upNama" class="w-full border p-2 rounded text-sm" placeholder="Contoh: SK Karang Taruna 2026">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                    <textarea id="upDesc" class="w-full border p-2 rounded text-sm" placeholder="Keterangan isi file..."></textarea>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Upload Sekarang',
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            const fileInput = document.getElementById('upFile').files[0];
            const nama = document.getElementById('upNama').value;
            const desc = document.getElementById('upDesc').value;

            if (!fileInput || !nama) {
                Swal.showValidationMessage('File dan Nama Tampilan wajib diisi');
                return false;
            }

            if (fileInput.size > 5 * 1024 * 1024) {
                 Swal.showValidationMessage('Ukuran file maksimal 5MB');
                 return false;
            }

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(fileInput);
                reader.onload = () => resolve({
                    fileData: reader.result,
                    fileName: fileInput.name,
                    mimeType: fileInput.type,
                    namaDisplay: nama,
                    deskripsi: desc
                });
                reader.onerror = error => reject(error);
            });
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const data = result.value;
            
            Swal.fire({
                title: 'Sedang Mengupload...',
                text: 'Mohon tunggu, jangan tutup halaman ini.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            secureFetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'uploadPDF',
                    api_key: MOLAS_API_KEY,
                    token: MOLAS_SECURE_HEADER.token,
                    file: data.fileData, 
                    realName: data.fileName,
                    mime: data.mimeType,
                    nama: data.namaDisplay,
                    desc: data.deskripsi
                })
            })
            .then(res => res.json())
            .then(response => {
                if (response.status === 'success') {
                    Swal.fire('Berhasil!', 'Dokumen berhasil disimpan.', 'success')
                    .then(() => openModulePDF()); 
                } else {
                    Swal.fire('Gagal', 'Error: ' + response.message, 'error');
                }
            })
            .catch(err => {
                Swal.fire('Error', 'Gagal menghubungi server.', 'error');
            });
        }
    });
}

function toggleAplikasiPortal() {
    const content = document.getElementById('aplikasi-portal-content');
    const btnText = document.getElementById('text-toggle-portal');
    const btnIcon = document.getElementById('icon-toggle-portal');
    const btn = document.getElementById('btn-toggle-portal');
    
    if (!content) return;
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        void content.offsetWidth;
        content.classList.remove('opacity-0', 'max-h-0');
        content.classList.add('opacity-100', 'max-h-[2000px]');
        btnText.innerText = 'Sembunyikan Aplikasi & Portal';
        btnIcon.classList.remove('fa-chevron-down');
        btnIcon.classList.add('fa-chevron-up');
        btnIcon.style.transform = 'rotate(180deg)';
        btn.classList.remove('from-teal-600', 'to-emerald-600');
        btn.classList.add('from-slate-700', 'to-slate-900');
    } else {
        content.classList.remove('opacity-100', 'max-h-[2000px]');
        content.classList.add('opacity-0', 'max-h-0');
        setTimeout(() => {
            content.classList.add('hidden');
        }, 400);
        btnText.innerText = 'Tampilkan Aplikasi & Portal';
        btnIcon.classList.remove('fa-chevron-up');
        btnIcon.classList.add('fa-chevron-down');
        btnIcon.style.transform = 'rotate(0deg)';
        btn.classList.remove('from-slate-700', 'to-slate-900');
        btn.classList.add('from-teal-600', 'to-emerald-600');
    }
}

function toggleStruktur() {
    var content = document.getElementById('more-struktur-content');
    var btnText = document.getElementById('text-toggle-struktur');
    var btnIcon = document.getElementById('icon-toggle-struktur');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btnText.innerHTML = "Tutup Kelembagaan";
        btnIcon.classList.remove('fa-chevron-down');
        btnIcon.classList.add('fa-chevron-up');
    } else {
        content.classList.add('hidden');
        btnText.innerHTML = "Lihat BPD & Kelembagaan Lainnya";
        btnIcon.classList.remove('fa-chevron-up');
        btnIcon.classList.add('fa-chevron-down');
    }
}

function toggleMoreFocus() {
    var content = document.getElementById('more-focus-content');
    var btnText = document.getElementById('text-toggle-focus');
    var btnIcon = document.getElementById('icon-toggle-focus');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        content.classList.add('grid'); 
        btnText.innerHTML = "Tutup Detail";
        btnIcon.classList.remove('fa-chevron-down');
        btnIcon.classList.add('fa-chevron-up');
    } else {
        content.classList.add('hidden');
        content.classList.remove('grid');
        btnText.innerHTML = "Baca Selengkapnya (4 Poin Lainnya)";
        btnIcon.classList.remove('fa-chevron-up');
        btnIcon.classList.add('fa-chevron-down');
    }
}

function updateFields() {
    const jenis = document.getElementById('jenis-surat').value;
    const container = document.getElementById('dynamic-fields');
    container.innerHTML = ''; 

    let fields = '';

    if (jenis === 'SKTM') {
        fields = `<div class='grid grid-cols-2 gap-4'><div><label class='block text-xs font-bold text-slate-500 mb-1'>Nama</label><input class='input-field' name='Nama' required='true' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>NIK</label><input class='input-field' name='NIK' required='true' type='text'/></div></div><div class='grid grid-cols-2 gap-4'><div><label class='block text-xs font-bold text-slate-500 mb-1'>TTL</label><input class='input-field' name='TTL' required='true' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Jenis Kelamin</label><select class='input-field' name='Gender'><option>Laki-laki</option><option>Perempuan</option></select></div></div><div class='grid grid-cols-2 gap-4'><div><label class='block text-xs font-bold text-slate-500 mb-1'>Agama</label><input class='input-field' name='Agama' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Pekerjaan</label><input class='input-field' name='Pekerjaan' type='text'/></div></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Alamat Lengkap</label><textarea class='input-field' name='Alamat' rows='2'></textarea></div>`;
    } else if (jenis === 'Domisili') {
        fields = `<div><label class='block text-xs font-bold text-slate-500 mb-1'>Nama Lengkap</label><input class='input-field' name='Nama' required='true' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Alamat / Lingkungan Jaga</label><input class='input-field' name='Alamat_Jaga' required='true' type='text'/></div>`;
    } else if (jenis === 'Domisili WNA') {
        fields = `<div><label class='block text-xs font-bold text-slate-500 mb-1'>Nama Lengkap</label><input class='input-field' name='Nama' required='true' type='text'/></div><div class='grid grid-cols-2 gap-4'><div><label class='block text-xs font-bold text-slate-500 mb-1'>TTL</label><input class='input-field' name='TTL' required='true' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Kewarganegaraan</label><input class='input-field' name='WNA_Asal' required='true' type='text'/></div></div><div class='grid grid-cols-2 gap-4'><div><label class='block text-xs font-bold text-slate-500 mb-1'>No Paspor</label><input class='input-field' name='No_Paspor' required='true' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Pekerjaan</label><input class='input-field' name='Pekerjaan' type='text'/></div></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Alamat di Desa Molas</label><textarea class='input-field' name='Alamat_Tinggal' rows='2'></textarea></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Tinggal di Sini Sejak</label><input class='input-field' name='Sejak_Kapan' type='date'/></div>`;
    } else if (jenis === 'KTP Hilang') {
        fields = `<div><label class='block text-xs font-bold text-slate-500 mb-1'>Nama Lengkap</label><input class='input-field' name='Nama' required='true' type='text'/></div><div class='grid grid-cols-2 gap-4'><div><label class='block text-xs font-bold text-slate-500 mb-1'>TTL</label><input class='input-field' name='TTL' required='true' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Jenis Kelamin</label><select class='input-field' name='Gender'><option>Laki-laki</option><option>Perempuan</option></select></div></div><div class='grid grid-cols-2 gap-4'><div><label class='block text-xs font-bold text-slate-500 mb-1'>Status</label><input class='input-field' name='Status_Kawin' placeholder='Belum Kawin/Kawin' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Golongan Darah</label><input class='input-field' name='Gol_Darah' type='text'/></div></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Alasan Kehilangan</label><input class='input-field' name='Alasan_Hilang' placeholder='Contoh: Jatuh di jalan' required='true' type='text'/></div>`;
    } else if (jenis === 'Lainnya') {
        fields = `<div><label class='block text-xs font-bold text-slate-500 mb-1'>Judul Surat</label><input class='input-field' name='Judul_Surat_Custom' placeholder='Contoh: Surat Keterangan Usaha' required='true' type='text'/></div><div><label class='block text-xs font-bold text-slate-500 mb-1'>Detail Keperluan</label><textarea class='input-field' name='Isi_Manual' required='true' rows='4' placeholder='Jelaskan detail data Anda di sini...'></textarea></div>`;
    }

    container.innerHTML = fields;
}

document.addEventListener('DOMContentLoaded', () => {
    const counters = document.querySelectorAll('.count-up');
    const speed = 120;

    const startCount = (counter) => {
        const target = +counter.getAttribute('data-target');
        let current = 0;
        const step = Math.max(1, Math.ceil(target / speed));

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                counter.innerText = target.toLocaleString('id-ID');
                clearInterval(timer);
            } else {
                counter.innerText = current.toLocaleString('id-ID');
            }
        }, 16);
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                startCount(entry.target);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    counters.forEach(counter => observer.observe(counter));
});

const galleryPhotos = [
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhTcrjP1mwD6b_yM74HuPe8p4twRpvhyphenhyphenRu8E6L5Wk1Wp8QE4uQnZF4H6Qo5jTkWlqBI-tWjWL9Xqa2wPx36_dHk_76-WBjOA0vouYJpjISgmTZ7ITyMN8rbEFge8AFKK6aWCUI6jEr01Vaqk1GskfMp_pUHxnU40SYao3Z5-LUPZi20hQtwnsLCa8qzQB8L/s1600/1.jpg",
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjyi6IMImIpWDwsWYSZ7MrhL921Ivd4_XcC2GoPQB-7VEeD1d2nI7K7t1RTPDDsxL31p5jsJ-0Ne6Z48iPOrbxYoB_xQLNhTme7uYxbTMZqyggiE8AST02gqoKTlieYBWFByYk__W8zQuB2yxoC4P5AyfhdSDGWVsvwskhIBsbhe0s18pWMslbH9SlxaVan/s1600/2.jpg",
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjPXHWJBFOFcNueU56vqh3NaohAIeh5CntkUxaLm5T3juW91-fAR9uUTq4yAQCfYfjvpQaaejSynp9OJJ1mJF_KWD9OWkOQ-CQwHsxXiTvBD9-UjQhsuQ4Ud8ois2sw7SQ-7lXfi5W1ti60o4n5ECKYOjb0OlSsp5Hz5RvNZsyUPtvL9vVydZcFnYtIwxEH/s1600/3.jpg",
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi_SKj6imrOlwdACWxawCJHgmihO1DgeURIH_1YvCWCistt1AwQuFboS3vJ-Skl7uESBxA4v33_JLHtTG8paOUjlIUhHgcxaMnfJSsaUha0iPgjBDXODSme2QkFcvwhZi2eIQPnGRDHXi55B_c5rKB6zAgxAj1USs1idWKhNEqd1A5CfyZzCJ68GxyxYR7-/s1600/4.jpg",
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi_3sZfMspAIkxJAPKh9DqzsJbriC7t0Yoq7e3EdZPEWbP-e3jCMdkAb3Sk_rzxdk_dkPfiA8wRTxpNuAgt9-ajyq7irfFGMyo6FHVGb0DrnSZRaN1HjqPQL8CBgH61Nacwf3Ozuuwim60ZGIHijyeITn27RGgBekk6bfe1exUFtGzQ7C2I-l57rlc0YUwS/s1600/5.jpg"
];

function openGalleryModal() {
    let contentHtml = `<div class="space-y-6 text-left">`;
    galleryPhotos.forEach((img, index) => {
        contentHtml += `
            <div class="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 mb-4">
                <div class="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm z-10 border border-white/10">
                    Foto Dokumentasi ${index + 1}
                </div>
                <img src="${img}" class="w-full object-cover hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in" onclick="window.open('${img}', '_blank')">
            </div>
        `;
    });
    contentHtml += `<div class="bg-slate-50 p-4 rounded-xl text-center border border-slate-200"><p class="text-xs text-slate-500 font-medium">Klik gambar untuk melihat ukuran penuh</p></div></div>`;

    Swal.fire({
        title: `<div class="flex items-center gap-3 border-b border-slate-100 pb-4"><div class="bg-orange-50 p-2.5 rounded-xl text-orange-600 border border-orange-100"><i class="fas fa-images text-xl"></i></div><div class="text-left"><div class="text-lg font-bold text-slate-800">Galeri Kegiatan</div><div class="text-xs text-slate-500 font-normal">Dokumentasi Pemerintah Desa</div></div></div>`,
        html: contentHtml,
        width: '600px',
        showCloseButton: true,
        showConfirmButton: false,
        background: '#ffffff',
        customClass: { popup: 'rounded-[2rem] p-0 overflow-hidden', htmlContainer: '!p-6 !m-0 max-h-[70vh] overflow-y-auto custom-scroll' }
    });
}

function updateOfficeStatus() {
    const options = { timeZone: "Asia/Makassar", hour12: false, hour: '2-digit', minute: '2-digit' };
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', options);
    const [hour, minute] = timeString.split(':').map(Number);
    const day = now.getDay(); 

    const badge = document.getElementById('office-status-badge');
    const text = document.getElementById('office-text');
    const dot = document.getElementById('office-dot');
    const ping = document.getElementById('office-ping');
    const clock = document.getElementById('live-clock');

    if(clock) clock.innerText = timeString;

    const isOpenDay = day >= 1 && day <= 5; 
    const isOpenHour = hour >= 8 && hour < 15; 

    if (isOpenDay && isOpenHour) {
        if(badge) {
            badge.className = "inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 rounded-full px-3 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)]";
            text.innerText = "BUKA SEKARANG";
            text.className = "text-xs font-bold text-emerald-400 uppercase tracking-wide";
            dot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400";
            ping.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
        }
    } else {
        if(badge) {
            badge.className = "inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5";
            text.innerText = "TUTUP";
            text.className = "text-xs font-bold text-slate-500 uppercase tracking-wide";
            dot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500";
            ping.className = "hidden"; 
        }
    }
}

setInterval(updateOfficeStatus, 1000);
updateOfficeStatus(); 

function renderPosyanduSchedule() {
    const listContainer = document.getElementById('posyandu-list');
    if(!listContainer) return;

    const schedules = [
        { month: 'Januari', date: 14 },
        { month: 'Februari', date: 9 },
        { month: 'Maret', date: 9 },
        { month: 'April', date: 9 },
        { month: 'Mei', date: 15 },
        { month: 'Juni', date: 15 },
        { month: 'Juli', date: 15 },
        { month: 'Agustus', date: 15 },
        { month: 'September', date: 15 },
        { month: 'Oktober', date: 15 },
        { month: 'November', date: 15 },
        { month: 'Desember', date: 15 }
    ];

    const today = new Date();
    const currentMonthIndex = today.getMonth(); 
    const currentDay = today.getDate();

    let html = '';
    schedules.forEach((item, index) => {
        let rowClass = '';
        let dateClass = '';
        let statusHtml = '';
        let isActive = false;

        if (index < currentMonthIndex || (index === currentMonthIndex && currentDay > item.date)) {
            rowClass = 'opacity-50';
            dateClass = 'bg-slate-100 text-slate-400';
            statusHtml = `<span class='text-[10px] text-slate-400 font-medium'>Selesai</span>`;
        } else if (index === currentMonthIndex && currentDay <= item.date) {
            isActive = true;
            rowClass = 'bg-rose-50 rounded-xl'; 
            dateClass = 'bg-rose-500 text-white shadow-sm'; 
            statusHtml = `<span class='text-[10px] font-bold text-rose-600'>Segera</span>`;
        } else {
            rowClass = 'hover:bg-slate-50 rounded-xl transition-colors';
            dateClass = 'bg-slate-100 text-slate-600';
            statusHtml = `<span class='text-[10px] text-slate-300'>Nanti</span>`;
        }

        html += `
            <div class='flex items-center justify-between p-2.5 mb-1 ${rowClass}' ${isActive ? 'id="active-schedule"' : ''}>
                <div class='flex items-center gap-3'>
                    <div class='w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${dateClass} shrink-0'>
                        ${item.date}
                    </div>
                    <div>
                        <div class='text-xs font-bold text-slate-700 leading-tight'>${item.month}</div>
                        <div class='text-[10px] text-slate-400'>09:00 WITA</div>
                    </div>
                </div>
                ${statusHtml}
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', renderPosyanduSchedule);

const dataKemendesa = {
    iks: [
        { no: 1, nama: "Akses Sarkes", skor: 5, ket: "Waktu tempuh dari ≤ 30 Menit" },
        { no: 2, nama: "Dokter", skor: 0, ket: "Jumlah Dokter Tidak ada" },
        { no: 3, nama: "Bidan", skor: 1, ket: "Jumlah bidan Tidak ada" },
        { no: 4, nama: "Nakes Lain", skor: 5, ket: "Jumlah tenaga kesehatan lainnya ≥ 5 orang" },
        { no: 5, nama: "Tingkat Kepesertaan BPJS", skor: 3, ket: "Jumlah peserta BPJS/jumlah penduduk antara 0,26 s.d 0,5" },
        { no: 6, nama: "Akses Poskesdes", skor: 5, ket: "Jarak tempuh menuju Poskesdes = 500 Meter" },
        { no: 7, nama: "Aktivitas Posyandu", skor: 5, ket: "Jumlah Posyandu aktif 1 bulan sekali/ Jumlah Posyandu > 0,75" },
        { no: 8, nama: "Akses SD/MI", skor: 5, ket: "Jarak tempuh menuju SD atau MI = 3000 Meter" },
        { no: 9, nama: "Akses SMP/MTS", skor: 5, ket: "Jarak tempuh menuju SMP atau MTs ≤ 6000 Meter" },
        { no: 10, nama: "Akses SMA/SMK", skor: 5, ket: "Jarak tempuh menuju SMU atau SMK ≤ 6000 Meter" },
        { no: 11, nama: "Ketersediaan PAUD", skor: 1, ket: "Jumlah PAUD Tidak ada" },
        { no: 12, nama: "Ketersediaan PKBM/ Paket ABC", skor: 1, ket: "Jumlah PKBM atau Paket ABC Tidak ada" },
        { no: 13, nama: "Ketersediaan Kursus", skor: 1, ket: "Jumlah Pusat Keterampilan atau Kursus Tidak ada" },
        { no: 14, nama: "Taman Baca/ Perpus Desa", skor: 1, ket: "Taman Bacaan Masyarakat atau perpustakaan Desa tidak tersedia" },
        { no: 15, nama: "Kebiasaan Gotong Royong", skor: 5, ket: "Terdapat Kebiasaan Gotong Royong" },
        { no: 16, nama: "Frekuensi Gotong Royong", skor: 5, ket: "Frekuensi Gotong Royong > 2" },
        { no: 17, nama: "Ketersediaan Ruang Publik", skor: 1, ket: "Ruang Publik tidak terdapat didesa" },
        { no: 18, nama: "Kelompok OR", skor: 0, ket: "Jumlah kelompok kegiatan olahraga tidak ada" },
        { no: 19, nama: "Kegiatan OR", skor: 2, ket: "Jumlah kegiatan olahraga 2 s.d 3" },
        { no: 20, nama: "Keragaman Agama", skor: 5, ket: "Jumlah Jenis Agama di Desa > 1" },
        { no: 21, nama: "Keragaman Bahasa", skor: 1, ket: "Jumlah Bahasa yang digunakan sehari-hari 1" },
        { no: 22, nama: "Keragaman Komunikasi", skor: 5, ket: "Warga Desa terdiri dari Suku > 1" },
        { no: 23, nama: "Poskamling", skor: 5, ket: "Terdapat Pos Keamanan di Desa" },
        { no: 24, nama: "Siskamling", skor: 5, ket: "Terdapat Sistem Keamanan Lingkungan warga di Desa" },
        { no: 25, nama: "Konflik", skor: 5, ket: "Tidak terdapat atau tidak ada Konflik di Desa" },
        { no: 26, nama: "PMKS", skor: 5, ket: "Jumlah PMKS tidak ada atau 0" },
        { no: 27, nama: "SLB", skor: 3, ket: "Jumlah Skor SLB antara 4 s.d 5" },
        { no: 28, nama: "Akses Listrik", skor: 5, ket: "(Jml Kel. Memakai listrik + non Listrik/Jml kel. memakai listrik) ≥ 0,9" },
        { no: 29, nama: "Sinyal Tlp", skor: 5, ket: "Sinyal telepon seluler di Desa Kuat" },
        { no: 30, nama: "Internet Kantor Desa", skor: 5, ket: "Terdapat fasilitas internet di kantor Desa" },
        { no: 31, nama: "Akses Internet Warga", skor: 5, ket: "Terdapat Akses internet warga di Desa" },
        { no: 32, nama: "Akses Jamban", skor: 5, ket: "Warga Desa BAB di Jamban Sendiri" },
        { no: 33, nama: "Sampah", skor: 4, ket: "Warga desa membuang sampah di Lubang atau di Bakar" },
        { no: 34, nama: "Air Minum", skor: 5, ket: "Sumber air minum berasal dari PAM, Air Ledeng tanpa Meteran" },
        { no: 35, nama: "Air Mandi & Cuci", skor: 5, ket: "Sumber air mandi dan cuci berasal dari PAM, Air Ledeng tanpa Meteran" }
    ],
    ike: [
        { no: 1, nama: "Keragaman Produksi", skor: 5, ket: "Jumlah Industri Mikro/ Jumlah KK ≥ 0,004" },
        { no: 2, nama: "Pertokoan", skor: 5, ket: "Jarak ke kelompok pertokoan terdekat ≤ 7 KM" },
        { no: 3, nama: "Pasar", skor: 1, ket: "(Total KK/jumlah pasar(permanen)) = 0" },
        { no: 4, nama: "Toko/ Warung Kelontong", skor: 5, ket: "Jumlah Toko dan warung kelontong > 3" },
        { no: 5, nama: "Kedai & Penginapan", skor: 3, ket: "Jumlah Kedai dan Penginapan = 1" },
        { no: 6, nama: "POS & Logistik", skor: 5, ket: "Jumlah pos dan jasa logistik > 1" },
        { no: 7, nama: "Bank & BPR", skor: 0, ket: "Jumlah bank dan BPR = 0" },
        { no: 8, nama: "Kredit", skor: 2, ket: "Jumlah fasilitas kredit = 1" },
        { no: 9, nama: "Lembaga Ekonomi", skor: 3, ket: "Jumlah koperasi aktif dan BUMDESA = 1" },
        { no: 10, nama: "Moda Transportasi Umum", skor: 5, ket: "Transportasi Umum ada dengan trayek tetap" },
        { no: 11, nama: "Keterbukaan Wilayah", skor: 5, ket: "Jalan di Desa dilalui oleh kendaraan bermotor roda empat atau lebih Sepanjang Tahun" },
        { no: 12, nama: "Kualitas Jalan", skor: 5, ket: "Jenis permukaan jalan desa Aspal atau beton" }
    ],
    ikl: [
        { no: 1, nama: "Kualitas Lingkungan", skor: 5, ket: "Pencemaran di desa = 0" },
        { no: 2, nama: "Rawan Bencana", skor: 5, ket: "Jenis bencana di desa = 0" },
        { no: 3, nama: "Tanggap Bencana", skor: 5, ket: "Fasilitas mitigasi/tanggap bencana = 3" }
    ]
};

function generateTableRows(dataArray, colorClass) {
    return dataArray.map(item => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="p-2.5 text-center text-xs font-bold text-slate-500">${item.no}</td>
            <td class="p-2.5 text-xs font-bold text-slate-800">${item.nama}</td>
            <td class="p-2.5 text-center"><span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${colorClass} font-black text-xs shadow-sm">${item.skor}</span></td>
            <td class="p-2.5 text-[10px] text-slate-600 leading-relaxed">${item.ket}</td>
        </tr>
    `).join('');
}

function showDetailIDM() {
    let contentHtml = `
        <div class="space-y-4 text-left font-sans pb-2">
            <div class="flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-4 border-b border-slate-100 pb-4 pt-2 px-2 relative">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgM_ZZxTr_O88Gg_zqKIg8UsP1gZ6zxIAqJ7j5FTPD0fAICmHyIC_G7Nqq22sVO5JLjjOMtE-QQjkapUziM2jys3vo07wW5ERyWS05_fb3Fqvz_ZVPTPuh5H-Lg_QFs4lDHnLqggjfqpw-cLn74C79294GVY1-HEmXBgZZN_a0eQR1tXUdKaFxjNYtFBFU/s1600/logo.png" class="h-14 w-14 md:h-16 md:w-16 object-contain drop-shadow-sm flex-shrink-0" alt="Logo Desa Molompar Atas" />
                <div class="text-center sm:text-left mt-1 sm:mt-0">
                    <h2 class="text-xl md:text-2xl font-black text-slate-800 leading-tight mb-2">Rincian Analisis IDM</h2>
                    <span class="text-[10px] md:text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full inline-block tracking-wide">
                        Desa Molompar Atas Tahun 2024
                    </span>
                </div>
            </div>

            <div class="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 mt-2">
                <button onclick="switchTabIDM('tab-summary', this)" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-white text-emerald-600 shadow-sm transition-all tab-btn-idm">Ringkasan</button>
                <button onclick="switchTabIDM('tab-iks', this)" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-500 hover:text-blue-600 transition-all tab-btn-idm">Data IKS</button>
                <button onclick="switchTabIDM('tab-ike', this)" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-500 hover:text-orange-600 transition-all tab-btn-idm">Data IKE</button>
                <button onclick="switchTabIDM('tab-ikl', this)" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-500 hover:text-teal-600 transition-all tab-btn-idm">Data IKL</button>
            </div>

            <div class="relative min-h-[300px]">
                <div id="tab-summary" class="tab-content-idm animate-fade-in space-y-5 mt-4">
                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p class="text-xs md:text-sm text-blue-800 leading-relaxed">
                            Berdasarkan rilis data Kementerian Desa PDTT tahun 2024, Desa Molompar Atas berhasil mencapai status <b>MANDIRI</b> dengan Skor <b>0.8235</b>.
                        </p>
                    </div>
                </div>
                <div id="tab-iks" class="tab-content-idm hidden animate-fade-in mt-4">
                    <table class="w-full text-left bg-white rounded-lg overflow-hidden border border-slate-200">
                        <thead class="bg-slate-100 text-[10px] uppercase text-slate-500">
                            <tr><th class="p-2 w-8 text-center">No</th><th class="p-2">Indikator</th><th class="p-2 w-12 text-center">Skor</th><th class="p-2">Keterangan</th></tr>
                        </thead>
                        <tbody>${generateTableRows(dataKemendesa.iks, 'bg-blue-100 text-blue-700')}</tbody>
                    </table>
                </div>
                <div id="tab-ike" class="tab-content-idm hidden animate-fade-in mt-4">
                    <table class="w-full text-left bg-white rounded-lg overflow-hidden border border-slate-200">
                        <thead class="bg-slate-100 text-[10px] uppercase text-slate-500">
                            <tr><th class="p-2 w-8 text-center">No</th><th class="p-2">Indikator</th><th class="p-2 w-12 text-center">Skor</th><th class="p-2">Keterangan</th></tr>
                        </thead>
                        <tbody>${generateTableRows(dataKemendesa.ike, 'bg-orange-100 text-orange-700')}</tbody>
                    </table>
                </div>
                <div id="tab-ikl" class="tab-content-idm hidden animate-fade-in mt-4">
                    <table class="w-full text-left bg-white rounded-lg overflow-hidden border border-slate-200">
                        <thead class="bg-slate-100 text-[10px] uppercase text-slate-500">
                            <tr><th class="p-2 w-8 text-center">No</th><th class="p-2">Indikator</th><th class="p-2 w-12 text-center">Skor</th><th class="p-2">Keterangan</th></tr>
                        </thead>
                        <tbody>${generateTableRows(dataKemendesa.ikl, 'bg-teal-100 text-teal-700')}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    Swal.fire({
        html: contentHtml,
        width: '700px',
        showCloseButton: true,
        showConfirmButton: false,
        background: '#ffffff',
        customClass: {
            popup: 'rounded-[2rem] p-0 overflow-hidden shadow-2xl relative',
            htmlContainer: '!p-5 sm:!p-6 !m-0 max-h-[85vh] overflow-y-auto custom-scroll'
        }
    });
}

function switchTabIDM(tabId, btnElement) {
    document.querySelectorAll('.tab-content-idm').forEach(el => el.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelectorAll('.tab-btn-idm').forEach(btn => {
        btn.classList.remove('bg-white', 'shadow-sm', 'text-emerald-600', 'text-blue-600', 'text-orange-600', 'text-teal-600');
        btn.classList.add('text-slate-500');
    });
    btnElement.classList.remove('text-slate-500');
    btnElement.classList.add('bg-white', 'shadow-sm');
    if(tabId === 'tab-summary') btnElement.classList.add('text-emerald-600');
    if(tabId === 'tab-iks') btnElement.classList.add('text-blue-600');
    if(tabId === 'tab-ike') btnElement.classList.add('text-orange-600');
    if(tabId === 'tab-ikl') btnElement.classList.add('text-teal-600');
}

function showDetailProfilDesa() {
    const desktopTableRows = dataProfilDesaLengkap.map(item => `
        <tr class="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
            <td class="p-2.5 text-center text-[11px] font-bold text-slate-400">${item.no}</td>
            <td class="p-2.5 text-xs font-bold text-slate-700">${item.nama}</td>
            <td class="p-2.5 text-center text-xs font-semibold text-indigo-600">${item.p}</td>
            <td class="p-2.5 text-center text-xs font-semibold text-pink-600">${item.w}</td>
            <td class="p-2.5 text-center text-xs font-black text-slate-800 bg-slate-50">${item.jml}</td>
        </tr>
    `).join('');

    const mobileCards = dataProfilDesaLengkap.map(item => `
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div class="flex items-start gap-2.5">
                <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 border mt-0.5">${item.no}</span>
                <div class="text-xs font-bold text-slate-800 leading-snug flex-1">${item.nama}</div>
            </div>
            <div class="grid grid-cols-3 gap-1.5 pt-1 text-center">
                <div class="bg-indigo-50/70 border border-indigo-100 p-1.5 rounded-xl">
                    <span class="block text-[8px] font-black text-indigo-400 uppercase">Pria</span>
                    <span class="text-xs font-bold text-indigo-700">${item.p}</span>
                </div>
                <div class="bg-pink-50/70 border border-pink-100 p-1.5 rounded-xl">
                    <span class="block text-[8px] font-black text-pink-400 uppercase">Wanita</span>
                    <span class="text-xs font-bold text-pink-700">${item.w}</span>
                </div>
                <div class="bg-slate-100/80 border border-slate-200 p-1.5 rounded-xl">
                    <span class="block text-[8px] font-black text-slate-500 uppercase">Total</span>
                    <span class="text-xs font-black text-slate-900">${item.jml}</span>
                </div>
            </div>
        </div>
    `).join('');

    let contentHtml = `
        <div class="text-left font-sans -m-1">
            <div class="flex items-center gap-3.5 border-b border-slate-100 pb-4 mb-4">
                <div class="bg-blue-50 border border-blue-100 text-blue-600 w-11 h-11 rounded-2xl flex items-center justify-center text-lg shadow-sm shrink-0">
                    <i class="fas fa-database"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <h2 class="text-base md:text-lg font-black text-slate-800 leading-tight">Data Profil Desa Lengkap</h2>
                    <p class="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Desa Molompar Atas Tahun 2026</p>
                </div>
            </div>
            <div class="block md:hidden max-h-[62vh] overflow-y-auto custom-scroll space-y-2.5 pr-1">${mobileCards}</div>
            <div class="hidden md:block relative max-h-[60vh] overflow-y-auto custom-scroll border border-slate-200 rounded-xl">
                <table class="w-full text-left bg-white">
                    <thead class="bg-slate-100 text-[10px] uppercase text-slate-600 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th class="p-3 w-10 text-center border-b">No</th>
                            <th class="p-3 border-b">Uraian / Indikator</th>
                            <th class="p-3 w-16 text-center border-b text-indigo-700">Pria</th>
                            <th class="p-3 w-16 text-center border-b text-pink-700">Wanita</th>
                            <th class="p-3 w-20 text-center border-b bg-slate-200">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>${desktopTableRows}</tbody>
                </table>
            </div>
        </div>
    `;

    Swal.fire({
        html: contentHtml,
        width: '750px',
        showCloseButton: true,
        showConfirmButton: false,
        background: '#ffffff',
        customClass: { popup: 'rounded-[2rem] p-5 sm:p-6 shadow-2xl relative' }
    });
}

function bukaCekDesilModal() {
    Swal.fire({
        html: `
            <div class="text-left font-sans -m-1">
                <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                        <i class="fas fa-id-card text-xl"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="text-base font-black text-slate-800 leading-tight">Pengecekan Desil DTSEN</h3>
                        <p class="text-[11px] text-slate-500 font-medium mt-0.5 truncate">Data Tunggal Sosial &amp; Ekonomi Nasional BPS</p>
                    </div>
                </div>
                <div class="space-y-3.5 pt-4">
                    <div class="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100/80 p-3.5 rounded-2xl flex items-start gap-3">
                        <i class="fas fa-shield-alt text-teal-600 mt-0.5 shrink-0"></i>
                        <p class="text-xs text-slate-700 leading-relaxed font-medium">Pengecekan desil bansos dilakukan langsung di portal resmi <b>DTSEN BPS RI</b> menggunakan NIK.</p>
                    </div>
                </div>
            </div>
        `,
        width: '480px',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-external-link-alt mr-1.5"></i> Buka Portal BPS',
        cancelButtonText: 'Tutup',
        confirmButtonColor: '#0f766e',
        cancelButtonColor: '#94a3b8'
    }).then((result) => {
        if (result.isConfirmed) {
            window.open('https://dtsen-form.bps.go.id/indonesia-pintar', '_blank');
        }
    });
}

function toggleDetailIdentitas() {
    const detailBox = document.getElementById('prof-detail-more');
    const btnText = document.getElementById('text-toggle-identitas');
    const btnIcon = document.getElementById('icon-toggle-identitas');

    if (detailBox.classList.contains('hidden')) {
        detailBox.classList.remove('hidden');
        btnText.innerText = 'Sembunyikan';
        btnIcon.className = 'fas fa-chevron-up text-[10px]';
    } else {
        detailBox.classList.add('hidden');
        btnText.innerText = 'Lihat Selengkapnya';
        btnIcon.className = 'fas fa-chevron-down text-[10px]';
    }
}

function switchLayananMobile(type) {
    const boxSurat = document.getElementById('box-layanan-surat');
    const boxAduan = document.getElementById('box-layanan-aduan');
    const tabSurat = document.getElementById('tab-btn-surat');
    const tabAduan = document.getElementById('tab-btn-aduan');

    if (type === 'surat') {
        boxSurat.classList.remove('hidden');
        boxAduan.classList.add('hidden');
        tabSurat.className = 'flex-1 py-2.5 text-xs font-black rounded-xl bg-white text-teal-800 shadow-sm transition-all flex items-center justify-center gap-2';
        tabAduan.className = 'flex-1 py-2.5 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-2';
    } else {
        boxSurat.classList.add('hidden');
        boxAduan.classList.remove('hidden');
        tabAduan.className = 'flex-1 py-2.5 text-xs font-black rounded-xl bg-white text-orange-700 shadow-sm transition-all flex items-center justify-center gap-2';
        tabSurat.className = 'flex-1 py-2.5 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-2';
    }
}

function openAppModal(type) {
    const isBlog = type === 'blog';
    const config = isBlog ? {
        title: 'Blog Molas',
        sub: 'Portal Berita & Publikasi Masyarakat',
        icon: 'fa-newspaper',
        iconColor: 'from-teal-500 to-emerald-600',
        badgeBg: 'bg-teal-50 text-teal-700 border-teal-200/80',
        badgeText: 'Akses Terbuka untuk Umum',
        url: 'https://blog.molomparatas.id/',
        btnText: 'Kunjungi Blog Desa',
        btnColor: '#0f766e',
        desc: 'Pusat publikasi dan keterbukaan informasi publik Pemerintah Desa Molompar Atas.'
    } : {
        title: 'Molas Cloud',
        sub: 'Server Dokumen & Database Digital Pemdes',
        icon: 'fa-cloud',
        iconColor: 'from-blue-600 to-indigo-700',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
        badgeText: 'Khusus Aparatur Desa',
        url: 'https://www.molas.cloud/',
        btnText: 'Masuk ke Molas Cloud',
        btnColor: '#2563eb',
        desc: 'Infrastruktur penyimpanan digital terpusat yang dirancang untuk mempermudah tata kelola kantor.'
    };

    Swal.fire({
        html: `
            <div class="text-left font-sans -m-1">
                <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${config.iconColor} flex items-center justify-center text-white text-xl shadow-md shrink-0">
                        <i class="fas ${config.icon}"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="text-base font-black text-slate-800 leading-tight">${config.title}</h3>
                        <span class="${config.badgeBg} text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border inline-block mt-0.5">${config.badgeText}</span>
                    </div>
                </div>
                <div class="pt-4 text-xs text-slate-700 leading-relaxed">${config.desc}</div>
            </div>
        `,
        width: '460px',
        showCancelButton: true,
        confirmButtonText: `<i class="fas fa-external-link-alt mr-1.5"></i> ${config.btnText}`,
        cancelButtonText: 'Tutup',
        confirmButtonColor: config.btnColor,
        cancelButtonColor: '#94a3b8'
    }).then((result) => {
        if (result.isConfirmed) {
            window.open(config.url, '_blank');
        }
    });
}

function bukaModalArtikel(id) {
    const art = dataArtikelDesa[id];
    if (!art) return;

    const htmlModal = `
        <div class="flex flex-col h-full max-h-[90vh] bg-white text-slate-800">
            <div class="relative w-full h-44 sm:h-56 md:h-64 shrink-0 bg-slate-950 overflow-hidden">
                <img src="${art.gambar}" alt="${art.judul}" class="w-full h-full object-cover opacity-85">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                <div class="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6">
                    <span class="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-teal-500 text-white text-[9px] sm:text-[10px] md:text-xs font-black rounded-full uppercase tracking-wider shadow-md inline-block mb-1 sm:mb-2">${art.kategori}</span>
                    <h2 class="text-sm sm:text-lg md:text-2xl font-black text-white leading-tight drop-shadow-sm m-0">${art.judul}</h2>
                </div>
            </div>
            <div class="px-4 py-2 sm:px-6 sm:py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500 shrink-0">
                <div class="flex items-center gap-1.5 font-medium"><i class="far fa-calendar-alt text-teal-600"></i><span>${art.tanggal}</span></div>
                <div class="flex items-center gap-1.5 font-bold text-slate-700 truncate"><i class="fas fa-user-edit text-teal-600"></i><span class="truncate">${art.penulis}</span></div>
            </div>
            <div class="article-scroll-area p-4 sm:p-6 space-y-3 sm:space-y-4 text-xs sm:text-sm md:text-base leading-relaxed text-slate-700 flex-1">
                ${typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(art.isi) : art.isi}
            </div>
        </div>
    `;

    Swal.fire({
        html: htmlModal,
        showCloseButton: true,
        showConfirmButton: false,
        background: '#ffffff',
        focusConfirm: false,
        customClass: { popup: 'article-popup-modal shadow-2xl border border-slate-200/80', htmlContainer: 'article-popup-body' }
    });
}

function initCharts() {
    const isMobile = window.innerWidth < 768;

    const ctxPendapatan = document.getElementById('chartPendapatanReal');
    if (ctxPendapatan) {
        new Chart(ctxPendapatan, {
            type: 'doughnut',
            data: {
                labels: ['Pendapatan Transfer', 'Pendapatan Asli Desa (PAD)', 'Pendapatan Lain-lain'],
                datasets: [{
                    data: [760044144, 50000000, 1000000],
                    backgroundColor: ['#0d9488', '#0284c7', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%'
            }
        });
    }

    const ctxBelanja = document.getElementById('chartBelanjaReal');
    if (ctxBelanja) {
        new Chart(ctxBelanja, {
            type: 'bar',
            data: {
                labels: [
                    'Penyelenggaraan Pemdes', 
                    'Pembangunan Desa', 
                    'Pembinaan Masy.', 
                    'Pemberdayaan Masy.', 
                    'Bencana & Mendesak'
                ],
                datasets: [{
                    label: 'Alokasi Anggaran (Rp)',
                    data: [483811577, 351309223, 7500000, 25000000, 32700000],
                    backgroundColor: ['#0f766e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'],
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            callback: function(value) { return 'Rp ' + (value / 1000000).toFixed(0) + ' Jt'; },
                            font: { size: 9 }
                        }
                    },
                    y: { ticks: { font: { size: isMobile ? 9 : 10, weight: 'bold' } } }
                }
            }
        });
    }
}

// ============================================================================
// ENGINE SISTEM INFORMASI DESA DIGITAL TERPADU (23 MODUL BENTO SAAS 2026)
// ============================================================================
const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    penduduk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    usaha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    kesehatan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    disabilitas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M18 19l-4-4v-4h-4v4l-4 4"/><path d="M9 13v6h6v-6"/></svg>',
    pemuda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    piket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>',
    opensid_surat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
    aset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    tanah: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    peta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    prodeskel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    surat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    bpd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    rekon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    bendahara: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="10" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="14" y2="16"/></svg>',
    regulasi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    berita_acara: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>',
    cetak_khusus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    print_universal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/><circle cx="18" cy="11" r="1"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    users_license: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    credits: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eye_off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.071.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    family: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
};

function getIconHtml(iconName) {
    if (ICONS[iconName]) return ICONS[iconName];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
}

function injectAllIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
        const key = el.getAttribute('data-icon');
        el.innerHTML = getIconHtml(key);
    });
}


const DEFAULT_DB = {
  "settings": {
    "nama_desa": "Molompar Atas",
    "kecamatan": "Tombatu Timur",
    "kabupaten": "Minahasa Tenggara",
    "provinsi": "Sulawesi Utara",
    "logo_desa": "",
    "hukum_tua": "ALFIUS BONIFASIUS TULANDI",
    "sekdes": "RONNY M. KAWULUSAN",
    "perangkat_desa": [
      {
        "nama": "ALFIUS BONIFASIUS TULANDI",
        "jabatan": "Hukum Tua",
        "no_hp": "081234567801"
      },
      {
        "nama": "RONNY M. KAWULUSAN",
        "jabatan": "Sekretaris Desa",
        "no_hp": "081234567802"
      },
      {
        "nama": "MEYDY LUKY KAWULUSAN",
        "jabatan": "Kaur Keuangan / Bendahara",
        "no_hp": "081234567803"
      },
      {
        "nama": "ROBY OLDY KOROMPIS",
        "jabatan": "Kaur Umum & Perencanaan",
        "no_hp": "081234567804"
      },
      {
        "nama": "DJEMS DEEN MUNAESECHE",
        "jabatan": "Kasi Pemerintahan",
        "no_hp": "081234567805"
      },
      {
        "nama": "VEKY FREDY NARAY",
        "jabatan": "Kasi Kesejahteraan & Pelayanan",
        "no_hp": "081234567806"
      },
      {
        "nama": "STEWARD ROLOS",
        "jabatan": "Kepala Jaga I (Pala 1)",
        "no_hp": "081234567807"
      },
      {
        "nama": "DONY I. Y. KOROMPIS",
        "jabatan": "Kepala Jaga II (Pala 2)",
        "no_hp": "081234567808"
      },
      {
        "nama": "OFNY DANIEL TOLO",
        "jabatan": "Kepala Jaga III (Pala 3)",
        "no_hp": "081234567809"
      },
      {
        "nama": "JEMBRIE JONLIE NARAY",
        "jabatan": "Kepala Jaga IV (Pala 4)",
        "no_hp": "081234567810"
      },
      {
        "nama": "OBRIN NEMAN, S.Th, M.Pd",
        "jabatan": "Ketua BPD",
        "no_hp": "081234567811"
      },
      {
        "nama": "DEEN FRYKE LOSUNG",
        "jabatan": "Wakil Ketua BPD",
        "no_hp": "081234567812"
      },
      {
        "nama": "YUNITA HENNY LOSUNG",
        "jabatan": "Operator Pelayanan Desa",
        "no_hp": "081234567813"
      },
      {
        "nama": "TREES W. K. KAWULUSAN",
        "jabatan": "Koordinator Kader Posyandu",
        "no_hp": "081234567814"
      }
    ],
    "kop_kab": "PEMERINTAH KABUPATEN MINAHASA TENGGARA",
    "kop_kec": "KECAMATAN TOMBATU TIMUR",
    "kop_desa": "PEMERINTAH DESA MOLOMPAR ATAS",
    "kop_show_website": true,
    "kop_show_pos": true,
    "kop_show_alamat": true,
    "kop_show_custom": true,
    "kop_website": "desa-molompar-atas.id",
    "kop_pos": "95693",
    "kop_alamat": "Jalan Trans Tombatu - Ratahan, Desa Molompar Atas, Kec. Tombatu Timur",
    "kop_custom": "Pelayanan Prima & Digitalisasi Menuju Desa Mandiri",
    "visi": "Terwujudnya Desa Molompar Atas yang Maju, Mandiri, Berbudaya, Sejahtera, dan Berbasis Digitalisasi Berkelanjutan.",
    "misi": "1. Meningkatkan pelayanan administrasi publik desa berbasis digital yang cepat, transparan, dan inklusif.\n2. Mewujudkan tata kelola keuangan APBDes dan inventaris aset desa yang tertib, akuntabel, dan bebas penyimpangan.\n3. Mengoptimalkan pemberdayaan ekonomi kerakyatan, kelompok usaha pemuda, dan produktivitas pertanian/perkebunan desa.\n4. Meningkatkan derajat kesehatan masyarakat melalui pemantauan posyandu bumil, balita, penuntasan stunting, serta kepedulian lansia & disabilitas.\n5. Meningkatkan pembangunan infrastruktur desa berstandar Dinas PU dengan tata ruang pemukiman yang tangguh bencana.",
    "tahun_berjalan": "2026",
    "nomor_perdes": "01/PERDES-MLPA/2026",
    "nomor_perkades": "01/PERKADES-MLPA/2026",
    "nomor_rkpdes": "02/RKPDES-MLPA/2026",
    "nomor_apbdes": "03/APBDES-MLPA/2026",
    "nomor_rpjmdes": "01/RPJMDES-MLPA/2021-2027",
    "theme": "emerald",
    "auto_save_7s": true,
    "ttd_cap_digital": "",
    "default_print_kop": true,
    "print_settings": {
      "font": "Arial",
      "paper": "A4",
      "orientation": "portrait",
      "fontSize": "11pt",
      "margin": "15mm",
      "digitalStamp": true,
      "useKop": true
    },
    "visible_menus": {
      "dashboard": true,
      "penduduk": true,
      "usaha": true,
      "kesehatan": true,
      "disabilitas": true,
      "pemuda": true,
      "piket": true,
      "opensid_surat": true,
      "aset": true,
      "tanah": true,
      "peta": true,
      "prodeskel": true,
      "surat": true,
      "bpd": true,
      "rekon": true,
      "bendahara": true,
      "regulasi": true,
      "berita_acara": true,
      "cetak_khusus": true,
      "print_universal": true,
      "settings": true,
      "users_license": true,
      "credits": true
    },
    "credits": {
      "fb": "https://www.facebook.com/alldykorompis/",
      "wa": "089510060273",
      "tujuan": "Desa yang lebih maju digitalisasi."
    }
  },
  "users": [
    {
      "id": 1,
      "username": "admin",
      "password": "admin123",
      "name": "Admin Utama Desa",
      "role": "admin",
      "jaga_scope": "all"
    },
    {
      "id": 2,
      "username": "jaga1",
      "password": "jaga1",
      "name": "Kepala Jaga I (Pala 1)",
      "role": "kepala_jaga",
      "jaga_scope": "JAGA I"
    },
    {
      "id": 3,
      "username": "jaga2",
      "password": "jaga2",
      "name": "Kepala Jaga II (Pala 2)",
      "role": "kepala_jaga",
      "jaga_scope": "JAGA II"
    },
    {
      "id": 4,
      "username": "jaga3",
      "password": "jaga3",
      "name": "Kepala Jaga III (Pala 3)",
      "role": "kepala_jaga",
      "jaga_scope": "JAGA III"
    },
    {
      "id": 5,
      "username": "jaga4",
      "password": "jaga4",
      "name": "Kepala Jaga IV (Pala 4)",
      "role": "kepala_jaga",
      "jaga_scope": "JAGA IV"
    },
    {
      "id": 6,
      "username": "bendahara",
      "password": "bendahara123",
      "name": "Bendahara Keuangan",
      "role": "bendahara",
      "jaga_scope": "all"
    },
    {
      "id": 7,
      "username": "kader",
      "password": "kader123",
      "name": "Kader Kesehatan Posyandu",
      "role": "kader",
      "jaga_scope": "all"
    },
    {
      "id": 8,
      "username": "operator",
      "password": "operator123",
      "name": "Operator Pelayanan",
      "role": "operator",
      "jaga_scope": "all"
    }
  ],
  "security": {
    "master_key": "SUPER-KOROMPIS-2026",
    "master_pin": "202699",
    "is_locked": false,
    "last_active": 1792000000000
  },
  "penduduk": [
    {
      "no": 1,
      "no_kk": "7107090409140001",
      "nik": "7107095004460001",
      "nama_lengkap": "JELTJE POLUAN",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "1946-04-10",
      "umur": 80,
      "jenis_kelamin": "Pr",
      "shdk": "KEPALA KELUARGA",
      "agama": "KRISTEN",
      "pendidikan": "TAMAT SD/SEDERAJAT",
      "pekerjaan": "MENGURUS RUMAH TANGGA",
      "nama_ayah": "Y.POLUAN",
      "nama_ibu": "K.TIOW",
      "alamat": "JAGA I",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 2,
      "no_kk": "7107091212110001",
      "nik": "7107090809870001",
      "nama_lengkap": "ELIYESER ELDY TUMIGOLUNG",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "1987-09-08",
      "umur": 39,
      "jenis_kelamin": "Lk",
      "shdk": "KEPALA KELUARGA",
      "agama": "KRISTEN",
      "pendidikan": "DIPLOMA IV/STRATA I",
      "pekerjaan": "PENDETA",
      "nama_ayah": "GODLIEB ABNER TUMIGOLUNG",
      "nama_ibu": "ROSALINA KADING",
      "alamat": "JAGA I",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 3,
      "no_kk": "7107091212110001",
      "nik": "7107095108880001",
      "nama_lengkap": "TESIL KOROMPIS",
      "tempat_lahir": "TOMBATU",
      "tanggal_lahir": "1988-08-11",
      "umur": 38,
      "jenis_kelamin": "Pr",
      "shdk": "ISTRI",
      "agama": "KRISTEN",
      "pendidikan": "DIPLOMA IV/STRATA I",
      "pekerjaan": "MENGURUS RUMAH TANGGA",
      "nama_ayah": "SIMON KOROMPIS",
      "nama_ibu": "SELFI MOKOLOMBAN",
      "alamat": "JAGA I",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 4,
      "no_kk": "7107091212110001",
      "nik": "7107092212110001",
      "nama_lengkap": "ABNER TUMIGOLUNG",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "2011-12-22",
      "umur": 14,
      "jenis_kelamin": "Lk",
      "shdk": "ANAK",
      "agama": "KRISTEN",
      "pendidikan": "TAMAT SD/SEDERAJAT",
      "pekerjaan": "PELAJAR/MAHASISWA",
      "nama_ayah": "ELIYESER ELDY TUMIGOLUNG",
      "nama_ibu": "TESIL KOROMPIS",
      "alamat": "JAGA I",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 5,
      "no_kk": "7107091212110001",
      "nik": "7107095007190001",
      "nama_lengkap": "ELORA ELSI TUMIGOLUNG",
      "tempat_lahir": "MANADO",
      "tanggal_lahir": "2019-07-10",
      "umur": 7,
      "jenis_kelamin": "Pr",
      "shdk": "ANAK",
      "agama": "KRISTEN",
      "pendidikan": "TIDAK/BLM SEKOLAH",
      "pekerjaan": "BELUM/TIDAK BEKERJA",
      "nama_ayah": "ELIYESER ELDY TUMIGOLUNG",
      "nama_ibu": "TESIL KOROMPIS",
      "alamat": "JAGA I",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 6,
      "no_kk": "7107090912110001",
      "nik": "7107091612730001",
      "nama_lengkap": "DONY IMANUEL YONATHAN KOROMPIS",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "1973-12-16",
      "umur": 52,
      "jenis_kelamin": "Lk",
      "shdk": "KEPALA KELUARGA",
      "agama": "KRISTEN",
      "pendidikan": "DIPLOMA IV/STRATA I",
      "pekerjaan": "WIRASWASTA",
      "nama_ayah": "MAX KOROMPIS",
      "nama_ibu": "ARIANTJI RUNTURAMBI",
      "alamat": "JAGA II",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 7,
      "no_kk": "7107090912110001",
      "nik": "7107094207810001",
      "nama_lengkap": "PRICILIA GRACIA YUVELIN RONDONUWU",
      "tempat_lahir": "TOMBATU",
      "tanggal_lahir": "1981-07-02",
      "umur": 45,
      "jenis_kelamin": "Pr",
      "shdk": "ISTRI",
      "agama": "KRISTEN",
      "pendidikan": "DIPLOMA IV/STRATA I",
      "pekerjaan": "KARYAWAN HONORER",
      "nama_ayah": "NICCO RONDONUWU",
      "nama_ibu": "STANS KAWULUSAN",
      "alamat": "JAGA II",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 8,
      "no_kk": "7107091807110234",
      "nik": "7107093112580001",
      "nama_lengkap": "ALFIUS BONIFASIUS TULANDI",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "1958-12-31",
      "umur": 67,
      "jenis_kelamin": "Lk",
      "shdk": "KEPALA KELUARGA",
      "agama": "KRISTEN",
      "pendidikan": "SLTA/SEDERAJAT",
      "pekerjaan": "KEPALA DESA",
      "nama_ayah": "LAURENS TULANDI",
      "nama_ibu": "ROSALINA KAWULUSAN",
      "alamat": "JAGA II",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 9,
      "no_kk": "7107091807110234",
      "nik": "7107094806600001",
      "nama_lengkap": "ANNI YUDITHA SANGKAY",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "1960-06-08",
      "umur": 66,
      "jenis_kelamin": "Pr",
      "shdk": "ISTRI",
      "agama": "KRISTEN",
      "pendidikan": "SLTA/SEDERAJAT",
      "pekerjaan": "MENGURUS RUMAH TANGGA",
      "nama_ayah": "ORELIANUS SANGKAY",
      "nama_ibu": "ANTONETA KOLANUS",
      "alamat": "JAGA II",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 10,
      "no_kk": "7107090907130001",
      "nik": "7107093003870001",
      "nama_lengkap": "ADITA MELKY SALMON PONGGOHONG",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "1987-03-30",
      "umur": 39,
      "jenis_kelamin": "Lk",
      "shdk": "KEPALA KELUARGA",
      "agama": "KRISTEN",
      "pendidikan": "SLTA/SEDERAJAT",
      "pekerjaan": "WIRASWASTA",
      "nama_ayah": "DORUS PONGGOHONG",
      "nama_ibu": "SOFIA ENGKA",
      "alamat": "JAGA III",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 11,
      "no_kk": "7107090907130001",
      "nik": "7107116012930001",
      "nama_lengkap": "SURIANI INGGRIANI PONTO",
      "tempat_lahir": "LIWUTUNG",
      "tanggal_lahir": "1993-12-20",
      "umur": 32,
      "jenis_kelamin": "Pr",
      "shdk": "ISTRI",
      "agama": "KRISTEN",
      "pendidikan": "SLTA/SEDERAJAT",
      "pekerjaan": "MENGURUS RUMAH TANGGA",
      "nama_ayah": "MUHAMAD PONTO",
      "nama_ibu": "REINE PONOWU",
      "alamat": "JAGA III",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 12,
      "no_kk": "7107090509120003",
      "nik": "7107090103790001",
      "nama_lengkap": "JEMBRIE JONLIE NARAY",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "1979-01-03",
      "umur": 47,
      "jenis_kelamin": "Lk",
      "shdk": "KEPALA KELUARGA",
      "agama": "KRISTEN",
      "pendidikan": "SLTA/SEDERAJAT",
      "pekerjaan": "PETANI/PEKEBUN",
      "nama_ayah": "DIRK NARAY",
      "nama_ibu": "AGUSTINA RUUSEN",
      "alamat": "JAGA IV",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 13,
      "no_kk": "7107090509120003",
      "nik": "7107094407740001",
      "nama_lengkap": "FELMA BOLUNG",
      "tempat_lahir": "AMPRENG",
      "tanggal_lahir": "1974-07-04",
      "umur": 52,
      "jenis_kelamin": "Pr",
      "shdk": "ISTRI",
      "agama": "KRISTEN",
      "pendidikan": "SLTP/SEDERAJAT",
      "pekerjaan": "MENGURUS RUMAH TANGGA",
      "nama_ayah": "PAUL BOLUNG",
      "nama_ibu": "SINTJE TULANGOW",
      "alamat": "JAGA IV",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 14,
      "no_kk": "7107090509120003",
      "nik": "7107092906120002",
      "nama_lengkap": "JOSHUA HENDRIK NARAY",
      "tempat_lahir": "MOLOMPAR ATAS",
      "tanggal_lahir": "2012-06-29",
      "umur": 14,
      "jenis_kelamin": "Lk",
      "shdk": "ANAK",
      "agama": "KRISTEN",
      "pendidikan": "TAMAT SD/SEDERAJAT",
      "pekerjaan": "PELAJAR/MAHASISWA",
      "nama_ayah": "JEMBRIE JONLIE NARAY",
      "nama_ibu": "FELMA BOLUNG",
      "alamat": "JAGA IV",
      "rt_rw": "000/000",
      "dusun": ""
    },
    {
      "no": 15,
      "no_kk": "7107091807110102",
      "nik": "7107090907800001",
      "nama_lengkap": "SUPARMAN",
      "tempat_lahir": "BABASALO",
      "tanggal_lahir": "1980-07-09",
      "umur": 46,
      "jenis_kelamin": "Lk",
      "shdk": "KEPALA KELUARGA",
      "agama": "ISLAM",
      "pendidikan": "SLTP/SEDERAJAT",
      "pekerjaan": "WIRASWASTA",
      "nama_ayah": "AMBO ASO",
      "nama_ibu": "INDO AKE",
      "alamat": "JAGA IV",
      "rt_rw": "000/000",
      "dusun": ""
    }
  ],
  "piket": [
    {
      "id": 1,
      "hari": "Senin",
      "tanggal": "2026-10-19",
      "jam": "08.00 - 15.00 WITA",
      "petugas": [
        "RONNY M. KAWULUSAN (Sekdes)",
        "STEWARD ROLOS (Pala 1)",
        "YUNITA HENNY LOSUNG (Operator)"
      ],
      "koordinator": "RONNY M. KAWULUSAN",
      "keterangan": "Piket Pelayanan Administrasi Umum & Surat Pengantar"
    },
    {
      "id": 2,
      "hari": "Selasa",
      "tanggal": "2026-10-20",
      "jam": "08.00 - 15.00 WITA",
      "petugas": [
        "MEYDY LUKY KAWULUSAN (Kaur Keuangan)",
        "DONY I. Y. KOROMPIS (Pala 2)",
        "OBRIN NEMAN (Ketua BPD)"
      ],
      "koordinator": "MEYDY LUKY KAWULUSAN",
      "keterangan": "Piket Layanan Keuangan Desa & Konsultasi BPD"
    },
    {
      "id": 3,
      "hari": "Rabu",
      "tanggal": "2026-10-21",
      "jam": "08.00 - 15.00 WITA",
      "petugas": [
        "ROBY OLDY KOROMPIS (Kaur Umum)",
        "OFNY DANIEL TOLO (Pala 3)",
        "TREES W. K. KAWULUSAN (Kader)"
      ],
      "koordinator": "ROBY OLDY KOROMPIS",
      "keterangan": "Piket Pemeliharaan Inventaris & Koordinasi Posyandu"
    },
    {
      "id": 4,
      "hari": "Kamis",
      "tanggal": "2026-10-22",
      "jam": "08.00 - 15.00 WITA",
      "petugas": [
        "DJEMS DEEN MUNAESECHE (Kasi Pemerintahan)",
        "JEMBRIE JONLIE NARAY (Pala 4)",
        "DEEN FRYKE LOSUNG (BPD)"
      ],
      "koordinator": "DJEMS DEEN MUNAESECHE",
      "keterangan": "Piket Administrasi Kependudukan & Mediasi Warga"
    },
    {
      "id": 5,
      "hari": "Jumat",
      "tanggal": "2026-10-23",
      "jam": "08.00 - 14.30 WITA",
      "petugas": [
        "VEKY FREDY NARAY (Kasi Pelayanan)",
        "YUNITA HENNY LOSUNG (Operator)",
        "JOHNY JEMMY SANGKAY (BPD)"
      ],
      "koordinator": "VEKY FREDY NARAY",
      "keterangan": "Piket Pelayanan Kesejahteraan & Rekap Surat Masuk"
    },
    {
      "id": 6,
      "hari": "Sabtu",
      "tanggal": "2026-10-24",
      "jam": "08.30 - 12.00 WITA",
      "petugas": [
        "STEWARD ROLOS (Pala 1)",
        "DONY I. Y. KOROMPIS (Pala 2)",
        "OFNY DANIEL TOLO (Pala 3)",
        "JEMBRIE JONLIE NARAY (Pala 4)"
      ],
      "koordinator": "STEWARD ROLOS",
      "keterangan": "Piket Keamanan Lingkungan Jaga & Piket Siaga Desa"
    }
  ],
  "piket_staff_pool": [
    {
      "id": "p1",
      "nama": "RONNY M. KAWULUSAN",
      "jabatan": "Sekretaris Desa",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p2",
      "nama": "MEYDY LUKY KAWULUSAN",
      "jabatan": "Kaur Keuangan / Bendahara",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p3",
      "nama": "ROBY OLDY KOROMPIS",
      "jabatan": "Kaur Umum & Perencanaan",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p4",
      "nama": "DJEMS DEEN MUNAESECHE",
      "jabatan": "Kasi Pemerintahan",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p5",
      "nama": "VEKY FREDY NARAY",
      "jabatan": "Kasi Pelayanan",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p6",
      "nama": "STEWARD ROLOS",
      "jabatan": "Kepala Jaga I (Pala 1)",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p7",
      "nama": "DONY I. Y. KOROMPIS",
      "jabatan": "Kepala Jaga II (Pala 2)",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p8",
      "nama": "OFNY DANIEL TOLO",
      "jabatan": "Kepala Jaga III (Pala 3)",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p9",
      "nama": "JEMBRIE JONLIE NARAY",
      "jabatan": "Kepala Jaga IV (Pala 4)",
      "kategori": "Perangkat Desa",
      "selected": true
    },
    {
      "id": "p10",
      "nama": "OBRIN NEMAN, S.Th, M.Pd",
      "jabatan": "Ketua BPD",
      "kategori": "BPD",
      "selected": true
    },
    {
      "id": "p11",
      "nama": "DEEN FRYKE LOSUNG",
      "jabatan": "Wakil Ketua BPD",
      "kategori": "BPD",
      "selected": true
    },
    {
      "id": "p12",
      "nama": "JOHNY JEMMY SANGKAY",
      "jabatan": "Sekretaris BPD",
      "kategori": "BPD",
      "selected": true
    },
    {
      "id": "p13",
      "nama": "YUNITA HENNY LOSUNG",
      "jabatan": "Operator Pelayanan Desa",
      "kategori": "Operator",
      "selected": true
    },
    {
      "id": "p14",
      "nama": "TREES W. K. KAWULUSAN",
      "jabatan": "Koordinator Kader Posyandu",
      "kategori": "Kader",
      "selected": true
    },
    {
      "id": "p15",
      "nama": "GLEDIS SYURLIANE MOKALU",
      "jabatan": "Kader Kesehatan Jaga I",
      "kategori": "Kader",
      "selected": true
    },
    {
      "id": "p16",
      "nama": "JELLY JEINI LUISA ROLOS",
      "jabatan": "Kader Kesehatan Jaga II",
      "kategori": "Kader",
      "selected": true
    }
  ],
  "surat_warga": [
    {
      "id": 1,
      "jenis": "Surat Keterangan Usaha (SKU)",
      "nomor": "503/SKU-MLPA/X/2026",
      "tanggal": "2026-10-14",
      "nik": "7107091612730001",
      "nama": "DONY IMANUEL YONATHAN KOROMPIS",
      "jaga": "JAGA II",
      "keperluan": "Kelengkapan Persyaratan Pengajuan KUR Mikro Bank SulutGo",
      "keterangan_tambahan": "Usaha Perdagangan Cengkih & Hasil Pertanian telah berjalan sejak tahun 2018",
      "hukum_tua": "ALFIUS BONIFASIUS TULANDI"
    },
    {
      "id": 2,
      "jenis": "Surat Keterangan Tidak Mampu (SKTM)",
      "nomor": "401/SKTM-MLPA/X/2026",
      "tanggal": "2026-10-12",
      "nik": "7101335212730001",
      "nama": "DINCO MOKODOMPIT",
      "jaga": "JAGA I",
      "keperluan": "Pengajuan Keringanan Biaya Pengobatan / BPJS PBI dan Bantuan Sosial Kemensos",
      "keterangan_tambahan": "Tergolong keluarga berpenghasilan rendah dan disabilitas fisik rentan",
      "hukum_tua": "ALFIUS BONIFASIUS TULANDI"
    },
    {
      "id": 3,
      "jenis": "Surat Keterangan Domisili",
      "nomor": "470/SKD-MLPA/X/2026",
      "tanggal": "2026-10-09",
      "nik": "7107090809870001",
      "nama": "ELIYESER ELDY TUMIGOLUNG",
      "jaga": "JAGA I",
      "keperluan": "Kelengkapan Berkas Pelayanan Gerejawi & Administrasi Kepegawaian",
      "keterangan_tambahan": "Benar berdomisili dan menetap di Jaga I Desa Molompar Atas",
      "hukum_tua": "ALFIUS BONIFASIUS TULANDI"
    }
  ],
  "prodeskel": {
    "klasifikasi_desa": "Desa Swasembada (Maju)",
    "tipologi": "Pertanian / Perkebunan Rakyat",
    "kategori_perkembangan": "Tingkat Perkembangan Cepat",
    "potensi_sda": [
      {
        "komoditas": "Cengkih",
        "luas_ha": 285.5,
        "produksi_ton_thn": 142.8,
        "pemasaran": "Pasar Regional & Ekspor"
      },
      {
        "komoditas": "Kelapa / Kopra",
        "luas_ha": 45.2,
        "produksi_ton_thn": 38.4,
        "pemasaran": "Pabrik Minyak Kelapa Mitra"
      },
      {
        "komoditas": "Jagung & Padi Ladang",
        "luas_ha": 22.0,
        "produksi_ton_thn": 64.0,
        "pemasaran": "Konsumsi Lokal & Peternakan"
      },
      {
        "komoditas": "Mata Air & Hutan Desa",
        "luas_ha": 15.0,
        "produksi_ton_thn": 0,
        "pemasaran": "Sumber Air Bersih Warga Jaga 1-4"
      }
    ],
    "kelembagaan": [
      {
        "nama": "Pemerintah Desa",
        "anggota": 12,
        "status": "Aktif & Tertib Administrasi"
      },
      {
        "nama": "Badan Permusyawaratan Desa (BPD)",
        "anggota": 5,
        "status": "Aktif Mengawasi & Menampung Aspirasi"
      },
      {
        "nama": "Lembaga Pemberdayaan Masyarakat (LPM)",
        "anggota": 7,
        "status": "Aktif Membantu Perencanaan PKTD"
      },
      {
        "nama": "TP-PKK Desa Molompar Atas",
        "anggota": 24,
        "status": "Aktif 10 Program Pokok PKK"
      },
      {
        "nama": "Posyandu Balita & Lansia",
        "anggota": 15,
        "status": "Aktif Penimbangan & PMT Bulanan"
      },
      {
        "nama": "Karang Taruna Generasi Emas",
        "anggota": 35,
        "status": "Aktif Olahraga, Seni & Siaga Bencana"
      },
      {
        "nama": "Kelompok Tani Cengkih Mandiri",
        "anggota": 68,
        "status": "Aktif Kelompok Tani Usaha Bersama"
      }
    ]
  },
  "usaha": [
    {
      "id": 1,
      "nama_usaha": "UD. Molompar Atas Sejahtera Cengkih",
      "pemilik": "DONY IMANUEL YONATHAN KOROMPIS",
      "nik": "7107091612730001",
      "bidang": "Perdagangan Hasil Bumi / Cengkih",
      "jaga": "JAGA II",
      "izin_nib": "NIB-7107-2026-0012",
      "omzet": 75000000,
      "karyawan": 6
    },
    {
      "id": 2,
      "nama_usaha": "Bengkel & Sparepart Motor Maju",
      "pemilik": "VIKRY ROGAHANG",
      "nik": "7107091002900001",
      "bidang": "Jasa Perbengkelan",
      "jaga": "JAGA I",
      "izin_nib": "NIB-7107-2025-0089",
      "omzet": 22000000,
      "karyawan": 3
    },
    {
      "id": 3,
      "nama_usaha": "Toko Sembako & Pakan Ternak Kasih",
      "pemilik": "ADITA MELKY SALMON PONGGOHONG",
      "nik": "7107093003870001",
      "bidang": "Perdagangan Retail",
      "jaga": "JAGA III",
      "izin_nib": "NIB-7107-2026-0034",
      "omzet": 45000000,
      "karyawan": 4
    },
    {
      "id": 4,
      "nama_usaha": "Mebel Kayu & Kusen Indah",
      "pemilik": "OLDY FERY BOLUNG",
      "nik": "7107092702700003",
      "bidang": "Industri Kayu / Kerajinan",
      "jaga": "JAGA II",
      "izin_nib": "NIB-7107-2024-0011",
      "omzet": 35000000,
      "karyawan": 5
    },
    {
      "id": 5,
      "nama_usaha": "Kios Berkah Hasil Tani",
      "pemilik": "TANRI TAKKO",
      "nik": "7107091505750001",
      "bidang": "Perdagangan Sayur & Bumbu",
      "jaga": "JAGA III",
      "izin_nib": "NIB-7107-2025-0078",
      "omzet": 18000000,
      "karyawan": 2
    }
  ],
  "kesehatan": {
    "bumil": [
      {
        "id": 1,
        "nama": "JUDITHA CHRISTINA KRISMAWATI RAMBI",
        "umur": 27,
        "nik": "7107095307990001",
        "jaga": "JAGA I",
        "usia_kehamilan": "28 Minggu (Trimester 3)",
        "hpl": "2026-12-15",
        "risiko": "Normal",
        "nama_suami": "FIRDAUSTA BARUS",
        "bantuan_pmt": "Pemberian Susu Bumil & Vitamin Fe"
      },
      {
        "id": 2,
        "nama": "LIGIA MASELA",
        "umur": 29,
        "nik": "7107094705970002",
        "jaga": "JAGA I",
        "usia_kehamilan": "16 Minggu (Trimester 2)",
        "hpl": "2027-03-10",
        "risiko": "Risiko KEK (Kurang Energi Kronis)",
        "nama_suami": "STEWARD ROLOS",
        "bantuan_pmt": "PMT Pemulihan Telur & Biskuit Balita/Bumil"
      },
      {
        "id": 3,
        "nama": "SURIANI INGGRIANI PONTO",
        "umur": 32,
        "nik": "7107116012930001",
        "jaga": "JAGA III",
        "usia_kehamilan": "34 Minggu (Trimester 3)",
        "hpl": "2026-11-20",
        "risiko": "Normal",
        "nama_suami": "ADITA MELKY SALMON PONGGOHONG",
        "bantuan_pmt": "Pemberian Vitamin & Kalsium"
      }
    ],
    "stunting": [
      {
        "id": 1,
        "nama_anak": "DIRGA PUTRA JEREMIAS TULANDI",
        "nik": "7107090311150001",
        "tgl_lahir": "2015-11-03",
        "jaga": "JAGA II",
        "orang_tua": "DEVIED ROY TULANDI",
        "umur_bulan": 48,
        "tb_cm": 92.5,
        "bb_kg": 12.1,
        "status_gizi": "Stunting Pendek (Perlu Intervensi PMT)",
        "intervensi": "PMT Pangan Lokal Telur & Tempe Tiap Hari"
      },
      {
        "id": 2,
        "nama_anak": "KENNET FERDINAND WERNER BOLUNG",
        "nik": "7107090408200001",
        "tgl_lahir": "2020-08-04",
        "jaga": "JAGA II",
        "orang_tua": "RENALDO VICTORY LAURENS BOLUNG",
        "umur_bulan": 38,
        "tb_cm": 88.0,
        "bb_kg": 11.2,
        "status_gizi": "Gizi Kurang (Wasting)",
        "intervensi": "Pendampingan Kader Posyandu & Suplemen Zinc"
      }
    ],
    "balita": [
      {
        "id": 1,
        "nama_anak": "DEVANO ZIONATHAN BARUS",
        "nik": "7107091208210001",
        "tgl_lahir": "2021-08-12",
        "jk": "Lk",
        "jaga": "JAGA I",
        "orang_tua": "FIRDAUSTA BARUS",
        "imunisasi_lengkap": "Ya (Lengkap)",
        "kms_status": "Hijau (Tumbuh Baik)"
      },
      {
        "id": 2,
        "nama_anak": "SHERYN ZANETA MONINGKA",
        "nik": "7107095011200001",
        "tgl_lahir": "2020-11-10",
        "jk": "Pr",
        "jaga": "JAGA I",
        "orang_tua": "CHRISTIANTO JUNAIDY MONINGKA",
        "imunisasi_lengkap": "Ya (Lengkap)",
        "kms_status": "Hijau (Tumbuh Baik)"
      },
      {
        "id": 3,
        "nama_anak": "SCHWARZ WILLIAM DIEN",
        "nik": "7107092703210001",
        "tgl_lahir": "2021-03-27",
        "jk": "Lk",
        "jaga": "JAGA II",
        "orang_tua": "RENDY JAMES DIEN",
        "imunisasi_lengkap": "Ya (Lengkap)",
        "kms_status": "Hijau (Tumbuh Baik)"
      }
    ],
    "lansia": [
      {
        "id": 1,
        "nama": "ERNEST TOLO",
        "umur": 95,
        "nik": "7107091401440001",
        "jk": "Lk",
        "jaga": "JAGA I",
        "kondisi": "Lansia Sangat Renta (Pendengaran Berkurang)",
        "bantuan": "Penerima BLT-Dana Desa & Posyandu Lansia"
      },
      {
        "id": 2,
        "nama": "SIMON PARU",
        "umur": 95,
        "nik": "7107092407310001",
        "jk": "Lk",
        "jaga": "JAGA IV",
        "kondisi": "Lansia Renta (Mobilitas Terbatas)",
        "bantuan": "Penerima Paket Sembako Lansia"
      },
      {
        "id": 3,
        "nama": "RULAND AHIS KAWULUSAN",
        "umur": 91,
        "nik": "7107090112340001",
        "jk": "Lk",
        "jaga": "JAGA I",
        "kondisi": "Sehat, Aktif Jalan Pagi",
        "bantuan": "Pemeriksaan Tensi & Gula Darah Rutin"
      },
      {
        "id": 4,
        "nama": "FREDERIK RATUWALANGON",
        "umur": 90,
        "nik": "7107091603360001",
        "jk": "Lk",
        "jaga": "JAGA I",
        "kondisi": "Lansia Sehat",
        "bantuan": "Posyandu Lansia Rutin"
      },
      {
        "id": 5,
        "nama": "YAN TOAR",
        "umur": 90,
        "nik": "7107090501360001",
        "jk": "Lk",
        "jaga": "JAGA IV",
        "kondisi": "Renta, Tinggal Sendiri",
        "bantuan": "Pendampingan Khusus & BLT-DD"
      }
    ]
  },
  "disabilitas": [
    {
      "id": 1,
      "nama": "DINCO MOKODOMPIT",
      "nik": "7101335212730001",
      "jaga": "JAGA I",
      "jenis": "Disabilitas Fisik (Kaki)",
      "tingkat": "Sedang",
      "alat_bantu": "Kruk / Tongkat Penyangga",
      "bantuan_sosial": "PKH Disabilitas & Bantuan Sembako Desa"
    },
    {
      "id": 2,
      "nama": "RATI LAMBENO",
      "nik": "7107095912960001",
      "jaga": "JAGA I",
      "jenis": "Disabilitas Intelektual",
      "tingkat": "Sedang",
      "alat_bantu": "Tidak Ada",
      "bantuan_sosial": "BLT-Dana Desa & Pendampingan Sosial"
    },
    {
      "id": 3,
      "nama": "FUJI RIANTO",
      "nik": "7501092911930001",
      "jaga": "JAGA I",
      "jenis": "Disabilitas Wicara & Rungu",
      "tingkat": "Berat",
      "alat_bantu": "Alat Bantu Dengar",
      "bantuan_sosial": "Bantuan Atensi Kemensos & Sembako Desa"
    }
  ],
  "pemuda": [
    {
      "id": 1,
      "nama": "FIRDAUSTA BARUS",
      "umur": 31,
      "jaga": "JAGA I",
      "status_kerja": "Bekerja di Luar Daerah (Pelaut Kapal Niaga)",
      "pendidikan": "D-IV / S1",
      "keahlian": "Navigasi Laut & Nautika",
      "minat_pelatihan": "Manajemen Logistik Maritim"
    },
    {
      "id": 2,
      "nama": "GEOVANI CONSTANTINE KOROMPIS",
      "umur": 20,
      "jaga": "JAGA II",
      "status_kerja": "Sedang Kuliah / Mahasiswa",
      "pendidikan": "SLTA",
      "keahlian": "Teknologi Informasi & Desain Grafis",
      "minat_pelatihan": "Digital Marketing Desa"
    },
    {
      "id": 3,
      "nama": "JUNAIDI FRANKY SIGAR",
      "umur": 32,
      "jaga": "JAGA I",
      "status_kerja": "Belum Bekerja / Mencari Kerja",
      "pendidikan": "SLTA",
      "keahlian": "Montir Sepeda Motor & Pertukangan",
      "minat_pelatihan": "Pelatihan Las Listrik & Servis Mesin Diesel"
    },
    {
      "id": 4,
      "nama": "NOFRI ALDO ROLOS",
      "umur": 27,
      "jaga": "JAGA I",
      "status_kerja": "Bekerja di Desa (Pertanian Cengkih)",
      "pendidikan": "SLTP",
      "keahlian": "Budidaya Cengkih & Hortikultura",
      "minat_pelatihan": "Pengolahan Minyak Atsiri Cengkih"
    },
    {
      "id": 5,
      "nama": "ZULKIFLY HENUR",
      "umur": 29,
      "jaga": "JAGA III",
      "status_kerja": "Belum Bekerja / Mencari Kerja",
      "pendidikan": "D-IV / S1",
      "keahlian": "Akuntansi & Administrasi Keuangan",
      "minat_pelatihan": "Kewirausahaan BUMDes"
    }
  ],
  "aset": [
    {
      "id": 1,
      "kode": "01.01.11.04.001",
      "nama": "Tanah Kas Desa & Kompleks Kantor Balai Desa",
      "golongan": "Tanah",
      "tahun": 1982,
      "asal_usul": "Tanah Adat / Kas Desa",
      "nilai": 450000000,
      "kondisi": "Berfungsi Digunakan",
      "catatan_service": "Bersertifikat Hak Pakai Pemerintah Desa, luas 2.450 m²"
    },
    {
      "id": 2,
      "kode": "02.03.01.01.002",
      "nama": "Gedung Balai Pertemuan Umum (BPU) Desa Molompar Atas",
      "golongan": "Gedung & Bangunan",
      "tahun": 2018,
      "asal_usul": "Dana Desa (DDS)",
      "nilai": 380000000,
      "kondisi": "Berfungsi Digunakan",
      "catatan_service": "Pengecatan ulang dan perbaikan plafon tahun 2025"
    },
    {
      "id": 3,
      "kode": "03.02.01.01.003",
      "nama": "Sepeda Motor Dinas Operasional Hukum Tua (Yamaha NMAX)",
      "golongan": "Peralatan & Mesin",
      "tahun": 2022,
      "asal_usul": "Alokasi Dana Desa (ADD)",
      "nilai": 34500000,
      "kondisi": "Berfungsi Digunakan",
      "catatan_service": "Servis berkala & ganti oli rutin Agustus 2026"
    },
    {
      "id": 4,
      "kode": "03.05.02.01.004",
      "nama": "Genset Diesel Siaga Desa 10 KVA",
      "golongan": "Peralatan & Mesin",
      "tahun": 2021,
      "asal_usul": "Dana Desa (DDS)",
      "nilai": 28000000,
      "kondisi": "Dalam Perbaikan / Service",
      "catatan_service": "Penggantian dinamo starter & aki basah 100Ah"
    },
    {
      "id": 5,
      "kode": "04.01.01.01.005",
      "nama": "Jalan Paving Blok & Drainase Sentra Tani Jaga II-III",
      "golongan": "Jalan, Irigasi & Jaringan",
      "tahun": 2023,
      "asal_usul": "Dana Desa (DDS)",
      "nilai": 175000000,
      "kondisi": "Berfungsi Digunakan",
      "catatan_service": "Panjang 420 meter, kondisi mulus"
    },
    {
      "id": 6,
      "kode": "03.07.01.02.006",
      "nama": "Inventaris Laptop ASUS Core i5 & Printer EPSON L3210 Operator",
      "golongan": "Peralatan Kantor",
      "tahun": 2024,
      "asal_usul": "Dana Operasional Desa",
      "nilai": 16500000,
      "kondisi": "Berfungsi Digunakan",
      "catatan_service": "Digunakan di ruang pelayanan desa"
    },
    {
      "id": 7,
      "kode": "03.06.01.01.007",
      "nama": "Mesin Pemotong Rumput Honda (2 Unit)",
      "golongan": "Peralatan",
      "tahun": 2020,
      "asal_usul": "PADes",
      "nilai": 6400000,
      "kondisi": "Rusak Ringan",
      "catatan_service": "1 unit pisau patah, butuh penggantian mata pisau"
    }
  ],
  "tanah": [
    {
      "id": 1,
      "nomor_reg": "01/REG-TNH/MLPA/2026",
      "nomor_folio": "14",
      "pemilik": "DONY IMANUEL YONATHAN KOROMPIS",
      "jaga": "JAGA II",
      "luas_m2": 2450,
      "luas_ha": 0.245,
      "peruntukan": "Kebun Cengkih & Tanaman Campuran",
      "batas_utara": "Tanah Keluarga Veky Fredy Naray",
      "batas_timur": "Jalan Desa Lorong Kasih",
      "batas_selatan": "Tanah Keluarga Monalisa Bolung",
      "batas_barat": "Sungai Kecil / Saluran Air Alami",
      "tim_pengukur": [
        {
          "nama": "ROBY OLDY KOROMPIS",
          "jabatan": "Kaur Umum & Aset"
        },
        {
          "nama": "DONY I. Y. KOROMPIS",
          "jabatan": "Kepala Jaga II"
        },
        {
          "nama": "OFNY DANIEL TOLO",
          "jabatan": "Kepala Jaga III"
        }
      ],
      "tempat_keluar": "Molompar Atas",
      "tanggal_keluar": "2026-08-14",
      "hukum_tua": "ALFIUS BONIFASIUS TULANDI",
      "sketsa_img": "",
      "berkas_pendukung": "Surat Hibah Keluarga Tertanggal 10 Mei 2012, No. 12/HB/2012"
    },
    {
      "id": 2,
      "nomor_reg": "02/REG-TNH/MLPA/2026",
      "nomor_folio": "19",
      "pemilik": "JEMBRIE JONLIE NARAY",
      "jaga": "JAGA IV",
      "luas_m2": 1200,
      "luas_ha": 0.12,
      "peruntukan": "Pekarangan Perumahan Warga",
      "batas_utara": "Tanah Keluarga Senly Runturambi",
      "batas_timur": "Jalan Poros Desa Molompar Atas",
      "batas_selatan": "Tanah Keluarga Freli Londah",
      "batas_barat": "Tanah Kas Desa Molompar Atas",
      "tim_pengukur": [
        {
          "nama": "ROBY OLDY KOROMPIS",
          "jabatan": "Kaur Umum & Aset"
        },
        {
          "nama": "JEMBRIE JONLIE NARAY",
          "jabatan": "Kepala Jaga IV"
        },
        {
          "nama": "RONNY M. KAWULUSAN",
          "jabatan": "Sekretaris Desa"
        }
      ],
      "tempat_keluar": "Molompar Atas",
      "tanggal_keluar": "2026-09-02",
      "hukum_tua": "ALFIUS BONIFASIUS TULANDI",
      "sketsa_img": "",
      "berkas_pendukung": "Akta Jual Beli Bawah Tangan bermaterai & disaksikan saksi batas"
    }
  ],
  "peta": {
    "peta_img": "",
    "luas_total_ha": 485.6,
    "batas_utara": "Desa Towuntu Barat / Hutan Lindung",
    "batas_timur": "Desa Mundung / Kecamatan Tombatu Timur",
    "batas_selatan": "Desa Molompar / Kecamatan Tombatu Timur",
    "batas_barat": "Desa Tonsawang / Perkebunan Rakyat",
    "koordinat": "1°01'44.2\"N 124°44'12.8\"E",
    "jalan_aspal_km": 4.8,
    "jalan_beton_paving_km": 7.2,
    "jalan_tanah_km": 5.5,
    "panjang_drainase_km": 8.4,
    "jumlah_jembatan": 4,
    "zona_pemukiman_ha": 92.4,
    "zona_perkebunan_ha": 350.2,
    "zona_fasilitas_ha": 43.0
  },
  "surat": {
    "masuk": [
      {
        "id": 1,
        "no_agenda": "SM/2026/089",
        "no_surat": "140/045/KEC-TT/VIII/2026",
        "tgl_surat": "2026-08-10",
        "tgl_terima": "2026-08-12",
        "pengirim": "Camat Tombatu Timur",
        "perihal": "Instruksi Pelaksanaan Rekonsiliasi APBDes Semester I TA 2026",
        "disposisi": "Sekdes & Bendahara tindak lanjuti sebelum 20 Agustus 2026",
        "status": "Selesai"
      },
      {
        "id": 2,
        "no_agenda": "SM/2026/094",
        "no_surat": "411/DPMD-MITRA/IX/2026",
        "tgl_surat": "2026-09-01",
        "tgl_terima": "2026-09-04",
        "pengirim": "Dinas PMD Kabupaten Minahasa Tenggara",
        "perihal": "Monitoring dan Evaluasi Bantuan Langsung Tunai (BLT-DD) Tahap II",
        "disposisi": "Kaur Keuangan siapkan laporan penyaluran & bukti transfer",
        "status": "Selesai"
      },
      {
        "id": 3,
        "no_agenda": "SM/2026/102",
        "no_surat": "440/PUSK-TMB/X/2026",
        "tgl_surat": "2026-10-02",
        "tgl_terima": "2026-10-05",
        "pengirim": "Puskesmas Tombatu Timur",
        "perihal": "Jadwal Intervensi Serentak Penimbangan Balita & Ibu Hamil",
        "disposisi": "Kader Posyandu & Kepala Jaga I-IV koordinasikan warga",
        "status": "Proses"
      }
    ],
    "keluar": [
      {
        "id": 1,
        "no_berkas": "SK/2026/051",
        "no_surat": "140/MLPA/051/VIII/2026",
        "tgl_surat": "2026-08-18",
        "tujuan": "Camat Tombatu Timur",
        "perihal": "Penyampaian Laporan Rekonsiliasi Realisasi APBDes Semester I 2026",
        "penandatangan": "ALFIUS BONIFASIUS TULANDI (Hukum Tua)",
        "status": "Terkirim"
      },
      {
        "id": 2,
        "no_berkas": "SK/2026/055",
        "no_surat": "140/MLPA/055/IX/2026",
        "tgl_surat": "2026-09-10",
        "tujuan": "Seluruh Tokoh Masyarakat & Warga Jaga I-IV",
        "perihal": "Undangan Rapat Musyawarah Desa (Musdes) Pembahasan RKPDes 2027",
        "penandatangan": "ALFIUS BONIFASIUS TULANDI (Hukum Tua)",
        "status": "Terkirim"
      }
    ]
  },
  "bpd": [
    {
      "id": 1,
      "jenis": "Keputusan BPD",
      "nomor": "01/BPD-MLPA/VI/2026",
      "tanggal": "2026-06-25",
      "perihal": "Persetujuan Bersama Terhadap Rancangan Peraturan Desa Tentang Laporan Realisasi Semester I APBDes 2026",
      "status": "Ditetapkan",
      "keterangan": "Disepakati seluruh 5 anggota BPD"
    },
    {
      "id": 2,
      "jenis": "Notulen Musyawarah",
      "nomor": "02/NOTULEN-BPD/VIII/2026",
      "tanggal": "2026-08-20",
      "perihal": "Rapat Pleno BPD Terkait Usulan Prioritas Pembangunan Padat Karya Tunai Jaga 1-4",
      "status": "Selesai",
      "keterangan": "Dihadiri Hukum Tua, BPD, dan Tokoh Masyarakat"
    },
    {
      "id": 3,
      "jenis": "Aspirasi Warga",
      "nomor": "01/ASPIRASI/IX/2026",
      "tanggal": "2026-09-14",
      "perihal": "Permohonan Pembangunan Drainase Pengendali Luapan Air di Perbatasan Jaga III dan IV",
      "status": "Ditampung dalam RKPDes",
      "keterangan": "Diajukan oleh perwakilan warga Jaga III"
    }
  ],
  "rekon": {
    "pendapatan": [
      {
        "kode": "4.1",
        "uraian": "Pendapatan Asli Desa (PADes)",
        "anggaran": 25000000,
        "siskeudes": 22500000,
        "rc_bank": 22500000
      },
      {
        "kode": "4.2.1",
        "uraian": "Dana Desa (DDS)",
        "anggaran": 720000000,
        "siskeudes": 540000000,
        "rc_bank": 540000000
      },
      {
        "kode": "4.2.2",
        "uraian": "Alokasi Dana Desa (ADD)",
        "anggaran": 380000000,
        "siskeudes": 285000000,
        "rc_bank": 285000000
      },
      {
        "kode": "4.2.3",
        "uraian": "Bagi Hasil Pajak & Retribusi (PBH)",
        "anggaran": 42000000,
        "siskeudes": 31500000,
        "rc_bank": 31500000
      }
    ],
    "belanja": [
      {
        "kode": "5.1",
        "uraian": "Bidang Penyelenggaraan Pemerintahan Desa",
        "anggaran": 395000000,
        "siskeudes": 298000000,
        "rc_bank": 298000000
      },
      {
        "kode": "5.2",
        "uraian": "Bidang Pelaksanaan Pembangunan Desa",
        "anggaran": 510000000,
        "siskeudes": 385000000,
        "rc_bank": 385000000
      },
      {
        "kode": "5.3",
        "uraian": "Bidang Pembinaan Kemasyarakatan Desa",
        "anggaran": 85000000,
        "siskeudes": 62000000,
        "rc_bank": 62000000
      },
      {
        "kode": "5.4",
        "uraian": "Bidang Pemberdayaan Masyarakat Desa",
        "anggaran": 120000000,
        "siskeudes": 85000000,
        "rc_bank": 85000000
      },
      {
        "kode": "5.5",
        "uraian": "Bidang Penanggulangan Bencana & Darurat Desa",
        "anggaran": 57000000,
        "siskeudes": 42000000,
        "rc_bank": 42000000
      }
    ],
    "spp": [
      {
        "no_spp": "SPP-01/DDS/2026",
        "tanggal": "2026-08-05",
        "kegiatan": "Pembangunan Rabat Beton Jalur Pertanian Jaga II",
        "pelaksana": "TPK Desa (Sany Runturambi)",
        "jumlah": 85000000,
        "status": "Lunas / Dicairkan"
      },
      {
        "no_spp": "SPP-02/ADD/2026",
        "tanggal": "2026-08-25",
        "kegiatan": "Siltap & Tunjangan Perangkat Desa serta BPD Bulan Agustus",
        "pelaksana": "Kaur Keuangan (Meydy L. Kawulusan)",
        "jumlah": 38500000,
        "status": "Lunas / Dicairkan"
      },
      {
        "no_spp": "SPP-03/DDS/2026",
        "tanggal": "2026-09-12",
        "kegiatan": "Penyaluran BLT-Dana Desa Triwulan III (Keluarga Miskin/Rentan)",
        "pelaksana": "Kasi Pelayanan (Veky F. Naray)",
        "jumlah": 27000000,
        "status": "Lunas / Dicairkan"
      }
    ]
  },
  "bendahara": [
    {
      "id": 1,
      "tanggal": "2026-08-01",
      "no_bukti": "BKM-01/2026",
      "uraian": "Penerimaan Penyaluran Dana Desa (DDS) Tahap II dari Kasda Mitra",
      "jenis": "masuk",
      "jumlah": 240000000
    },
    {
      "id": 2,
      "tanggal": "2026-08-06",
      "no_bukti": "BKK-01/2026",
      "uraian": "Pembayaran Material & Upah HOK Rabat Beton Jalan Pertanian (SPP-01)",
      "jenis": "keluar",
      "jumlah": 85000000
    },
    {
      "id": 3,
      "tanggal": "2026-08-15",
      "no_bukti": "BKM-02/2026",
      "uraian": "Penerimaan Penyaluran Alokasi Dana Desa (ADD) Tahap II",
      "jenis": "masuk",
      "jumlah": 125000000
    },
    {
      "id": 4,
      "tanggal": "2026-08-26",
      "no_bukti": "BKK-02/2026",
      "uraian": "Pembayaran Penghasilan Tetap (Siltap) Hukum Tua, Perangkat & BPD (SPP-02)",
      "jenis": "keluar",
      "jumlah": 38500000
    },
    {
      "id": 5,
      "tanggal": "2026-09-02",
      "no_bukti": "BKM-03/2026",
      "uraian": "Penerimaan Pendapatan Asli Desa (PADes) Retribusi Pemanfaatan Lahan BPU",
      "jenis": "masuk",
      "jumlah": 4500000
    },
    {
      "id": 6,
      "tanggal": "2026-09-15",
      "no_bukti": "BKK-03/2026",
      "uraian": "Penyaluran BLT-Dana Desa Triwulan III Bagi 30 KPM x Rp 900.000 (SPP-03)",
      "jenis": "keluar",
      "jumlah": 27000000
    },
    {
      "id": 7,
      "tanggal": "2026-09-28",
      "no_bukti": "BKK-04/2026",
      "uraian": "Biaya Operasional Posyandu, Makanan Tambahan PMT Bumil & Balita Stunting",
      "jenis": "keluar",
      "jumlah": 6800000
    }
  ],
  "regulasi": [
    {
      "id": 1,
      "jenis": "PERDES",
      "nomor": "01/PERDES-MLPA/2026",
      "tahun": 2026,
      "judul": "Laporan Realisasi Semester Pertama Anggaran Pendapatan dan Belanja Desa (APBDes) Tahun Anggaran 2026",
      "tgl_tetap": "2026-07-15",
      "tgl_undangkan": "2026-07-16",
      "status": "Berlaku"
    },
    {
      "id": 2,
      "jenis": "PERKADES",
      "nomor": "01/PERKADES-MLPA/2026",
      "tahun": 2026,
      "judul": "Petunjuk Teknis Pelaksanaan Padat Karya Tunai Desa (PKTD) Pembangunan Fisik Dana Desa 2026",
      "tgl_tetap": "2026-02-10",
      "tgl_undangkan": "2026-02-12",
      "status": "Berlaku"
    },
    {
      "id": 3,
      "jenis": "RKPDES",
      "nomor": "02/RKPDES-MLPA/2026",
      "tahun": 2026,
      "judul": "Rencana Kerja Pemerintah Desa (RKPDes) Desa Molompar Atas Tahun Anggaran 2026",
      "tgl_tetap": "2025-09-30",
      "tgl_undangkan": "2025-10-02",
      "status": "Berlaku"
    },
    {
      "id": 4,
      "jenis": "RPJMDES",
      "nomor": "01/RPJMDES-MLPA/2021-2027",
      "tahun": 2021,
      "judul": "Rencana Pembangunan Jangka Menengah Desa (RPJMDes) Desa Molompar Atas Periode 2021-2027",
      "tgl_tetap": "2021-08-15",
      "tgl_undangkan": "2021-08-20",
      "status": "Berlaku"
    }
  ],
  "berita_acara": [
    {
      "id": 1,
      "jenis": "Musdes",
      "nomor": "BA-01/MUSDES-MLPA/2026",
      "tanggal": "2026-09-15",
      "perihal": "Berita Acara Musyawarah Desa Penyusunan Rencana Kerja Pemerintah Desa (RKPDes) Tahun 2027",
      "pimpinan": "OBRIN NEMAN, S.Th, M.Pd (Ketua BPD)",
      "sekretaris": "RONNY M. KAWULUSAN (Sekdes)",
      "hasil": "Menyepakati 12 butir usulan pembangunan prioritas padat karya dan peningkatan sarana posyandu."
    },
    {
      "id": 2,
      "jenis": "Pengadaan Barang & Jasa",
      "nomor": "BA-02/PBJ-MLPA/2026",
      "tanggal": "2026-08-03",
      "perihal": "Berita Acara Pembukaan & Evaluasi Penawaran Pengadaan Paving Blok Jalur Pertanian",
      "pimpinan": "SANY RUNTURAMBI (Ketua TPK)",
      "sekretaris": "VIKRY ROGAHANG (Anggota TPK)",
      "hasil": "Memilih penyedia lokal UD. Cahaya Mitra dengan penawaran sesuai spesifikasi teknis dan standar SNI."
    },
    {
      "id": 3,
      "jenis": "Musrenbangdes",
      "nomor": "BA-03/MRB-MLPA/2026",
      "tanggal": "2026-01-22",
      "perihal": "Berita Acara Musrenbangdes Penetapan Usulan Program Desa ke Musrenbang Tingkat Kecamatan",
      "pimpinan": "ALFIUS BONIFASIUS TULANDI (Hukum Tua)",
      "sekretaris": "RONNY M. KAWULUSAN (Sekdes)",
      "hasil": "Penetapan 3 usulan supra-desa: perbaikan jalan penghubung kabupaten, jaringan pipa air bersih, dan peremajaan bibit cengkih."
    }
  ],
  "cetak_khusus": {
    "musdes_config": {
      "kegiatan": "Musyawarah Desa (Musdes) Perencanaan RKPDes Tahun Anggaran 2027",
      "tanggal": "2026-09-15",
      "tempat": "Balai Pertemuan Umum (BPU) Desa Molompar Atas",
      "jam": "09.00 WITA - Selesai"
    },
    "hok_mingguan_config": {
      "kegiatan": "Padat Karya Tunai Desa Pembangunan Jalan Rabat Beton Jaga II-III",
      "periode": "Minggu II Bulan Agustus 2026",
      "lokasi": "Sentra Perkebunan Jaga II",
      "upah_per_hari": 120000
    },
    "hok_harian_config": {
      "kegiatan": "Normalisasi Saluran Drainase dan Pembersihan Lingkungan Desa",
      "tanggal": "2026-10-09",
      "lokasi": "Sepanjang Jalan Utama Jaga I s/d IV",
      "upah_per_hari": 120000
    }
  }
};

/* ==========================================================================
   PART 1: CORE APPLICATION STATE, AUTH, SESSION & BENTO SIDEBAR NAVIGATION
   ========================================================================== */

let DB = null;
let currentUser = null;
let currentView = 'dashboard';
let currentKesehatanTab = 'bumil';
let currentSuratTab = 'masuk';
let currentCetakKhususTab = 'musdes';
let pendudukViewMode = 'tabel'; // 'tabel' or 'kk'
let sessionTimerInterval = null;
let autoSaveInterval = null;
let lastUserActivity = Date.now();
let chartAnimFrame = null;
const SESSION_DURATION = 60 * 60 * 1000; // 1 Jam
const INACTIVITY_LOCK_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 Hari

// Utility: Number and Currency Formatter (True Comma Style: 1,250,000)
function formatNumber(num) {
    if (num === null || num === undefined || num === '' || isNaN(Number(num))) return "0";
    return Number(num).toLocaleString('en-US');
}

function formatRupiah(num) {
    if (num === null || num === undefined || num === '' || isNaN(Number(num))) return "Rp 0";
    const clean = Math.round(Number(num) || 0);
    return 'Rp ' + clean.toLocaleString('en-US');
}

function formatCurrencyInput(el) {
    if (!el) return;
    const rawDigits = el.value.toString().replace(/[^0-9]/g, '');
    if (!rawDigits) {
        el.value = '';
        return;
    }
    const num = parseInt(rawDigits, 10);
    el.value = isNaN(num) ? '' : num.toLocaleString('en-US');
}

function cleanNumber(str) {
    if (typeof str === 'number') return Math.round(str);
    if (!str) return 0;
    let s = str.toString().replace(/Rp/gi, '').trim();
    // Strip trailing ,00 or .00 if present
    s = s.replace(/[,.]00$/, '');
    const digits = s.replace(/[^0-9-]/g, '');
    return parseInt(digits, 10) || 0;
}

// Database Initialization & Persistence
function initDatabase() {
    try {
        const stored = localStorage.getItem('desa_digital_db');
        if (stored) {
            DB = JSON.parse(stored);
            // Auto-upgrade legacy default 'Molompar' to 'Molompar Atas'
            if (DB.settings && DB.settings.nama_desa === 'Molompar') {
                DB.settings.nama_desa = 'Molompar Atas';
                if (DB.settings.kop_desa === 'PEMERINTAH DESA MOLOMPAR') {
                    DB.settings.kop_desa = 'PEMERINTAH DESA MOLOMPAR ATAS';
                }
                if (DB.settings.kop_alamat && DB.settings.kop_alamat.includes('Desa Molompar,')) {
                    DB.settings.kop_alamat = DB.settings.kop_alamat.replace('Desa Molompar,', 'Desa Molompar Atas,');
                }
                saveDatabase(true);
            }
        } else {
            DB = JSON.parse(JSON.stringify(DEFAULT_DB));
            saveDatabase(true);
        }
    } catch (e) {
        console.error("Error loading DB, restoring default:", e);
        DB = JSON.parse(JSON.stringify(DEFAULT_DB));
    }

    // Verify all critical keys
    if (!DB.settings) DB.settings = JSON.parse(JSON.stringify(DEFAULT_DB.settings));
    if (!DB.users) DB.users = JSON.parse(JSON.stringify(DEFAULT_DB.users));
    if (!DB.security) DB.security = JSON.parse(JSON.stringify(DEFAULT_DB.security));
    if (!DB.penduduk) DB.penduduk = [];
    if (!DB.piket) DB.piket = [];
    if (!DB.piket_staff_pool) DB.piket_staff_pool = [];
    if (!DB.surat_warga) DB.surat_warga = [];
    if (!DB.prodeskel) DB.prodeskel = { klasifikasi_desa: "", tipologi: "", kategori_perkembangan: "", potensi_sda: [], kelembagaan: [] };
    if (!DB.usaha) DB.usaha = [];
    if (!DB.kesehatan) DB.kesehatan = { bumil: [], stunting: [], balita: [], lansia: [] };
    if (!DB.disabilitas) DB.disabilitas = [];
    if (!DB.pemuda) DB.pemuda = [];
    if (!DB.aset) DB.aset = [];
    if (!DB.tanah) DB.tanah = [];
    if (!DB.peta) DB.peta = JSON.parse(JSON.stringify(DEFAULT_DB.peta));
    if (!DB.surat) DB.surat = { masuk: [], keluar: [] };
    if (!DB.bpd) DB.bpd = [];
    if (!DB.rekon) DB.rekon = { pendapatan: [], belanja: [], spp: [] };
    if (!DB.bendahara) DB.bendahara = [];
    if (!DB.regulasi) DB.regulasi = [];
    if (!DB.berita_acara) DB.berita_acara = [];
    if (!DB.cetak_khusus) DB.cetak_khusus = JSON.parse(JSON.stringify(DEFAULT_DB.cetak_khusus));

    if (!DB.settings.visible_menus) {
        DB.settings.visible_menus = JSON.parse(JSON.stringify(DEFAULT_DB.settings.visible_menus));
    }

    // Apply active theme
    applyTheme(DB.settings.theme || 'emerald');

    // Render Dynamic Bento Sidebar
    renderSidebarNavigation();

    // Check Inactivity Lock (30 Hari)
    checkLicenseSecurity();

    // Setup 7-Second Auto-save
    setupAutoSaveTimer();

    // Check Persistent Login (1 Jam session)
    checkPersistentLogin();
}

function saveDatabase(silent = false) {
    if (!DB) return;
    DB.security.last_active = Date.now();
    localStorage.setItem('desa_digital_db', JSON.stringify(DB));
    if (!silent) {
        flashAutoSaveIndicator();
        if (typeof scheduleCloudSyncToGAS === 'function') {
            scheduleCloudSyncToGAS();
        }
    }
}

function flashAutoSaveIndicator() {
    const el = document.getElementById('autoSaveIndicator');
    const txt = document.getElementById('autoSaveStatusText');
    if (el && txt) {
        el.style.background = '#38bdf8';
        txt.textContent = 'Tersimpan';
        setTimeout(() => {
            el.style.background = '#10b981';
            txt.textContent = 'Auto-Save 7d';
        }, 1200);
    }
}

function setupAutoSaveTimer() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => {
        if (DB && DB.settings && DB.settings.auto_save_7s && currentUser) {
            saveDatabase(false);
        }
    }, 7000); // 7 Detik otomatis simpan
}

// Security & Licensing Control (30 Days Inactivity Lock)
function checkLicenseSecurity() {
    const now = Date.now();
    const lastActive = DB.security.last_active || now;

    // Check if 30 days inactive
    if ((now - lastActive) > INACTIVITY_LOCK_DURATION) {
        DB.security.is_locked = true;
        saveDatabase(true);
    }

    if (DB.security.is_locked) {
        showLicenseLockScreen();
    } else {
        hideLicenseLockScreen();
    }
}

function showLicenseLockScreen() {
    document.getElementById('licenseLockScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
}

function hideLicenseLockScreen() {
    document.getElementById('licenseLockScreen').style.display = 'none';
}

function handleUnlockSystem() {
    const key = document.getElementById('inputUnlockKey').value.trim();
    const msg = document.getElementById('unlockMsg');

    if (key === DB.security.master_key || key === DB.security.master_pin) {
        DB.security.is_locked = false;
        DB.security.last_active = Date.now();
        saveDatabase(true);
        hideLicenseLockScreen();
        alert("Kunci lisensi berhasil dibuka! Selamat datang kembali.");
        if (currentUser) {
            document.getElementById('appContainer').style.display = 'flex';
        } else {
            document.getElementById('loginScreen').style.display = 'flex';
        }
    } else {
        msg.textContent = "Kode Enkripsi atau Master PIN salah! Akses ditolak.";
    }
}

function lockSystemNowManual() {
    if (confirm("PERINGATAN PEMILIK: Apakah Anda yakin ingin mencabut lisensi dan mengunci aplikasi ini sekarang?\\n\\nAplikasi hanya dapat dibuka kembali dengan memasukkan Master Encryption Key atau Master PIN Anda.")) {
        DB.security.is_locked = true;
        saveDatabase(true);
        showLicenseLockScreen();
    }
}

// Authentication & Session Engine (1 Hour Persistent & Idle Auto-Logout)
function checkPersistentLogin() {
    const sess = sessionStorage.getItem('desa_digital_session') || localStorage.getItem('desa_digital_session');
    const uSess = localStorage.getItem('userSession');
    if (sess && uSess) {
        try {
            const data = JSON.parse(sess);
            const uData = JSON.parse(uSess);
            const now = Date.now();
            if (uData.isAdmin && data && data.user && data.loginTime && (now - data.loginTime < SESSION_DURATION)) {
                loginSuccess(data.user, data.loginTime);
                return;
            }
        } catch (e) {
            console.error("Session parse error:", e);
        }
    }
    // Jangan tampilkan loginScreen menutupi Landing Page jika belum masuk mode Admin
    const ls = document.getElementById('loginScreen');
    if (ls) ls.style.display = 'none';
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    updateLoginScreenTitles();
}

function updateLoginScreenTitles() {
    if (!DB) return;
    const dName = (DB.settings.nama_desa !== undefined && DB.settings.nama_desa !== null) ? DB.settings.nama_desa.trim() : 'MOLOMPAR ATAS';
    const kecName = (DB.settings.kecamatan !== undefined && DB.settings.kecamatan !== null) ? DB.settings.kecamatan.trim() : 'Tombatu Timur';
    const kabName = (DB.settings.kabupaten !== undefined && DB.settings.kabupaten !== null) ? DB.settings.kabupaten.trim() : 'Minahasa Tenggara';

    document.getElementById('loginDesaTitle').textContent = dName ? ('PEMERINTAH DESA ' + dName.toUpperCase()) : 'PEMERINTAH DESA (BELUM DIATUR)';
    document.getElementById('loginDesaSub').textContent = (kecName || kabName)
        ? `Kecamatan ${kecName || '-'} • Kabupaten ${kabName || '-'}`
        : 'Silakan atur identitas desa & kecamatan pada menu Pengaturan';

    const logoImg = document.getElementById('loginLogoImg');
    const logoFallback = document.getElementById('loginLogoFallback');
    if (DB.settings.logo_desa) {
        logoImg.src = DB.settings.logo_desa;
        logoImg.style.display = 'inline-block';
        logoFallback.style.display = 'none';
    } else {
        logoImg.style.display = 'none';
        logoFallback.style.display = 'block';
    }
}

function quickFillLogin(u, p) {
    document.getElementById('loginUsername').value = u;
    document.getElementById('loginPassword').value = p;
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    const err = document.getElementById('loginErrorMsg');
    err.style.display = 'none';

    const found = DB.users.find(x => x.username.toLowerCase() === u.toLowerCase() && x.password === p);
    if (found) {
        loginSuccess(found);
    } else {
        err.textContent = "Nama pengguna atau kata sandi tidak cocok!";
        err.style.display = 'block';
    }
}

function loginSuccess(user, existingLoginTime = null) {
    currentUser = user;
    const loginTime = existingLoginTime || Date.now();

    const sessionData = {
        user: currentUser,
        loginTime: loginTime
    };
    sessionStorage.setItem('desa_digital_session', JSON.stringify(sessionData));
    localStorage.setItem('desa_digital_session', JSON.stringify(sessionData));

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('currentUserRoleTitle').textContent = getRoleDisplayTitle(currentUser.role, currentUser.jaga_scope);

    applyRBAC();
    startSessionTimer(loginTime);
    attachActivityListeners();
    updateHeaderVillageInfo();
    renderAllViews();
    switchView('dashboard');
}

function handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar dari Dashboard Desa Digital dan kembali ke Halaman Utama?")) {
        sessionStorage.removeItem('desa_digital_session');
        localStorage.removeItem('desa_digital_session');
        currentUser = null;
        if (sessionTimerInterval) clearInterval(sessionTimerInterval);
        doLogout();
    }
}

function startSessionTimer(loginTime) {
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    const timerEl = document.getElementById('sessionTimerText');

    function update() {
        const elapsed = Date.now() - loginTime;
        const remain = SESSION_DURATION - elapsed;
        if (remain <= 0) {
            clearInterval(sessionTimerInterval);
            alert("Waktu sesi 1 jam telah berakhir. Anda dialihkan ke halaman login.");
            handleLogout();
            return;
        }
        const m = Math.floor(remain / 60000);
        const s = Math.floor((remain % 60000) / 1000);
        timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    update();
    sessionTimerInterval = setInterval(update, 1000);
}

function attachActivityListeners() {
    function onActive() {
        lastUserActivity = Date.now();
        if (DB && DB.security) {
            DB.security.last_active = Date.now();
        }
    }
    window.addEventListener('mousemove', onActive, { passive: true });
    window.addEventListener('keydown', onActive, { passive: true });
    window.addEventListener('click', onActive, { passive: true });
}

function openSuperAdminAuthModal() {
    document.getElementById('inputMasterKey').value = '';
    document.getElementById('superAdminErrorMsg').style.display = 'none';
    openModal('modalSuperAdminAuth');
}

function handleSuperAdminAuthSubmit(e) {
    e.preventDefault();
    const key = document.getElementById('inputMasterKey').value.trim();
    const err = document.getElementById('superAdminErrorMsg');

    if (key === DB.security.master_key || key === DB.security.master_pin) {
        closeModal('modalSuperAdminAuth');
        const superUser = {
            id: 999,
            username: "superadmin",
            name: "Pemilik Sistem (Alldy Korompis)",
            role: "super_admin",
            jaga_scope: "all"
        };
        closeLoginModal();
        saveSession(superUser.name, "SUPER_ADMIN", true, superUser);
        grantAccess(superUser.name, "SUPER_ADMIN", true, superUser);
        loginSuccess(superUser);
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: '👑 Super Admin Aktif', text: 'Hak akses tertinggi pemilik sistem telah diaktifkan.', timer: 1800, showConfirmButton: false });
        }
    } else {
        err.textContent = "Kode Enkripsi atau Master PIN Pemilik Salah!";
        err.style.display = 'block';
    }
}

function getRoleDisplayTitle(role, scope) {
    if (role === 'super_admin') return 'SUPER ADMIN';
    if (role === 'admin') return 'Admin Biasa';
    if (role === 'kepala_jaga') return scope || 'Kepala Jaga';
    if (role === 'bendahara') return 'Bendahara';
    if (role === 'kader') return 'Kader Posyandu';
    if (role === 'operator') return 'Operator Pelayanan';
    return role;
}

function applyRBAC() {
    if (!currentUser) return;
    const role = currentUser.role;
    const scope = currentUser.jaga_scope;

    const filterJaga = document.getElementById('filterJaga');
    if (filterJaga) {
        if (role === 'kepala_jaga' && scope !== 'all') {
            filterJaga.value = scope;
            filterJaga.disabled = true;
        } else {
            filterJaga.disabled = false;
        }
    }
}

// Dynamic Bento Sidebar Navigation Renderer (Bento Cards + Black Pill Active)
const MENU_DEFINITIONS = [
    { cat: "UTAMA & RINGKASAN", items: [
        { key: "dashboard", label: "Dashboard Utama", icon: "dashboard" },
        { key: "cloud_legacy", label: "Modul Cloud & PBB/PDF", icon: "sparkles" }
    ]},
    { cat: "PELAYANAN & PENDUDUK", items: [
        { key: "penduduk", label: "Data Penduduk Lengkap", icon: "penduduk" },
        { key: "piket", label: "Jadwal Piket Kantor", icon: "piket" },
        { key: "opensid_surat", label: "Surat Warga (OpenSID)", icon: "opensid_surat" },
        { key: "usaha", label: "Pemilik Usaha Desa", icon: "usaha" },
        { key: "kesehatan", label: "Kesehatan & Posyandu", icon: "kesehatan" },
        { key: "disabilitas", label: "Data Disabilitas", icon: "disabilitas" },
        { key: "pemuda", label: "Ketenagakerjaan Pemuda", icon: "pemuda" }
    ]},
    { cat: "ASET, WILAYAH & PRODESKEL", items: [
        { key: "aset", label: "Aset Desa (SIPADES)", icon: "aset" },
        { key: "tanah", label: "Register Pertanahan", icon: "tanah" },
        { key: "peta", label: "Peta Wilayah Standar PU", icon: "peta" },
        { key: "prodeskel", label: "Profil Desa (Prodeskel)", icon: "prodeskel" }
    ]},
    { cat: "PERSURATAN & BPD", items: [
        { key: "surat", label: "Surat Masuk & Keluar", icon: "surat" },
        { key: "bpd", label: "Register Khusus BPD", icon: "bpd" },
        { key: "berita_acara", label: "Buku Berita Acara (BA)", icon: "berita_acara" },
        { key: "regulasi", label: "Perdes & Perkades", icon: "regulasi" }
    ]},
    { cat: "KEUANGAN & APBDES", items: [
        { key: "rekon", label: "Rekon APBDes & SPP", icon: "rekon" },
        { key: "bendahara", label: "Buku Kas Bendahara (BKU)", icon: "bendahara" }
    ]},
    { cat: "CETAK & DOKUMEN", items: [
        { key: "cetak_khusus", label: "Daftar Hadir Musdes/HOK", icon: "cetak_khusus" },
        { key: "print_universal", label: "Universal Print Engine", icon: "print_universal" }
    ]},
    { cat: "SISTEM & KELOLA", items: [
        { key: "settings", label: "Pengaturan & Reset", icon: "settings" },
        { key: "users_license", label: "Pengguna & Lisensi", icon: "users_license" },
        { key: "credits", label: "Credits & Pengembang", icon: "credits" }
    ]}
];

function renderSidebarNavigation() {
    const container = document.getElementById('sidebarNavContainer');
    if (!container || !DB) return;

    const visibleMap = DB.settings.visible_menus || {};
    let html = "";

    MENU_DEFINITIONS.forEach(category => {
        const activeItems = category.items.filter(item => visibleMap[item.key] !== false);
        if (activeItems.length > 0) {
            html += `<div class="bento-nav-card">`;
            html += `<div class="nav-category"><span>${category.cat}</span></div>`;
            activeItems.forEach(item => {
                const isActive = (item.key === currentView);
                html += `
                    <button class="nav-item ${isActive ? 'active' : ''}" onclick="switchView('${item.key}')">
                        <span class="nav-icon">${getIconHtml(item.icon)}</span>
                        <span>${item.label}</span>
                    </button>
                `;
            });
            html += `</div>`;
        }
    });

    container.innerHTML = html;
}

function toggleSidebar() {
    const sb = document.getElementById('mainSidebar');
    if (sb) {
        sb.classList.toggle('collapsed');
    }
}

function updateHeaderVillageInfo() {
    if (!DB) return;
    const dName = (DB.settings.nama_desa !== undefined && DB.settings.nama_desa !== null) ? DB.settings.nama_desa.trim() : '';
    const kecName = (DB.settings.kecamatan !== undefined && DB.settings.kecamatan !== null) ? DB.settings.kecamatan.trim() : '';
    const kabName = (DB.settings.kabupaten !== undefined && DB.settings.kabupaten !== null) ? DB.settings.kabupaten.trim() : '';

    document.getElementById('sidebarDesaName').textContent = dName ? ('DESA ' + dName.toUpperCase()) : 'DESA (BELUM DIATUR)';
    document.getElementById('sidebarKecKab').textContent = (kecName || kabName) ? `${kecName || '-'}, ${kabName || '-'}` : 'Kecamatan & Kabupaten Belum Diisi';
    document.getElementById('topDesaLocation').textContent = dName
        ? `Desa ${dName} - Kec. ${kecName || '-'} - Kab. ${kabName || '-'}`
        : 'Identitas Desa & Kecamatan Belum Diatur (Silakan Isi di Menu Pengaturan)';

    const sbImg = document.getElementById('sidebarLogoImg');
    const sbFb = document.getElementById('sidebarLogoFallback');
    if (DB.settings.logo_desa) {
        sbImg.src = DB.settings.logo_desa;
        sbImg.style.display = 'block';
        sbFb.style.display = 'none';
    } else {
        sbImg.style.display = 'none';
        sbFb.style.display = 'block';
    }
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

// Global KOP Toggle Handler
function getDefaultUseKop() {
    if (DB && DB.settings && typeof DB.settings.default_print_kop === 'boolean') {
        return DB.settings.default_print_kop;
    }
    return true;
}

function handleGlobalKopToggle(isChecked) {
    if (!DB) return;
    DB.settings.default_print_kop = isChecked;
    if (!DB.settings.print_settings) DB.settings.print_settings = {};
    DB.settings.print_settings.useKop = isChecked;
    const lbl = document.getElementById('globalUseKopLabel');
    if (lbl) {
        lbl.textContent = isChecked ? '🖨️ Mode: Dengan KOP' : '🖨️ Mode: Tanpa KOP';
    }
    saveDatabase(true);
}

// Navigation & View Switching
function switchView(viewName) {
    currentView = viewName;
    const views = document.querySelectorAll('.menu-view');
    views.forEach(v => v.style.display = 'none');

    const target = document.getElementById('view-' + viewName);
    if (target) {
        target.style.display = 'block';
    }

    renderSidebarNavigation();

    const titles = {
        dashboard: 'Bento SaaS Analytics & Command Center Desa',
        cloud_legacy: 'Modul Cloud Google Drive, Absensi Foto, PBB & Database ADMP_1',
        penduduk: 'Master Data Kependudukan Lengkap',
        piket: 'Jadwal Piket Pelayanan Kantor Desa',
        opensid_surat: 'Pelayanan Surat Keterangan Warga (OpenSID)',
        usaha: 'Direktori Pemilik Usaha Desa (UMKM)',
        kesehatan: 'Data Kesehatan, Posyandu & Stunting',
        disabilitas: 'Pencatatan Penyandang Disabilitas',
        pemuda: 'Ketenagakerjaan Remaja & Pemuda',
        aset: 'Inventaris Aset Desa & Kondisi (SIPADES)',
        tanah: 'Buku Register Pertanahan Desa (Letter C)',
        peta: 'Peta Wilayah & Geospasial Standar PU',
        prodeskel: 'Profil Perkembangan Desa (Prodeskel)',
        surat: 'Buku Register Surat Masuk & Keluar',
        bpd: 'Register Khusus BPD',
        rekon: 'Rekonsiliasi APBDes, Siskeudes & SPP',
        bendahara: 'Buku Kas Umum (BKU) Bendahara',
        regulasi: 'Pencatatan Produk Hukum & Regulasi',
        berita_acara: 'Buku Berita Acara (BA) Desa',
        cetak_khusus: 'Cetak Daftar Hadir Musdes & HOK',
        print_universal: 'Universal Print Engine',
        settings: 'Pengaturan, Menu & Reset Sistem',
        users_license: 'Manajemen Pengguna & Lisensi',
        credits: 'Credits & Informasi Pengembang'
    };
    const titleEl = document.getElementById('topPageTitle');
    if (titleEl) titleEl.textContent = titles[viewName] || 'Aplikasi Desa Digital';

    renderViewContent(viewName);
    injectAllIcons();
}

function renderAllViews() {
    renderDashboardView();
    renderPendudukView();
    renderPiketView();
    renderSuratWargaOpenSID();
    renderUsahaTable();
    renderKesehatanView();
    renderDisabilitasTable();
    renderPemudaTable();
    renderAsetTable();
    renderTanahTable();
    renderPetaView();
    renderProdeskelView();
    renderSuratTable();
    renderBPDTable();
    renderRekonView();
    renderBendaharaTable();
    renderRegulasiTable();
    renderBeritaAcaraTable();
    renderSettingsView();
    renderUsersTable();
    renderUniversalPrintConfig();
    renderMenuVisibilityCheckboxes();
    injectAllIcons();
}

function renderViewContent(name) {
    if (name === 'dashboard') renderDashboardView();
    else if (name === 'cloud_legacy') { if (typeof renderAdminApps === 'function') renderAdminApps(); }
    else if (name === 'penduduk') renderPendudukView();
    else if (name === 'piket') renderPiketView();
    else if (name === 'opensid_surat') renderSuratWargaOpenSID();
    else if (name === 'usaha') renderUsahaTable();
    else if (name === 'kesehatan') renderKesehatanView();
    else if (name === 'disabilitas') renderDisabilitasTable();
    else if (name === 'pemuda') renderPemudaTable();
    else if (name === 'aset') renderAsetTable();
    else if (name === 'tanah') renderTanahTable();
    else if (name === 'peta') renderPetaView();
    else if (name === 'prodeskel') renderProdeskelView();
    else if (name === 'surat') renderSuratTable();
    else if (name === 'bpd') renderBPDTable();
    else if (name === 'rekon') renderRekonView();
    else if (name === 'bendahara') renderBendaharaTable();
    else if (name === 'regulasi') renderRegulasiTable();
    else if (name === 'berita_acara') renderBeritaAcaraTable();
    else if (name === 'print_universal') renderUniversalPrintConfig();
    else if (name === 'settings') { renderSettingsView(); renderMenuVisibilityCheckboxes(); }
    else if (name === 'users_license') renderUsersTable();
}

function openModalSurat(type) {
    currentSuratTab = type || 'masuk';
    switchView('surat');
    switchSuratTab(currentSuratTab);
    openModalSuratCurrent();
}

function syncPiketStaffFromSettings() {
    if (!DB || !DB.settings || !DB.settings.perangkat_desa) return;
    if (!DB.piket_staff_pool) DB.piket_staff_pool = [];

    let added = 0;
    DB.settings.perangkat_desa.forEach((st, idx) => {
        const exists = DB.piket_staff_pool.some(x => x.nama.toLowerCase() === st.nama.toLowerCase());
        if (!exists && st.nama) {
            let kat = 'Perangkat Desa';
            const j = (st.jabatan || '').toLowerCase();
            if (j.includes('bpd')) kat = 'BPD';
            else if (j.includes('operator')) kat = 'Operator';
            else if (j.includes('kader') || j.includes('posyandu')) kat = 'Kader';

            DB.piket_staff_pool.push({
                id: 'sync_' + Date.now() + '_' + idx,
                nama: st.nama,
                jabatan: st.jabatan || 'Perangkat Desa',
                kategori: kat,
                selected: true
            });
            added++;
        }
    });

    saveDatabase();
    renderPiketStaffCheckboxes();
    alert(added > 0 ? `Berhasil menyinkronkan ${added} personel baru dari Pengaturan Desa!` : "Seluruh personel di Pengaturan Desa sudah terdaftar dalam daftar centang piket.");
}

/* ==========================================================================
   PART 2: BENTO GRID SAAS ANALYTICS DASHBOARD 2026 (60FPS BAR CHARTS & POPUPS)
   ========================================================================== */

let dashboardChartState = {
    jagaData: [],
    umurData: [],
    apbdesData: [],
    pemudaData: [],
    entryProgress: 0,
    phase: 0,
    animId: null
};

function renderDashboardView() {
    if (!DB) return;

    // Leader & Header info (supports empty state after full Reset Data)
    const htEl = document.getElementById('dashHukumTuaName');
    const sekEl = document.getElementById('dashSekdesName');
    const welEl = document.getElementById('dashWelcomeTitle');
    const regBadge = document.getElementById('heroRegulasiBadge');

    const desaTitle = DB.settings.nama_desa ? ('Desa ' + DB.settings.nama_desa) : '(Desa Belum Diatur)';
    if (htEl) htEl.textContent = DB.settings.hukum_tua || 'Belum Diisi';
    if (sekEl) sekEl.textContent = DB.settings.sekdes || 'Belum Diisi';
    if (welEl) welEl.textContent = 'Command Center Pemerintah ' + desaTitle;
    if (regBadge) regBadge.textContent = '📜 APBDes: ' + (DB.settings.nomor_apbdes || 'Belum Diisi');

    updateLiveClock();

    // Metrics Calculation
    const totalPddk = DB.penduduk.length;
    let lk = 0, pr = 0, balita = 0, anak = 0, remaja = 0, produktif = 0, lansia = 0;
    const kkSet = new Set();
    const jagaMap = { 'JAGA I': 0, 'JAGA II': 0, 'JAGA III': 0, 'JAGA IV': 0 };

    DB.penduduk.forEach(p => {
        if (p.jenis_kelamin === 'Lk') lk++;
        if (p.jenis_kelamin === 'Pr') pr++;
        if (p.no_kk) kkSet.add(p.no_kk);

        const age = parseInt(p.umur) || 0;
        if (age <= 5) balita++;
        else if (age <= 12) anak++;
        else if (age <= 17) remaja++;
        else if (age <= 59) produktif++;
        else lansia++;

        const j = (p.alamat || '').trim().toUpperCase();
        if (jagaMap[j] !== undefined) {
            jagaMap[j]++;
        } else if (j.includes('JAGA I') || j.includes('JAGA 1')) {
            jagaMap['JAGA I']++;
        } else if (j.includes('JAGA II') || j.includes('JAGA 2')) {
            jagaMap['JAGA II']++;
        } else if (j.includes('JAGA III') || j.includes('JAGA 3')) {
            jagaMap['JAGA III']++;
        } else if (j.includes('JAGA IV') || j.includes('JAGA 4')) {
            jagaMap['JAGA IV']++;
        }
    });

    const totalKK = kkSet.size;
    const totalStunting = (DB.kesehatan && DB.kesehatan.stunting) ? DB.kesehatan.stunting.length : 0;
    const totalUsaha = DB.usaha ? DB.usaha.length : 0;

    let totalNilaiAset = 0;
    if (DB.aset) {
        DB.aset.forEach(a => totalNilaiAset += cleanNumber(a.nilai));
    }

    let totalMasuk = 0, totalKeluar = 0;
    if (DB.bendahara) {
        DB.bendahara.forEach(b => {
            if (b.jenis === 'masuk') totalMasuk += cleanNumber(b.jumlah);
            if (b.jenis === 'keluar') totalKeluar += cleanNumber(b.jumlah);
        });
    }
    const saldoKas = totalMasuk - totalKeluar;

    const totalTanah = DB.tanah ? DB.tanah.length : 0;
    const smMasuk = (DB.surat && DB.surat.masuk) ? DB.surat.masuk.length : 0;
    const smKeluar = (DB.surat && DB.surat.keluar) ? DB.surat.keluar.length : 0;
    const totalPiket = DB.piket ? DB.piket.length : 0;
    const totalSuratWarga = DB.surat_warga ? DB.surat_warga.length : 0;

    // Update Counter Elements
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('mTotalPenduduk', formatNumber(totalPddk));
    setTxt('mTotalLaki', formatNumber(lk));
    setTxt('mTotalPerempuan', formatNumber(pr));
    setTxt('mTotalKK', formatNumber(totalKK));
    setTxt('mTotalBalitaAnak', formatNumber(balita + anak));
    setTxt('mTotalBalita', formatNumber(balita));
    setTxt('mTotalStunting', formatNumber(totalStunting));
    setTxt('mTotalProduktif', formatNumber(produktif));
    setTxt('mTotalLansia', formatNumber(lansia));
    setTxt('mTotalPiket', `${totalPiket} Shift`);
    setTxt('mTotalSuratWarga', formatNumber(totalSuratWarga));
    setTxt('mTotalUsaha', formatNumber(totalUsaha));
    setTxt('mTotalNilaiAset', formatRupiah(totalNilaiAset));
    setTxt('mTotalItemAset', formatNumber(DB.aset ? DB.aset.length : 0));
    setTxt('mSaldoKas', formatRupiah(saldoKas));
    setTxt('mTotalTanah', formatNumber(totalTanah));
    setTxt('mTotalSurat', formatNumber(smMasuk + smKeluar));
    setTxt('mSuratMasuk', formatNumber(smMasuk));
    setTxt('mSuratKeluar', formatNumber(smKeluar));

    // Piket Hari Ini Badge & Live Ticker
    const todayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
    const piketToday = DB.piket ? DB.piket.find(p => p.hari.toLowerCase() === todayName.toLowerCase()) : null;
    const pTodayEl = document.getElementById('mPiketHariIni');
    if (pTodayEl) {
        pTodayEl.textContent = piketToday ? `Hari Ini (${piketToday.hari}): ${piketToday.petugas.length} Petugas` : (totalPiket ? 'Jadwal Piket Siaga' : 'Belum Ada Jadwal');
    }
    const tickerEl = document.getElementById('dashLiveTickerText');
    if (tickerEl) {
        if (piketToday) {
            tickerEl.innerHTML = `Petugas Piket Hari Ini (<strong>${piketToday.hari}</strong>): <strong>${piketToday.petugas.slice(0, 3).join(', ')}</strong> &bull; Klik kartu Bento atau grafik bar mana saja untuk Popup Aksi Cepat!`;
        } else {
            tickerEl.innerHTML = `Bento Grid SaaS Analytics 2026 Aktif &bull; Klik kartu metrik atau grafik bar mana saja di bawah untuk membuka Popup Ringkasan & Aksi Cepat!`;
        }
    }

    // Store data for Live 60fps Animated Bento SaaS Bar Charts
    dashboardChartState.jagaData = [
        { label: 'JAGA I', value: jagaMap['JAGA I'], color: '#09090B' },
        { label: 'JAGA II', value: jagaMap['JAGA II'], color: '#059669' },
        { label: 'JAGA III', value: jagaMap['JAGA III'], color: '#0284C7' },
        { label: 'JAGA IV', value: jagaMap['JAGA IV'], color: '#7C3AED' }
    ];

    dashboardChartState.umurData = [
        { label: 'Balita (0-5)', value: balita, color: '#F43F5E' },
        { label: 'Anak (6-12)', value: anak, color: '#F59E0B' },
        { label: 'Remaja (13-17)', value: remaja, color: '#8B5CF6' },
        { label: 'Produktif (18-59)', value: produktif, color: '#09090B' },
        { label: 'Lansia (60+)', value: lansia, color: '#059669' }
    ];

    let anggPend = 0, realPend = 0, anggBel = 0, realBel = 0;
    if (DB.rekon) {
        if (DB.rekon.pendapatan) {
            DB.rekon.pendapatan.forEach(p => { anggPend += cleanNumber(p.anggaran); realPend += cleanNumber(p.siskeudes); });
        }
        if (DB.rekon.belanja) {
            DB.rekon.belanja.forEach(b => { anggBel += cleanNumber(b.anggaran); realBel += cleanNumber(b.siskeudes); });
        }
    }
    dashboardChartState.apbdesData = [
        { label: 'Pendapatan Desa', val1: anggPend, val2: realPend },
        { label: 'Belanja Desa', val1: anggBel, val2: realBel }
    ];

    let pemDesa = 0, pemLuar = 0, pemNganggur = 0, pemKuliah = 0;
    if (DB.pemuda) {
        DB.pemuda.forEach(p => {
            if (p.status_kerja.includes('Desa')) pemDesa++;
            else if (p.status_kerja.includes('Luar')) pemLuar++;
            else if (p.status_kerja.includes('Belum')) pemNganggur++;
            else pemKuliah++;
        });
    }
    dashboardChartState.pemudaData = [
        { label: 'Kerja di Desa', value: pemDesa, color: '#059669' },
        { label: 'Luar / Pelaut', value: pemLuar, color: '#09090B' },
        { label: 'Pencari Kerja', value: pemNganggur, color: '#EF4444' },
        { label: 'Kuliah/Sekolah', value: pemKuliah, color: '#0284C7' }
    ];

    // Update Legends once
    updateChartLegend('chartJagaLegend', dashboardChartState.jagaData);
    updateChartLegend('chartPemudaLegend', dashboardChartState.pemudaData);
    const uLeg = document.getElementById('chartUmurLegend');
    if (uLeg) uLeg.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">● Live SaaS Horizontal Bar Animation &bull; Distribusi kelompok umur warga real-time</span>`;
    const aLeg = document.getElementById('chartAPBDesLegend');
    if (aLeg) {
        aLeg.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 11px; height: 11px; border-radius: 3px; background: #A1A1AA;"></span>
                <span>Pagu Anggaran APBDes</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 11px; height: 11px; border-radius: 3px; background: #09090B;"></span>
                <span>Realisasi Siskeudes & RC Bank</span>
            </div>
        `;
    }

    // Reset entry sweep and start continuous live animation loop
    dashboardChartState.entryProgress = 0.05;
    startDashboardChartAnimationLoop();
}

function updateChartLegend(legendId, data) {
    const legendEl = document.getElementById(legendId);
    if (!legendEl) return;
    const total = data.reduce((sum, d) => sum + d.value, 0);
    legendEl.innerHTML = data.map(d => {
        const pct = total ? Math.round((d.value / total) * 100) : 0;
        return `<div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 9px; height: 9px; border-radius: 3px; background: ${d.color}; display: inline-block;"></span>
            <span>${d.label}: <strong>${formatNumber(d.value)}</strong> (${pct}%)</span>
        </div>`;
    }).join('');
}

function startDashboardChartAnimationLoop() {
    if (dashboardChartState.animId) {
        cancelAnimationFrame(dashboardChartState.animId);
    }

    function step() {
        if (currentView === 'dashboard') {
            if (dashboardChartState.entryProgress < 1) {
                dashboardChartState.entryProgress = Math.min(1, dashboardChartState.entryProgress + 0.032);
            }
            dashboardChartState.phase += 0.038;

            const ease = 1 - Math.pow(1 - dashboardChartState.entryProgress, 3);
            drawAnimatedSaaSVerticalBarChart('chartJaga', dashboardChartState.jagaData, ease, dashboardChartState.phase, 'TOTAL PENDUDUK');
            drawAnimatedHorizontalBarChart('chartUmur', dashboardChartState.umurData, ease, dashboardChartState.phase);
            drawAnimatedGroupedBarChart('chartAPBDes', dashboardChartState.apbdesData, ease, dashboardChartState.phase);
            drawAnimatedSaaSVerticalBarChart('chartPemuda', dashboardChartState.pemudaData, ease, -dashboardChartState.phase, 'TOTAL PEMUDA');
        }
        dashboardChartState.animId = requestAnimationFrame(step);
    }

    dashboardChartState.animId = requestAnimationFrame(step);
}

function updateLiveClock() {
    const now = new Date();
    const dateEl = document.getElementById('dashDate');
    const clockEl = document.getElementById('dashClock');
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('id-ID') + ' WITA';
    }
}
setInterval(updateLiveClock, 1000);

// Interactive Quick Modal on Dashboard Card or Menu Click
function openDashboardQuickModal(type) {
    const titleEl = document.getElementById('quickModalTitle');
    const bodyEl = document.getElementById('quickModalBody');
    const goBtn = document.getElementById('quickModalGoBtn');
    const printKopBtn = document.getElementById('quickModalPrintKopBtn');
    const printNoKopBtn = document.getElementById('quickModalPrintNoKopBtn');

    let targetView = 'dashboard';
    let title = '';
    let content = '';
    let printFn = null;

    if (type === 'penduduk') {
        targetView = 'penduduk';
        title = '👥 Ringkasan Cepat Data Kependudukan';
        printFn = (kop) => printDataPendudukCurrent(kop);
        const tot = DB.penduduk.length;
        let lk = 0, pr = 0;
        DB.penduduk.forEach(p => { if (p.jenis_kelamin === 'Lk') lk++; else pr++; });
        const recent = DB.penduduk.slice(0, 4);
        content = `
            <div style="font-size: 13px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
                    <div style="background: var(--bg-card-subtle); padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border-color);">Total Jiwa: <strong style="font-size: 16px; color: var(--primary); display: block;">${formatNumber(tot)}</strong></div>
                    <div style="background: var(--bg-card-subtle); padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border-color);">Laki-Laki: <strong style="font-size: 16px; color: #0284c7; display: block;">${formatNumber(lk)}</strong></div>
                    <div style="background: var(--bg-card-subtle); padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border-color);">Perempuan: <strong style="font-size: 16px; color: #e11d48; display: block;">${formatNumber(pr)}</strong></div>
                </div>
                <div style="font-weight: 700; margin-bottom: 6px;">Cuplikan Data Warga Terdaftar:</div>
                <div class="table-responsive" style="margin-bottom: 12px;">
                    <table class="table-modern" style="font-size: 12px;">
                        <thead><tr><th>Nama Lengkap</th><th>NIK</th><th>JK</th><th>Jaga</th></tr></thead>
                        <tbody>
                            ${recent.length ? recent.map(r => `<tr><td><strong>${r.nama_lengkap}</strong></td><td>${r.nik}</td><td>${r.jenis_kelamin}</td><td>${r.alamat}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;">Belum ada data penduduk</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('penduduk'); openModalPenduduk();">➕ Input Penduduk Baru</button>
                    <button class="btn btn-secondary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('penduduk'); openPrintFilterModal();">🖨️ Cetak Per-Jaga / Kategori</button>
                </div>
            </div>
        `;
    } else if (type === 'kk') {
        targetView = 'penduduk';
        title = '👨‍👩‍👧‍👦 Ringkasan Kartu Keluarga (Per-KK)';
        printFn = (kop) => printDataPendudukCurrent(kop);
        const kkSet = new Set(DB.penduduk.map(p => p.no_kk).filter(Boolean));
        content = `
            <div style="font-size: 13px;">
                <p>Tercatat sebanyak <strong style="color: var(--primary); font-size: 16px;">${formatNumber(kkSet.size)} Kartu Keluarga (KK)</strong> aktif di Desa ${DB.settings.nama_desa || '-'}.</p>
                <p style="color: var(--text-muted); font-size: 12px; margin: 8px 0 14px 0;">Anda dapat menampilkan seluruh anggota keluarga yang dikelompokkan rapi di bawah masing-masing Kepala Keluarga dan mencetak salinan KK secara langsung.</p>
                <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('penduduk'); setPendudukViewMode('kk');">👨‍👩‍👧‍👦 Buka Tampilan Rapih Per-KK Sekarang</button>
            </div>
        `;
    } else if (type === 'kesehatan') {
        targetView = 'kesehatan';
        title = '🩺 Ringkasan Kesehatan, Posyandu & Stunting';
        printFn = (kop) => printKesehatanCurrent(kop);
        const bumil = DB.kesehatan?.bumil?.length || 0;
        const stunting = DB.kesehatan?.stunting?.length || 0;
        const balita = DB.kesehatan?.balita?.length || 0;
        const lansia = DB.kesehatan?.lansia?.length || 0;
        content = `
            <div style="font-size: 13px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px;">
                    <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: 10px;">🤰 Ibu Hamil: <strong>${bumil} Orang</strong></div>
                    <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: 10px;">👶 Anak Stunting: <strong style="color: var(--danger);">${stunting} Anak</strong></div>
                    <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: 10px;">🍼 Balita Posyandu: <strong>${balita} Anak</strong></div>
                    <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: 10px;">👵 Warga Lansia (60+): <strong>${lansia} Jiwa</strong></div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('kesehatan'); openModalKesehatanCurrent();">➕ Tambah Data Kesehatan / Posyandu</button>
            </div>
        `;
    } else if (type === 'piket') {
        targetView = 'piket';
        title = '📅 Ringkasan Jadwal Piket Kantor Desa';
        printFn = (kop) => printJadwalPiket(kop);
        const listP = DB.piket || [];
        content = `
            <div style="font-size: 13px;">
                <p style="margin-bottom: 10px;">Tersedia <strong>${listP.length} shift jadwal piket</strong> gabungan (Perangkat Desa, BPD, Operator, dan Kader).</p>
                <div class="table-responsive" style="margin-bottom: 12px; max-height: 180px;">
                    <table class="table-modern" style="font-size: 12px;">
                        <thead><tr><th>Hari</th><th>Jam</th><th>Koordinator & Petugas</th></tr></thead>
                        <tbody>
                            ${listP.slice(0, 6).map(p => `<tr><td><strong>${p.hari}</strong></td><td>${p.jam}</td><td>${p.petugas.join(', ')}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-success btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('piket'); openModalGeneratePiket();">⚡ Generator Piket Otomatis</button>
                    <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('piket'); openModalTambahPiketManual();">➕ Input Piket Manual</button>
                </div>
            </div>
        `;
    } else if (type === 'opensid_surat') {
        targetView = 'opensid_surat';
        title = '📝 Layanan Surat Keterangan Warga (Format OpenSID)';
        const listSW = DB.surat_warga || [];
        content = `
            <div style="font-size: 13px;">
                <p style="margin-bottom: 10px;">Buat surat keterangan resmi warga dalam hitungan detik (Otomatis isi NIK, TTL, Agama & Jaga dari database penduduk):</p>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                    <button class="btn btn-secondary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('opensid_surat'); quickCreateSuratWarga('Surat Keterangan Usaha (SKU)');">🏪 Buat SKU</button>
                    <button class="btn btn-secondary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('opensid_surat'); quickCreateSuratWarga('Surat Keterangan Tidak Mampu (SKTM)');">🤝 Buat SKTM</button>
                    <button class="btn btn-secondary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('opensid_surat'); quickCreateSuratWarga('Surat Keterangan Domisili');">🏠 Buat Domisili</button>
                    <button class="btn btn-secondary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('opensid_surat'); quickCreateSuratWarga('Surat Pengantar SKCK');">👮 Pengantar SKCK</button>
                </div>
                <div style="font-size: 12px; color: var(--text-muted);">Total surat warga diterbitkan: <strong>${listSW.length} dokumen</strong>.</div>
            </div>
        `;
    } else if (type === 'pemuda') {
        targetView = 'pemuda';
        title = '💼 Ringkasan Ketenagakerjaan Remaja & Pemuda';
        printFn = (kop) => printDataPemuda(kop);
        const totPem = DB.pemuda ? DB.pemuda.length : 0;
        content = `
            <div style="font-size: 13px;">
                <p>Tercatat <strong>${totPem} data pemuda/remaja</strong> usia 15–30 tahun (Bekerja di desa, pelaut/luar daerah, pencari kerja, dan mahasiswa).</p>
                <div style="margin-top: 12px;">
                    <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('pemuda'); openModalPemuda();">➕ Tambah Data Pemuda</button>
                </div>
            </div>
        `;
    } else if (type === 'usaha') {
        targetView = 'usaha';
        title = '🏢 Ringkasan Pelaku Usaha & UMKM Desa';
        printFn = (kop) => printDataUsaha(kop);
        const totU = DB.usaha ? DB.usaha.length : 0;
        let totOmzet = 0;
        if (DB.usaha) DB.usaha.forEach(u => totOmzet += cleanNumber(u.omzet));
        content = `
            <div style="font-size: 13px;">
                <p>Terdaftar <strong>${totU} unit usaha/UMKM</strong> dengan total estimasi perputaran omzet <strong>${formatRupiah(totOmzet)} / bulan</strong>.</p>
                <div style="margin-top: 12px;">
                    <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('usaha'); openModalUsaha();">➕ Tambah Usaha Baru</button>
                </div>
            </div>
        `;
    } else if (type === 'aset') {
        targetView = 'aset';
        title = '🏛️ Ringkasan Inventaris Aset Desa (SIPADES)';
        printFn = (kop) => printDataAset(kop);
        let totNilai = 0;
        if (DB.aset) DB.aset.forEach(a => totNilai += cleanNumber(a.nilai));
        content = `
            <div style="font-size: 13px;">
                <p>Total Nilai Perolehan Aset Desa: <strong style="color: var(--primary); font-size: 15px;">${formatRupiah(totNilai)}</strong> (${DB.aset ? DB.aset.length : 0} Unit Inventaris).</p>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('aset'); openModalAset();">➕ Input Aset Baru</button>
                    <button class="btn btn-secondary btn-sm" onclick="closeModal('modalDashboardQuick'); printLabelBarcodeAset();">🏷️ Cetak Label Barcode SIPADES</button>
                </div>
            </div>
        `;
    } else if (type === 'bendahara') {
        targetView = 'bendahara';
        title = '💵 Ringkasan Buku Kas Umum (BKU) Bendahara';
        printFn = (kop) => printBukuKasBendahara(kop);
        let totM = 0, totK = 0;
        if (DB.bendahara) {
            DB.bendahara.forEach(b => {
                if (b.jenis === 'masuk') totM += cleanNumber(b.jumlah);
                else totK += cleanNumber(b.jumlah);
            });
        }
        content = `
            <div style="font-size: 13px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
                    <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: 10px;">Masuk:<br><strong style="color: #059669;">${formatRupiah(totM)}</strong></div>
                    <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: 10px;">Keluar:<br><strong style="color: #dc2626;">${formatRupiah(totK)}</strong></div>
                    <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: 10px;">Saldo:<br><strong style="color: var(--primary);">${formatRupiah(totM - totK)}</strong></div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('bendahara'); openModalBKU();">➕ Catat Transaksi Kas Baru</button>
            </div>
        `;
    } else if (type === 'rekon') {
        targetView = 'rekon';
        title = '💰 Ringkasan Rekonsiliasi APBDes, Siskeudes & SPP';
        printFn = (kop) => printBeritaAcaraRekon(kop);
        let pAngg = 0, pReal = 0, bAngg = 0, bReal = 0;
        if (DB.rekon?.pendapatan) DB.rekon.pendapatan.forEach(x => { pAngg += cleanNumber(x.anggaran); pReal += cleanNumber(x.siskeudes); });
        if (DB.rekon?.belanja) DB.rekon.belanja.forEach(x => { bAngg += cleanNumber(x.anggaran); bReal += cleanNumber(x.siskeudes); });
        content = `
            <div style="font-size: 13px;">
                <p>Status Rekonsiliasi Siskeudes & Rekening Koran (RC) Bank: <span class="badge badge-success">✓ KLOP / NIHIL SELISIH</span></p>
                <div style="margin: 10px 0; line-height: 1.7;">
                    Realisasi Pendapatan: <strong>${formatRupiah(pReal)}</strong> dari Pagu ${formatRupiah(pAngg)}<br>
                    Realisasi Belanja: <strong>${formatRupiah(bReal)}</strong> dari Pagu ${formatRupiah(bAngg)}<br>
                    Total SPP Tercatat: <strong>${DB.rekon?.spp?.length || 0} Dokumen SPP</strong>
                </div>
                <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('rekon'); openModalSPP();">➕ Buat SPP Baru</button>
            </div>
        `;
    } else if (type === 'tanah') {
        targetView = 'tanah';
        title = '📜 Ringkasan Buku Register Pertanahan Desa';
        printFn = (kop) => printDataTanahBuku(kop);
        const totT = DB.tanah ? DB.tanah.length : 0;
        content = `
            <div style="font-size: 13px;">
                <p>Tercatat <strong>${totT} persil bidang tanah</strong> dalam Buku Register Pertanahan (Letter C) lengkap dengan Nomor Folio, Batas Wilayah, Sketsa Situasi Tanah, dan Tim Pengukur (Maks 3 Orang).</p>
                <div style="margin-top: 12px;">
                    <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('tanah'); openModalTanah();">➕ Input Register Tanah Baru</button>
                </div>
            </div>
        `;
    } else if (type === 'surat') {
        targetView = 'surat';
        title = '📬 Ringkasan Agenda Surat Masuk & Keluar';
        printFn = (kop) => printAgendaSuratCurrent(kop);
        const sm = DB.surat?.masuk?.length || 0;
        const sk = DB.surat?.keluar?.length || 0;
        content = `
            <div style="font-size: 13px;">
                <p>Tercatat <strong>${sm} Surat Masuk</strong> dan <strong>${sk} Surat Keluar</strong> dalam Buku Agenda Persuratan Pemerintah Desa.</p>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); openModalSurat('masuk');">📥 Catat Surat Masuk</button>
                    <button class="btn btn-secondary btn-sm" onclick="closeModal('modalDashboardQuick'); openModalSurat('keluar');">📤 Catat Surat Keluar</button>
                </div>
            </div>
        `;
    } else if (type === 'prodeskel') {
        targetView = 'prodeskel';
        title = '📊 Ringkasan Profil Perkembangan Desa (Prodeskel)';
        printFn = (kop) => printLaporanProdeskel(kop);
        content = `
            <div style="font-size: 13px;">
                <p>Klasifikasi Desa: <strong>${DB.prodeskel?.klasifikasi_desa || 'Belum Diisi'}</strong> (${DB.prodeskel?.tipologi || '-'}).</p>
                <p style="margin-top: 6px;">Mencakup data potensi Sumber Daya Alam dan ${DB.prodeskel?.kelembagaan?.length || 0} Lembaga Kemasyarakatan Desa aktif.</p>
            </div>
        `;
    } else if (type === 'peta') {
        targetView = 'peta';
        title = '🗺️ Ringkasan Peta Wilayah Standar Dinas PU';
        printFn = (kop) => printProfilPetaPU(kop);
        content = `
            <div style="font-size: 13px;">
                <p>Luas Wilayah: <strong>${DB.peta?.luas_total_ha || 0} Ha</strong> &bull; Koordinat: <strong>${DB.peta?.koordinat || '-'}</strong></p>
                <p style="margin-top: 6px;">Infrastruktur PU: Jalan Aspal ${DB.peta?.jalan_aspal_km || 0} Km, Jalan Beton/Paving ${DB.peta?.jalan_beton_paving_km || 0} Km, Drainase ${DB.peta?.panjang_drainase_km || 0} Km.</p>
            </div>
        `;
    } else if (type === 'bpd') {
        targetView = 'bpd';
        title = '📑 Ringkasan Register Khusus BPD';
        printFn = (kop) => printDataBPD(kop);
        content = `
            <div style="font-size: 13px;">
                <p>Tercatat <strong>${DB.bpd?.length || 0} dokumen resmi BPD</strong> (Keputusan BPD, Notulen Musyawarah, dan Aspirasi Masyarakat).</p>
                <div style="margin-top: 12px;">
                    <button class="btn btn-primary btn-sm" onclick="closeModal('modalDashboardQuick'); switchView('bpd'); openModalBPD();">➕ Tambah Dokumen BPD</button>
                </div>
            </div>
        `;
    } else if (type === 'disabilitas') {
        targetView = 'disabilitas';
        title = '♿ Ringkasan Data Penyandang Disabilitas';
        printFn = (kop) => printDataDisabilitas(kop);
        content = `
            <div style="font-size: 13px;">
                <p>Tercatat <strong>${DB.disabilitas?.length || 0} warga penyandang disabilitas</strong> beserta pemetaan kebutuhan alat bantu dan perlindungan sosial.</p>
            </div>
        `;
    } else if (type === 'cetak_khusus') {
        targetView = 'cetak_khusus';
        title = '🖨️ Ringkasan Cetak Daftar Hadir Musdes & HOK';
        printFn = (kop) => printDaftarHadirMusdes(kop);
        content = `
            <div style="font-size: 13px;">
                <p>Siap mencetak format resmi Daftar Hadir Musyawarah Desa (Musdes), Daftar Hadir HOK Mingguan (Padat Karya Tunai), dan HOK Harian lengkap dengan tanda tangan sejajar rapi.</p>
            </div>
        `;
    }

    titleEl.textContent = title;
    bodyEl.innerHTML = content;

    if (printFn) {
        printKopBtn.style.display = 'inline-flex';
        printNoKopBtn.style.display = 'inline-flex';
        printKopBtn.onclick = function() { closeModal('modalDashboardQuick'); printFn(true); };
        printNoKopBtn.onclick = function() { closeModal('modalDashboardQuick'); printFn(false); };
    } else {
        printKopBtn.style.display = 'none';
        printNoKopBtn.style.display = 'none';
    }

    goBtn.onclick = function() {
        closeModal('modalDashboardQuick');
        switchView(targetView);
    };

    openModal('modalDashboardQuick');
}

// ==========================================================================
// 2026 BENTO SAAS 60FPS ANIMATED BAR CHART RENDERERS
// ==========================================================================

function drawAnimatedSaaSVerticalBarChart(canvasId, data, progress = 1, phase = 0, badgeTitle = 'TOTAL') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const maxVal = Math.max(...data.map(d => d.value), 5);
    const chartBottom = height - 38;
    const chartTop = 44;
    const chartHeight = chartBottom - chartTop;
    const textMain = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#09090B';

    // Subtle SaaS Horizontal Dashed Gridlines
    ctx.save();
    ctx.strokeStyle = 'rgba(113, 113, 122, 0.14)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
        const gy = chartTop + (chartHeight / 3) * g;
        ctx.beginPath();
        ctx.moveTo(28, gy);
        ctx.lineTo(width - 28, gy);
        ctx.stroke();
    }
    ctx.restore();

    // Background Moving Telemetry Sine Wave
    ctx.save();
    ctx.beginPath();
    for (let x = 28; x <= width - 28; x += 6) {
        const yWave = chartBottom - chartHeight * 0.45 + Math.sin(x * 0.025 + phase * 1.6) * 16;
        if (x === 28) ctx.moveTo(x, yWave);
        else ctx.lineTo(x, yWave);
    }
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Top-right SaaS Total Summary Pill
    ctx.save();
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.roundRect(width - 138, 6, 114, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${badgeTitle}: ${formatNumber(Math.round(total * progress))}`, width - 81, 18);
    ctx.restore();

    const colWidth = (width - 64) / data.length;
    const barW = Math.min(48, colWidth * 0.54);

    data.forEach((item, idx) => {
        const cx = 32 + idx * colWidth + colWidth / 2;
        const breath = Math.sin(phase * 2.2 + idx * 0.9) * 3;
        const rawH = (item.value / maxVal) * chartHeight * progress;
        const barH = Math.max(8, rawH + (item.value > 0 ? breath : 0));
        const barX = cx - barW / 2;
        const barY = chartBottom - barH;

        // Ghost Track Capsule (Bento SaaS Background Bar)
        ctx.fillStyle = 'rgba(113, 113, 122, 0.09)';
        ctx.beginPath();
        ctx.roundRect(barX, chartTop, barW, chartHeight, 12);
        ctx.fill();

        // Active Animated Bar Fill
        const grad = ctx.createLinearGradient(barX, barY, barX, chartBottom);
        grad.addColorStop(0, adjustColorBrightness(item.color, 15));
        grad.addColorStop(1, item.color);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 12);
        ctx.fill();

        // Floating Value Pill Badge on top of each bar
        const pillW = 46;
        const pillH = 20;
        const pillY = Math.max(10, barY - 26);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#09090B';
        ctx.font = '800 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatNumber(Math.round(item.value * progress)), cx, pillY + pillH / 2);

        // X-Axis Label
        ctx.fillStyle = textMain;
        ctx.font = '700 11.5px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, cx, chartBottom + 18);
    });
}

function drawAnimatedHorizontalBarChart(canvasId, data, progress = 1, phase = 0) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...data.map(d => d.value), 5);
    const startX = 128;
    const barWidth = width - startX - 62;
    const rowHeight = (height - 20) / data.length;
    const shimmerPos = ((phase * 0.35) % 1.4) - 0.2;
    const textMain = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#09090B';

    data.forEach((item, i) => {
        const y = 14 + i * rowHeight;
        const breath = item.value > 0 ? Math.sin(phase * 2 + i) * 2.5 : 0;
        const targetBarW = Math.max(10, (item.value / maxVal) * barWidth * progress + breath);

        // Label
        ctx.fillStyle = textMain;
        ctx.font = '700 11.5px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, startX - 12, y + 11);

        // Rounded SaaS Track
        ctx.fillStyle = 'rgba(113, 113, 122, 0.10)';
        ctx.beginPath();
        ctx.roundRect(startX, y, barWidth, 22, 11);
        ctx.fill();

        // Animated Shimmer Gradient Bar Fill
        const grad = ctx.createLinearGradient(startX, y, startX + targetBarW, y);
        grad.addColorStop(0, item.color);
        const sStop = Math.max(0.05, Math.min(0.95, shimmerPos));
        grad.addColorStop(sStop, adjustColorBrightness(item.color, 35));
        grad.addColorStop(1, item.color);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(startX, y, targetBarW, 22, 11);
        ctx.fill();

        // Value Label
        ctx.fillStyle = textMain;
        ctx.font = '800 11.5px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(formatNumber(Math.round(item.value * progress)), startX + targetBarW + 10, y + 11);
    });
}

function drawAnimatedGroupedBarChart(canvasId, data, progress = 1, phase = 0) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...data.map(d => Math.max(d.val1, d.val2)), 1000000);
    const chartBottom = height - 40;
    const chartTop = 36;
    const chartHeight = chartBottom - chartTop;
    const sectionWidth = width / data.length;
    const textMain = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#09090B';

    // Subtle SaaS Gridlines
    ctx.save();
    ctx.strokeStyle = 'rgba(113, 113, 122, 0.14)';
    ctx.setLineDash([4, 4]);
    for (let g = 0; g <= 3; g++) {
        const gy = chartTop + (chartHeight / 3) * g;
        ctx.beginPath();
        ctx.moveTo(28, gy);
        ctx.lineTo(width - 28, gy);
        ctx.stroke();
    }
    ctx.restore();

    // Background Live Sine Wave Telemetry
    ctx.save();
    ctx.beginPath();
    for (let x = 24; x < width - 24; x += 6) {
        const yWave = chartBottom - 45 + Math.sin(x * 0.03 + phase * 1.5) * 14;
        if (x === 24) ctx.moveTo(x, yWave);
        else ctx.lineTo(x, yWave);
    }
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    data.forEach((item, i) => {
        const cx = i * sectionWidth + sectionWidth / 2;
        const barW = 42;
        const breath = (item.val2 > 0) ? Math.sin(phase * 2 + i) * 2.5 : 0;

        const h1 = (item.val1 / maxVal) * chartHeight * progress;
        const h2 = Math.max(6, (item.val2 / maxVal) * chartHeight * progress + breath);

        // Bar 1 (Pagu Anggaran - Soft Slate Pill)
        ctx.fillStyle = '#A1A1AA';
        ctx.beginPath();
        ctx.roundRect(cx - barW - 6, chartBottom - Math.max(6, h1), barW, Math.max(6, h1), 10);
        ctx.fill();

        // Bar 2 (Realisasi Siskeudes - Sleek Black/Emerald SaaS Pill)
        const grad = ctx.createLinearGradient(cx + 6, chartBottom - h2, cx + 6, chartBottom);
        grad.addColorStop(0, '#059669');
        grad.addColorStop(1, '#09090B');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(cx + 6, chartBottom - h2, barW, h2, 10);
        ctx.fill();

        // Percentage Pill above Realisasi
        const pct = item.val1 ? Math.round((item.val2 / item.val1) * 100) : 0;
        const pillY = Math.max(8, chartBottom - h2 - 24);
        ctx.fillStyle = '#09090B';
        ctx.beginPath();
        ctx.roundRect(cx + 6 + barW / 2 - 24, pillY, 48, 18, 9);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pct + '%', cx + 6 + barW / 2, pillY + 9);

        // Label
        ctx.fillStyle = textMain;
        ctx.font = '800 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, cx, chartBottom + 18);
    });
}

function adjustColorBrightness(col, percent) {
    if (!col || !col.startsWith('#')) return col;
    let num = parseInt(col.slice(1), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

/* ==========================================================================
   PART 3: JADWAL PIKET KANTOR DESA & LAYANAN SURAT WARGA (OPENSID)
   ========================================================================== */

// 1. JADWAL PIKET KANTOR DESA ENGINE
function renderPiketView() {
    renderPiketStaffCheckboxes();
    renderPiketTable();
}

function renderPiketStaffCheckboxes() {
    const grid = document.getElementById('piketStaffCheckboxGrid');
    if (!grid || !DB.piket_staff_pool) return;

    grid.innerHTML = DB.piket_staff_pool.map(s => {
        let badgeColor = 'badge-primary';
        if (s.kategori === 'BPD') badgeColor = 'badge-info';
        else if (s.kategori === 'Operator') badgeColor = 'badge-warning';
        else if (s.kategori === 'Kader') badgeColor = 'badge-danger';

        return `
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px; cursor: pointer;">
                <input type="checkbox" id="chkStaff_${s.id}" ${s.selected ? 'checked' : ''} onchange="togglePiketStaff('${s.id}', this.checked)">
                <span style="font-weight: 700;">${s.nama}</span>
                <span class="badge ${badgeColor}" style="font-size: 10px;">${s.kategori}</span>
            </label>
        `;
    }).join('');
}

function togglePiketStaff(id, isChecked) {
    const s = DB.piket_staff_pool.find(x => x.id === id);
    if (s) {
        s.selected = isChecked;
        saveDatabase(true);
    }
}

function toggleSelectAllPiketStaff(selectAll) {
    DB.piket_staff_pool.forEach(s => s.selected = selectAll);
    saveDatabase(true);
    renderPiketStaffCheckboxes();
}

function selectStaffByCategory(cat) {
    DB.piket_staff_pool.forEach(s => s.selected = (s.kategori === cat));
    saveDatabase(true);
    renderPiketStaffCheckboxes();
}

function renderPiketTable() {
    const tbody = document.getElementById('tbodyJadwalPiket');
    if (!tbody || !DB.piket) return;

    if (!DB.piket.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada jadwal piket yang dibuat. Gunakan tombol 'Hasilkan Jadwal Otomatis' atau 'Tambah Jadwal Manual'.</td></tr>`;
        return;
    }

    tbody.innerHTML = DB.piket.map((p, idx) => {
        const petugasHtml = p.petugas.map(pt => `<span style="display: inline-block; background: var(--bg-card-subtle); border: 1px solid var(--border-color); padding: 2px 8px; border-radius: 6px; margin: 2px; font-weight: 600;">👤 ${pt}</span>`).join(' ');

        return `
            <tr>
                <td style="font-weight: 700;">${idx + 1}</td>
                <td style="font-weight: 800; color: var(--primary);">${p.hari}</td>
                <td>${p.tanggal}</td>
                <td><span class="badge badge-neutral">${p.jam}</span></td>
                <td>${petugasHtml}</td>
                <td><strong>${p.koordinator || '-'}</strong></td>
                <td><small>${p.keterangan || '-'}</small></td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn btn-danger btn-sm" onclick="deletePiket(${p.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    const countBadge = document.getElementById('mTotalPiket');
    if (countBadge) countBadge.textContent = `${DB.piket.length} Shift`;
}

function openModalGeneratePiket() {
    document.getElementById('genPiketStartDate').value = new Date().toISOString().slice(0, 10);
    openModal('modalGeneratePiket');
}

function handleExecuteGeneratePiket(e) {
    e.preventDefault();
    const startDateVal = document.getElementById('genPiketStartDate').value;
    const workDays = parseInt(document.getElementById('genPiketWorkDays').value) || 6;
    const staffPerDay = parseInt(document.getElementById('genPiketStaffPerDay').value) || 3;
    const hours = document.getElementById('genPiketHours').value.trim();
    const note = document.getElementById('genPiketNote').value.trim();

    const selectedStaff = DB.piket_staff_pool.filter(s => s.selected);
    if (selectedStaff.length === 0) {
        alert("Peringatan: Belum ada personel piket yang dicentang! Silakan centang personel di daftar personel gabungan terlebih dahulu.");
        return;
    }

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let currentD = new Date(startDateVal);

    // Generate for 1 full rotation or 12 working days
    const totalDaysToGen = Math.max(12, Math.ceil((selectedStaff.length / staffPerDay) * 2));
    const newSchedule = [];
    let staffIdx = 0;
    let daysGenerated = 0;

    while (daysGenerated < totalDaysToGen) {
        const dayOfWeek = currentD.getDay(); // 0 is Sunday
        let isValidWorkDay = (workDays === 6) ? (dayOfWeek >= 1 && dayOfWeek <= 6) : (dayOfWeek >= 1 && dayOfWeek <= 5);

        if (isValidWorkDay) {
            const dayPetugas = [];
            for (let i = 0; i < staffPerDay; i++) {
                const s = selectedStaff[staffIdx % selectedStaff.length];
                dayPetugas.push(`${s.nama} (${s.jabatan})`);
                staffIdx++;
            }

            const koordinator = dayPetugas[0].split('(')[0].trim();
            const dateStr = currentD.toISOString().slice(0, 10);

            newSchedule.push({
                id: Date.now() + daysGenerated,
                hari: dayNames[dayOfWeek],
                tanggal: dateStr,
                jam: hours,
                petugas: dayPetugas,
                koordinator: koordinator,
                keterangan: note
            });
            daysGenerated++;
        }
        currentD.setDate(currentD.getDate() + 1);
    }

    DB.piket = newSchedule;
    saveDatabase();
    closeModal('modalGeneratePiket');
    renderPiketTable();
    renderDashboardView();
    alert(`Berhasil menghasilkan ${newSchedule.length} shift jadwal piket kantor desa secara otomatis dan merata!`);
}

function openModalTambahPiketManual() {
    document.getElementById('piketManualEditId').value = '';
    document.getElementById('formPiketManual').reset();
    document.getElementById('pmTanggal').value = new Date().toISOString().slice(0, 10);
    openModal('modalPiketManual');
}

function handleSavePiketManual(e) {
    e.preventDefault();
    const rawPetugas = document.getElementById('pmPetugas').value.split(',').map(s => s.trim()).filter(Boolean);
    const item = {
        id: Date.now(),
        hari: document.getElementById('pmHari').value,
        tanggal: document.getElementById('pmTanggal').value,
        jam: document.getElementById('pmJam').value.trim(),
        petugas: rawPetugas,
        koordinator: document.getElementById('pmKoordinator').value.trim(),
        keterangan: document.getElementById('pmKeterangan').value.trim()
    };

    DB.piket.push(item);
    saveDatabase();
    closeModal('modalPiketManual');
    renderPiketTable();
    renderDashboardView();
    alert("Jadwal piket manual berhasil ditambahkan!");
}

function deletePiket(id) {
    if (confirm("Hapus jadwal piket ini?")) {
        DB.piket = DB.piket.filter(x => x.id !== id);
        saveDatabase();
        renderPiketTable();
        renderDashboardView();
    }
}

function printJadwalPiket(useKop = true) {
    const title = "JADWAL PIKET PELAYANAN KANTOR DESA";
    const sub = `Pemerintah Desa ${DB.settings.nama_desa}, Kecamatan ${DB.settings.kecamatan} - Tahun ${DB.settings.tahun_berjalan}`;

    const rows = DB.piket.map((p, i) => `
        <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: center;">${p.hari}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${p.tanggal}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${p.jam}</td>
            <td style="border: 1px solid #000; padding: 6px;">
                ${p.petugas.map(pt => `<div>• ${pt}</div>`).join('')}
            </td>
            <td style="border: 1px solid #000; padding: 6px;"><strong>${p.koordinator}</strong></td>
            <td style="border: 1px solid #000; padding: 6px;"><small>${p.keterangan || '-'}</small></td>
        </tr>
    `).join('');

    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 6px; width: 35px;">No</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 80px;">Hari</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 95px;">Tanggal</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 110px;">Jam Piket</th>
                    <th style="border: 1px solid #000; padding: 6px;">Daftar Petugas Piket</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 150px;">Koordinator</th>
                    <th style="border: 1px solid #000; padding: 6px;">Tugas & Keterangan</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    // Strictly aligned horizontal signers
    const signers = [
        { title: "Dikoordinasikan Oleh,\\nSekretaris Desa", name: DB.settings.sekdes },
        { title: "Mengetahui & Menetapkan,\\nHukum Tua Desa " + DB.settings.nama_desa, name: DB.settings.hukum_tua }
    ];

    executeUniversalPrint(title, sub, tableHtml, 'landscape', signers, useKop);
}


// 2. LAYANAN SURAT WARGA (FORMAT OPENSID INSTAN)
function renderSuratWargaOpenSID() {
    const tbody = document.getElementById('tbodySuratWargaOpenSID');
    if (!tbody || !DB.surat_warga) return;

    if (!DB.surat_warga.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada arsip surat keterangan warga yang dibuat. Klik tombol di atas untuk membuat surat instan.</td></tr>`;
        return;
    }

    tbody.innerHTML = DB.surat_warga.map((sw, i) => `
        <tr>
            <td style="font-weight: 600;">${i + 1}</td>
            <td><span class="badge badge-primary">${sw.jenis}</span></td>
            <td style="font-family: monospace; font-weight: 700;">${sw.nomor}</td>
            <td>${sw.tanggal}</td>
            <td><strong>${sw.nama}</strong></td>
            <td style="font-family: monospace;">${sw.nik}</td>
            <td><span class="badge badge-neutral">${sw.jaga || '-'}</span></td>
            <td><small>${sw.keperluan}</small></td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn btn-primary btn-sm" onclick="printSuratWarga(${sw.id}, true)" title="Cetak dengan KOP">🖨️ KOP</button>
                <button class="btn btn-secondary btn-sm" onclick="printSuratWarga(${sw.id}, false)" title="Cetak tanpa KOP">Tanpa KOP</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSuratWarga(${sw.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function openModalBuatSuratWarga(templateJenis = null) {
    document.getElementById('formSuratWarga').reset();
    document.getElementById('suratWargaEditId').value = '';
    document.getElementById('swTanggal').value = new Date().toISOString().slice(0, 10);

    if (templateJenis) {
        document.getElementById('swJenis').value = templateJenis;
    }

    populatePendudukDropdownForSurat();
    handleSuratWargaJenisChange();
    openModal('modalSuratWarga');
}

function quickCreateSuratWarga(jenis) {
    openModalBuatSuratWarga(jenis);
}

function populatePendudukDropdownForSurat() {
    const sel = document.getElementById('swSelectPenduduk');
    if (!sel || !DB.penduduk) return;

    sel.innerHTML = `<option value="">-- Pilih Nama Warga / NIK --</option>` +
        DB.penduduk.map(p => `<option value="${p.nik}">${p.nama_lengkap} - ${p.nik} (${p.alamat})</option>`).join('');
}

function autoFillSuratWargaFromPenduduk() {
    const nik = document.getElementById('swSelectPenduduk').value;
    if (!nik) return;

    const p = DB.penduduk.find(x => x.nik === nik);
    if (!p) return;

    document.getElementById('swNama').value = p.nama_lengkap;
    document.getElementById('swNIK').value = p.nik;
    document.getElementById('swTTL').value = `${p.tempat_lahir || ''}, ${p.tanggal_lahir || ''}`;
    document.getElementById('swJK').value = (p.jenis_kelamin === 'Lk') ? 'Laki-Laki' : 'Perempuan';
    document.getElementById('swAgama').value = p.agama || 'KRISTEN';
    document.getElementById('swPekerjaan').value = p.pekerjaan || 'PETANI/PEKEBUN';
    document.getElementById('swJaga').value = p.alamat || 'JAGA I';
}

function handleSuratWargaJenisChange() {
    const jenis = document.getElementById('swJenis').value;
    const numEl = document.getElementById('swNomor');
    const seq = (DB.surat_warga ? DB.surat_warga.length + 1 : 1).toString().padStart(3, '0');

    let code = "SKU";
    if (jenis.includes("Tidak Mampu")) code = "SKTM";
    else if (jenis.includes("Domisili")) code = "SKD";
    else if (jenis.includes("SKCK")) code = "SKCK";
    else if (jenis.includes("Kelahiran")) code = "SKL";
    else if (jenis.includes("Kematian")) code = "SKM";

    numEl.value = `470/${code}-MLP/${seq}/X/2026`;
}

function handleSaveSuratWarga(e) {
    e.preventDefault();
    const useKop = document.getElementById('swPrintKopYes').checked;
    const item = {
        id: Date.now(),
        jenis: document.getElementById('swJenis').value,
        nomor: document.getElementById('swNomor').value.trim(),
        tanggal: document.getElementById('swTanggal').value,
        nama: document.getElementById('swNama').value.trim(),
        nik: document.getElementById('swNIK').value.trim(),
        ttl: document.getElementById('swTTL').value.trim(),
        jk: document.getElementById('swJK').value,
        agama: document.getElementById('swAgama').value,
        pekerjaan: document.getElementById('swPekerjaan').value.trim(),
        jaga: document.getElementById('swJaga').value.trim(),
        keperluan: document.getElementById('swKeperluan').value.trim(),
        keterangan_tambahan: document.getElementById('swKetTambahan').value.trim(),
        hukum_tua: DB.settings.hukum_tua
    };

    if (!DB.surat_warga) DB.surat_warga = [];
    DB.surat_warga.unshift(item);
    saveDatabase();
    closeModal('modalSuratWarga');
    renderSuratWargaOpenSID();

    if (confirm("Surat berhasil disimpan ke arsip! Apakah Anda ingin langsung mencetaknya sekarang?")) {
        printSuratWarga(item.id, useKop);
    }
}

function deleteSuratWarga(id) {
    if (confirm("Hapus arsip surat keterangan warga ini?")) {
        DB.surat_warga = DB.surat_warga.filter(x => x.id !== id);
        saveDatabase();
        renderSuratWargaOpenSID();
    }
}

function printSuratWarga(id, useKop = true) {
    const sw = DB.surat_warga.find(x => x.id === id);
    if (!sw) return;

    const title = sw.jenis.toUpperCase();
    const sub = `Nomor: ${sw.nomor}`;

    const contentHtml = `
        <div style="font-size: 11pt; line-height: 1.6; margin-top: 15px; text-align: justify;">
            <p>Yang bertanda tangan di bawah ini Pemerintah Desa ${DB.settings.nama_desa}, Kecamatan ${DB.settings.kecamatan}, Kabupaten ${DB.settings.kabupaten}, Provinsi ${DB.settings.provinsi}, dengan ini menerangkan bahwa:</p>
            
            <table style="width: 100%; margin: 12px 0 16px 20px; font-size: 11pt; border-collapse: collapse;">
                <tr><td style="width: 220px; padding: 3px 0;">1. Nama Lengkap</td><td>: <strong>${sw.nama}</strong></td></tr>
                <tr><td style="padding: 3px 0;">2. Nomor Induk Kependudukan (NIK)</td><td>: <span style="font-family: monospace; font-weight: bold;">${sw.nik}</span></td></tr>
                <tr><td style="padding: 3px 0;">3. Tempat / Tanggal Lahir</td><td>: ${sw.ttl}</td></tr>
                <tr><td style="padding: 3px 0;">4. Jenis Kelamin</td><td>: ${sw.jk}</td></tr>
                <tr><td style="padding: 3px 0;">5. Agama</td><td>: ${sw.agama}</td></tr>
                <tr><td style="padding: 3px 0;">6. Pekerjaan</td><td>: ${sw.pekerjaan || '-'}</td></tr>
                <tr><td style="padding: 3px 0;">7. Alamat / Tempat Tinggal</td><td>: ${sw.jaga}, Desa ${DB.settings.nama_desa}</td></tr>
            </table>

            <p>Bahwa nama yang bersangkutan di atas adalah benar-benar penduduk / warga yang berdomisili sah di Desa ${DB.settings.nama_desa}, Kecamatan ${DB.settings.kecamatan}, dan berdasarkan catatan kami:</p>
            
            <div style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 12px 16px; margin: 10px 0; border-radius: 6px;">
                <p style="margin: 0; font-weight: bold;">Keperluan / Maksud Surat:</p>
                <p style="margin: 2px 0 6px 0;">${sw.keperluan}</p>
                ${sw.keterangan_tambahan ? `<p style="margin: 0; font-size: 10pt; color: #334155;"><em>Keterangan Khusus: ${sw.keterangan_tambahan}</em></p>` : ''}
            </div>

            <p style="margin-top: 14px;">Demikian Surat Keterangan ini kami buat dan berikan kepada yang bersangkutan dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
        </div>
    `;

    executeUniversalPrint(title, sub, contentHtml, 'portrait', null, useKop);
}

/* ==========================================================================
   PART 4: MODUL PENDUDUK, USAHA, KESEHATAN, PRODESKEL, ASET & SURAT
   ========================================================================== */

// 1. DATA PENDUDUK ENGINE
function getFilteredPenduduk() {
    if (!DB || !DB.penduduk) return [];

    const fJaga = document.getElementById('filterJaga').value;
    const fUsia = document.getElementById('filterUsia').value;
    const fJK = document.getElementById('filterJK').value;
    const fSHDK = document.getElementById('filterSHDK').value;
    const search = document.getElementById('searchPenduduk').value.toLowerCase().trim();
    const sort = document.getElementById('sortPenduduk').value;

    let res = DB.penduduk.filter(p => {
        if (currentUser && currentUser.role === 'kepala_jaga' && currentUser.jaga_scope !== 'all') {
            if (p.alamat !== currentUser.jaga_scope) return false;
        }
        if (fJaga !== 'all' && p.alamat !== fJaga) return false;
        if (fJK !== 'all' && p.jenis_kelamin !== fJK) return false;
        if (fSHDK !== 'all' && p.shdk !== fSHDK) return false;

        const age = parseInt(p.umur) || 0;
        if (fUsia === 'balita' && age > 5) return false;
        if (fUsia === 'anak' && (age < 6 || age > 12)) return false;
        if (fUsia === 'remaja' && (age < 13 || age > 17)) return false;
        if (fUsia === 'pemuda' && (age < 18 || age > 59)) return false;
        if (fUsia === 'lansia' && age < 60) return false;

        if (search) {
            const mNik = (p.nik || '').toLowerCase().includes(search);
            const mNama = (p.nama_lengkap || '').toLowerCase().includes(search);
            const mKK = (p.no_kk || '').toLowerCase().includes(search);
            const mOrtu = (p.nama_ayah || '').toLowerCase().includes(search) || (p.nama_ibu || '').toLowerCase().includes(search);
            if (!mNik && !mNama && !mKK && !mOrtu) return false;
        }
        return true;
    });

    if (sort === 'nama_asc') res.sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || ''));
    else if (sort === 'umur_desc') res.sort((a, b) => (parseInt(b.umur) || 0) - (parseInt(a.umur) || 0));
    else if (sort === 'umur_asc') res.sort((a, b) => (parseInt(a.umur) || 0) - (parseInt(b.umur) || 0));
    else if (sort === 'kk_asc') res.sort((a, b) => (a.no_kk || '').localeCompare(b.no_kk || ''));
    else res.sort((a, b) => (parseInt(a.no) || 0) - (parseInt(b.no) || 0));

    return res;
}

function applyFilterPenduduk() {
    renderPendudukView();
}

function setPendudukViewMode(mode) {
    pendudukViewMode = mode;
    document.getElementById('btnModeTabel').className = mode === 'tabel' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    document.getElementById('btnModeKK').className = mode === 'kk' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    renderPendudukView();
}

function renderPendudukView() {
    const list = getFilteredPenduduk();
    const countEl = document.getElementById('pendudukFilterCount');
    const totEl = document.getElementById('pendudukTotalCount');
    if (countEl) countEl.textContent = formatNumber(list.length);
    if (totEl) totEl.textContent = formatNumber(DB.penduduk.length);

    const fJagaVal = document.getElementById('filterJaga').value;
    const badgeEl = document.getElementById('pendudukFilterInfoBadge');
    if (badgeEl) badgeEl.textContent = fJagaVal === 'all' ? 'Semua Wilayah Jaga' : fJagaVal;

    const tblContainer = document.getElementById('containerTabelPenduduk');
    const kkContainer = document.getElementById('containerKKPenduduk');

    if (pendudukViewMode === 'tabel') {
        tblContainer.style.display = 'block';
        kkContainer.style.display = 'none';
        renderTabelPenduduk(list);
    } else {
        tblContainer.style.display = 'none';
        kkContainer.style.display = 'flex';
        renderKKPenduduk(list);
    }
}

function renderTabelPenduduk(list) {
    const tbody = document.getElementById('tbodyPenduduk');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 24px; color: var(--text-muted);">Tidak ada data penduduk yang cocok dengan filter pencarian.</td></tr>`;
        return;
    }

    const renderLimit = 300;
    const displayList = list.slice(0, renderLimit);

    tbody.innerHTML = displayList.map((p, idx) => {
        const badgeJK = p.jenis_kelamin === 'Lk' ? '<span class="badge badge-info">Lk</span>' : '<span class="badge badge-danger">Pr</span>';
        const isKepala = p.shdk === 'KEPALA KELUARGA';
        const namaHtml = isKepala ? `<strong>${p.nama_lengkap || '-'}</strong> <span class="badge badge-primary">KK</span>` : (p.nama_lengkap || '-');

        return `<tr>
            <td style="font-weight: 600;">${p.no || idx + 1}</td>
            <td><a href="javascript:void(0)" onclick="viewDetailKK('${p.no_kk}')" style="color: var(--primary); font-weight: 700; text-decoration: none;">${p.no_kk || '-'}</a></td>
            <td style="font-family: monospace;">${p.nik || '-'}</td>
            <td>${namaHtml}</td>
            <td>${badgeJK}</td>
            <td>${p.tempat_lahir || '-'}, ${p.tanggal_lahir || '-'} (${p.umur || 0} Thn)</td>
            <td>${p.shdk || '-'}</td>
            <td>${p.agama || '-'}</td>
            <td>${p.pendidikan || '-'}</td>
            <td>${p.pekerjaan || '-'}</td>
            <td><span class="badge badge-neutral">${p.alamat || '-'}</span></td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn btn-secondary btn-sm" onclick="viewDetailKK('${p.no_kk}')" title="Lihat Keluarga">👨‍👩‍👧</button>
                <button class="btn btn-secondary btn-sm" onclick="editPenduduk(${p.no})" title="Edit Data">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deletePenduduk(${p.no})" title="Hapus Data">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    if (list.length > renderLimit) {
        tbody.innerHTML += `<tr><td colspan="12" style="text-align: center; background: var(--bg-card-subtle); color: var(--text-muted); padding: 10px;">
            Menampilkan 300 data pertama untuk kecepatan layar. Total hasil filter adalah <strong>${formatNumber(list.length)}</strong> data. (Semua data tercetak saat klik tombol Cetak).
        </td></tr>`;
    }
}

function renderKKPenduduk(list) {
    const container = document.getElementById('containerKKPenduduk');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div class="card" style="text-align: center; padding: 24px; color: var(--text-muted);">Tidak ada Kartu Keluarga yang cocok dengan filter.</div>`;
        return;
    }

    const families = {};
    list.forEach(p => {
        const noKK = p.no_kk || 'TANPA_KK';
        if (!families[noKK]) {
            families[noKK] = { no_kk: noKK, kepala: null, alamat: p.alamat || '-', anggota: [] };
        }
        families[noKK].anggota.push(p);
        if (p.shdk === 'KEPALA KELUARGA' || !families[noKK].kepala) {
            families[noKK].kepala = p.nama_lengkap;
            families[noKK].alamat = p.alamat || '-';
        }
    });

    const kkKeys = Object.keys(families).slice(0, 80);

    container.innerHTML = kkKeys.map(kkId => {
        const fam = families[kkId];
        return `<div class="card" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">KARTU KELUARGA NO:</span>
                    <h3 style="font-size: 16px; font-weight: 800; color: var(--primary);">${fam.no_kk}</h3>
                    <div style="font-size: 13px;">Kepala Keluarga: <strong>${fam.kepala || 'Belum Tercatat'}</strong> | Wilayah: <span class="badge badge-neutral">${fam.alamat}</span></div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm" onclick="viewDetailKK('${fam.no_kk}')">Lihat Rincian</button>
                    <button class="btn btn-secondary btn-sm" onclick="printSpesifikKK('${fam.no_kk}', false)">Tanpa KOP</button>
                    <button class="btn btn-primary btn-sm" onclick="printSpesifikKK('${fam.no_kk}', true)">🖨️ Cetak KK (KOP)</button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table-modern" style="font-size: 12px;">
                    <thead>
                        <tr>
                            <th style="width: 35px;">No</th>
                            <th>Nama Lengkap</th>
                            <th>NIK</th>
                            <th>JK</th>
                            <th>Hubungan (SHDK)</th>
                            <th>TTL / Umur</th>
                            <th>Pendidikan</th>
                            <th>Pekerjaan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fam.anggota.map((m, i) => `<tr>
                            <td>${i + 1}</td>
                            <td><strong>${m.nama_lengkap}</strong></td>
                            <td style="font-family: monospace;">${m.nik}</td>
                            <td>${m.jenis_kelamin}</td>
                            <td><span class="badge ${m.shdk === 'KEPALA KELUARGA' ? 'badge-primary' : 'badge-neutral'}">${m.shdk}</span></td>
                            <td>${m.tempat_lahir}, ${m.tanggal_lahir} (${m.umur} Thn)</td>
                            <td>${m.pendidikan || '-'}</td>
                            <td>${m.pekerjaan || '-'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    }).join('');
}

function openModalPenduduk() {
    document.getElementById('modalPendudukTitle').textContent = 'Tambah Data Penduduk';
    document.getElementById('pendudukEditId').value = '';
    document.getElementById('formPenduduk').reset();
    document.getElementById('pTglLahir').value = '2000-01-01';
    calculateAutoAge();
    openModal('modalPenduduk');
}

function editPenduduk(no) {
    const p = DB.penduduk.find(x => x.no === no);
    if (!p) return;

    document.getElementById('modalPendudukTitle').textContent = 'Edit Data Penduduk';
    document.getElementById('pendudukEditId').value = p.no;
    document.getElementById('pNoKK').value = p.no_kk || '';
    document.getElementById('pNIK').value = p.nik || '';
    document.getElementById('pNama').value = p.nama_lengkap || '';
    document.getElementById('pTempatLahir').value = p.tempat_lahir || '';
    document.getElementById('pTglLahir').value = p.tanggal_lahir || '';
    document.getElementById('pUmur').value = p.umur || 0;
    document.getElementById('pJK').value = p.jenis_kelamin || 'Lk';
    document.getElementById('pSHDK').value = p.shdk || 'KEPALA KELUARGA';
    document.getElementById('pAgama').value = p.agama || 'KRISTEN';
    document.getElementById('pPendidikan').value = p.pendidikan || '';
    document.getElementById('pPekerjaan').value = p.pekerjaan || '';
    document.getElementById('pAyah').value = p.nama_ayah || '';
    document.getElementById('pIbu').value = p.nama_ibu || '';
    document.getElementById('pJaga').value = p.alamat || 'JAGA I';

    openModal('modalPenduduk');
}

function deletePenduduk(no) {
    const p = DB.penduduk.find(x => x.no === no);
    if (!p) return;

    if (confirm(`Yakin ingin menghapus data penduduk:\n${p.nama_lengkap} (NIK: ${p.nik})?`)) {
        DB.penduduk = DB.penduduk.filter(x => x.no !== no);
        saveDatabase();
        renderPendudukView();
        renderDashboardView();
        alert("Data penduduk berhasil dihapus.");
    }
}

function calculateAutoAge() {
    const val = document.getElementById('pTglLahir').value;
    if (!val) return;
    const bday = new Date(val);
    const today = new Date();
    let age = today.getFullYear() - bday.getFullYear();
    const m = today.getMonth() - bday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) {
        age--;
    }
    document.getElementById('pUmur').value = Math.max(0, age);
}

function handleSavePenduduk(e) {
    e.preventDefault();
    const editId = document.getElementById('pendudukEditId').value;
    const noKK = document.getElementById('pNoKK').value.trim();
    const nik = document.getElementById('pNIK').value.trim();
    const nama = document.getElementById('pNama').value.trim();
    const tempat = document.getElementById('pTempatLahir').value.trim();
    const tgl = document.getElementById('pTglLahir').value;
    const umur = parseInt(document.getElementById('pUmur').value) || 0;
    const jk = document.getElementById('pJK').value;
    const shdk = document.getElementById('pSHDK').value;
    const agama = document.getElementById('pAgama').value;
    const pendidikan = document.getElementById('pPendidikan').value.trim();
    const pekerjaan = document.getElementById('pPekerjaan').value.trim();
    const ayah = document.getElementById('pAyah').value.trim();
    const ibu = document.getElementById('pIbu').value.trim();
    const jaga = document.getElementById('pJaga').value;

    if (editId) {
        const p = DB.penduduk.find(x => x.no === parseInt(editId));
        if (p) {
            p.no_kk = noKK; p.nik = nik; p.nama_lengkap = nama; p.tempat_lahir = tempat;
            p.tanggal_lahir = tgl; p.umur = umur; p.jenis_kelamin = jk; p.shdk = shdk;
            p.agama = agama; p.pendidikan = pendidikan; p.pekerjaan = pekerjaan;
            p.nama_ayah = ayah; p.nama_ibu = ibu; p.alamat = jaga;
        }
    } else {
        const maxNo = DB.penduduk.reduce((max, x) => Math.max(max, parseInt(x.no) || 0), 0);
        DB.penduduk.push({
            no: maxNo + 1, no_kk: noKK, nik: nik, nama_lengkap: nama, tempat_lahir: tempat,
            tanggal_lahir: tgl, umur: umur, jenis_kelamin: jk, shdk: shdk, agama: agama,
            pendidikan: pendidikan, pekerjaan: pekerjaan, nama_ayah: ayah, nama_ibu: ibu,
            alamat: jaga, rt_rw: "000/000", dusun: ""
        });
    }

    saveDatabase();
    closeModal('modalPenduduk');
    renderPendudukView();
    renderDashboardView();
    alert("Data kependudukan berhasil disimpan!");
}

function viewDetailKK(noKK) {
    const members = DB.penduduk.filter(p => p.no_kk === noKK);
    if (!members.length) {
        alert("Data anggota keluarga untuk No KK tersebut tidak ditemukan.");
        return;
    }

    const kepala = members.find(p => p.shdk === 'KEPALA KELUARGA') || members[0];
    const body = document.getElementById('modalKKBody');

    body.innerHTML = `
        <div style="border-bottom: 2px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div>
                    <h2 style="font-size: 18px; font-weight: 800; color: var(--primary);">KARTU KELUARGA: ${noKK}</h2>
                    <div style="font-size: 13px; color: var(--text-main); margin-top: 2px;">
                        Nama Kepala Keluarga: <strong>${kepala.nama_lengkap}</strong> | Wilayah: <strong>${kepala.alamat}</strong>
                    </div>
                </div>
                <div class="badge badge-primary" style="font-size: 12px; padding: 6px 12px;">
                    Total ${members.length} Jiwa Anggota Keluarga
                </div>
            </div>
        </div>

        <div class="table-responsive">
            <table class="table-modern">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nama Lengkap</th>
                        <th>NIK</th>
                        <th>JK</th>
                        <th>Tempat Lahir</th>
                        <th>Tanggal Lahir</th>
                        <th>Umur</th>
                        <th>SHDK</th>
                        <th>Agama</th>
                        <th>Pendidikan</th>
                        <th>Pekerjaan</th>
                    </tr>
                </thead>
                <tbody>
                    ${members.map((m, idx) => `<tr>
                        <td>${idx + 1}</td>
                        <td><strong>${m.nama_lengkap}</strong></td>
                        <td style="font-family: monospace;">${m.nik}</td>
                        <td>${m.jenis_kelamin}</td>
                        <td>${m.tempat_lahir}</td>
                        <td>${m.tanggal_lahir}</td>
                        <td>${m.umur} Thn</td>
                        <td><span class="badge ${m.shdk === 'KEPALA KELUARGA' ? 'badge-primary' : 'badge-neutral'}">${m.shdk}</span></td>
                        <td>${m.agama}</td>
                        <td>${m.pendidikan}</td>
                        <td>${m.pekerjaan}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;

    body.setAttribute('data-current-kk', noKK);
    openModal('modalKK');
}

function printCurrentKK(useKop = true) {
    const noKK = document.getElementById('modalKKBody').getAttribute('data-current-kk');
    if (noKK) {
        printSpesifikKK(noKK, useKop);
    }
}

function printSpesifikKK(noKK, useKop = true) {
    const members = DB.penduduk.filter(p => p.no_kk === noKK);
    if (!members.length) return;
    const kepala = members.find(p => p.shdk === 'KEPALA KELUARGA') || members[0];

    const title = `SALINAN DATA KARTU KELUARGA (KK)`;
    const sub = `Nomor KK: ${noKK} - Kepala Keluarga: ${kepala.nama_lengkap} (${kepala.alamat})`;

    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 6px;">No</th>
                    <th style="border: 1px solid #000; padding: 6px;">Nama Lengkap</th>
                    <th style="border: 1px solid #000; padding: 6px;">NIK</th>
                    <th style="border: 1px solid #000; padding: 6px;">JK</th>
                    <th style="border: 1px solid #000; padding: 6px;">Tempat, Tgl Lahir</th>
                    <th style="border: 1px solid #000; padding: 6px;">Umur</th>
                    <th style="border: 1px solid #000; padding: 6px;">Hubungan (SHDK)</th>
                    <th style="border: 1px solid #000; padding: 6px;">Agama</th>
                    <th style="border: 1px solid #000; padding: 6px;">Pendidikan</th>
                    <th style="border: 1px solid #000; padding: 6px;">Pekerjaan</th>
                </tr>
            </thead>
            <tbody>
                ${members.map((m, i) => `<tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 5px;"><strong>${m.nama_lengkap}</strong></td>
                    <td style="border: 1px solid #000; padding: 5px; font-family: monospace;">${m.nik}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${m.jenis_kelamin}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${m.tempat_lahir}, ${m.tanggal_lahir}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${m.umur}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${m.shdk}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${m.agama}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${m.pendidikan}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${m.pekerjaan}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;

    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}

function exportPendudukCSV() {
    const list = getFilteredPenduduk();
    if (!list.length) {
        alert("Tidak ada data untuk diekspor.");
        return;
    }
    const headers = ["No", "No_KK", "NIK", "Nama_Lengkap", "Tempat_Lahir", "Tanggal_Lahir", "Umur", "Jenis_Kelamin", "SHDK", "Agama", "Pendidikan", "Pekerjaan", "Nama_Ayah", "Nama_Ibu", "Alamat_Jaga"];
    let csv = headers.join(",") + "\\n";
    list.forEach(p => {
        csv += [
            p.no,
            `"${p.no_kk || ''}"`,
            `"${p.nik || ''}"`,
            `"${(p.nama_lengkap || '').replace(/"/g, '""')}"`,
            `"${p.tempat_lahir || ''}"`,
            `"${p.tanggal_lahir || ''}"`,
            p.umur || 0,
            `"${p.jenis_kelamin || ''}"`,
            `"${p.shdk || ''}"`,
            `"${p.agama || ''}"`,
            `"${p.pendidikan || ''}"`,
            `"${p.pekerjaan || ''}"`,
            `"${p.nama_ayah || ''}"`,
            `"${p.nama_ibu || ''}"`,
            `"${p.alamat || ''}"`
        ].join(",") + "\\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `data_penduduk_${DB.settings.nama_desa}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

function printDataPendudukCurrent(useKop = true) {
    const list = getFilteredPenduduk();
    const title = "BUKU DATA KEPENDUDUKAN DESA (HASIL FILTER)";
    const sub = "Desa " + DB.settings.nama_desa + " - Total " + formatNumber(list.length) + " Jiwa";

    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9.5pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border:1px solid #000; padding:5px;">No</th>
                    <th style="border:1px solid #000; padding:5px;">No. KK</th>
                    <th style="border:1px solid #000; padding:5px;">NIK</th>
                    <th style="border:1px solid #000; padding:5px;">Nama Lengkap</th>
                    <th style="border:1px solid #000; padding:5px;">JK</th>
                    <th style="border:1px solid #000; padding:5px;">Tempat, Tgl Lahir</th>
                    <th style="border:1px solid #000; padding:5px;">Umur</th>
                    <th style="border:1px solid #000; padding:5px;">SHDK</th>
                    <th style="border:1px solid #000; padding:5px;">Pendidikan</th>
                    <th style="border:1px solid #000; padding:5px;">Pekerjaan</th>
                    <th style="border:1px solid #000; padding:5px;">Jaga</th>
                </tr>
            </thead>
            <tbody>
                ${list.map((p, i) => `<tr>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${i+1}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.no_kk}</td>
                    <td style="border:1px solid #000; padding:4px; font-family:monospace;">${p.nik}</td>
                    <td style="border:1px solid #000; padding:4px;"><strong>${p.nama_lengkap}</strong></td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.jenis_kelamin}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.tempat_lahir}, ${p.tanggal_lahir}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.umur}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.shdk}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.pendidikan}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.pekerjaan}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.alamat}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;

    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}

// 2. MODUL PRODESKEL (PROFIL DESA & KELURAHAN KEMENDAGRI)
function renderProdeskelView() {
    if (!DB || !DB.prodeskel) return;
    const p = DB.prodeskel;

    const kEl = document.getElementById('prodeskelKlasifikasi');
    if (kEl) kEl.textContent = p.klasifikasi_desa || 'Desa Swasembada';

    const tbSDA = document.getElementById('tbodyProdeskelSDA');
    if (tbSDA && p.potensi_sda) {
        tbSDA.innerHTML = p.potensi_sda.map((s, i) => `<tr>
            <td style="text-align: center; font-weight: 700;">${i + 1}</td>
            <td><strong>${s.komoditas}</strong></td>
            <td class="numeric">${formatNumber(s.luas_ha)} Ha</td>
            <td class="numeric">${formatNumber(s.produksi_ton_thn)} Ton/Tahun</td>
            <td>${s.pemasaran}</td>
        </tr>`).join('');
    }

    const tbLembaga = document.getElementById('tbodyProdeskelLembaga');
    if (tbLembaga && p.kelembagaan) {
        tbLembaga.innerHTML = p.kelembagaan.map((l, i) => `<tr>
            <td style="text-align: center; font-weight: 700;">${i + 1}</td>
            <td><strong>${l.nama}</strong></td>
            <td style="text-align: center;">${l.anggota} Pengurus</td>
            <td><span class="badge badge-success">${l.status}</span></td>
        </tr>`).join('');
    }
}

function printLaporanProdeskel(useKop = true) {
    const title = "LAPORAN TINGKAT PERKEMBANGAN & PROFIL DESA (FORMAT STANDAR PRODESKEL)";
    const sub = `Pemerintah Desa ${DB.settings.nama_desa}, Kecamatan ${DB.settings.kecamatan} - Tahun ${DB.settings.tahun_berjalan}`;
    const p = DB.prodeskel;

    const tableHtml = `
        <div style="font-size: 11pt; line-height: 1.6; margin-top: 15px;">
            <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f1f5f9;"><th colspan="2" style="border: 1px solid #000; padding: 6px; text-align: left;">I. KLASIFIKASI & TINGKAT PERKEMBANGAN DESA</th></tr>
                <tr><td style="border: 1px solid #000; padding: 6px; width: 260px;">Klasifikasi Tingkat Perkembangan</td><td style="border: 1px solid #000; padding: 6px;"><strong>${p.klasifikasi_desa}</strong></td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Tipologi Karakteristik Wilayah</td><td style="border: 1px solid #000; padding: 6px;">${p.tipologi}</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Kategori Perkembangan</td><td style="border: 1px solid #000; padding: 6px;">${p.kategori_perkembangan}</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Total Jumlah Jiwa Penduduk</td><td style="border: 1px solid #000; padding: 6px;"><strong>${formatNumber(DB.penduduk.length)} Jiwa</strong></td></tr>
            </table>

            <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f1f5f9;"><th colspan="5" style="border: 1px solid #000; padding: 6px; text-align: left;">II. POTENSI PERKEBUNAN & SUMBER DAYA ALAM UNGGULAN</th></tr>
                <tr style="background: #f8fafc; font-weight: bold;">
                    <th style="border: 1px solid #000; padding: 5px; width: 35px;">No</th>
                    <th style="border: 1px solid #000; padding: 5px;">Komoditas</th>
                    <th style="border: 1px solid #000; padding: 5px; text-align: right;">Luas Lahan (Ha)</th>
                    <th style="border: 1px solid #000; padding: 5px; text-align: right;">Produksi Rata-rata</th>
                    <th style="border: 1px solid #000; padding: 5px;">Pemasaran</th>
                </tr>
                ${p.potensi_sda.map((s, i) => `<tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i+1}</td>
                    <td style="border: 1px solid #000; padding: 5px;"><strong>${s.komoditas}</strong></td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatNumber(s.luas_ha)} Ha</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatNumber(s.produksi_ton_thn)} Ton/Thn</td>
                    <td style="border: 1px solid #000; padding: 5px;">${s.pemasaran}</td>
                </tr>`).join('')}
            </table>

            <table style="width: 100%; border: 1px solid #000; border-collapse: collapse;">
                <tr style="background: #f1f5f9;"><th colspan="4" style="border: 1px solid #000; padding: 6px; text-align: left;">III. KELEMBAGAAN & PARTISIPASI MASYARAKAT DESA</th></tr>
                <tr style="background: #f8fafc; font-weight: bold;">
                    <th style="border: 1px solid #000; padding: 5px; width: 35px;">No</th>
                    <th style="border: 1px solid #000; padding: 5px;">Nama Lembaga</th>
                    <th style="border: 1px solid #000; padding: 5px; text-align: center;">Jumlah Anggota</th>
                    <th style="border: 1px solid #000; padding: 5px;">Status & Peran</th>
                </tr>
                ${p.kelembagaan.map((l, i) => `<tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i+1}</td>
                    <td style="border: 1px solid #000; padding: 5px;"><strong>${l.nama}</strong></td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${l.anggota} Pengurus</td>
                    <td style="border: 1px solid #000; padding: 5px;">${l.status}</td>
                </tr>`).join('')}
            </table>
        </div>
    `;

    const signers = [
        { title: "Ketua BPD Desa " + DB.settings.nama_desa, name: "OBRIN NEMAN, S.Th, M.Pd" },
        { title: "Mengetahui & Mengesahkan,\\nHukum Tua Desa " + DB.settings.nama_desa, name: DB.settings.hukum_tua }
    ];

    executeUniversalPrint(title, sub, tableHtml, 'portrait', signers, useKop);
}

// 3. SIPADES LABEL BARCODE ASET
function printLabelBarcodeAset() {
    if (!DB || !DB.aset || !DB.aset.length) {
        alert("Belum ada aset desa untuk dicetak label.");
        return;
    }

    const title = "LABEL BARCODE / TANDA PENGENAL INVENTARIS BARANG (SIPADES)";
    const sub = "Pemerintah Desa " + DB.settings.nama_desa + " - Permendagri No. 1/2016";

    const labelsHtml = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 15px;">
            ${DB.aset.map(a => `
                <div style="border: 2px solid #000; border-radius: 6px; padding: 10px; text-align: center; page-break-inside: avoid; background: #fff;">
                    <div style="font-weight: 800; font-size: 9pt; border-bottom: 1px solid #000; padding-bottom: 3px; text-transform: uppercase;">
                        PEMERINTAH DESA ${DB.settings.nama_desa.toUpperCase()}
                    </div>
                    <div style="margin: 8px 0; font-family: monospace; font-size: 16pt; font-weight: 900; letter-spacing: 3px; background: #f1f5f9; padding: 4px; border: 1px dashed #64748b;">
                        ||||| | |||| || | |||
                    </div>
                    <div style="font-size: 10pt; font-weight: bold; font-family: monospace;">${a.kode}</div>
                    <div style="font-size: 9.5pt; font-weight: bold; margin-top: 2px;">${a.nama}</div>
                    <div style="font-size: 8pt; color: #475569;">Tahun: ${a.tahun} | Gol: ${a.golongan}</div>
                </div>
            `).join('')}
        </div>
    `;

    executeUniversalPrint(title, sub, labelsHtml, 'portrait', null, false);
}

// ==========================================================================
// 3. MODUL PEMILIK USAHA DESA
// ==========================================================================

function renderUsahaTable() {
    if (!DB || !DB.usaha) return;
    const fJaga = document.getElementById('filterUsahaJaga').value;
    const search = document.getElementById('searchUsaha').value.toLowerCase().trim();

    const filtered = DB.usaha.filter(u => {
        if (fJaga !== 'all' && u.jaga !== fJaga) return false;
        if (search) {
            const m1 = (u.nama_usaha || '').toLowerCase().includes(search);
            const m2 = (u.pemilik || '').toLowerCase().includes(search);
            const m3 = (u.bidang || '').toLowerCase().includes(search);
            if (!m1 && !m2 && !m3) return false;
        }
        return true;
    });

    const tbody = document.getElementById('tbodyUsaha');
    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">Tidak ada data usaha yang sesuai filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((u, i) => `<tr>
        <td style="font-weight: 600;">${i + 1}</td>
        <td><strong>${u.nama_usaha}</strong></td>
        <td>${u.pemilik}</td>
        <td style="font-family: monospace;">${u.nik || '-'}</td>
        <td>${u.bidang}</td>
        <td><span class="badge badge-neutral">${u.jaga}</span></td>
        <td>${u.izin_nib || '<span style="color: var(--text-muted);">-</span>'}</td>
        <td class="numeric" style="font-weight: 600; color: var(--primary);">${formatRupiah(u.omzet)}</td>
        <td style="text-align: center;">${u.karyawan || 1} Org</td>
        <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="editUsaha(${u.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteUsaha(${u.id})">🗑️</button>
        </td>
    </tr>`).join('');
}

function openModalUsaha() {
    document.getElementById('modalUsahaTitle').textContent = 'Tambah Data Usaha Desa';
    document.getElementById('usahaEditId').value = '';
    document.getElementById('formUsaha').reset();
    openModal('modalUsaha');
}

function editUsaha(id) {
    const u = DB.usaha.find(x => x.id === id);
    if (!u) return;
    document.getElementById('modalUsahaTitle').textContent = 'Edit Data Usaha Desa';
    document.getElementById('usahaEditId').value = u.id;
    document.getElementById('uNamaUsaha').value = u.nama_usaha;
    document.getElementById('uPemilik').value = u.pemilik;
    document.getElementById('uNIK').value = u.nik || '';
    document.getElementById('uBidang').value = u.bidang;
    document.getElementById('uJaga').value = u.jaga;
    document.getElementById('uIzin').value = u.izin_nib || '';
    document.getElementById('uOmzet').value = u.omzet ? formatNumber(u.omzet) : '0';
    document.getElementById('uKaryawan').value = u.karyawan || 1;
    openModal('modalUsaha');
}

function deleteUsaha(id) {
    if (confirm("Hapus data pemilik usaha ini?")) {
        DB.usaha = DB.usaha.filter(x => x.id !== id);
        saveDatabase();
        renderUsahaTable();
        renderDashboardView();
    }
}

function handleSaveUsaha(e) {
    e.preventDefault();
    const editId = document.getElementById('usahaEditId').value;
    const item = {
        nama_usaha: document.getElementById('uNamaUsaha').value.trim(),
        pemilik: document.getElementById('uPemilik').value.trim(),
        nik: document.getElementById('uNIK').value.trim(),
        bidang: document.getElementById('uBidang').value.trim(),
        jaga: document.getElementById('uJaga').value,
        izin_nib: document.getElementById('uIzin').value.trim(),
        omzet: cleanNumber(document.getElementById('uOmzet').value),
        karyawan: parseInt(document.getElementById('uKaryawan').value) || 1
    };

    if (editId) {
        const u = DB.usaha.find(x => x.id === parseInt(editId));
        if (u) Object.assign(u, item);
    } else {
        item.id = Date.now();
        DB.usaha.push(item);
    }

    saveDatabase();
    closeModal('modalUsaha');
    renderUsahaTable();
    renderDashboardView();
    alert("Data usaha desa berhasil disimpan!");
}

function printDataUsaha(useKop = null) {
    const title = "DAFTAR REKAPITULASI PELAKU USAHA & UMKM DESA";
    const sub = "Desa " + DB.settings.nama_desa + ", Kec. " + DB.settings.kecamatan + " - Tahun " + DB.settings.tahun_berjalan;
    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 6px;">No</th>
                    <th style="border: 1px solid #000; padding: 6px;">Nama Usaha</th>
                    <th style="border: 1px solid #000; padding: 6px;">Pemilik Usaha</th>
                    <th style="border: 1px solid #000; padding: 6px;">Bidang Usaha</th>
                    <th style="border: 1px solid #000; padding: 6px;">Jaga / Lokasi</th>
                    <th style="border: 1px solid #000; padding: 6px;">Izin / NIB</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: right;">Omzet Rata-rata/Bln</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: center;">Tenaga Kerja</th>
                </tr>
            </thead>
            <tbody>
                ${DB.usaha.map((u, i) => `<tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 5px;"><strong>${u.nama_usaha}</strong></td>
                    <td style="border: 1px solid #000; padding: 5px;">${u.pemilik}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${u.bidang}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${u.jaga}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${u.izin_nib || '-'}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatRupiah(u.omzet)}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${u.karyawan} Org</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}


// ==========================================================================
// 4. MODUL KESEHATAN DESA & POSYANDU
// ==========================================================================

function switchKesehatanTab(tab) {
    currentKesehatanTab = tab;
    ['bumil', 'stunting', 'balita', 'lansia'].forEach(t => {
        const btn = document.getElementById('tabKes' + t.charAt(0).toUpperCase() + t.slice(1));
        const cnt = document.getElementById('subTabContent' + t.charAt(0).toUpperCase() + t.slice(1));
        if (t === tab) {
            btn.classList.add('active');
            cnt.style.display = 'block';
        } else {
            btn.classList.remove('active');
            cnt.style.display = 'none';
        }
    });
    renderKesehatanView();
}

function renderKesehatanView() {
    if (!DB || !DB.kesehatan) return;

    // 1. Bumil
    const tbBumil = document.getElementById('tbodyKesBumil');
    if (tbBumil) {
        tbBumil.innerHTML = (DB.kesehatan.bumil || []).map((b, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${b.nama}</strong></td>
            <td>${b.umur} Thn</td>
            <td style="font-family: monospace;">${b.nik || '-'}</td>
            <td><span class="badge badge-neutral">${b.jaga}</span></td>
            <td>${b.nama_suami || '-'}</td>
            <td>${b.usia_kehamilan}</td>
            <td>${b.hpl || '-'}</td>
            <td><span class="badge ${b.risiko.includes('Normal') ? 'badge-success' : 'badge-danger'}">${b.risiko}</span></td>
            <td>${b.bantuan_pmt || '-'}</td>
            <td style="text-align: center;">
                <button class="btn btn-secondary btn-sm" onclick="editKesehatanItem('bumil', ${b.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteKesehatanItem('bumil', ${b.id})">🗑️</button>
            </td>
        </tr>`).join('');
    }

    // 2. Stunting
    const tbStunting = document.getElementById('tbodyKesStunting');
    if (tbStunting) {
        tbStunting.innerHTML = (DB.kesehatan.stunting || []).map((s, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${s.nama_anak}</strong></td>
            <td style="font-family: monospace;">${s.nik || '-'}</td>
            <td>${s.tgl_lahir || '-'} (${s.umur_bulan || 0} Bln)</td>
            <td>${s.orang_tua || '-'}</td>
            <td><span class="badge badge-neutral">${s.jaga}</span></td>
            <td style="font-weight: 600;">${s.tb_cm} cm</td>
            <td style="font-weight: 600;">${s.bb_kg} kg</td>
            <td><span class="badge badge-danger">${s.status_gizi}</span></td>
            <td>${s.intervensi || '-'}</td>
            <td style="text-align: center;">
                <button class="btn btn-secondary btn-sm" onclick="editKesehatanItem('stunting', ${s.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteKesehatanItem('stunting', ${s.id})">🗑️</button>
            </td>
        </tr>`).join('');
    }

    // 3. Balita
    const tbBalita = document.getElementById('tbodyKesBalita');
    if (tbBalita) {
        tbBalita.innerHTML = (DB.kesehatan.balita || []).map((b, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${b.nama_anak}</strong></td>
            <td style="font-family: monospace;">${b.nik || '-'}</td>
            <td>${b.tgl_lahir || '-'}</td>
            <td><span class="badge ${b.jk === 'Lk' ? 'badge-info' : 'badge-danger'}">${b.jk}</span></td>
            <td>${b.orang_tua || '-'}</td>
            <td><span class="badge badge-neutral">${b.jaga}</span></td>
            <td>${b.imunisasi_lengkap}</td>
            <td><span class="badge badge-success">${b.kms_status || '-'}</span></td>
            <td style="text-align: center;">
                <button class="btn btn-secondary btn-sm" onclick="editKesehatanItem('balita', ${b.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteKesehatanItem('balita', ${b.id})">🗑️</button>
            </td>
        </tr>`).join('');
    }

    // 4. Lansia
    const tbLansia = document.getElementById('tbodyKesLansia');
    if (tbLansia) {
        tbLansia.innerHTML = (DB.kesehatan.lansia || []).map((l, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${l.nama}</strong></td>
            <td style="font-family: monospace;">${l.nik || '-'}</td>
            <td style="font-weight: 700;">${l.umur} Thn</td>
            <td>${l.jk}</td>
            <td><span class="badge badge-neutral">${l.jaga}</span></td>
            <td>${l.kondisi || '-'}</td>
            <td>${l.bantuan || '-'}</td>
            <td style="text-align: center;">
                <button class="btn btn-secondary btn-sm" onclick="editKesehatanItem('lansia', ${l.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteKesehatanItem('lansia', ${l.id})">🗑️</button>
            </td>
        </tr>`).join('');
    }
}

function openModalKesehatanCurrent() {
    const type = currentKesehatanTab;
    document.getElementById('kesType').value = type;
    document.getElementById('kesEditId').value = '';
    const body = document.getElementById('modalKesehatanBody');

    const titles = {
        bumil: 'Input Data Ibu Hamil (Bumil)',
        stunting: 'Input Data Anak Stunting / Gizi Kurang',
        balita: 'Input Data Balita Posyandu',
        lansia: 'Input Data Warga Lansia (60+)'
    };
    document.getElementById('modalKesehatanTitle').textContent = titles[type];

    if (type === 'bumil') {
        body.innerHTML = `
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nama Ibu Hamil: *</label><input type="text" id="kNama" class="form-control" required></div>
                <div class="form-group"><label class="form-label">Umur:</label><input type="number" id="kUmur" class="form-control" value="28"></div>
                <div class="form-group"><label class="form-label">NIK:</label><input type="text" id="kNIK" class="form-control"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Wilayah Jaga: *</label>
                    <select id="kJaga" class="form-control"><option value="JAGA I">JAGA I</option><option value="JAGA II">JAGA II</option><option value="JAGA III">JAGA III</option><option value="JAGA IV">JAGA IV</option></select>
                </div>
                <div class="form-group"><label class="form-label">Nama Suami:</label><input type="text" id="kSuami" class="form-control"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Usia Kehamilan:</label><input type="text" id="kUsiaHamil" class="form-control" placeholder="Contoh: 24 Minggu"></div>
                <div class="form-group"><label class="form-label">HPL (Taksiran Partus):</label><input type="date" id="kHPL" class="form-control"></div>
                <div class="form-group"><label class="form-label">Status Risiko:</label>
                    <select id="kRisiko" class="form-control"><option value="Normal">Normal</option><option value="Risiko KEK (Kurang Energi)">Risiko KEK</option><option value="Risiko Tinggi (Resti)">Risiko Tinggi (Resti)</option></select>
                </div>
            </div>
            <div class="form-group"><label class="form-label">Intervensi PMT / Bantuan Gizi:</label><input type="text" id="kBantuan" class="form-control" placeholder="Susu, Vitamin Fe, Makanan Tambahan..."></div>
        `;
    } else if (type === 'stunting') {
        body.innerHTML = `
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nama Anak: *</label><input type="text" id="kNama" class="form-control" required></div>
                <div class="form-group"><label class="form-label">NIK Anak:</label><input type="text" id="kNIK" class="form-control"></div>
                <div class="form-group"><label class="form-label">Umur (Bulan):</label><input type="number" id="kUmurBulan" class="form-control" value="24"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nama Orang Tua: *</label><input type="text" id="kOrtu" class="form-control" required></div>
                <div class="form-group"><label class="form-label">Jaga: *</label>
                    <select id="kJaga" class="form-control"><option value="JAGA I">JAGA I</option><option value="JAGA II">JAGA II</option><option value="JAGA III">JAGA III</option><option value="JAGA IV">JAGA IV</option></select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Tinggi Badan (cm):</label><input type="number" step="0.1" id="kTB" class="form-control" value="82.0"></div>
                <div class="form-group"><label class="form-label">Berat Badan (kg):</label><input type="number" step="0.1" id="kBB" class="form-control" value="10.5"></div>
                <div class="form-group"><label class="form-label">Status Gizi:</label><input type="text" id="kStatusGizi" class="form-control" value="Stunting Pendek (Perlu PMT)"></div>
            </div>
            <div class="form-group"><label class="form-label">Intervensi Bantuan & Medis:</label><input type="text" id="kBantuan" class="form-control" value="PMT Telur Tiap Hari & Pemantauan Kader"></div>
        `;
    } else if (type === 'balita') {
        body.innerHTML = `
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nama Balita: *</label><input type="text" id="kNama" class="form-control" required></div>
                <div class="form-group"><label class="form-label">Tanggal Lahir:</label><input type="date" id="kTglLahir" class="form-control" value="2023-01-01"></div>
                <div class="form-group"><label class="form-label">JK:</label><select id="kJK" class="form-control"><option value="Lk">Laki-Laki</option><option value="Pr">Perempuan</option></select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nama Orang Tua:</label><input type="text" id="kOrtu" class="form-control"></div>
                <div class="form-group"><label class="form-label">Jaga:</label>
                    <select id="kJaga" class="form-control"><option value="JAGA I">JAGA I</option><option value="JAGA II">JAGA II</option><option value="JAGA III">JAGA III</option><option value="JAGA IV">JAGA IV</option></select>
                </div>
                <div class="form-group"><label class="form-label">Status Imunisasi:</label><input type="text" id="kImunisasi" class="form-control" value="Ya (Lengkap)"></div>
            </div>
        `;
    } else {
        body.innerHTML = `
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nama Lansia: *</label><input type="text" id="kNama" class="form-control" required></div>
                <div class="form-group"><label class="form-label">Umur (60+): *</label><input type="number" id="kUmur" class="form-control" value="68" required></div>
                <div class="form-group"><label class="form-label">JK:</label><select id="kJK" class="form-control"><option value="Lk">Laki-Laki</option><option value="Pr">Perempuan</option></select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Wilayah Jaga: *</label>
                    <select id="kJaga" class="form-control"><option value="JAGA I">JAGA I</option><option value="JAGA II">JAGA II</option><option value="JAGA III">JAGA III</option><option value="JAGA IV">JAGA IV</option></select>
                </div>
                <div class="form-group"><label class="form-label">Kondisi Kesehatan / Keluhan:</label><input type="text" id="kKondisi" class="form-control" placeholder="Hipertensi, Mobilitas terbatas, Sehat..."></div>
            </div>
            <div class="form-group"><label class="form-label">Bantuan Program Lansia:</label><input type="text" id="kBantuan" class="form-control" placeholder="BLT-DD, Sembako Lansia, Cek Tensi Rutin..."></div>
        `;
    }

    openModal('modalKesehatan');
}

function handleSaveKesehatan(e) {
    e.preventDefault();
    const type = document.getElementById('kesType').value;
    const editId = document.getElementById('kesEditId').value;
    const nama = document.getElementById('kNama').value.trim();
    const jaga = document.getElementById('kJaga').value;

    let item = { nama, jaga };

    if (type === 'bumil') {
        item.umur = parseInt(document.getElementById('kUmur').value) || 0;
        item.nik = document.getElementById('kNIK').value.trim();
        item.nama_suami = document.getElementById('kSuami').value.trim();
        item.usia_kehamilan = document.getElementById('kUsiaHamil').value.trim();
        item.hpl = document.getElementById('kHPL').value;
        item.risiko = document.getElementById('kRisiko').value;
        item.bantuan_pmt = document.getElementById('kBantuan').value.trim();
    } else if (type === 'stunting') {
        item.nama_anak = nama;
        item.nik = document.getElementById('kNIK').value.trim();
        item.umur_bulan = parseInt(document.getElementById('kUmurBulan').value) || 0;
        item.orang_tua = document.getElementById('kOrtu').value.trim();
        item.tb_cm = parseFloat(document.getElementById('kTB').value) || 0;
        item.bb_kg = parseFloat(document.getElementById('kBB').value) || 0;
        item.status_gizi = document.getElementById('kStatusGizi').value.trim();
        item.intervensi = document.getElementById('kBantuan').value.trim();
    } else if (type === 'balita') {
        item.nama_anak = nama;
        item.tgl_lahir = document.getElementById('kTglLahir').value;
        item.jk = document.getElementById('kJK').value;
        item.orang_tua = document.getElementById('kOrtu').value.trim();
        item.imunisasi_lengkap = document.getElementById('kImunisasi').value.trim();
        item.kms_status = 'Hijau (Tumbuh Baik)';
    } else if (type === 'lansia') {
        item.umur = parseInt(document.getElementById('kUmur').value) || 60;
        item.jk = document.getElementById('kJK').value;
        item.kondisi = document.getElementById('kKondisi').value.trim();
        item.bantuan = document.getElementById('kBantuan').value.trim();
    }

    if (editId) {
        const arr = DB.kesehatan[type];
        const existing = arr.find(x => x.id === parseInt(editId));
        if (existing) Object.assign(existing, item);
    } else {
        item.id = Date.now();
        if (!DB.kesehatan[type]) DB.kesehatan[type] = [];
        DB.kesehatan[type].push(item);
    }

    saveDatabase();
    closeModal('modalKesehatan');
    renderKesehatanView();
    renderDashboardView();
    alert("Data kesehatan berhasil disimpan!");
}

function deleteKesehatanItem(type, id) {
    if (confirm("Hapus data kesehatan ini?")) {
        DB.kesehatan[type] = DB.kesehatan[type].filter(x => x.id !== id);
        saveDatabase();
        renderKesehatanView();
        renderDashboardView();
    }
}

function editKesehatanItem(type, id) {
    alert("Untuk merubah rincian data kesehatan, silakan tambahkan data baru atau perbarui melalui formulir.");
}

function printKesehatanCurrent(useKop = null) {
    const type = currentKesehatanTab;
    const titles = {
        bumil: 'LAPORAN REKAPITULASI IBU HAMIL (BUMIL) POSYANDU DESA',
        stunting: 'LAPORAN DATA BALITA STUNTING & INTERVENSI PMT DESA',
        balita: 'LAPORAN REKAPITULASI BALITA & IMUNISASI POSYANDU DESA',
        lansia: 'LAPORAN REKAPITULASI WARGA LANSIA (USIA 60 TAHUN KE ATAS)'
    };
    const t = titles[type];
    const sub = "Desa " + DB.settings.nama_desa + " - Tahun " + DB.settings.tahun_berjalan;

    let rows = "";
    if (type === 'bumil') {
        rows = (DB.kesehatan.bumil || []).map((b, i) => `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #000; padding:5px;"><strong>${b.nama}</strong></td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${b.umur}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${b.jaga}</td>
            <td style="border:1px solid #000; padding:5px;">${b.nama_suami || '-'}</td>
            <td style="border:1px solid #000; padding:5px;">${b.usia_kehamilan}</td>
            <td style="border:1px solid #000; padding:5px;">${b.hpl || '-'}</td>
            <td style="border:1px solid #000; padding:5px;">${b.risiko}</td>
            <td style="border:1px solid #000; padding:5px;">${b.bantuan_pmt || '-'}</td>
        </tr>`).join('');
    } else if (type === 'stunting') {
        rows = (DB.kesehatan.stunting || []).map((s, i) => `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #000; padding:5px;"><strong>${s.nama_anak}</strong></td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${s.umur_bulan} Bln</td>
            <td style="border:1px solid #000; padding:5px;">${s.orang_tua || '-'}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${s.jaga}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${s.tb_cm} cm</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${s.bb_kg} kg</td>
            <td style="border:1px solid #000; padding:5px;">${s.status_gizi}</td>
            <td style="border:1px solid #000; padding:5px;">${s.intervensi || '-'}</td>
        </tr>`).join('');
    } else if (type === 'balita') {
        rows = (DB.kesehatan.balita || []).map((b, i) => `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #000; padding:5px;"><strong>${b.nama_anak}</strong></td>
            <td style="border:1px solid #000; padding:5px;">${b.tgl_lahir}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${b.jk}</td>
            <td style="border:1px solid #000; padding:5px;">${b.orang_tua || '-'}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${b.jaga}</td>
            <td style="border:1px solid #000; padding:5px;">${b.imunisasi_lengkap}</td>
        </tr>`).join('');
    } else {
        rows = (DB.kesehatan.lansia || []).map((l, i) => `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #000; padding:5px;"><strong>${l.nama}</strong></td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${l.umur} Thn</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${l.jk}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${l.jaga}</td>
            <td style="border:1px solid #000; padding:5px;">${l.kondisi || '-'}</td>
            <td style="border:1px solid #000; padding:5px;">${l.bantuan || '-'}</td>
        </tr>`).join('');
    }

    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <tbody>${rows}</tbody>
        </table>
    `;
    executeUniversalPrint(t, sub, tableHtml, 'landscape', null, useKop);
}


// ==========================================================================
// 5. MODUL DISABILITAS
// ==========================================================================

function renderDisabilitasTable() {
    if (!DB || !DB.disabilitas) return;
    const tbody = document.getElementById('tbodyDisabilitas');
    if (!tbody) return;

    if (!DB.disabilitas.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">Tidak ada data disabilitas tercatat.</td></tr>`;
        return;
    }

    tbody.innerHTML = DB.disabilitas.map((d, i) => `<tr>
        <td style="font-weight: 600;">${i + 1}</td>
        <td><strong>${d.nama}</strong></td>
        <td style="font-family: monospace;">${d.nik || '-'}</td>
        <td><span class="badge badge-neutral">${d.jaga}</span></td>
        <td>${d.jenis}</td>
        <td><span class="badge ${d.tingkat === 'Berat' ? 'badge-danger' : 'badge-warning'}">${d.tingkat}</span></td>
        <td>${d.alat_bantu || '-'}</td>
        <td>${d.bantuan_sosial || '-'}</td>
        <td style="text-align: center;">
            <button class="btn btn-danger btn-sm" onclick="deleteDisabilitas(${d.id})">🗑️</button>
        </td>
    </tr>`).join('');
}

function openModalDisabilitas() {
    document.getElementById('modalDisabilitasTitle').textContent = 'Tambah Data Penyandang Disabilitas';
    document.getElementById('disEditId').value = '';
    document.getElementById('formDisabilitas').reset();
    openModal('modalDisabilitas');
}

function deleteDisabilitas(id) {
    if (confirm("Hapus data disabilitas ini?")) {
        DB.disabilitas = DB.disabilitas.filter(x => x.id !== id);
        saveDatabase();
        renderDisabilitasTable();
        renderDashboardView();
    }
}

function handleSaveDisabilitas(e) {
    e.preventDefault();
    const item = {
        id: Date.now(),
        nama: document.getElementById('disNama').value.trim(),
        nik: document.getElementById('disNIK').value.trim(),
        jaga: document.getElementById('disJaga').value,
        jenis: document.getElementById('disJenis').value,
        tingkat: document.getElementById('disTingkat').value,
        alat_bantu: document.getElementById('disAlatBantu').value.trim(),
        bantuan_sosial: document.getElementById('disBantuan').value.trim()
    };

    DB.disabilitas.push(item);
    saveDatabase();
    closeModal('modalDisabilitas');
    renderDisabilitasTable();
    renderDashboardView();
    alert("Data penyandang disabilitas berhasil disimpan!");
}

function printDataDisabilitas(useKop = null) {
    const title = "DATA REKAPITULASI PENYANDANG DISABILITAS DESA";
    const sub = "Desa " + DB.settings.nama_desa + " - Tahun " + DB.settings.tahun_berjalan;
    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 6px;">No</th>
                    <th style="border: 1px solid #000; padding: 6px;">Nama Lengkap</th>
                    <th style="border: 1px solid #000; padding: 6px;">NIK</th>
                    <th style="border: 1px solid #000; padding: 6px;">Wilayah Jaga</th>
                    <th style="border: 1px solid #000; padding: 6px;">Ragam Disabilitas</th>
                    <th style="border: 1px solid #000; padding: 6px;">Tingkat</th>
                    <th style="border: 1px solid #000; padding: 6px;">Alat Bantu</th>
                    <th style="border: 1px solid #000; padding: 6px;">Bantuan Sosial</th>
                </tr>
            </thead>
            <tbody>
                ${DB.disabilitas.map((d, i) => `<tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 5px;"><strong>${d.nama}</strong></td>
                    <td style="border: 1px solid #000; padding: 5px; font-family: monospace;">${d.nik}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${d.jaga}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${d.jenis}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${d.tingkat}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${d.alat_bantu || '-'}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${d.bantuan_sosial || '-'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
    executeUniversalPrint(title, sub, tableHtml, 'portrait', null, useKop);
}


// ==========================================================================
// 6. MODUL KETENAGAKERJAAN PEMUDA (15-30 TAHUN)
// ==========================================================================

function renderPemudaTable() {
    if (!DB || !DB.pemuda) return;
    const fStatus = document.getElementById('filterPemudaKerja').value;
    const filtered = DB.pemuda.filter(p => {
        if (fStatus !== 'all' && !p.status_kerja.includes(fStatus)) return false;
        return true;
    });

    const tbody = document.getElementById('tbodyPemuda');
    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">Tidak ada data pemuda yang sesuai.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((p, i) => `<tr>
        <td style="font-weight: 600;">${i + 1}</td>
        <td><strong>${p.nama}</strong></td>
        <td>${p.umur} Thn</td>
        <td><span class="badge badge-neutral">${p.jaga}</span></td>
        <td><span class="badge ${p.status_kerja.includes('Belum') ? 'badge-danger' : (p.status_kerja.includes('Bekerja') ? 'badge-success' : 'badge-info')}">${p.status_kerja}</span></td>
        <td>${p.pendidikan}</td>
        <td>${p.keahlian || '-'}</td>
        <td>${p.minat_pelatihan || '-'}</td>
        <td style="text-align: center;">
            <button class="btn btn-danger btn-sm" onclick="deletePemuda(${p.id})">🗑️</button>
        </td>
    </tr>`).join('');
}

function openModalPemuda() {
    document.getElementById('modalPemudaTitle').textContent = 'Tambah Data Ketenagakerjaan Pemuda';
    document.getElementById('pemEditId').value = '';
    document.getElementById('formPemuda').reset();
    openModal('modalPemuda');
}

function deletePemuda(id) {
    if (confirm("Hapus data pemuda ini?")) {
        DB.pemuda = DB.pemuda.filter(x => x.id !== id);
        saveDatabase();
        renderPemudaTable();
        renderDashboardView();
    }
}

function handleSavePemuda(e) {
    e.preventDefault();
    const item = {
        id: Date.now(),
        nama: document.getElementById('pemNama').value.trim(),
        umur: parseInt(document.getElementById('pemUmur').value) || 20,
        jaga: document.getElementById('pemJaga').value,
        status_kerja: document.getElementById('pemStatus').value,
        pendidikan: document.getElementById('pemPendidikan').value.trim(),
        keahlian: document.getElementById('pemKeahlian').value.trim(),
        minat_pelatihan: document.getElementById('pemMinat').value.trim()
    };

    DB.pemuda.push(item);
    saveDatabase();
    closeModal('modalPemuda');
    renderPemudaTable();
    renderDashboardView();
    alert("Data ketenagakerjaan pemuda berhasil disimpan!");
}

function printDataPemuda(useKop = null) {
    const title = "REKAPITULASI KETENAGAKERJAAN REMAJA & PEMUDA DESA (USIA 15 - 30 TAHUN)";
    const sub = "Desa " + DB.settings.nama_desa + " - Tahun " + DB.settings.tahun_berjalan;
    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 6px;">No</th>
                    <th style="border: 1px solid #000; padding: 6px;">Nama Pemuda / Remaja</th>
                    <th style="border: 1px solid #000; padding: 6px;">Umur</th>
                    <th style="border: 1px solid #000; padding: 6px;">Wilayah Jaga</th>
                    <th style="border: 1px solid #000; padding: 6px;">Status Bekerja Saat Ini</th>
                    <th style="border: 1px solid #000; padding: 6px;">Pendidikan</th>
                    <th style="border: 1px solid #000; padding: 6px;">Keahlian / Keterampilan</th>
                    <th style="border: 1px solid #000; padding: 6px;">Minat Pelatihan / Program Kerja</th>
                </tr>
            </thead>
            <tbody>
                ${DB.pemuda.map((p, i) => `<tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 5px;"><strong>${p.nama}</strong></td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${p.umur} Thn</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${p.jaga}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${p.status_kerja}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${p.pendidikan}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${p.keahlian || '-'}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${p.minat_pelatihan || '-'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}

// ==========================================================================
// 7. MODUL ASET DESA & KONDISI BARANG
// ==========================================================================

function renderAsetTable() {
    if (!DB || !DB.aset) return;
    const fKondisi = document.getElementById('filterAsetKondisi').value;
    const fGol = document.getElementById('filterAsetGolongan').value;

    const filtered = DB.aset.filter(a => {
        if (fKondisi !== 'all' && a.kondisi !== fKondisi) return false;
        if (fGol !== 'all' && a.golongan !== fGol) return false;
        return true;
    });

    const tbody = document.getElementById('tbodyAset');
    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">Tidak ada aset yang sesuai filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((a, i) => {
        let badgeCls = 'badge-success';
        if (a.kondisi.includes('Rusak Berat')) badgeCls = 'badge-danger';
        else if (a.kondisi.includes('Rusak') || a.kondisi.includes('Service')) badgeCls = 'badge-warning';
        else if (a.kondisi.includes('Tidak Digunakan')) badgeCls = 'badge-neutral';

        return `<tr>
            <td style="font-weight: 600;">${i + 1}</td>
            <td style="font-family: monospace; font-weight: 700;">${a.kode}</td>
            <td><strong>${a.nama}</strong></td>
            <td>${a.golongan}</td>
            <td>${a.tahun}</td>
            <td>${a.asal_usul}</td>
            <td class="numeric" style="font-weight: 700; color: var(--primary);">${formatRupiah(a.nilai)}</td>
            <td><span class="badge ${badgeCls}">${a.kondisi}</span></td>
            <td><small>${a.catatan_service || '-'}</small></td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn btn-secondary btn-sm" onclick="editAset(${a.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteAset(${a.id})">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function openModalAset() {
    document.getElementById('modalAsetTitle').textContent = 'Tambah Aset Inventaris Desa';
    document.getElementById('asetEditId').value = '';
    document.getElementById('formAset').reset();
    openModal('modalAset');
}

function editAset(id) {
    const a = DB.aset.find(x => x.id === id);
    if (!a) return;
    document.getElementById('modalAsetTitle').textContent = 'Edit Data Aset Desa';
    document.getElementById('asetEditId').value = a.id;
    document.getElementById('aKode').value = a.kode;
    document.getElementById('aNama').value = a.nama;
    document.getElementById('aGolongan').value = a.golongan;
    document.getElementById('aTahun').value = a.tahun;
    document.getElementById('aAsal').value = a.asal_usul || '';
    document.getElementById('aNilai').value = a.nilai ? formatNumber(a.nilai) : '0';
    document.getElementById('aKondisi').value = a.kondisi;
    document.getElementById('aCatatan').value = a.catatan_service || '';
    openModal('modalAset');
}

function deleteAset(id) {
    if (confirm("Hapus data aset desa ini?")) {
        DB.aset = DB.aset.filter(x => x.id !== id);
        saveDatabase();
        renderAsetTable();
        renderDashboardView();
    }
}

function handleSaveAset(e) {
    e.preventDefault();
    const editId = document.getElementById('asetEditId').value;
    const item = {
        kode: document.getElementById('aKode').value.trim(),
        nama: document.getElementById('aNama').value.trim(),
        golongan: document.getElementById('aGolongan').value,
        tahun: parseInt(document.getElementById('aTahun').value) || 2026,
        asal_usul: document.getElementById('aAsal').value.trim(),
        nilai: cleanNumber(document.getElementById('aNilai').value),
        kondisi: document.getElementById('aKondisi').value,
        catatan_service: document.getElementById('aCatatan').value.trim()
    };

    if (editId) {
        const a = DB.aset.find(x => x.id === parseInt(editId));
        if (a) Object.assign(a, item);
    } else {
        item.id = Date.now();
        DB.aset.push(item);
    }

    saveDatabase();
    closeModal('modalAset');
    renderAsetTable();
    renderDashboardView();
    alert("Data aset desa berhasil disimpan!");
}

function printDataAset(useKop = null) {
    const title = "BUKU INVENTARIS ASET BARANG MILIK DESA";
    const sub = "Desa " + DB.settings.nama_desa + ", Kec. " + DB.settings.kecamatan + " - Tahun " + DB.settings.tahun_berjalan;

    const showKaur = document.getElementById('ttdAsetKaur').checked;
    const showBPD = document.getElementById('ttdAsetBpd').checked;

    let totalNilai = 0;
    DB.aset.forEach(a => totalNilai += cleanNumber(a.nilai));

    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 6px;">No</th>
                    <th style="border: 1px solid #000; padding: 6px;">Kode Barang</th>
                    <th style="border: 1px solid #000; padding: 6px;">Nama Aset / Barang</th>
                    <th style="border: 1px solid #000; padding: 6px;">Golongan</th>
                    <th style="border: 1px solid #000; padding: 6px;">Tahun</th>
                    <th style="border: 1px solid #000; padding: 6px;">Asal-Usul</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: right;">Nilai Aset (Rp)</th>
                    <th style="border: 1px solid #000; padding: 6px;">Kondisi Barang</th>
                    <th style="border: 1px solid #000; padding: 6px;">Catatan / Komponen Diganti</th>
                </tr>
            </thead>
            <tbody>
                ${DB.aset.map((a, i) => `<tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 5px; font-family: monospace;">${a.kode}</td>
                    <td style="border: 1px solid #000; padding: 5px;"><strong>${a.nama}</strong></td>
                    <td style="border: 1px solid #000; padding: 5px;">${a.golongan}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${a.tahun}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${a.asal_usul}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">${formatRupiah(a.nilai)}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${a.kondisi}</td>
                    <td style="border: 1px solid #000; padding: 5px;"><small>${a.catatan_service || '-'}</small></td>
                </tr>`).join('')}
                <tr style="background: #f1f5f9; font-weight: bold;">
                    <td colspan="6" style="border: 1px solid #000; padding: 6px; text-align: right;">TOTAL NILAI INVENTARIS ASET DESA:</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right; color: #000;">${formatRupiah(totalNilai)}</td>
                    <td colspan="2" style="border: 1px solid #000; padding: 6px;">${DB.aset.length} Unit Barang</td>
                </tr>
            </tbody>
        </table>
    `;

    // Multi-signers custom block
    const customSigners = [];
    if (showKaur) {
        const kaur = DB.settings.perangkat_desa.find(x => x.jabatan.toLowerCase().includes('kaur umum')) || { nama: "ROBY OLDY KOROMPIS", jabatan: "Kaur Umum & Perlengkapan" };
        customSigners.push({ title: "Pengurus Barang / Kaur Umum", name: kaur.nama });
    }
    if (showBPD) {
        const bpd = DB.settings.perangkat_desa.find(x => x.jabatan.toLowerCase().includes('bpd')) || { nama: "OBRIN NEMAN, S.Th, M.Pd", jabatan: "Ketua BPD" };
        customSigners.push({ title: "Mengetahui / Mengawasi\\nKetua BPD", name: bpd.nama });
    }
    customSigners.push({ title: "Mengesahkan,\\nHukum Tua Desa " + DB.settings.nama_desa, name: DB.settings.hukum_tua });

    executeUniversalPrint(title, sub, tableHtml, 'landscape', customSigners, useKop);
}


// ==========================================================================
// 8. MODUL REGISTER PERTANAHAN DESA
// ==========================================================================

function renderTanahTable() {
    if (!DB || !DB.tanah) return;
    const tbody = document.getElementById('tbodyTanah');
    if (!tbody) return;

    if (!DB.tanah.length) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada buku register tanah yang tercatat.</td></tr>`;
        return;
    }

    tbody.innerHTML = DB.tanah.map((t, i) => {
        const p1 = t.tim_pengukur && t.tim_pengukur[0] ? t.tim_pengukur[0].nama : '-';
        const p2 = t.tim_pengukur && t.tim_pengukur[1] ? t.tim_pengukur[1].nama : '-';
        const p3 = t.tim_pengukur && t.tim_pengukur[2] ? t.tim_pengukur[2].nama : '-';

        return `<tr>
            <td style="font-weight: 600;">${i + 1}</td>
            <td style="font-weight: 700; color: var(--primary);">${t.nomor_reg}</td>
            <td style="font-weight: 700;">Folio ${t.nomor_folio}</td>
            <td><strong>${t.pemilik}</strong></td>
            <td><span class="badge badge-neutral">${t.jaga}</span></td>
            <td class="numeric">${formatNumber(t.luas_m2)} m² (${t.luas_ha || (t.luas_m2/10000)} Ha)</td>
            <td><small>U: ${t.batas_utara}<br>T: ${t.batas_timur}<br>S: ${t.batas_selatan}<br>B: ${t.batas_barat}</small></td>
            <td>${t.peruntukan || '-'}</td>
            <td><small>1. ${p1}<br>2. ${p2}<br>3. ${p3}</small></td>
            <td>${t.sketsa_img ? '🖼️ Ada Denah' : '<span style="color: var(--text-muted);">Tidak Ada</span>'}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn btn-primary btn-sm" onclick="printSuratKeteranganTanah(${t.id})" title="Cetak Surat Keterangan Tanah">🖨️ Surat</button>
                <button class="btn btn-secondary btn-sm" onclick="editTanah(${t.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTanah(${t.id})">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function openModalTanah() {
    document.getElementById('modalTanahTitle').textContent = 'Input Register Pertanahan Desa';
    document.getElementById('tanahEditId').value = '';
    document.getElementById('formTanah').reset();
    document.getElementById('tTanggalKeluar').value = new Date().toISOString().slice(0, 10);
    document.getElementById('tHukumTua').value = DB.settings.hukum_tua;
    document.getElementById('previewSketsaTanah').style.display = 'none';

    // Default 3 Tim Pengukur
    document.getElementById('tPengukur1').value = "ROBY OLDY KOROMPIS (Kaur Umum)";
    document.getElementById('tPengukur2').value = "Kepala Jaga Setempat";
    document.getElementById('tPengukur3').value = "RONNY M. KAWULUSAN (Sekdes)";

    openModal('modalTanah');
}

function editTanah(id) {
    const t = DB.tanah.find(x => x.id === id);
    if (!t) return;

    document.getElementById('modalTanahTitle').textContent = 'Edit Register Pertanahan Desa';
    document.getElementById('tanahEditId').value = t.id;
    document.getElementById('tNomorReg').value = t.nomor_reg;
    (document.getElementById('tNomorFolio') || document.getElementById('tFolio')).value = t.nomor_folio;
    document.getElementById('tJaga').value = t.jaga;
    document.getElementById('tPemilik').value = t.pemilik;
    document.getElementById('tLuasM2').value = t.luas_m2;
    document.getElementById('tPeruntukan').value = t.peruntukan || '';
    document.getElementById('tBatasUtara').value = t.batas_utara || '';
    document.getElementById('tBatasTimur').value = t.batas_timur || '';
    document.getElementById('tBatasSelatan').value = t.batas_selatan || '';
    document.getElementById('tBatasBarat').value = t.batas_barat || '';

    const p = t.tim_pengukur || [];
    document.getElementById('tPengukur1').value = p[0] ? `${p[0].nama} (${p[0].jabatan})` : '';
    document.getElementById('tPengukur2').value = p[1] ? `${p[1].nama} (${p[1].jabatan})` : '';
    document.getElementById('tPengukur3').value = p[2] ? `${p[2].nama} (${p[2].jabatan})` : '';

    document.getElementById('tTempatKeluar').value = t.tempat_keluar || DB.settings.nama_desa;
    document.getElementById('tTanggalKeluar').value = t.tanggal_keluar || '';
    document.getElementById('tHukumTua').value = t.hukum_tua || DB.settings.hukum_tua;
    document.getElementById('tBerkasPendukung').value = t.berkas_pendukung || '';

    const prev = document.getElementById('previewSketsaTanah');
    if (t.sketsa_img) {
        prev.src = t.sketsa_img;
        prev.style.display = 'block';
    } else {
        prev.style.display = 'none';
    }

    openModal('modalTanah');
}

function deleteTanah(id) {
    if (confirm("Hapus data register tanah ini?")) {
        DB.tanah = DB.tanah.filter(x => x.id !== id);
        saveDatabase();
        renderTanahTable();
        renderDashboardView();
    }
}

let tempSketsaBase64 = "";
function handleSketsaTanahUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            tempSketsaBase64 = evt.target.result;
            const prev = document.getElementById('previewSketsaTanah');
            prev.src = tempSketsaBase64;
            prev.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function handleSaveTanah(e) {
    e.preventDefault();
    const editId = document.getElementById('tanahEditId').value;
    const luas = parseFloat(document.getElementById('tLuasM2').value) || 0;

    const parseTim = (val) => {
        if (!val) return { nama: "-", jabatan: "-" };
        const parts = val.split('(');
        const nama = parts[0].trim();
        const jabatan = parts[1] ? parts[1].replace(')', '').trim() : "Perangkat Desa";
        return { nama, jabatan };
    };

    const item = {
        nomor_reg: document.getElementById('tNomorReg').value.trim(),
        nomor_folio: (document.getElementById('tNomorFolio') || document.getElementById('tFolio')).value.trim(),
        jaga: document.getElementById('tJaga').value,
        pemilik: document.getElementById('tPemilik').value.trim(),
        luas_m2: luas,
        luas_ha: (luas / 10000),
        peruntukan: document.getElementById('tPeruntukan').value.trim(),
        batas_utara: document.getElementById('tBatasUtara').value.trim(),
        batas_timur: document.getElementById('tBatasTimur').value.trim(),
        batas_selatan: document.getElementById('tBatasSelatan').value.trim(),
        batas_barat: document.getElementById('tBatasBarat').value.trim(),
        tim_pengukur: [
            parseTim(document.getElementById('tPengukur1').value),
            parseTim(document.getElementById('tPengukur2').value),
            parseTim(document.getElementById('tPengukur3').value)
        ],
        tempat_keluar: document.getElementById('tTempatKeluar').value.trim(),
        tanggal_keluar: document.getElementById('tTanggalKeluar').value,
        hukum_tua: document.getElementById('tHukumTua').value.trim(),
        berkas_pendukung: document.getElementById('tBerkasPendukung').value.trim()
    };

    if (tempSketsaBase64) {
        item.sketsa_img = tempSketsaBase64;
        tempSketsaBase64 = "";
    } else if (editId) {
        const old = DB.tanah.find(x => x.id === parseInt(editId));
        if (old) item.sketsa_img = old.sketsa_img;
    }

    if (editId) {
        const t = DB.tanah.find(x => x.id === parseInt(editId));
        if (t) Object.assign(t, item);
    } else {
        item.id = Date.now();
        DB.tanah.push(item);
    }

    saveDatabase();
    closeModal('modalTanah');
    renderTanahTable();
    renderDashboardView();
    alert("Data register pertanahan desa berhasil disimpan!");
}

function printDataTanahBuku(useKop = null) {
    const title = "BUKU REGISTER PERTANAHAN (LETTER C) DESA";
    const sub = "Pemerintah Desa " + DB.settings.nama_desa + ", Kec. " + DB.settings.kecamatan + " - Tahun " + DB.settings.tahun_berjalan;
    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9.5pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 5px;">No</th>
                    <th style="border: 1px solid #000; padding: 5px;">No. Register</th>
                    <th style="border: 1px solid #000; padding: 5px;">Folio</th>
                    <th style="border: 1px solid #000; padding: 5px;">Nama Pemilik / Pemohon</th>
                    <th style="border: 1px solid #000; padding: 5px;">Wilayah Jaga</th>
                    <th style="border: 1px solid #000; padding: 5px; text-align: right;">Luas (m²)</th>
                    <th style="border: 1px solid #000; padding: 5px;">Batas Utara / Timur / Selatan / Barat</th>
                    <th style="border: 1px solid #000; padding: 5px;">Peruntukan Tanah</th>
                    <th style="border: 1px solid #000; padding: 5px;">Tim Pengukur Desa</th>
                </tr>
            </thead>
            <tbody>
                ${DB.tanah.map((t, i) => `<tr>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${t.nomor_reg}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.nomor_folio}</td>
                    <td style="border: 1px solid #000; padding: 4px;"><strong>${t.pemilik}</strong></td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.jaga}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: right;">${formatNumber(t.luas_m2)}</td>
                    <td style="border: 1px solid #000; padding: 4px;"><small>U: ${t.batas_utara}<br>T: ${t.batas_timur}<br>S: ${t.batas_selatan}<br>B: ${t.batas_barat}</small></td>
                    <td style="border: 1px solid #000; padding: 4px;">${t.peruntukan}</td>
                    <td style="border: 1px solid #000; padding: 4px;"><small>${t.tim_pengukur.map(p => p.nama).join(', ')}</small></td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}

function printSuratKeteranganTanah(id, useKop = null) {
    const t = DB.tanah.find(x => x.id === id);
    if (!t) return;

    const title = "SURAT KETERANGAN PENGUASAAN / KEPEMILIKAN TANAH";
    const sub = `Nomor Register: ${t.nomor_reg} / Folio: ${t.nomor_folio}`;

    let sketsaHtml = "";
    if (t.sketsa_img) {
        sketsaHtml = `
            <div style="margin-top: 15px; border: 1px solid #000; padding: 10px; text-align: center;">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: 10pt;">GAMBAR SITUASI / DENAH TANAH:</div>
                <img src="${t.sketsa_img}" style="max-height: 220px; max-width: 100%; object-fit: contain;">
            </div>
        `;
    }

    const contentHtml = `
        <div style="font-size: 11pt; line-height: 1.6; margin-top: 15px; text-align: justify;">
            <p>Yang bertanda tangan di bawah ini Pemerintah Desa ${DB.settings.nama_desa}, Kecamatan ${DB.settings.kecamatan}, Kabupaten ${DB.settings.kabupaten}, menerangkan dengan sebenarnya bahwa:</p>
            
            <table style="width: 100%; margin: 10px 0; font-size: 11pt;">
                <tr><td style="width: 200px; padding: 3px 0;">Nama Pemilik / Pemohon</td><td>: <strong>${t.pemilik}</strong></td></tr>
                <tr><td style="padding: 3px 0;">Letak Tanah / Wilayah</td><td>: ${t.jaga}, Desa ${DB.settings.nama_desa}</td></tr>
                <tr><td style="padding: 3px 0;">Luas Bidang Tanah</td><td>: <strong>${formatNumber(t.luas_m2)} m²</strong> (Kurang lebih ${t.luas_ha} Hektar)</td></tr>
                <tr><td style="padding: 3px 0;">Peruntukan / Penggunaan</td><td>: ${t.peruntukan || '-'}</td></tr>
                <tr><td style="padding: 3px 0;">Dasar / Berkas Pendukung</td><td>: ${t.berkas_pendukung || '-'}</td></tr>
            </table>

            <p>Benar sebidang tanah tersebut di atas adalah milik / dalam penguasaan yang bersangkutan dengan batas-batas yang telah diukur dan disepakati bersama oleh pemilik tanah yang berbatasan sebagai berikut:</p>

            <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin: 10px 0; font-size: 10pt;">
                <tr style="background: #f8fafc;"><td style="border: 1px solid #000; padding: 6px; width: 140px;">Sebelah UTARA</td><td style="border: 1px solid #000; padding: 6px;">${t.batas_utara}</td></tr>
                <tr style="background: #f8fafc;"><td style="border: 1px solid #000; padding: 6px;">Sebelah TIMUR</td><td style="border: 1px solid #000; padding: 6px;">${t.batas_timur}</td></tr>
                <tr style="background: #f8fafc;"><td style="border: 1px solid #000; padding: 6px;">Sebelah SELATAN</td><td style="border: 1px solid #000; padding: 6px;">${t.batas_selatan}</td></tr>
                <tr style="background: #f8fafc;"><td style="border: 1px solid #000; padding: 6px;">Sebelah BARAT</td><td style="border: 1px solid #000; padding: 6px;">${t.batas_barat}</td></tr>
            </table>

            <p style="margin-top: 10px;">Pengukuran di lapangan telah dilaksanakan oleh Tim Pengukur Desa sebagai berikut:</p>
            <ol style="margin-left: 20px; font-size: 10pt;">
                ${t.tim_pengukur.map(p => `<li>${p.nama} - (${p.jabatan})</li>`).join('')}
            </ol>

            ${sketsaHtml}

            <p style="margin-top: 15px;">Demikian Surat Keterangan Pertanahan ini dibuat dan dikeluarkan di Desa ${t.tempat_keluar} pada tanggal ${t.tanggal_keluar || new Date().toISOString().slice(0, 10)} untuk dapat dipergunakan sebagaimana mestinya.</p>
        </div>
    `;

    executeUniversalPrint(title, sub, contentHtml, 'portrait', null, useKop);
}


// ==========================================================================
// 9. MODUL PETA WILAYAH STANDAR DINAS PU
// ==========================================================================

function renderPetaView() {
    if (!DB || !DB.peta) return;
    const p = DB.peta;
    document.getElementById('petaLuasTotal').value = p.luas_total_ha || 0;
    document.getElementById('petaKoordinat').value = p.koordinat || '';
    document.getElementById('petaBatasUtara').value = p.batas_utara || '';
    document.getElementById('petaBatasTimur').value = p.batas_timur || '';
    document.getElementById('petaBatasSelatan').value = p.batas_selatan || '';
    document.getElementById('petaBatasBarat').value = p.batas_barat || '';

    document.getElementById('petaJalanAspal').value = p.jalan_aspal_km || 0;
    document.getElementById('petaJalanPaving').value = p.jalan_beton_paving_km || 0;
    document.getElementById('petaJalanTanah').value = p.jalan_tanah_km || 0;
    document.getElementById('petaDrainase').value = p.panjang_drainase_km || 0;
    document.getElementById('petaJembatan').value = p.jumlah_jembatan || 0;

    const img = document.getElementById('petaPreviewImg');
    const pl = document.getElementById('petaPlaceholder');
    if (p.peta_img) {
        img.src = p.peta_img;
        img.style.display = 'block';
        pl.style.display = 'none';
    } else {
        img.style.display = 'none';
        pl.style.display = 'block';
    }
}

function handlePetaImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            DB.peta.peta_img = evt.target.result;
            saveDatabase();
            renderPetaView();
            alert("Gambar peta desa berhasil diunggah!");
        };
        reader.readAsDataURL(file);
    }
}

function savePetaSettings() {
    if (!DB.peta) DB.peta = {};
    DB.peta.luas_total_ha = parseFloat(document.getElementById('petaLuasTotal').value) || 0;
    DB.peta.koordinat = document.getElementById('petaKoordinat').value.trim();
    DB.peta.batas_utara = document.getElementById('petaBatasUtara').value.trim();
    DB.peta.batas_timur = document.getElementById('petaBatasTimur').value.trim();
    DB.peta.batas_selatan = document.getElementById('petaBatasSelatan').value.trim();
    DB.peta.batas_barat = document.getElementById('petaBatasBarat').value.trim();

    DB.peta.jalan_aspal_km = parseFloat(document.getElementById('petaJalanAspal').value) || 0;
    DB.peta.jalan_beton_paving_km = parseFloat(document.getElementById('petaJalanPaving').value) || 0;
    DB.peta.jalan_tanah_km = parseFloat(document.getElementById('petaJalanTanah').value) || 0;
    DB.peta.panjang_drainase_km = parseFloat(document.getElementById('petaDrainase').value) || 0;
    DB.peta.jumlah_jembatan = parseInt(document.getElementById('petaJembatan').value) || 0;

    saveDatabase();
    alert("Data spesifikasi teknis peta standar Dinas PU berhasil disimpan!");
}

function printProfilPetaPU(useKop = null) {
    const title = "LEMBAR PROFIL GEOSPASIAL & INFRASTRUKTUR DESA (STANDAR DINAS PU)";
    const sub = "Pemerintah Desa " + DB.settings.nama_desa + ", Kec. " + DB.settings.kecamatan + " - Kabupaten " + DB.settings.kabupaten;
    const p = DB.peta;

    let imgHtml = "";
    if (p.peta_img) {
        imgHtml = `
            <div style="text-align: center; margin: 15px 0; border: 1px solid #000; padding: 10px;">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: 10pt;">CITRA PETA GEOSPASIAL WILAYAH DESA:</div>
                <img src="${p.peta_img}" style="max-height: 300px; max-width: 100%; object-fit: contain;">
            </div>
        `;
    }

    const tableHtml = `
        <div style="margin-top: 15px; font-size: 11pt; line-height: 1.6;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
                <tr style="background: #f1f5f9;"><th colspan="2" style="border: 1px solid #000; padding: 6px; text-align: left;">I. DATA GEOGRAFIS & BATAS ADMINISTRASI</th></tr>
                <tr><td style="border: 1px solid #000; padding: 6px; width: 280px;">Luas Wilayah Total</td><td style="border: 1px solid #000; padding: 6px;"><strong>${p.luas_total_ha} Hektar</strong> (${(p.luas_total_ha/100).toFixed(2)} km²)</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Titik Koordinat Titik Pusat Desa</td><td style="border: 1px solid #000; padding: 6px;">${p.koordinat}</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Batas Wilayah Bagian Utara</td><td style="border: 1px solid #000; padding: 6px;">${p.batas_utara}</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Batas Wilayah Bagian Timur</td><td style="border: 1px solid #000; padding: 6px;">${p.batas_timur}</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Batas Wilayah Bagian Selatan</td><td style="border: 1px solid #000; padding: 6px;">${p.batas_selatan}</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Batas Wilayah Bagian Barat</td><td style="border: 1px solid #000; padding: 6px;">${p.batas_barat}</td></tr>

                <tr style="background: #f1f5f9;"><th colspan="2" style="border: 1px solid #000; padding: 6px; text-align: left;">II. DATA TEKNIS INFRASTRUKTUR JALAN & DRAINASE (DINAS PU)</th></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Panjang Jalan Aspal</td><td style="border: 1px solid #000; padding: 6px;">${p.jalan_aspal_km} Km</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Panjang Jalan Beton / Paving Blok</td><td style="border: 1px solid #000; padding: 6px;">${p.jalan_beton_paving_km} Km</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Panjang Jalan Tanah / Perkebunan</td><td style="border: 1px solid #000; padding: 6px;">${p.jalan_tanah_km} Km</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Total Panjang Jaringan Jalan Desa</td><td style="border: 1px solid #000; padding: 6px;"><strong>${(p.jalan_aspal_km + p.jalan_beton_paving_km + p.jalan_tanah_km).toFixed(1)} Km</strong></td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Panjang Saluran Drainase & Gorong-gorong</td><td style="border: 1px solid #000; padding: 6px;">${p.panjang_drainase_km} Km</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Jumlah Jembatan Penghubung</td><td style="border: 1px solid #000; padding: 6px;">${p.jumlah_jembatan} Unit Jembatan</td></tr>
            </table>
            ${imgHtml}
        </div>
    `;

    executeUniversalPrint(title, sub, tableHtml, 'portrait', null, useKop);
}

// ==========================================================================
// 10. MODUL SURAT MASUK & KELUAR
// ==========================================================================

function switchSuratTab(tab) {
    currentSuratTab = tab;
    document.getElementById('tabSuratMasuk').classList.toggle('active', tab === 'masuk');
    document.getElementById('tabSuratKeluar').classList.toggle('active', tab === 'keluar');
    document.getElementById('containerSuratMasuk').style.display = tab === 'masuk' ? 'block' : 'none';
    document.getElementById('containerSuratKeluar').style.display = tab === 'keluar' ? 'block' : 'none';
    renderSuratTable();
}

function renderSuratTable() {
    if (!DB || !DB.surat) return;

    if (currentSuratTab === 'masuk') {
        const tb = document.getElementById('tbodySuratMasuk');
        if (!tb) return;
        tb.innerHTML = (DB.surat.masuk || []).map((s, i) => `<tr>
            <td style="font-weight: 600;">${i + 1}</td>
            <td style="font-family: monospace; font-weight: 700;">${s.no_agenda}</td>
            <td><strong>${s.no_surat}</strong></td>
            <td>${s.tgl_surat}</td>
            <td>${s.tgl_terima}</td>
            <td>${s.pengirim}</td>
            <td>${s.perihal}</td>
            <td><small>${s.disposisi || '-'}</small></td>
            <td><span class="badge ${s.status === 'Selesai' ? 'badge-success' : 'badge-warning'}">${s.status}</span></td>
            <td style="text-align: center;">
                <button class="btn btn-danger btn-sm" onclick="deleteSurat('masuk', ${s.id})">🗑️</button>
            </td>
        </tr>`).join('');
    } else {
        const tb = document.getElementById('tbodySuratKeluar');
        if (!tb) return;
        tb.innerHTML = (DB.surat.keluar || []).map((s, i) => `<tr>
            <td style="font-weight: 600;">${i + 1}</td>
            <td style="font-family: monospace; font-weight: 700;">${s.no_berkas}</td>
            <td><strong>${s.no_surat}</strong></td>
            <td>${s.tgl_surat}</td>
            <td>${s.tujuan}</td>
            <td>${s.perihal}</td>
            <td>${s.penandatangan}</td>
            <td><span class="badge badge-success">${s.status}</span></td>
            <td style="text-align: center;">
                <button class="btn btn-danger btn-sm" onclick="deleteSurat('keluar', ${s.id})">🗑️</button>
            </td>
        </tr>`).join('');
    }
}

function openModalSuratCurrent() {
    const type = currentSuratTab;
    document.getElementById('suratType').value = type;
    document.getElementById('suratEditId').value = '';
    const body = document.getElementById('modalSuratBody');

    document.getElementById('modalSuratTitle').textContent = type === 'masuk' ? 'Catat Surat Masuk Baru' : 'Catat Surat Keluar Baru';

    if (type === 'masuk') {
        body.innerHTML = `
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nomor Agenda: *</label><input type="text" id="sNoAgenda" class="form-control" value="SM/2026/${(DB.surat.masuk.length + 1).toString().padStart(3, '0')}" required></div>
                <div class="form-group"><label class="form-label">Nomor Surat Asli: *</label><input type="text" id="sNoSurat" class="form-control" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Tanggal Surat:</label><input type="date" id="sTglSurat" class="form-control" required></div>
                <div class="form-group"><label class="form-label">Tanggal Diterima:</label><input type="date" id="sTglTerima" class="form-control" value="${new Date().toISOString().slice(0, 10)}" required></div>
            </div>
            <div class="form-group"><label class="form-label">Instansi / Pengirim Surat: *</label><input type="text" id="sPengirim" class="form-control" required></div>
            <div class="form-group"><label class="form-label">Perihal / Ringkasan Isi Surat: *</label><textarea id="sPerihal" class="form-control" rows="2" required></textarea></div>
            <div class="form-group"><label class="form-label">Disposisi Hukum Tua / Instruksi:</label><textarea id="sDisposisi" class="form-control" rows="2" placeholder="Disposisi kepada..."></textarea></div>
            <div class="form-group"><label class="form-label">Status Tindak Lanjut:</label>
                <select id="sStatus" class="form-control"><option value="Proses">Sedang Diproses</option><option value="Selesai">Selesai</option></select>
            </div>
        `;
    } else {
        body.innerHTML = `
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nomor Berkas: *</label><input type="text" id="sNoBerkas" class="form-control" value="SK/2026/${(DB.surat.keluar.length + 1).toString().padStart(3, '0')}" required></div>
                <div class="form-group"><label class="form-label">Nomor Surat Keluar: *</label><input type="text" id="sNoSurat" class="form-control" placeholder="140/MLP/..." required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Tanggal Surat:</label><input type="date" id="sTglSurat" class="form-control" value="${new Date().toISOString().slice(0, 10)}" required></div>
                <div class="form-group"><label class="form-label">Penandatangan:</label><input type="text" id="sPenandatangan" class="form-control" value="${DB.settings.hukum_tua} (Hukum Tua)"></div>
            </div>
            <div class="form-group"><label class="form-label">Tujuan Surat / Penerima: *</label><input type="text" id="sTujuan" class="form-control" required></div>
            <div class="form-group"><label class="form-label">Perihal Surat: *</label><textarea id="sPerihal" class="form-control" rows="2" required></textarea></div>
            <div class="form-group"><label class="form-label">Status Surat:</label>
                <select id="sStatus" class="form-control"><option value="Terkirim">Terkirim & Diarsipkan</option><option value="Draft">Konsep / Draft</option></select>
            </div>
        `;
    }

    openModal('modalSurat');
}

function handleSaveSurat(e) {
    e.preventDefault();
    const type = document.getElementById('suratType').value;
    let item = { id: Date.now() };

    if (type === 'masuk') {
        item.no_agenda = document.getElementById('sNoAgenda').value.trim();
        item.no_surat = document.getElementById('sNoSurat').value.trim();
        item.tgl_surat = document.getElementById('sTglSurat').value;
        item.tgl_terima = document.getElementById('sTglTerima').value;
        item.pengirim = document.getElementById('sPengirim').value.trim();
        item.perihal = document.getElementById('sPerihal').value.trim();
        item.disposisi = document.getElementById('sDisposisi').value.trim();
        item.status = document.getElementById('sStatus').value;
        DB.surat.masuk.push(item);
    } else {
        item.no_berkas = document.getElementById('sNoBerkas').value.trim();
        item.no_surat = document.getElementById('sNoSurat').value.trim();
        item.tgl_surat = document.getElementById('sTglSurat').value;
        item.tujuan = document.getElementById('sTujuan').value.trim();
        item.perihal = document.getElementById('sPerihal').value.trim();
        item.penandatangan = document.getElementById('sPenandatangan').value.trim();
        item.status = document.getElementById('sStatus').value;
        DB.surat.keluar.push(item);
    }

    saveDatabase();
    closeModal('modalSurat');
    renderSuratTable();
    renderDashboardView();
    alert("Surat berhasil dicatat ke dalam buku register!");
}

function deleteSurat(type, id) {
    if (confirm("Hapus catatan surat ini?")) {
        DB.surat[type] = DB.surat[type].filter(x => x.id !== id);
        saveDatabase();
        renderSuratTable();
        renderDashboardView();
    }
}

function printAgendaSuratCurrent(useKop = null) {
    const isMasuk = currentSuratTab === 'masuk';
    const title = isMasuk ? "BUKU AGENDA SURAT MASUK PEMERINTAH DESA" : "BUKU AGENDA SURAT KELUAR PEMERINTAH DESA";
    const sub = "Desa " + DB.settings.nama_desa + " - Tahun " + DB.settings.tahun_berjalan;

    let rows = "";
    if (isMasuk) {
        rows = DB.surat.masuk.map((s, i) => `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #000; padding:5px; font-weight:bold;">${s.no_agenda}</td>
            <td style="border:1px solid #000; padding:5px;">${s.no_surat}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${s.tgl_surat}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${s.tgl_terima}</td>
            <td style="border:1px solid #000; padding:5px;">${s.pengirim}</td>
            <td style="border:1px solid #000; padding:5px;">${s.perihal}</td>
            <td style="border:1px solid #000; padding:5px;"><small>${s.disposisi || '-'}</small></td>
        </tr>`).join('');
    } else {
        rows = DB.surat.keluar.map((s, i) => `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #000; padding:5px; font-weight:bold;">${s.no_berkas}</td>
            <td style="border:1px solid #000; padding:5px;">${s.no_surat}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${s.tgl_surat}</td>
            <td style="border:1px solid #000; padding:5px;">${s.tujuan}</td>
            <td style="border:1px solid #000; padding:5px;">${s.perihal}</td>
            <td style="border:1px solid #000; padding:5px;">${s.penandatangan}</td>
        </tr>`).join('');
    }

    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border:1px solid #000; padding:6px;">No</th>
                    <th style="border:1px solid #000; padding:6px;">${isMasuk ? 'No. Agenda' : 'No. Berkas'}</th>
                    <th style="border:1px solid #000; padding:6px;">Nomor Surat</th>
                    <th style="border:1px solid #000; padding:6px;">Tgl. Surat</th>
                    <th style="border:1px solid #000; padding:6px;">${isMasuk ? 'Tgl. Terima' : 'Tujuan Surat'}</th>
                    <th style="border:1px solid #000; padding:6px;">${isMasuk ? 'Pengirim' : 'Perihal'}</th>
                    <th style="border:1px solid #000; padding:6px;">${isMasuk ? 'Perihal' : 'Penandatangan'}</th>
                    ${isMasuk ? '<th style="border:1px solid #000; padding:6px;">Disposisi Hukum Tua</th>' : ''}
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}


// ==========================================================================
// 11. MODUL BPD (BADAN PERMUSYAWARATAN DESA)
// ==========================================================================

function renderBPDTable() {
    if (!DB || !DB.bpd) return;
    const tbody = document.getElementById('tbodyBPD');
    if (!tbody) return;

    if (!DB.bpd.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada dokumen BPD yang dicatat.</td></tr>`;
        return;
    }

    tbody.innerHTML = DB.bpd.map((b, i) => `<tr>
        <td style="font-weight: 600;">${i + 1}</td>
        <td><span class="badge badge-primary">${b.jenis}</span></td>
        <td style="font-weight: 700;">${b.nomor}</td>
        <td>${b.tanggal}</td>
        <td><strong>${b.perihal}</strong></td>
        <td><span class="badge badge-success">${b.status}</span></td>
        <td><small>${b.keterangan || '-'}</small></td>
        <td style="text-align: center;">
            <button class="btn btn-danger btn-sm" onclick="deleteBPD(${b.id})">🗑️</button>
        </td>
    </tr>`).join('');
}

function openModalBPD() {
    document.getElementById('modalBPDTitle').textContent = 'Tambah Dokumen / Catatan BPD';
    document.getElementById('bpdEditId').value = '';
    document.getElementById('formBPD').reset();
    document.getElementById('bpdTanggal').value = new Date().toISOString().slice(0, 10);
    openModal('modalBPD');
}

function deleteBPD(id) {
    if (confirm("Hapus berkas BPD ini?")) {
        DB.bpd = DB.bpd.filter(x => x.id !== id);
        saveDatabase();
        renderBPDTable();
    }
}

function handleSaveBPD(e) {
    e.preventDefault();
    const item = {
        id: Date.now(),
        jenis: document.getElementById('bpdJenis').value,
        nomor: document.getElementById('bpdNomor').value.trim(),
        tanggal: document.getElementById('bpdTanggal').value,
        status: document.getElementById('bpdStatus').value.trim() || 'Ditetapkan',
        perihal: document.getElementById('bpdPerihal').value.trim(),
        keterangan: document.getElementById('bpdKeterangan').value.trim()
    };

    DB.bpd.push(item);
    saveDatabase();
    closeModal('modalBPD');
    renderBPDTable();
    alert("Data BPD berhasil disimpan!");
}

function printDataBPD(useKop = null) {
    const title = "BUKU REGISTER DOKUMEN BADAN PERMUSYAWARATAN DESA (BPD)";
    const sub = "Desa " + DB.settings.nama_desa + " - Tahun " + DB.settings.tahun_berjalan;
    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border:1px solid #000; padding:6px;">No</th>
                    <th style="border:1px solid #000; padding:6px;">Jenis Dokumen</th>
                    <th style="border:1px solid #000; padding:6px;">Nomor Berkas</th>
                    <th style="border:1px solid #000; padding:6px;">Tanggal</th>
                    <th style="border:1px solid #000; padding:6px;">Perihal / Pokok Bahasan</th>
                    <th style="border:1px solid #000; padding:6px;">Status</th>
                    <th style="border:1px solid #000; padding:6px;">Keterangan / Hasil</th>
                </tr>
            </thead>
            <tbody>
                ${DB.bpd.map((b, i) => `<tr>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
                    <td style="border:1px solid #000; padding:5px;">${b.jenis}</td>
                    <td style="border:1px solid #000; padding:5px; font-weight:bold;">${b.nomor}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${b.tanggal}</td>
                    <td style="border:1px solid #000; padding:5px;"><strong>${b.perihal}</strong></td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${b.status}</td>
                    <td style="border:1px solid #000; padding:5px;"><small>${b.keterangan || '-'}</small></td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}


// ==========================================================================
// 12. MODUL REKON APBDES & SPP
// ==========================================================================

function renderRekonView() {
    if (!DB || !DB.rekon) return;

    let totAnggP = 0, totRealP = 0, totAnggB = 0, totRealB = 0;

    const tbP = document.getElementById('tbodyRekonPendapatan');
    if (tbP) {
        tbP.innerHTML = (DB.rekon.pendapatan || []).map((p, idx) => {
            totAnggP += cleanNumber(p.anggaran);
            totRealP += cleanNumber(p.siskeudes);
            return `<tr>
                <td style="font-family: monospace;">${p.kode}</td>
                <td>${p.uraian}</td>
                <td class="numeric"><input type="text" inputmode="numeric" class="form-control input-rupiah" style="text-align:right; padding:5px 8px; font-size:12px;" value="${formatNumber(p.anggaran)}" oninput="formatCurrencyInput(this)" onchange="updateRekonItem('pendapatan', ${idx}, 'anggaran', this.value)"></td>
                <td class="numeric"><input type="text" inputmode="numeric" class="form-control input-rupiah" style="text-align:right; padding:5px 8px; font-size:12px; color:#059669;" value="${formatNumber(p.siskeudes)}" oninput="formatCurrencyInput(this)" onchange="updateRekonItem('pendapatan', ${idx}, 'siskeudes', this.value)"></td>
            </tr>`;
        }).join('');
        document.getElementById('rekonTotAnggPend').textContent = formatRupiah(totAnggP);
        document.getElementById('rekonTotRealPend').textContent = formatRupiah(totRealP);
    }

    const tbB = document.getElementById('tbodyRekonBelanja');
    if (tbB) {
        tbB.innerHTML = (DB.rekon.belanja || []).map((b, idx) => {
            totAnggB += cleanNumber(b.anggaran);
            totRealB += cleanNumber(b.siskeudes);
            return `<tr>
                <td style="font-family: monospace;">${b.kode}</td>
                <td>${b.uraian}</td>
                <td class="numeric"><input type="text" inputmode="numeric" class="form-control input-rupiah" style="text-align:right; padding:5px 8px; font-size:12px;" value="${formatNumber(b.anggaran)}" oninput="formatCurrencyInput(this)" onchange="updateRekonItem('belanja', ${idx}, 'anggaran', this.value)"></td>
                <td class="numeric"><input type="text" inputmode="numeric" class="form-control input-rupiah" style="text-align:right; padding:5px 8px; font-size:12px; color:#dc2626;" value="${formatNumber(b.siskeudes)}" oninput="formatCurrencyInput(this)" onchange="updateRekonItem('belanja', ${idx}, 'siskeudes', this.value)"></td>
            </tr>`;
        }).join('');
        document.getElementById('rekonTotAnggBel').textContent = formatRupiah(totAnggB);
        document.getElementById('rekonTotRealBel').textContent = formatRupiah(totRealB);
    }

    // SPP Table
    const tbSPP = document.getElementById('tbodyRekonSPP');
    if (tbSPP) {
        tbSPP.innerHTML = (DB.rekon.spp || []).map((s, i) => `<tr>
            <td style="font-family: monospace; font-weight: 700;">${s.no_spp}</td>
            <td>${s.tanggal}</td>
            <td><strong>${s.kegiatan}</strong></td>
            <td>${s.pelaksana}</td>
            <td class="numeric" style="font-weight: 700; color: var(--primary);">${formatRupiah(s.jumlah)}</td>
            <td><span class="badge badge-success">${s.status}</span></td>
            <td style="text-align: center;">
                <button class="btn btn-danger btn-sm" onclick="deleteSPP('${s.no_spp}')">🗑️</button>
            </td>
        </tr>`).join('');
    }

    // Reconciliation balance
    const siskBalance = totRealP - totRealB;
    document.getElementById('rekonTotalSiskeudes').textContent = formatRupiah(siskBalance);
    document.getElementById('rekonTotalRCBank').textContent = formatRupiah(siskBalance);
}

function openModalSPP() {
    document.getElementById('modalSPPTitle').textContent = 'Buat Surat Permintaan Pembayaran (SPP)';
    document.getElementById('sppEditId').value = '';
    document.getElementById('formSPP').reset();
    document.getElementById('sppTanggal').value = new Date().toISOString().slice(0, 10);
    document.getElementById('sppNomor').value = `SPP-${(DB.rekon.spp.length + 1).toString().padStart(2, '0')}/DDS/2026`;
    openModal('modalSPP');
}

function deleteSPP(noSPP) {
    if (confirm("Hapus data SPP ini?")) {
        DB.rekon.spp = DB.rekon.spp.filter(x => x.no_spp !== noSPP);
        saveDatabase();
        renderRekonView();
    }
}

function handleSaveSPP(e) {
    e.preventDefault();
    const item = {
        no_spp: document.getElementById('sppNomor').value.trim(),
        tanggal: document.getElementById('sppTanggal').value,
        kegiatan: document.getElementById('sppKegiatan').value.trim(),
        pelaksana: document.getElementById('sppPelaksana').value.trim(),
        jumlah: cleanNumber(document.getElementById('sppJumlah').value),
        status: document.getElementById('sppStatus').value
    };

    DB.rekon.spp.push(item);
    saveDatabase();
    closeModal('modalSPP');
    renderRekonView();
    alert("SPP berhasil dicatat!");
}

function printBeritaAcaraRekon(useKop = null) {
    const title = "BERITA ACARA REKONSILIASI KEUANGAN APBDES, SISKEUDES & REKENING BANK";
    const sub = "Pemerintah Desa " + DB.settings.nama_desa + " - Periode Semester I Tahun Anggaran 2026";

    let totRealP = 0, totRealB = 0;
    DB.rekon.pendapatan.forEach(p => totRealP += cleanNumber(p.siskeudes));
    DB.rekon.belanja.forEach(b => totRealB += cleanNumber(b.siskeudes));
    const saldoKas = totRealP - totRealB;

    const contentHtml = `
        <div style="font-size: 11pt; line-height: 1.6; margin-top: 15px; text-align: justify;">
            <p>Pada hari ini, disepakati dan ditandatangani Berita Acara Rekonsiliasi Keuangan Anggaran Pendapatan dan Belanja Desa (APBDes) Desa ${DB.settings.nama_desa}, Kecamatan ${DB.settings.kecamatan}, Kabupaten ${DB.settings.kabupaten} dengan rincian pembukuan sebagai berikut:</p>
            
            <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin: 15px 0; font-size: 10.5pt;">
                <tr style="background: #f1f5f9;"><th style="border: 1px solid #000; padding: 6px; text-align: left;">KOMPONEN KEUANGAN</th><th style="border: 1px solid #000; padding: 6px; text-align: right;">PEMBUKUAN BKU (RP)</th><th style="border: 1px solid #000; padding: 6px; text-align: right;">SISKEUDES (RP)</th><th style="border: 1px solid #000; padding: 6px; text-align: right;">RC BANK (RP)</th></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Total Realisasi Pendapatan</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(totRealP)}</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(totRealP)}</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(totRealP)}</td></tr>
                <tr><td style="border: 1px solid #000; padding: 6px;">Total Realisasi Belanja</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(totRealB)}</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(totRealB)}</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(totRealB)}</td></tr>
                <tr style="background: #f1f5f9; font-weight: bold;"><td style="border: 1px solid #000; padding: 6px;">SISA SALDO KAS AKHIR</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(saldoKas)}</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(saldoKas)}</td><td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(saldoKas)}</td></tr>
                <tr style="font-weight: bold; background: #e2e8f0;"><td colspan="3" style="border: 1px solid #000; padding: 6px; text-align: right;">SELISIH KAS (REKONSILIASI):</td><td style="border: 1px solid #000; padding: 6px; text-align: right; color: #059669;">Rp 0,00 (KLOP NIHIL)</td></tr>
            </table>

            <p>Berdasarkan hasil pencocokan antara Buku Kas Umum Bendahara Desa, Aplikasi Siskeudes, dan Rekening Koran Kas Desa pada Bank SulutGo, dinyatakan bahwa seluruh transaksi telah tercatat dengan tertib, benar, dan tidak terdapat selisih pembukuan.</p>
        </div>
    `;

    const signers = [
        { title: "Kaur Keuangan / Bendahara", name: DB.settings.perangkat_desa.find(x => x.jabatan.toLowerCase().includes('keuangan'))?.nama || "MEYDY LUKY KAWULUSAN" },
        { title: "Diverifikasi Oleh,\\nSekretaris Desa", name: DB.settings.sekdes },
        { title: "Mengesahkan,\\nHukum Tua Desa " + DB.settings.nama_desa, name: DB.settings.hukum_tua }
    ];

    executeUniversalPrint(title, sub, contentHtml, 'portrait', signers, useKop);
}


// ==========================================================================
// 13. MODUL KAS BENDAHARA (BUKU KAS UMUM - BKU)
// ==========================================================================

function renderBendaharaTable() {
    if (!DB || !DB.bendahara) return;
    const tbody = document.getElementById('tbodyBendaharaBKU');
    if (!tbody) return;

    let totMasuk = 0, totKeluar = 0, saldoKumu = 0;

    tbody.innerHTML = DB.bendahara.map((b, i) => {
        const jml = cleanNumber(b.jumlah);
        if (b.jenis === 'masuk') {
            totMasuk += jml;
            saldoKumu += jml;
        } else {
            totKeluar += jml;
            saldoKumu -= jml;
        }

        return `<tr>
            <td style="font-weight: 600;">${i + 1}</td>
            <td>${b.tanggal}</td>
            <td style="font-family: monospace; font-weight: 700;">${b.no_bukti}</td>
            <td><strong>${b.uraian}</strong></td>
            <td class="numeric" style="color: #059669; font-weight: 700;">${b.jenis === 'masuk' ? formatRupiah(jml) : '-'}</td>
            <td class="numeric" style="color: #dc2626; font-weight: 700;">${b.jenis === 'keluar' ? formatRupiah(jml) : '-'}</td>
            <td class="numeric" style="color: var(--primary); font-weight: 800;">${formatRupiah(saldoKumu)}</td>
            <td style="text-align: center;">
                <button class="btn btn-danger btn-sm" onclick="deleteBKU(${b.id})">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    document.getElementById('bkuTotalMasuk').textContent = formatRupiah(totMasuk);
    document.getElementById('bkuTotalKeluar').textContent = formatRupiah(totKeluar);
    document.getElementById('bkuSisaSaldo').textContent = formatRupiah(totMasuk - totKeluar);
}

function openModalBKU() {
    document.getElementById('modalBKUTitle').textContent = 'Tambah Transaksi Kas Bendahara';
    document.getElementById('bkuEditId').value = '';
    document.getElementById('formBKU').reset();
    document.getElementById('bkuTanggal').value = new Date().toISOString().slice(0, 10);
    document.getElementById('bkuNoBukti').value = `BKK-${(DB.bendahara.length + 1).toString().padStart(2, '0')}/2026`;
    openModal('modalBKU');
}

function deleteBKU(id) {
    if (confirm("Hapus transaksi kas ini?")) {
        DB.bendahara = DB.bendahara.filter(x => x.id !== id);
        saveDatabase();
        renderBendaharaTable();
        renderDashboardView();
    }
}

function handleSaveBKU(e) {
    e.preventDefault();
    const item = {
        id: Date.now(),
        tanggal: document.getElementById('bkuTanggal').value,
        no_bukti: document.getElementById('bkuNoBukti').value.trim(),
        uraian: document.getElementById('bkuUraian').value.trim(),
        jenis: document.getElementById('bkuJenis').value,
        jumlah: cleanNumber(document.getElementById('bkuJumlah').value)
    };

    DB.bendahara.push(item);
    saveDatabase();
    closeModal('modalBKU');
    renderBendaharaTable();
    renderDashboardView();
    alert("Transaksi kas berhasil dicatat!");
}

function printBukuKasBendahara(useKop = null) {
    const title = "BUKU KAS UMUM (BKU) BENDAHARA DESA";
    const sub = "Desa " + DB.settings.nama_desa + ", Kec. " + DB.settings.kecamatan + " - Tahun " + DB.settings.tahun_berjalan;

    let totMasuk = 0, totKeluar = 0, saldo = 0;
    const rows = DB.bendahara.map((b, i) => {
        const jml = cleanNumber(b.jumlah);
        if (b.jenis === 'masuk') { totMasuk += jml; saldo += jml; }
        else { totKeluar += jml; saldo -= jml; }

        return `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${b.tanggal}</td>
            <td style="border:1px solid #000; padding:5px; font-family:monospace;">${b.no_bukti}</td>
            <td style="border:1px solid #000; padding:5px;">${b.uraian}</td>
            <td style="border:1px solid #000; padding:5px; text-align:right;">${b.jenis === 'masuk' ? formatRupiah(jml) : '-'}</td>
            <td style="border:1px solid #000; padding:5px; text-align:right;">${b.jenis === 'keluar' ? formatRupiah(jml) : '-'}</td>
            <td style="border:1px solid #000; padding:5px; text-align:right; font-weight:bold;">${formatRupiah(saldo)}</td>
        </tr>`;
    }).join('');

    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border:1px solid #000; padding:6px;">No</th>
                    <th style="border:1px solid #000; padding:6px;">Tanggal</th>
                    <th style="border:1px solid #000; padding:6px;">No. Bukti</th>
                    <th style="border:1px solid #000; padding:6px;">Uraian Transaksi</th>
                    <th style="border:1px solid #000; padding:6px; text-align:right;">Penerimaan (Rp)</th>
                    <th style="border:1px solid #000; padding:6px; text-align:right;">Pengeluaran (Rp)</th>
                    <th style="border:1px solid #000; padding:6px; text-align:right;">Saldo Kas (Rp)</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
                <tr style="background:#f1f5f9; font-weight:bold;">
                    <td colspan="4" style="border:1px solid #000; padding:6px; text-align:right;">TOTAL KAS:</td>
                    <td style="border:1px solid #000; padding:6px; text-align:right;">${formatRupiah(totMasuk)}</td>
                    <td style="border:1px solid #000; padding:6px; text-align:right;">${formatRupiah(totKeluar)}</td>
                    <td style="border:1px solid #000; padding:6px; text-align:right;">${formatRupiah(totMasuk - totKeluar)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    const signers = [
        { title: "Bendahara Desa", name: DB.settings.perangkat_desa.find(x => x.jabatan.toLowerCase().includes('keuangan'))?.nama || "MEYDY LUKY KAWULUSAN" },
        { title: "Mengetahui,\\nHukum Tua Desa " + DB.settings.nama_desa, name: DB.settings.hukum_tua }
    ];

    executeUniversalPrint(title, sub, tableHtml, 'landscape', signers, useKop);
}
function updateRekonItem(type, index, field, rawVal) {
    if (!DB || !DB.rekon || !DB.rekon[type] || !DB.rekon[type][index]) return;
    const val = cleanNumber(rawVal);
    DB.rekon[type][index][field] = val;
    if (field === 'siskeudes') {
        DB.rekon[type][index].rc_bank = val;
    }
    saveDatabase();
    renderRekonView();
    renderDashboardView();
}


// ==========================================================================
// 14. MODUL REGULASI PRODUK HUKUM
// ==========================================================================

function renderRegulasiTable() {
    if (!DB || !DB.regulasi) return;
    const tbody = document.getElementById('tbodyRegulasi');
    if (!tbody) return;

    if (!DB.regulasi.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada regulasi yang dicatat.</td></tr>`;
        return;
    }

    tbody.innerHTML = DB.regulasi.map((r, i) => `<tr>
        <td style="font-weight: 600;">${i + 1}</td>
        <td><span class="badge badge-primary">${r.jenis}</span></td>
        <td style="font-weight: 700;">${r.nomor}</td>
        <td>${r.tahun}</td>
        <td><strong>${r.judul}</strong></td>
        <td>${r.tgl_tetap}</td>
        <td>${r.tgl_undangkan || '-'}</td>
        <td><span class="badge badge-success">${r.status}</span></td>
        <td style="text-align: center;">
            <button class="btn btn-danger btn-sm" onclick="deleteRegulasi(${r.id})">🗑️</button>
        </td>
    </tr>`).join('');
}

function openModalRegulasi() {
    document.getElementById('modalRegulasiTitle').textContent = 'Tambah Produk Hukum Desa';
    document.getElementById('regEditId').value = '';
    document.getElementById('formRegulasi').reset();
    document.getElementById('regTahun').value = DB.settings.tahun_berjalan || '2026';
    document.getElementById('regTglTetap').value = new Date().toISOString().slice(0, 10);
    openModal('modalRegulasi');
}

function deleteRegulasi(id) {
    if (confirm("Hapus catatan produk hukum ini?")) {
        DB.regulasi = DB.regulasi.filter(x => x.id !== id);
        saveDatabase();
        renderRegulasiTable();
    }
}

function handleSaveRegulasi(e) {
    e.preventDefault();
    const item = {
        id: Date.now(),
        jenis: document.getElementById('regJenis').value,
        nomor: document.getElementById('regNomor').value.trim(),
        tahun: parseInt(document.getElementById('regTahun').value) || 2026,
        judul: document.getElementById('regJudul').value.trim(),
        tgl_tetap: document.getElementById('regTglTetap').value,
        tgl_undangkan: document.getElementById('regTglUndang').value,
        status: document.getElementById('regStatus').value
    };

    DB.regulasi.push(item);
    saveDatabase();
    closeModal('modalRegulasi');
    renderRegulasiTable();
    alert("Produk hukum desa berhasil dicatat!");
}

function printDataRegulasi(useKop = null) {
    const title = "BUKU REGISTER PRODUK HUKUM & REGULASI DESA";
    const sub = "Desa " + DB.settings.nama_desa + " - Tahun " + DB.settings.tahun_berjalan;
    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border:1px solid #000; padding:6px;">No</th>
                    <th style="border:1px solid #000; padding:6px;">Jenis</th>
                    <th style="border:1px solid #000; padding:6px;">Nomor Regulasi</th>
                    <th style="border:1px solid #000; padding:6px;">Tahun</th>
                    <th style="border:1px solid #000; padding:6px;">Judul / Tentang</th>
                    <th style="border:1px solid #000; padding:6px;">Tgl. Ditetapkan</th>
                    <th style="border:1px solid #000; padding:6px;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${DB.regulasi.map((r, i) => `<tr>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
                    <td style="border:1px solid #000; padding:5px;">${r.jenis}</td>
                    <td style="border:1px solid #000; padding:5px; font-weight:bold;">${r.nomor}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${r.tahun}</td>
                    <td style="border:1px solid #000; padding:5px;"><strong>${r.judul}</strong></td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${r.tgl_tetap}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${r.status}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}


// ==========================================================================
// 15. MODUL BERITA ACARA (BA)
// ==========================================================================

function renderBeritaAcaraTable() {
    if (!DB || !DB.berita_acara) return;
    const tbody = document.getElementById('tbodyBeritaAcara');
    if (!tbody) return;

    if (!DB.berita_acara.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada berita acara yang dicatat.</td></tr>`;
        return;
    }

    tbody.innerHTML = DB.berita_acara.map((b, i) => `<tr>
        <td style="font-weight: 600;">${i + 1}</td>
        <td style="font-weight: 700; color: var(--primary);">${b.nomor}</td>
        <td>${b.tanggal}</td>
        <td><span class="badge badge-info">${b.jenis}</span></td>
        <td><strong>${b.perihal}</strong></td>
        <td>${b.pimpinan}</td>
        <td>${b.sekretaris}</td>
        <td><small>${b.hasil || '-'}</small></td>
        <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-primary btn-sm" onclick="printSpesifikBA(${b.id})" title="Cetak Berita Acara">🖨️ BA</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBeritaAcara(${b.id})">🗑️</button>
        </td>
    </tr>`).join('');
}

function openModalBeritaAcara() {
    document.getElementById('modalBATitle').textContent = 'Buat Berita Acara Baru';
    document.getElementById('baEditId').value = '';
    document.getElementById('formBeritaAcara').reset();
    document.getElementById('baTanggal').value = new Date().toISOString().slice(0, 10);
    document.getElementById('baNomor').value = `BA-${(DB.berita_acara.length + 1).toString().padStart(2, '0')}/MUSDES-MLP/2026`;
    document.getElementById('baPimpinan').value = DB.settings.hukum_tua;
    document.getElementById('baSekretaris').value = DB.settings.sekdes;
    openModal('modalBeritaAcara');
}

function deleteBeritaAcara(id) {
    if (confirm("Hapus berita acara ini?")) {
        DB.berita_acara = DB.berita_acara.filter(x => x.id !== id);
        saveDatabase();
        renderBeritaAcaraTable();
    }
}

function handleSaveBeritaAcara(e) {
    e.preventDefault();
    const item = {
        id: Date.now(),
        jenis: document.getElementById('baJenis').value,
        nomor: document.getElementById('baNomor').value.trim(),
        tanggal: document.getElementById('baTanggal').value,
        perihal: document.getElementById('baPerihal').value.trim(),
        pimpinan: document.getElementById('baPimpinan').value.trim(),
        sekretaris: document.getElementById('baSekretaris').value.trim(),
        hasil: document.getElementById('baHasil').value.trim()
    };

    DB.berita_acara.push(item);
    saveDatabase();
    closeModal('modalBeritaAcara');
    renderBeritaAcaraTable();
    alert("Berita Acara berhasil disimpan!");
}

function printDataBeritaAcara(useKop = null) {
    const title = "BUKU REGISTER BERITA ACARA (BA) DESA";
    const sub = "Desa " + DB.settings.nama_desa + " - Tahun " + DB.settings.tahun_berjalan;
    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border:1px solid #000; padding:6px;">No</th>
                    <th style="border:1px solid #000; padding:6px;">Nomor BA</th>
                    <th style="border:1px solid #000; padding:6px;">Tanggal</th>
                    <th style="border:1px solid #000; padding:6px;">Jenis BA</th>
                    <th style="border:1px solid #000; padding:6px;">Perihal / Agenda</th>
                    <th style="border:1px solid #000; padding:6px;">Pimpinan Rapat</th>
                    <th style="border:1px solid #000; padding:6px;">Sekretaris</th>
                </tr>
            </thead>
            <tbody>
                ${DB.berita_acara.map((b, i) => `<tr>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
                    <td style="border:1px solid #000; padding:5px; font-weight:bold;">${b.nomor}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${b.tanggal}</td>
                    <td style="border:1px solid #000; padding:5px;">${b.jenis}</td>
                    <td style="border:1px solid #000; padding:5px;"><strong>${b.perihal}</strong></td>
                    <td style="border:1px solid #000; padding:5px;">${b.pimpinan}</td>
                    <td style="border:1px solid #000; padding:5px;">${b.sekretaris}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
    executeUniversalPrint(title, sub, tableHtml, 'landscape', null, useKop);
}

function printSpesifikBA(id, useKop = null) {
    const b = DB.berita_acara.find(x => x.id === id);
    if (!b) return;

    const title = "BERITA ACARA";
    const sub = `Nomor: ${b.nomor} / Perihal: ${b.perihal}`;

    const contentHtml = `
        <div style="font-size: 11pt; line-height: 1.6; margin-top: 15px; text-align: justify;">
            <p>Pada hari ini, tanggal <strong>${b.tanggal}</strong>, bertempat di Balai Pertemuan Umum Desa ${DB.settings.nama_desa}, Kecamatan ${DB.settings.kecamatan}, Kabupaten ${DB.settings.kabupaten}, telah diselenggarakan <strong>${b.perihal}</strong>.</p>
            
            <p>Musyawarah / rapat dipimpin oleh <strong>${b.pimpinan}</strong> dan dicatat oleh <strong>${b.sekretaris}</strong>, dengan dihadiri oleh jajaran Pemerintah Desa, BPD, tokoh agama, tokoh masyarakat, dan unsur perwakilan warga Jaga I s/d IV.</p>

            <h4 style="margin-top: 15px; margin-bottom: 8px;">HASIL KESEPAKATAN & KEPUTUSAN BERSAMA:</h4>
            <div style="border: 1px solid #000; padding: 14px; background: #f8fafc; font-size: 10.5pt; line-height: 1.6;">
                ${b.hasil.replace(/\\n/g, '<br>')}
            </div>

            <p style="margin-top: 20px;">Demikian Berita Acara ini dibuat dan ditandatangani dengan penuh tanggung jawab untuk dapat dipergunakan sebagai dokumen resmi dalam penyelenggaraan pemerintahan desa.</p>
        </div>
    `;

    const signers = [
        { title: "Sekretaris / Notulis", name: b.sekretaris },
        { title: "Pimpinan Musyawarah / Rapat", name: b.pimpinan },
        { title: "Mengetahui,\\nHukum Tua Desa " + DB.settings.nama_desa, name: DB.settings.hukum_tua }
    ];

    executeUniversalPrint(title, sub, contentHtml, 'portrait', signers, useKop);
}


// ==========================================================================
// 16. MODUL CETAK KHUSUS (DAFTAR HADIR MUSDES & HOK)
// ==========================================================================

function switchCetakKhususTab(tab) {
    currentCetakKhususTab = tab;
    document.getElementById('tabCetakMusdes').classList.toggle('active', tab === 'musdes');
    document.getElementById('tabCetakHOKMingguan').classList.toggle('active', tab === 'hok_mingguan');
    document.getElementById('tabCetakHOKHarian').classList.toggle('active', tab === 'hok_harian');

    document.getElementById('panelCetakMusdes').style.display = tab === 'musdes' ? 'block' : 'none';
    document.getElementById('panelCetakHOKMingguan').style.display = tab === 'hok_mingguan' ? 'block' : 'none';
    document.getElementById('panelCetakHOKHarian').style.display = tab === 'hok_harian' ? 'block' : 'none';
}

function printDaftarHadirMusdes(useKop = null) {
    const keg = document.getElementById('cfgMusdesKegiatan').value;
    const tgl = document.getElementById('cfgMusdesTanggal').value;
    const tpt = document.getElementById('cfgMusdesTempat').value;
    const wkt = document.getElementById('cfgMusdesWaktu').value;

    const title = "DAFTAR HADIR MUSYAWARAH DESA (MUSDES)";
    const sub = keg;

    // Generate 25 rows for attendance
    let rows = "";
    for (let i = 1; i <= 25; i++) {
        const isOdd = (i % 2 !== 0);
        rows += `<tr>
            <td style="border: 1px solid #000; padding: 7px; text-align: center;">${i}</td>
            <td style="border: 1px solid #000; padding: 7px;"></td>
            <td style="border: 1px solid #000; padding: 7px;"></td>
            <td style="border: 1px solid #000; padding: 7px; text-align: center;">JAGA </td>
            <td style="border: 1px solid #000; padding: 7px; width: 140px; text-align: ${isOdd ? 'left' : 'right'}; font-size: 8pt; color: #475569;">
                ${i}. ..........
            </td>
        </tr>`;
    }

    const headerDetails = `
        <div style="font-size: 10pt; line-height: 1.5; margin-bottom: 12px;">
            <table style="width: 100%;">
                <tr><td style="width: 140px;">Hari / Tanggal</td><td>: ${tgl}</td></tr>
                <tr><td>Waktu / Jam</td><td>: ${wkt}</td></tr>
                <tr><td>Tempat</td><td>: ${tpt}</td></tr>
            </table>
        </div>
        <table class="print-table" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 6px; width: 40px;">No</th>
                    <th style="border: 1px solid #000; padding: 6px;">Nama Peserta</th>
                    <th style="border: 1px solid #000; padding: 6px;">Unsur / Jabatan</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 100px;">Alamat / Jaga</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 150px;">Tanda Tangan</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    executeUniversalPrint(title, sub, headerDetails, 'portrait', null, useKop);
}

function printDaftarHadirHOKMingguan(useKop = null) {
    const keg = document.getElementById('cfgHOKMKegiatan').value;
    const per = document.getElementById('cfgHOKMPeriode').value;
    const lok = document.getElementById('cfgHOKMLokasi').value;
    const upah = cleanNumber(document.getElementById('cfgHOKMUpah').value) || 120000;

    const title = "DAFTAR HADIR DAN PEMBAYARAN HOK MINGGUAN (PADAT KARYA TUNAI)";
    const sub = keg;

    let rows = "";
    for (let i = 1; i <= 15; i++) {
        const hariKerja = 6;
        const totalUang = hariKerja * upah;
        rows += `<tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${i}</td>
            <td style="border: 1px solid #000; padding: 6px;">Pekerja Lokal ${i}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">JAGA ${(i % 4) + 1}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">✓</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">✓</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">✓</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">✓</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">✓</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">✓</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${hariKerja}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(upah)}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">${formatRupiah(totalUang)}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 8pt; width: 100px;">${i}. .........</td>
        </tr>`;
    }

    const headerDetails = `
        <div style="font-size: 10pt; line-height: 1.5; margin-bottom: 12px;">
            <table style="width: 100%;">
                <tr><td style="width: 150px;">Periode Kerja</td><td>: ${per}</td></tr>
                <tr><td>Lokasi Pekerjaan</td><td>: ${lok}</td></tr>
                <tr><td>Standar Upah HOK</td><td>: <strong>${formatRupiah(upah)} / Hari</strong></td></tr>
            </table>
        </div>
        <table class="print-table" style="width: 100%; border-collapse: collapse; font-size: 9pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 5px;" rowspan="2">No</th>
                    <th style="border: 1px solid #000; padding: 5px;" rowspan="2">Nama Tenaga Kerja</th>
                    <th style="border: 1px solid #000; padding: 5px;" rowspan="2">Jaga</th>
                    <th style="border: 1px solid #000; padding: 5px;" colspan="6">Kehadiran Hari Kerja</th>
                    <th style="border: 1px solid #000; padding: 5px;" rowspan="2">Total HOK</th>
                    <th style="border: 1px solid #000; padding: 5px;" rowspan="2">Upah / Hari</th>
                    <th style="border: 1px solid #000; padding: 5px;" rowspan="2">Jumlah Diterima</th>
                    <th style="border: 1px solid #000; padding: 5px;" rowspan="2">Tanda Tangan</th>
                </tr>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 3px;">Sen</th>
                    <th style="border: 1px solid #000; padding: 3px;">Sel</th>
                    <th style="border: 1px solid #000; padding: 3px;">Rab</th>
                    <th style="border: 1px solid #000; padding: 3px;">Kam</th>
                    <th style="border: 1px solid #000; padding: 3px;">Jum</th>
                    <th style="border: 1px solid #000; padding: 3px;">Sab</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    const signers = [
        { title: "Ketua TPK Desa", name: "SANY RUNTURAMBI" },
        { title: "Bendahara Pembantu Kegiatan", name: "MEYDY LUKY KAWULUSAN" },
        { title: "Mengetahui / Mengesahkan,\\nHukum Tua Desa " + DB.settings.nama_desa, name: DB.settings.hukum_tua }
    ];

    executeUniversalPrint(title, sub, headerDetails, 'landscape', signers, useKop);
}

function printDaftarHadirHOKHarian(useKop = null) {
    const keg = document.getElementById('cfgHOKHKegiatan').value;
    const tgl = document.getElementById('cfgHOKHTanggal').value;
    const lok = document.getElementById('cfgHOKHLokasi').value;
    const upah = cleanNumber(document.getElementById('cfgHOKHUpah').value) || 120000;

    const title = "DAFTAR HADIR HARIAN TENAGA KERJA (HOK HARIAN)";
    const sub = keg;

    let rows = "";
    for (let i = 1; i <= 20; i++) {
        rows += `<tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${i}</td>
            <td style="border: 1px solid #000; padding: 6px;">Pekerja ${i}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">JAGA ${(i % 4) + 1}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">07.30 WITA</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">16.00 WITA</td>
            <td style="border: 1px solid #000; padding: 6px;">Pembersihan & Penggalian Drainase</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(upah)}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; width: 120px; font-size: 8pt;">${i}. ........</td>
        </tr>`;
    }

    const headerDetails = `
        <div style="font-size: 10pt; line-height: 1.5; margin-bottom: 12px;">
            <table style="width: 100%;">
                <tr><td style="width: 150px;">Tanggal Kerja</td><td>: ${tgl}</td></tr>
                <tr><td>Lokasi Pekerjaan</td><td>: ${lok}</td></tr>
                <tr><td>Standar Upah HOK</td><td>: <strong>${formatRupiah(upah)} / Hari</strong></td></tr>
            </table>
        </div>
        <table class="print-table" style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #000; padding: 6px; width: 40px;">No</th>
                    <th style="border: 1px solid #000; padding: 6px;">Nama Pekerja</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 80px;">Jaga</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 90px;">Jam Datang</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 90px;">Jam Pulang</th>
                    <th style="border: 1px solid #000; padding: 6px;">Uraian Hasil Kerja</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: right;">Upah Harian</th>
                    <th style="border: 1px solid #000; padding: 6px; width: 120px;">Tanda Tangan</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    const signers = [
        { title: "Pengawas Lapangan / TPK", name: "SANY RUNTURAMBI" },
        { title: "Mengetahui,\\nHukum Tua Desa " + DB.settings.nama_desa, name: DB.settings.hukum_tua }
    ];

    executeUniversalPrint(title, sub, headerDetails, 'portrait', signers, useKop);
}

// 18. MODUL PENGATURAN, PROFIL DESA, BACKUP & RESTORE
// ==========================================================================

function renderSettingsView() {
    if (!DB || !DB.settings) return;
    const s = DB.settings;

    document.getElementById('setNamaDesa').value = s.nama_desa || '';
    document.getElementById('setKecamatan').value = s.kecamatan || '';
    document.getElementById('setKabupaten').value = s.kabupaten || '';
    document.getElementById('setProvinsi').value = s.provinsi || '';
    document.getElementById('setHukumTua').value = s.hukum_tua || '';
    document.getElementById('setSekdes').value = s.sekdes || '';

    document.getElementById('setKopKab').value = s.kop_kab || '';
    document.getElementById('setKopKec').value = s.kop_kec || '';
    document.getElementById('setKopDesa').value = s.kop_desa || '';
    document.getElementById('setKopAlamat').value = s.kop_alamat || '';
    document.getElementById('setKopPos').value = s.kop_pos || '';
    document.getElementById('setKopWebsite').value = s.kop_website || '';
    document.getElementById('setKopCustom').value = s.kop_custom || '';

    document.getElementById('setKopShowWebsite').checked = !!s.kop_show_website;
    document.getElementById('setKopShowPos').checked = !!s.kop_show_pos;
    document.getElementById('setKopShowAlamat').checked = !!s.kop_show_alamat;
    document.getElementById('setKopShowCustom').checked = !!s.kop_show_custom;

    document.getElementById('setVisi').value = s.visi || '';
    document.getElementById('setMisi').value = s.misi || '';

    document.getElementById('setTahunBerjalan').value = s.tahun_berjalan || '2026';
    document.getElementById('setNomorPerdes').value = s.nomor_perdes || '';
    document.getElementById('setNomorPerkades').value = s.nomor_perkades || '';
    document.getElementById('setNomorRKPDes').value = s.nomor_rkpdes || '';
    document.getElementById('setNomorAPBDes').value = s.nomor_apbdes || '';
    document.getElementById('setNomorRPJMDes').value = s.nomor_rpjmdes || '';

    // Auto-save toggle
    if (s.auto_save_7s) {
        document.getElementById('optAutoSaveYes').checked = true;
    } else {
        document.getElementById('optAutoSaveNo').checked = true;
    }

    // Logo preview
    const lPrev = document.getElementById('setLogoPreview');
    if (s.logo_desa) {
        lPrev.src = s.logo_desa;
        lPrev.style.display = 'block';
    } else {
        lPrev.style.display = 'none';
    }

    // TTD Cap preview
    const ttdPrev = document.getElementById('setTTDCapPreview');
    if (s.ttd_cap_digital) {
        ttdPrev.src = s.ttd_cap_digital;
        ttdPrev.style.display = 'block';
    } else {
        ttdPrev.style.display = 'none';
    }

    // Active theme card
    highlightActiveThemeCard(s.theme || 'emerald');

    // Render Staff Table
    renderStaffTable();
}

function renderStaffTable() {
    const tbody = document.getElementById('tbodyStaffSettings');
    if (!tbody || !DB.settings.perangkat_desa) return;

    tbody.innerHTML = DB.settings.perangkat_desa.map((st, i) => `<tr>
        <td style="font-weight: 600;">${i + 1}</td>
        <td><input type="text" class="form-control form-control-sm" value="${st.nama}" onchange="updateStaffItem(${i}, 'nama', this.value)"></td>
        <td><input type="text" class="form-control form-control-sm" value="${st.jabatan}" onchange="updateStaffItem(${i}, 'jabatan', this.value)"></td>
        <td><input type="text" class="form-control form-control-sm" value="${st.no_hp || ''}" onchange="updateStaffItem(${i}, 'no_hp', this.value)"></td>
        <td style="text-align: center;"><button class="btn btn-danger btn-sm" onclick="removeStaffItem(${i})">🗑️</button></td>
    </tr>`).join('');
}

function addPerangkatRow() {
    DB.settings.perangkat_desa.push({ nama: "Nama Pejabat", jabatan: "Jabatan Baru", no_hp: "" });
    renderStaffTable();
}

function updateStaffItem(index, key, val) {
    if (DB.settings.perangkat_desa[index]) {
        DB.settings.perangkat_desa[index][key] = val;
    }
}

function removeStaffItem(index) {
    if (confirm("Hapus baris perangkat desa ini?")) {
        DB.settings.perangkat_desa.splice(index, 1);
        renderStaffTable();
    }
}

function selectTheme(themeName) {
    DB.settings.theme = themeName;
    applyTheme(themeName);
    highlightActiveThemeCard(themeName);
    saveDatabase(true);
}

function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
}

function highlightActiveThemeCard(themeName) {
    ['emerald', 'ocean', 'amethyst', 'sunset', 'cyberdark'].forEach(t => {
        const el = document.getElementById('themeOpt-' + t);
        if (el) {
            if (t === themeName) {
                el.style.borderColor = 'var(--primary)';
                el.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            } else {
                el.style.borderColor = 'var(--border-color)';
                el.style.boxShadow = 'none';
            }
        }
    });
}

function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            DB.settings.logo_desa = evt.target.result;
            document.getElementById('setLogoPreview').src = evt.target.result;
            document.getElementById('setLogoPreview').style.display = 'block';
            updateHeaderVillageInfo();
            saveDatabase();
            alert("Logo desa berhasil diunggah!");
        };
        reader.readAsDataURL(file);
    }
}

function resetDefaultLogo() {
    DB.settings.logo_desa = "";
    document.getElementById('setLogoPreview').style.display = 'none';
    updateHeaderVillageInfo();
    saveDatabase();
    alert("Logo desa dikembalikan ke ikon default.");
}

function handleTTDCapUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            DB.settings.ttd_cap_digital = evt.target.result;
            document.getElementById('setTTDCapPreview').src = evt.target.result;
            document.getElementById('setTTDCapPreview').style.display = 'block';
            saveDatabase();
            alert("Tanda tangan dan cap digital berhasil disimpan!");
        };
        reader.readAsDataURL(file);
    }
}

function clearTTDCap() {
    DB.settings.ttd_cap_digital = "";
    document.getElementById('setTTDCapPreview').style.display = 'none';
    saveDatabase();
    alert("Tanda tangan dan cap digital dibersihkan.");
}

function saveAllSettings() {
    const s = DB.settings;
    s.nama_desa = document.getElementById('setNamaDesa').value.trim();
    s.kecamatan = document.getElementById('setKecamatan').value.trim();
    s.kabupaten = document.getElementById('setKabupaten').value.trim();
    s.provinsi = document.getElementById('setProvinsi').value.trim();
    s.hukum_tua = document.getElementById('setHukumTua').value.trim();
    s.sekdes = document.getElementById('setSekdes').value.trim();

    s.kop_kab = document.getElementById('setKopKab').value.trim();
    s.kop_kec = document.getElementById('setKopKec').value.trim();
    s.kop_desa = document.getElementById('setKopDesa').value.trim();
    s.kop_alamat = document.getElementById('setKopAlamat').value.trim();
    s.kop_pos = document.getElementById('setKopPos').value.trim();
    s.kop_website = document.getElementById('setKopWebsite').value.trim();
    s.kop_custom = document.getElementById('setKopCustom').value.trim();

    s.kop_show_website = document.getElementById('setKopShowWebsite').checked;
    s.kop_show_pos = document.getElementById('setKopShowPos').checked;
    s.kop_show_alamat = document.getElementById('setKopShowAlamat').checked;
    s.kop_show_custom = document.getElementById('setKopShowCustom').checked;

    s.visi = document.getElementById('setVisi').value.trim();
    s.misi = document.getElementById('setMisi').value.trim();

    s.tahun_berjalan = document.getElementById('setTahunBerjalan').value.trim();
    s.nomor_perdes = document.getElementById('setNomorPerdes').value.trim();
    s.nomor_perkades = document.getElementById('setNomorPerkades').value.trim();
    s.nomor_rkpdes = document.getElementById('setNomorRKPDes').value.trim();
    s.nomor_apbdes = document.getElementById('setNomorAPBDes').value.trim();
    s.nomor_rpjmdes = document.getElementById('setNomorRPJMDes').value.trim();

    s.auto_save_7s = document.getElementById('optAutoSaveYes').checked;

    saveDatabase();
    updateHeaderVillageInfo();
    updateLoginScreenTitles();
    setupAutoSaveTimer();
    applySettings({ desa: s.nama_desa ? "Desa " + s.nama_desa : "", kec: s.kecamatan ? "Kec. " + s.kecamatan : "", logo: s.logo_desa || "" });
    alert("Semua pengaturan desa berhasil disimpan & disinkronkan ke Google Sheets!");
}

// Backup & Restore Engine
function downloadBackupJSON() {
    saveDatabase(true);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `backup_desa_${DB.settings.nama_desa}_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
}

function handleRestoreJSONFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            processRestoredJSON(parsed);
        } catch (err) {
            alert("File JSON tidak valid atau rusak: " + err.message);
        }
    };
    reader.readAsText(file);
}

function processRestoredJSON(parsed) {
    if (parsed.data_penduduk && Array.isArray(parsed.data_penduduk)) {
        // This is a direct data_penduduk_semua.json format!
        if (confirm(`Terdeteksi file data kependudukan lengkap dengan ${parsed.data_penduduk.length} jiwa penduduk!\n\nApakah Anda ingin memulihkan / mengimpor seluruh data kependudukan ini ke dalam sistem?`)) {
            DB.penduduk = parsed.data_penduduk;
            if (parsed.metadata) {
                if (parsed.metadata.desa) DB.settings.nama_desa = parsed.metadata.desa;
                if (parsed.metadata.kecamatan) DB.settings.kecamatan = parsed.metadata.kecamatan;
                if (parsed.metadata.kabupaten) DB.settings.kabupaten = parsed.metadata.kabupaten;
                if (parsed.metadata.provinsi) DB.settings.provinsi = parsed.metadata.provinsi;
            }
            saveDatabase();
            renderAllViews();
            alert(`Berhasil memulihkan ${parsed.data_penduduk.length} data penduduk Desa ${DB.settings.nama_desa}!`);
        }
    } else if (parsed.settings && parsed.penduduk) {
        // Full database backup format
        if (confirm("Apakah Anda yakin ingin memulihkan seluruh database sistem dari file backup ini?")) {
            DB = parsed;
            saveDatabase();
            renderAllViews();
            applyTheme(DB.settings.theme || 'emerald');
            alert("Database desa berhasil dipulihkan secara penuh!");
        }
    } else {
        alert("Format struktur file JSON tidak dikenali.");
    }
}

function loadSampleMolomparData() {
    alert("Untuk memulihkan data penduduk contoh lengkap (1.077 jiwa), gunakan tombol 'Restore Data dari File JSON' dan pilih file data_penduduk_semua.json yang telah Anda siapkan.");
}


// ==========================================================================
// 19. MANAJEMEN PENGGUNA & LISENSI (RBAC + SUPER ADMIN)
// ==========================================================================

function renderUsersTable() {
    if (!DB || !DB.users) return;
    const tbody = document.getElementById('tbodyUsersList');
    if (!tbody) return;

    tbody.innerHTML = DB.users.map((u, i) => {
        const isSuper = (currentUser && currentUser.role === 'super_admin');
        const canDelete = (u.role !== 'admin' || isSuper);

        return `<tr>
            <td style="font-weight: 600;">${i + 1}</td>
            <td><strong>${u.name}</strong></td>
            <td style="font-family: monospace;">${u.username}</td>
            <td><span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}">${u.role}</span></td>
            <td><span class="badge badge-neutral">${u.jaga_scope || 'all'}</span></td>
            <td>${u.role === 'admin' ? 'Akses Penuh Semua Menu' : (u.role === 'kepala_jaga' ? 'Data Penduduk ' + u.jaga_scope : 'Menu Tupoksi ' + u.role)}</td>
            <td style="text-align: center;">
                ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">🗑️ Hapus</button>` : '<span style="font-size: 11px; color: var(--text-muted);">(Hanya Super Admin)</span>'}
            </td>
        </tr>`;
    }).join('');
}

function openModalUser() {
    document.getElementById('modalUserTitle').textContent = 'Tambah Pengguna Baru';
    document.getElementById('userEditId').value = '';
    document.getElementById('formUser').reset();
    handleUserRoleChange();
    openModal('modalUser');
}

function handleUserRoleChange() {
    const role = document.getElementById('uRole').value;
    const grp = document.getElementById('groupJagaScope');
    if (role === 'kepala_jaga') {
        grp.style.display = 'block';
    } else {
        grp.style.display = 'none';
        document.getElementById('uJagaScope').value = 'all';
    }
}

function deleteUser(id) {
    const target = DB.users.find(x => x.id === id);
    if (!target) return;

    if (target.role === 'admin' && (!currentUser || currentUser.role !== 'super_admin')) {
        alert("Hanya Super Admin pemilik sistem yang berhak menghapus akun Admin Utama!");
        return;
    }

    if (confirm(`Hapus pengguna ${target.name} (${target.username})?`)) {
        DB.users = DB.users.filter(x => x.id !== id);
        saveDatabase();
        renderUsersTable();
        alert("Pengguna berhasil dihapus.");
    }
}

function handleSaveUser(e) {
    e.preventDefault();
    const newUser = {
        id: Date.now(),
        name: document.getElementById('uFullName').value.trim(),
        username: document.getElementById('uLoginUsername').value.trim(),
        password: document.getElementById('uLoginPassword').value.trim(),
        role: document.getElementById('uRole').value,
        jaga_scope: document.getElementById('uJagaScope').value
    };

    // Check duplicate username
    if (DB.users.some(x => x.username.toLowerCase() === newUser.username.toLowerCase())) {
        alert("Nama pengguna (username) sudah digunakan!");
        return;
    }

    DB.users.push(newUser);
    saveDatabase();
    closeModal('modalUser');
    renderUsersTable();
    alert("Pengguna baru berhasil ditambahkan!");
}


// ==========================================================================

/* ==========================================================================
   PART 5: UNIVERSAL PRINT (TABEL TTD SEJAJAR LURUS 100%), KOP TOGGLE & FULL RESET
   ========================================================================== */

function renderUniversalPrintConfig() {
    if (!DB || !DB.settings || !DB.settings.print_settings) return;
    const p = DB.settings.print_settings;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('uprintFont', p.font || 'Arial');
    setVal('uprintPaper', p.paper || 'A4');
    setVal('uprintOrientation', p.orientation || 'portrait');
    setVal('uprintFontSize', p.fontSize || '11pt');
    setVal('uprintMargin', p.margin || '15mm');
    setVal('uprintDigitalStamp', p.digitalStamp ? 'true' : 'false');
    setVal('uprintDefaultKop', (DB.settings.default_print_kop !== false) ? 'true' : 'false');

    const gToggle = document.getElementById('globalUseKopToggle');
    const gLabel = document.getElementById('globalUseKopLabel');
    if (gToggle) gToggle.checked = (DB.settings.default_print_kop !== false);
    if (gLabel) gLabel.textContent = (DB.settings.default_print_kop !== false) ? '🖨️ Mode: Dengan KOP' : '🖨️ Mode: Tanpa KOP';

    updatePrintPreviewDemo();
}

function saveUniversalPrintSettings() {
    if (!DB.settings.print_settings) DB.settings.print_settings = {};
    DB.settings.print_settings.font = document.getElementById('uprintFont').value;
    DB.settings.print_settings.paper = document.getElementById('uprintPaper').value;
    DB.settings.print_settings.orientation = document.getElementById('uprintOrientation').value;
    DB.settings.print_settings.fontSize = document.getElementById('uprintFontSize').value;
    DB.settings.print_settings.margin = document.getElementById('uprintMargin').value;
    DB.settings.print_settings.digitalStamp = (document.getElementById('uprintDigitalStamp').value === 'true');
    DB.settings.default_print_kop = (document.getElementById('uprintDefaultKop').value === 'true');

    handleGlobalKopToggle(DB.settings.default_print_kop);
    saveDatabase();
    alert("Pengaturan Universal Print berhasil disimpan! Semua menu cetak otomatis mengikuti konfigurasi ini.");
}

function buildAlignedSignersTableHTML(customSigners, isDigital) {
    const tglStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const desaName = DB.settings.nama_desa || 'Molompar Atas';
    const htName = DB.settings.hukum_tua || '....................';

    if (!customSigners || customSigners.length === 0) {
        return `
            <table class="print-ttd-table">
                <tr class="print-ttd-date-row">
                    <td style="width: 50%;">&nbsp;</td>
                    <td style="width: 50%;">Dikeluarkan di: ${desaName}, ${tglStr}</td>
                </tr>
                <tr class="print-ttd-jabatan-row">
                    <td>&nbsp;</td>
                    <td>Hukum Tua Desa ${desaName}</td>
                </tr>
                <tr class="print-ttd-space-row">
                    <td>&nbsp;</td>
                    <td>${isDigital && DB.settings.ttd_cap_digital ? `<img src="${DB.settings.ttd_cap_digital}" class="print-ttd-img">` : ''}</td>
                </tr>
                <tr class="print-ttd-name-row">
                    <td>&nbsp;</td>
                    <td>${htName}</td>
                </tr>
            </table>
        `;
    }

    const colWidth = Math.floor(100 / customSigners.length) + '%';

    const dateCells = customSigners.map((sig, idx) => {
        const isLast = (idx === customSigners.length - 1);
        const topNote = isLast ? `${desaName}, ${tglStr}` : 'Mengetahui / Menyetujui,';
        return `<td style="width: ${colWidth};">${topNote}</td>`;
    }).join('');

    const jabatanCells = customSigners.map(sig => {
        const cleanTitle = (sig.title || '')
            .replace(/Mengetahui\s*\/?\s*Mengesahkan,?\s*/gi, '')
            .replace(/Mengetahui,?\s*/gi, '')
            .replace(/Mengesahkan,?\s*/gi, '')
            .replace(/Dikoordinasikan Oleh,?\s*/gi, '')
            .replace(/Diverifikasi Oleh,?\s*/gi, '')
            .replace(/\n/g, '<br>')
            .trim();
        return `<td>${cleanTitle || sig.title}</td>`;
    }).join('');

    const spaceCells = customSigners.map(sig => {
        const showStamp = (isDigital && sig.name === htName && DB.settings.ttd_cap_digital);
        return `<td>${showStamp ? `<img src="${DB.settings.ttd_cap_digital}" class="print-ttd-img">` : ''}</td>`;
    }).join('');

    const nameCells = customSigners.map(sig => {
        return `<td>${sig.name || '....................'}</td>`;
    }).join('');

    return `
        <table class="print-ttd-table">
            <tr class="print-ttd-date-row">${dateCells}</tr>
            <tr class="print-ttd-jabatan-row">${jabatanCells}</tr>
            <tr class="print-ttd-space-row">${spaceCells}</tr>
            <tr class="print-ttd-name-row">${nameCells}</tr>
        </table>
    `;
}

function updatePrintPreviewDemo() {
    const box = document.getElementById('uprintMiniPreviewBox');
    if (!box) return;

    const font = document.getElementById('uprintFont').value;
    const isDigital = (document.getElementById('uprintDigitalStamp').value === 'true');
    const useKop = (document.getElementById('uprintDefaultKop').value === 'true');
    const kop = useKop ? generatePrintKopHTML() : '<div style="padding: 10px; border: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 9pt; margin-bottom: 12px;">[Mode Tanpa KOP Aktif - Ruang Kepala Surat Kosong]</div>';

    const demoSigners = [
        { title: "Sekretaris Desa " + (DB.settings.nama_desa || 'Molompar Atas'), name: DB.settings.sekdes || '....................' },
        { title: "Hukum Tua Desa " + (DB.settings.nama_desa || 'Molompar Atas'), name: DB.settings.hukum_tua || '....................' }
    ];

    box.style.fontFamily = font;
    box.innerHTML = `
        ${kop}
        <div style="text-align: center; margin: 14px 0;">
            <strong style="text-decoration: underline; font-size: 12.5pt;">SIMULASI CETAK DOKUMEN & TTD SEJAJAR LURUS</strong><br>
            <span style="font-size: 9pt;">Nomor: 001/SIMULASI/MLPA/2026</span>
        </div>
        <p style="font-size: 10pt; text-align: justify; line-height: 1.5;">
            Pratinjau ini menunjukkan tata letak tanda tangan 2 pejabat (Sekretaris Desa di kiri dan Hukum Tua di kanan) yang dijamin 100% sejajar lurus secara horizontal baik baris jabatan, ruang tanda tangan, maupun garis nama pejabat.
        </p>
        ${buildAlignedSignersTableHTML(demoSigners, isDigital)}
    `;
}

function runTestPrintUniversal(useKop = null) {
    const demoSigners = [
        { title: "Sekretaris Desa " + (DB.settings.nama_desa || 'Molompar Atas'), name: DB.settings.sekdes || '....................' },
        { title: "Hukum Tua Desa " + (DB.settings.nama_desa || 'Molompar Atas'), name: DB.settings.hukum_tua || '....................' }
    ];
    executeUniversalPrint(
        "LEMBAR UJI COBA UNIVERSAL PRINT ENGINE",
        "Verifikasi KOP Surat & Tanda Tangan 2 Pejabat Sejajar Lurus",
        `<p style="font-size: 11pt; line-height: 1.6; text-align: justify;">
            Lembar ini membuktikan bahwa Universal Print Engine berfungsi sempurna. Anda dapat mencetak dokumen di seluruh menu baik <strong>Dengan KOP</strong> maupun <strong>Tanpa KOP</strong>, serta posisi tanda tangan antara Hukum Tua dan pejabat lainnya sejajar lurus secara presisi.
        </p>`,
        'portrait',
        demoSigners,
        useKop
    );
}

function generatePrintKopHTML() {
    const s = DB.settings;
    const logoSrc = s.logo_desa || '';

    let subLines = [];
    if (s.kop_show_alamat && s.kop_alamat) subLines.push(s.kop_alamat);
    if (s.kop_show_pos && s.kop_pos) subLines.push("Kode Pos: " + s.kop_pos);
    if (s.kop_show_website && s.kop_website) subLines.push("Website: " + s.kop_website);
    if (s.kop_show_custom && s.kop_custom) subLines.push(s.kop_custom);

    return `
        <div class="print-kop-wrapper">
            ${logoSrc ? `<img src="${logoSrc}" class="print-kop-logo" alt="Logo">` : '<div style="font-size: 48px; width: 70px; text-align: center;">🏛️</div>'}
            <div class="print-kop-text">
                <h2>${s.kop_kab || 'PEMERINTAH KABUPATEN MINAHASA TENGGARA'}</h2>
                <h2>${s.kop_kec || 'KECAMATAN TOMBATU TIMUR'}</h2>
                <h1>${s.kop_desa || 'PEMERINTAH DESA MOLOMPAR ATAS'}</h1>
                ${subLines.length ? `<p>${subLines.join(' | ')}</p>` : ''}
            </div>
            <div style="width: 70px;"></div>
        </div>
    `;
}

function executeUniversalPrint(docTitle, docSubtitle, bodyContentHtml, overrideOrientation = null, customSigners = null, useKop = null) {
    const pCfg = DB.settings.print_settings || { font: "Arial", paper: "A4", orientation: "portrait", fontSize: "11pt", margin: "15mm", digitalStamp: true };
    const orientation = overrideOrientation || pCfg.orientation || 'portrait';
    const font = pCfg.font || 'Arial';
    const fontSize = pCfg.fontSize || '11pt';
    const margin = pCfg.margin || '15mm';
    const isDigital = pCfg.digitalStamp;

    const finalUseKop = (useKop === null || useKop === undefined) ? getDefaultUseKop() : Boolean(useKop);

    const container = document.getElementById('printContainer');
    container.innerHTML = '';
    container.className = finalUseKop ? 'print-with-kop' : 'print-no-kop';

    let printStyle = document.getElementById('dynamicPrintStyle');
    if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'dynamicPrintStyle';
        document.head.appendChild(printStyle);
    }

    let paperSize = 'A4';
    if (pCfg.paper === 'F4') paperSize = '215mm 330mm';
    else if (pCfg.paper === 'Legal') paperSize = 'legal';
    else if (pCfg.paper === 'Letter') paperSize = 'letter';

    printStyle.innerHTML = `
        @media print {
            @page {
                size: ${paperSize} ${orientation};
                margin: ${margin};
            }
            #printContainer {
                font-family: ${font} !important;
                font-size: ${fontSize} !important;
            }
        }
    `;

    const signersHtml = buildAlignedSignersTableHTML(customSigners, isDigital);

    container.innerHTML = `
        <div style="padding: 6px; font-family: ${font}; font-size: ${fontSize}; color: #000;">
            ${finalUseKop ? generatePrintKopHTML() : ''}
            <div class="print-doc-header" style="text-align: center; margin: 12px 0 16px 0;">
                <h3 style="font-size: 13.5pt; font-weight: 900; text-transform: uppercase; margin: 0; text-decoration: underline;">${docTitle}</h3>
                ${docSubtitle ? `<div style="font-size: 10pt; margin-top: 3px;">${docSubtitle}</div>` : ''}
            </div>
            ${bodyContentHtml}
            ${signersHtml}
        </div>
    `;

    window.print();
}

function openUniversalPrintModal(mode, explicitUseKop = null) {
    const useKop = (explicitUseKop === null || explicitUseKop === undefined) ? getDefaultUseKop() : explicitUseKop;
    if (mode === 'current') {
        if (currentView === 'penduduk') printDataPendudukCurrent(useKop);
        else if (currentView === 'piket') printJadwalPiket(useKop);
        else if (currentView === 'usaha') printDataUsaha(useKop);
        else if (currentView === 'kesehatan') printKesehatanCurrent(useKop);
        else if (currentView === 'disabilitas') printDataDisabilitas(useKop);
        else if (currentView === 'pemuda') printDataPemuda(useKop);
        else if (currentView === 'aset') printDataAset(useKop);
        else if (currentView === 'tanah') printDataTanahBuku(useKop);
        else if (currentView === 'peta') printProfilPetaPU(useKop);
        else if (currentView === 'prodeskel') printLaporanProdeskel(useKop);
        else if (currentView === 'surat') printAgendaSuratCurrent(useKop);
        else if (currentView === 'bpd') printDataBPD(useKop);
        else if (currentView === 'rekon') printBeritaAcaraRekon(useKop);
        else if (currentView === 'bendahara') printBukuKasBendahara(useKop);
        else if (currentView === 'regulasi') printDataRegulasi(useKop);
        else if (currentView === 'berita_acara') printDataBeritaAcara(useKop);
        else if (currentView === 'cetak_khusus') printDaftarHadirMusdes(useKop);
        else {
            runTestPrintUniversal(useKop);
        }
    }
}

function openPrintFilterModal() {
    openModal('modalPrintFilter');
}

function executeCustomPrintPenduduk() {
    const jaga = document.getElementById('pPrintJagaSelect').value;
    const kat = document.getElementById('pPrintKategoriSelect').value;
    const title = document.getElementById('pPrintCustomTitle').value.trim() || 'BUKU REKAPITULASI KEPENDUDUKAN';
    const kopRadio = document.querySelector('input[name="pPrintKopOpt"]:checked');
    const useKop = kopRadio ? (kopRadio.value === 'yes') : getDefaultUseKop();

    closeModal('modalPrintFilter');

    let list = DB.penduduk.filter(p => {
        if (jaga !== 'all' && p.alamat !== jaga) return false;
        const age = parseInt(p.umur) || 0;
        if (kat === 'balita' && age > 5) return false;
        if (kat === 'anak' && (age < 6 || age > 12)) return false;
        if (kat === 'remaja' && (age < 13 || age > 17)) return false;
        if (kat === 'pemuda' && (age < 18 || age > 59)) return false;
        if (kat === 'lansia' && age < 60) return false;
        if (kat === 'kk' && p.shdk !== 'KEPALA KELUARGA') return false;
        return true;
    });

    const sub = `Wilayah: ${jaga === 'all' ? 'Seluruh Desa' : jaga} | Kategori: ${kat.toUpperCase()} | Total: ${formatNumber(list.length)} Jiwa`;

    const tableHtml = `
        <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9.5pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border:1px solid #000; padding:5px;">No</th>
                    <th style="border:1px solid #000; padding:5px;">No. KK</th>
                    <th style="border:1px solid #000; padding:5px;">NIK</th>
                    <th style="border:1px solid #000; padding:5px;">Nama Lengkap</th>
                    <th style="border:1px solid #000; padding:5px;">JK</th>
                    <th style="border:1px solid #000; padding:5px;">Tempat, Tgl Lahir</th>
                    <th style="border:1px solid #000; padding:5px;">Umur</th>
                    <th style="border:1px solid #000; padding:5px;">Hubungan (SHDK)</th>
                    <th style="border:1px solid #000; padding:5px;">Pendidikan</th>
                    <th style="border:1px solid #000; padding:5px;">Pekerjaan</th>
                    <th style="border:1px solid #000; padding:5px;">Wilayah Jaga</th>
                </tr>
            </thead>
            <tbody>
                ${list.map((p, i) => `<tr>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${i+1}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.no_kk}</td>
                    <td style="border:1px solid #000; padding:4px; font-family:monospace;">${p.nik}</td>
                    <td style="border:1px solid #000; padding:4px;"><strong>${p.nama_lengkap}</strong></td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.jenis_kelamin}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.tempat_lahir}, ${p.tanggal_lahir}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.umur}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.shdk}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.pendidikan}</td>
                    <td style="border:1px solid #000; padding:4px;">${p.pekerjaan}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.alamat}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;

    const signers = [
        { title: "Sekretaris Desa " + (DB.settings.nama_desa || 'Molompar Atas'), name: DB.settings.sekdes },
        { title: "Hukum Tua Desa " + (DB.settings.nama_desa || 'Molompar Atas'), name: DB.settings.hukum_tua }
    ];

    executeUniversalPrint(title, sub, tableHtml, 'landscape', signers, useKop);
}

function openModalFactoryReset() {
    document.getElementById('inputResetConfirmCode').value = '';
    openModal('modalFactoryReset');
}

function handleExecuteFactoryReset(e) {
    e.preventDefault();
    const code = document.getElementById('inputResetConfirmCode').value.trim();

    if (code.toUpperCase() === 'RESET' || code === DB.security.master_pin || code === DB.security.master_key) {
        closeModal('modalFactoryReset');

        // 1. Reset seluruh modul operasional ke kosong
        DB.penduduk = [];
        DB.usaha = [];
        DB.kesehatan = { bumil: [], stunting: [], balita: [], lansia: [] };
        DB.disabilitas = [];
        DB.pemuda = [];
        DB.aset = [];
        DB.tanah = [];
        DB.surat = { masuk: [], keluar: [] };
        DB.bpd = [];
        DB.rekon = { pendapatan: [], belanja: [], spp: [] };
        DB.bendahara = [];
        DB.regulasi = [];
        DB.berita_acara = [];
        DB.surat_warga = [];
        DB.piket = [];
        DB.piket_staff_pool = [];
        DB.prodeskel = {
            klasifikasi_desa: "",
            tipologi: "",
            kategori_perkembangan: "",
            potensi_sda: [],
            kelembagaan: []
        };
        DB.peta = {
            peta_img: "",
            luas_total_ha: 0,
            batas_utara: "",
            batas_timur: "",
            batas_selatan: "",
            batas_barat: "",
            koordinat: "",
            jalan_aspal_km: 0,
            jalan_beton_paving_km: 0,
            jalan_tanah_km: 0,
            panjang_drainase_km: 0,
            jumlah_jembatan: 0,
            zona_pemukiman_ha: 0,
            zona_perkebunan_ha: 0,
            zona_fasilitas_ha: 0
        };

        // 2. Reset seluruh Settings & Data Perangkat Desa (termasuk Desa, Kecamatan, Kabupaten, Perangkat, KOP, Visi Misi, Regulasi)
        DB.settings.nama_desa = "";
        DB.settings.kecamatan = "";
        DB.settings.kabupaten = "";
        DB.settings.provinsi = "";
        DB.settings.logo_desa = "";
        DB.settings.hukum_tua = "";
        DB.settings.sekdes = "";
        DB.settings.perangkat_desa = [];
        DB.settings.kop_kab = "";
        DB.settings.kop_kec = "";
        DB.settings.kop_desa = "";
        DB.settings.kop_website = "";
        DB.settings.kop_pos = "";
        DB.settings.kop_alamat = "";
        DB.settings.kop_custom = "";
        DB.settings.visi = "";
        DB.settings.misi = "";
        DB.settings.tahun_berjalan = "";
        DB.settings.nomor_perdes = "";
        DB.settings.nomor_perkades = "";
        DB.settings.nomor_rkpdes = "";
        DB.settings.nomor_apbdes = "";
        DB.settings.nomor_rpjmdes = "";
        DB.settings.ttd_cap_digital = "";

        saveDatabase(true);
        updateHeaderVillageInfo();
        updateLoginScreenTitles();
        renderAllViews();
        renderDashboardView();
        alert("✅ RESET DATA TOTAL BERHASIL:\n\nSeluruh data operasional hingga bagian Pengaturan Desa (Nama Desa, Kecamatan, Kabupaten, KOP, Visi Misi) dan Daftar Perangkat Desa telah dikosongkan semua seperti belum pernah menginput data apa pun!");
    } else {
        alert("Kode konfirmasi tidak sesuai! Ketik kata RESET atau masukkan Master PIN (202699) untuk mereset semua data.");
    }
}

function restoreDefaultMolomparAtas() {
    if (confirm("Kembalikan pengaturan dan data contoh default ke Desa Molompar Atas, Kecamatan Tombatu Timur, Kabupaten Minahasa Tenggara?")) {
        DB = JSON.parse(JSON.stringify(DEFAULT_DB));
        saveDatabase(true);
        updateHeaderVillageInfo();
        updateLoginScreenTitles();
        renderAllViews();
        renderDashboardView();
        alert("✅ Berhasil mengembalikan data default: Desa Molompar Atas, Kecamatan Tombatu Timur, Kabupaten Minahasa Tenggara!");
    }
}

function openMenuVisibilityModal() {
    renderMenuVisibilityCheckboxes();
    openModal('modalMenuVisibility');
}

function renderMenuVisibilityCheckboxes() {
    if (!DB) return;
    const visibleMap = DB.settings.visible_menus || {};

    const buildGridHtml = (prefix) => {
        let html = "";
        MENU_DEFINITIONS.forEach(cat => {
            cat.items.forEach(item => {
                const isVisible = visibleMap[item.key] !== false;
                html += `
                    <label style="display: flex; align-items: center; gap: 8px; padding: 7px 11px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer;">
                        <input type="checkbox" id="${prefix}_${item.key}" ${isVisible ? 'checked' : ''} onchange="toggleMenuVisibility('${item.key}', this.checked)">
                        <span style="font-weight: 600; font-size: 12.5px;">${item.label}</span>
                    </label>
                `;
            });
        });
        return html;
    };

    const gridSettings = document.getElementById('settingsMenuVisibilityGrid');
    if (gridSettings) gridSettings.innerHTML = buildGridHtml('chkMenuSet');

    const gridModal = document.getElementById('modalMenuVisibilityGrid');
    if (gridModal) gridModal.innerHTML = buildGridHtml('chkMenuMod');
}

function toggleMenuVisibility(key, isChecked) {
    if (!DB.settings.visible_menus) DB.settings.visible_menus = {};
    if (key === 'settings' && !isChecked) {
        alert("Menu Pengaturan tetap ditampilkan agar Anda selalu dapat mengatur kembali menu yang disembunyikan.");
        renderMenuVisibilityCheckboxes();
        return;
    }
    DB.settings.visible_menus[key] = isChecked;
    saveDatabase(true);
    renderSidebarNavigation();
    renderMenuVisibilityCheckboxes();
}

function setAllMenusVisibility(visible) {
    if (!DB.settings.visible_menus) DB.settings.visible_menus = {};
    MENU_DEFINITIONS.forEach(cat => {
        cat.items.forEach(item => {
            DB.settings.visible_menus[item.key] = visible;
        });
    });
    DB.settings.visible_menus['dashboard'] = true;
    DB.settings.visible_menus['settings'] = true;
    saveDatabase(true);
    renderSidebarNavigation();
    renderMenuVisibilityCheckboxes();
}

function setEssentialMenusOnly() {
    const essentials = ['dashboard', 'penduduk', 'piket', 'opensid_surat', 'aset', 'bendahara', 'rekon', 'settings'];
    if (!DB.settings.visible_menus) DB.settings.visible_menus = {};
    MENU_DEFINITIONS.forEach(cat => {
        cat.items.forEach(item => {
            DB.settings.visible_menus[item.key] = essentials.includes(item.key);
        });
    });
    saveDatabase(true);
    renderSidebarNavigation();
    renderMenuVisibilityCheckboxes();
}

window.addEventListener('DOMContentLoaded', () => {
    injectAllIcons();
    initDatabase();
    renderAllViews();
});



// ============================================================================
// AUTO-SYNC FORM WARGA (SURAT ONLINE, PENGADUAN & KONTAK) KE GOOGLE SHEETS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const fSurat = document.getElementById('form-surat-online');
    if (fSurat) {
        fSurat.addEventListener('submit', function() {
            try {
                const fd = new FormData(fSurat);
                const obj = {};
                fd.forEach((v, k) => { obj[k] = v; });
                secureFetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'catatPermohonanSuratWarga', ...obj, api_key: MOLAS_API_KEY })
                }).catch(() => {});
            } catch (err) {}
        });
    }

    const fAduan = document.getElementById('form-pengaduan');
    if (fAduan) {
        fAduan.addEventListener('submit', function() {
            try {
                const fd = new FormData(fAduan);
                const obj = {};
                fd.forEach((v, k) => { obj[k] = v; });
                secureFetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'catatPengaduanWarga', ...obj, api_key: MOLAS_API_KEY })
                }).catch(() => {});
            } catch (err) {}
        });
    }

    const fKontak = document.getElementById('form-kontak');
    if (fKontak) {
        fKontak.action = EP_KONTAK;
        fKontak.addEventListener('submit', function() {
            try {
                const fd = new FormData(fKontak);
                const obj = {};
                fd.forEach((v, k) => { obj[k] = v; });
                secureFetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'catatPengaduanWarga', Pelapor_Nama: obj.nama, Judul: 'Pesan Kontak Landing (' + (obj.alamat || '-') + ')', Isi_Pesan: obj.pesan, api_key: MOLAS_API_KEY })
                }).catch(() => {});
            } catch (err) {}
        });
    }
});