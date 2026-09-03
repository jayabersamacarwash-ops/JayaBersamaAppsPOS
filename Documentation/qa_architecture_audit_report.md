# 📋 LAPORAN AUDIT QA/QC & LEAD SOFTWARE ARCHITECT
**Aplikasi WebApp POS & Manajemen Operasional Jaya Bersama (Cafe & Carwash)**
*Tanggal Audit: 3 September 2026*  
*Role Auditor: Senior QA Engineer & Lead Software Architect*  
*Stack: React 19, Vite, Tailwind CSS v4, Supabase (PostgreSQL & Realtime)*

---

## 📑 Daftar Isi
1. [Executive Summary](#1-executive-summary)
2. [Tabel Rekapitulasi Temuan Masalah](#2-tabel-rekapitulasi-temuan-masalah)
3. [Detail Temuan & Rekomendasi Solusi (Before vs After)](#3-detail-temuan--rekomendasi-solusi)
   - [3.1 Security: Celah Kebocoran API Key WhatsApp CRM di Client-Side](#31-security-celah-kebocoran-api-key-whatsapp-crm-di-client-side)
   - [3.2 Functional Bug: Transaksi Split Payment Terabaikan saat Tutup Kasir](#32-functional-bug-transaksi-split-payment-terabaikan-saat-tutup-kasir)
   - [3.3 Security: Ketiadaan File .gitignore di Root Project](#33-security-ketiadaan-file-gitignore-di-root-project)
   - [3.4 Performance: Unbounded Data Fetching pada Finance & Karyawan](#34-performance-unbounded-data-fetching-pada-finance--karyawan)
   - [3.5 Bug & Edge Case: Fallback UUID Generator Tidak Valid untuk PostgreSQL UUID](#35-bug--edge-case-fallback-uuid-generator-tidak-valid-untuk-postgresql-uuid)
   - [3.6 Performance & Arsitektur: Ketiadaan Route Code-Splitting (React.lazy)](#36-performance--arsitektur-ketiadaan-route-code-splitting-reactlazy)
   - [3.7 UI/UX Consistency: Inkonsistensi Dialog Alert Native vs Modal Kustom](#37-uiux-consistency-inkonsistensi-dialog-alert-native-vs-modal-kustom)
4. [Rekomendasi Action Plan Prioritas](#4-rekomendasi-action-plan-prioritas)

---

## 1. Executive Summary

Audit menyeluruh telah dilakukan terhadap sistem aplikasi POS Jaya Bersama mencakup aspek **Functional Correctness, State Management, Error Handling, Performance & Resource Efficiency, UI/UX Consistency, serta Code Quality & Security**.

Aplikasi ini memiliki pondasi fungsional yang matang, desain antarmuka modern, dan alur operasional yang lengkap (POS Kasir, Antrean Carwash Real-time, Perhitungan Komisi Kru, Akuntansi Dua Tingkat, dan Manajemen Inventaris). Namun, ditemukan beberapa **risiko keamanan kritis**, **bug kalkulasi omzet pada pembayaran kombinasi (Split Payment)**, serta **potensi degradasi performa frontend** yang perlu segera ditangani sebelum deployment penuh.

### Ringkasan Penilaian Kesehatan Sistem:
* **Skor Kesehatan Keseluruhan:** **`7.4 / 10`**
* **Functional Correctness:** `7.5 / 10` (Alur utama stabil, terdapat bug pada rekap Split Payment)
* **Error Handling & Validation:** `8.0 / 10` (Validasi form lengkap, dialog error informatif)
* **Performance & Scalability:** `6.5 / 10` (Perlu server-side filtering & code-splitting)
* **UI/UX Consistency:** `8.5 / 10` (Desain rapi, transisi halus, dark theme konsisten)
* **Security & Data Privacy:** `6.0 / 10` (Perlu pengamanan API key pihak ketiga & .gitignore)

---

## 2. Tabel Rekapitulasi Temuan Masalah

| No | Lokasi File / Komponen | Kategori | Tingkat Keparahan | Deskripsi Masalah |
| :---: | :--- | :---: | :---: | :--- |
| **1** | `src/pages/CafePOS.jsx` (L1397-L1516) | **Security** | **HIGH** | `VITE_WACRM_API_KEY` diekspos di client bundle. API Key CRM WhatsApp dapat diekstrak oleh siapapun melalui DevTools / Network tab. |
| **2** | `src/utils/helpers.js` (L45-L55) & `CafePOS.jsx` (L901-L907) | **Bug** | **HIGH** | Rekap Tutup Kasir (End of Day) mengabaikan transaksi `SPLIT` payment, mengakibatkan selisih saldo omzet harian pada tabel `cashflow`. |
| **3** | Root Directory (`.gitignore`) | **Security** | **MEDIUM** | Tidak ada file `.gitignore`. File environment (`JB.env`, `JB_dev.env.bak`) serta file backup CSV/JSON sensitif rentan terunggah ke repositori publik/privat. |
| **4** | `src/pages/Finance.jsx` (L23-L38) & `Karyawan.jsx` (L18-L33) | **Performance** | **MEDIUM** | `fetchAllRows` mengunduh seluruh isi tabel `cashflow` dan `carwash` dari awal database dibuat tanpa batas tanggal di server. |
| **5** | `src/utils/helpers.js` (L1-L6) | **Bug / Edge Case** | **LOW** | Fallback `generateUUID()` menggunakan string acak non-standar yang akan ditolak oleh kolom bertipe `uuid` di PostgreSQL jika `crypto.randomUUID` tidak aktif. |
| **6** | `src/App.jsx` (L6-L13) | **Performance** | **LOW** | Semua halaman diimpor secara statis tanpa `React.lazy()`. Ukuran bundle awal mencapai ~783 kB JS. |
| **7** | `src/pages/CafePOS.jsx` (L1521) | **UX Consistency** | **LOW** | Penggunaan `window.alert()` browser bawaan yang tidak konsisten dengan modal kustom modern aplikasi. |

---

## 3. Detail Temuan & Rekomendasi Solusi

### 3.1 Security: Celah Kebocoran API Key WhatsApp CRM di Client-Side
* **Lokasi:** `src/pages/CafePOS.jsx` (Baris 1399–1401)
* **Akar Masalah:**
  Environment variable dengan awalan `VITE_` dimasukkan langsung ke dalam JavaScript bundle publik oleh Vite. Memanggil endpoint WhatsApp CRM secara langsung dari browser menggunakan `Authorization: Bearer ${apiKey}` membuat pihak luar/kasir dapat menyalin API key dan menyalahgunakannya.
* **Rekomendasi Arsitektur:**
  Gunakan **Supabase Edge Function** (`/functions/v1/wacrm-sync`) sebagai API Gateway/Proxy server-side.

#### Perbaikan Kode (Before vs After):
```javascript
// ❌ BEFORE (Client-side langsung memegang Secret Key)
const apiUrl = import.meta.env.VITE_WACRM_API_URL;
const apiKey = import.meta.env.VITE_WACRM_API_KEY;

await fetch(`${apiUrl}/api/v1/contacts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}` // ⚠️ RENTAN: Bocor di Network Tab & JS Bundle
  },
  body: JSON.stringify({ phone, name: cleanPlat })
});
```

```javascript
// ✅ AFTER (Aman: Panggil melalui Supabase Edge Function)
const { data, error } = await supabase.functions.invoke('wacrm-sync', {
  body: {
    plat: cleanPlat,
    phone: phone,
    model: carwashForm.model || 'Mobil',
    paket: carwashForm.paket || 'Cuci'
  }
});
```

---

### 3.2 Functional Bug: Transaksi Split Payment Terabaikan saat Tutup Kasir
* **Lokasi:** `src/utils/helpers.js` (Baris 45–55) dan `src/pages/CafePOS.jsx` (Baris 901–907)
* **Akar Masalah:**
  Pada sistem POS, pembayaran dapat berupa `CASH`, `QRIS`, atau kombinasi keduanya (`SPLIT`). Saat proses Tutup Kasir, fungsi `calculateTutupKasirRecap` hanya mengecek `s.metode_bayar === 'CASH'` atau `'QRIS'`. Transaksi bernilai `SPLIT` dilewati begitu saja sehingga nominal Cash & QRIS tidak pernah masuk ke buku kas (`cashflow`). Selain itu, query di `CafePOS.jsx` tidak menyertakan kolom `nominal_cash` dan `nominal_qris`.

#### Perbaikan Kode (Before vs After):
```javascript
// ❌ BEFORE (helpers.js - Mengabaikan SPLIT)
export const calculateTutupKasirRecap = ({ receipts, expenses, cashierName, todayDate, timestamp }) => {
  let totalCash = 0
  let totalQRIS = 0
  
  if (receipts) {
    receipts.forEach(s => {
      if (s.metode_bayar === 'CASH') totalCash += parseFloat(s.total_tagihan || 0)
      else if (s.metode_bayar === 'QRIS') totalQRIS += parseFloat(s.total_tagihan || 0)
      // Transaksi SPLIT diabaikan total!
    })
  }
  // ...
}
```

```javascript
// ✅ AFTER (helpers.js - Mendukung CASH, QRIS, dan SPLIT secara presisi)
export const calculateTutupKasirRecap = ({ receipts, expenses, cashierName, todayDate, timestamp }) => {
  let totalCash = 0
  let totalQRIS = 0
  
  if (receipts) {
    receipts.forEach(s => {
      if (s.metode_bayar === 'CASH') {
        totalCash += parseFloat(s.total_tagihan || 0)
      } else if (s.metode_bayar === 'QRIS') {
        totalQRIS += parseFloat(s.total_tagihan || 0)
      } else if (s.metode_bayar === 'SPLIT') {
        totalCash += parseFloat(s.nominal_cash || 0)
        totalQRIS += parseFloat(s.nominal_qris || 0)
      }
    })
  }
  // ...
}
```

```javascript
// ✅ UPDATE DI CafePOS.jsx (Baris 903)
const { data: strukHariIni, error: errStruk } = await supabase
  .from('struk')
  .select('total_tagihan, metode_bayar, nominal_cash, nominal_qris') // <- Tambahkan nominal_cash & nominal_qris
  .eq('status_bayar', 'Selesai')
  .eq('tanggal', todayDate)
```

---

### 3.3 Security: Ketiadaan File .gitignore di Root Project
* **Lokasi:** Root Workspace (`c:/code/JB POSS APS/`)
* **Akar Masalah:**
  Tidak ditemukannya file `.gitignore` membuat file rahasia (`JB.env`, `JB_dev.env.bak`) dan folder cadangan data (`backup_*`, `Data Penuh CSV/`) rentan ter-commit tanpa sengaja ke Git.
* **Rekomendasi Solusi:**
  Tambahkan file `.gitignore` di root folder dengan isi berikut:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing & Logs
coverage/
*.log

# Production Build
dist/
build/

# Environment variables & secrets
.env
.env.local
.env.*.local
JB.env
JB_dev.env.bak
*.env

# Local backups & Scratch Files
scratch_*.js
backup_*/
Backup */
Data Penuh CSV/
csv file/

# OS / Editor
.DS_Store
Thumbs.db
.vscode/
.idea/
```

---

### 3.4 Performance: Unbounded Data Fetching pada Finance & Karyawan
* **Lokasi:** `src/pages/Finance.jsx` (Baris 23–38) & `src/pages/Karyawan.jsx` (Baris 18–33)
* **Akar Masalah:**
  Fungsi `fetchAllRows` mengambil seluruh isi tabel tanpa filter tanggal di sisi database. Seiring berjalannya operasional selama berbulan-bulan, aplikasi akan mengunduh puluhan ribu baris ke RAM browser setiap kali halaman dibuka.
* **Rekomendasi Solusi:**
  Tambahkan server-side query filtering berbasis rentang tanggal aktif (`startDate` dan `endDate`) seperti yang telah diterapkan pada `Dashboard.jsx`.

#### Perbaikan Kode (Before vs After):
```javascript
// ❌ BEFORE (Finance.jsx & Karyawan.jsx)
const fetchAllRows = async (table, select = '*') => {
  let allData = []
  let from = 0
  const step = 1000
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + step - 1)
    if (error || !data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < step) break
    from += step
  }
  return allData
}
```

```javascript
// ✅ AFTER (Filtered Server-Side by Date Range)
const fetchAllRows = async (table, select = '*', dateColumn = null, start = null, end = null) => {
  let allData = []
  let from = 0
  const step = 1000
  while (true) {
    let query = supabase.from(table).select(select)
    if (dateColumn && start) query = query.gte(dateColumn, start)
    if (dateColumn && end) query = query.lte(dateColumn, end)

    const { data, error } = await query.range(from, from + step - 1)
    if (error || !data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < step) break
    from += step
  }
  return allData
}
```

---

### 3.5 Bug & Edge Case: Fallback UUID Generator Tidak Valid untuk PostgreSQL UUID
* **Lokasi:** `src/utils/helpers.js` (Baris 1–6)
* **Akar Masalah:**
  Jika aplikasi diakses dari perangkat kasir berbasis jaringan lokal tanpa HTTPS/SSL, `window.crypto.randomUUID` mungkin `undefined`. Fallback saat ini menghasilkan string alfanumerik biasa (misal: `7g9xk2p...`) yang akan **ditolak mentah-mentah oleh kolom PostgreSQL bertipe `UUID`** (`invalid input syntax for type uuid`).
* **Rekomendasi Solusi:**
  Gunakan generator UUID v4 standar RFC 4122.

#### Perbaikan Kode (Before vs After):
```javascript
// ❌ BEFORE
export const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
```

```javascript
// ✅ AFTER (RFC 4122 Compliant UUID v4 Fallback)
export const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

---

### 3.6 Performance & Arsitektur: Ketiadaan Route Code-Splitting (React.lazy)
* **Lokasi:** `src/App.jsx` (Baris 6–13)
* **Akar Masalah:**
  Seluruh halaman (`Dashboard`, `Admin`, `Finance`, `Database`, `Karyawan`, `CafePOS`) di-bundle ke dalam 1 file JavaScript berukuran >780 kB. Kasir yang hanya membuka menu `/pos` tetap harus mengunduh seluruh kode analitik dan manajemen database yang tidak mereka miliki hak aksesnya.
* **Rekomendasi Solusi:**
  Terapkan Dynamic Imports via `React.lazy()` dan `<Suspense>`.

#### Perbaikan Kode (Before vs After):
```javascript
// ❌ BEFORE (Synchronous Direct Imports)
import Dashboard from './pages/Dashboard'
import CafePOS from './pages/CafePOS'
import CarwashQueue from './pages/CarwashQueue'
import Finance from './pages/Finance'
import Admin from './pages/Admin'
import Karyawan from './pages/Karyawan'
import Database from './pages/Database'
import Login from './pages/Login'
```

```javascript
// ✅ AFTER (Lazy Loading Code Splitting)
import React, { useState, lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const CafePOS = lazy(() => import('./pages/CafePOS'))
const CarwashQueue = lazy(() => import('./pages/CarwashQueue'))
const Finance = lazy(() => import('./pages/Finance'))
const Admin = lazy(() => import('./pages/Admin'))
const Karyawan = lazy(() => import('./pages/Karyawan'))
const Database = lazy(() => import('./pages/Database'))
const Login = lazy(() => import('./pages/Login'))

// Bungkus <Routes> di dalam <Suspense fallback={<LoadingSpinner />}>
```

---

### 3.7 UI/UX Consistency: Inkonsistensi Dialog Alert Native vs Modal Kustom
* **Lokasi:** `src/pages/CafePOS.jsx` (Baris 1521)
* **Akar Masalah:**
  Saat transaksi berhasil diedit, aplikasi memicu `window.alert('Perubahan transaksi berhasil disimpan!')` yang merusak estetika gelap/glassmorphism aplikasi.
* **Rekomendasi Solusi:**
  Ganti dengan fungsi `await showAlert(...)` yang sudah tersedia di dalam komponen.

```javascript
// ❌ BEFORE
window.alert('Perubahan transaksi berhasil disimpan!')

// ✅ AFTER
await showAlert('Perubahan transaksi berhasil disimpan!', 'Sukses')
```

---

## 4. Rekomendasi Action Plan Prioritas

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           PRIORITAS IMPLEMENTASI PERBAIKAN                        │
├───────────────────────────────────────────────────────────────────────────────────┤
│ 1. [CRITICAL] Perbaiki kalkulasi Tutup Kasir untuk mendukung SPLIT payment        │
│ 2. [SECURITY] Amankan WhatsApp CRM API Key & buat file .gitignore                 │
│ 3. [STABILITY] Perbarui generator UUID RFC4122 di helpers.js                      │
│ 4. [PERFORMANCE] Terapkan Server-Side Date Filter pada Finance & Karyawan         │
│ 5. [OPTIMIZATION] Terapkan React.lazy() & refactor modular CafePOS.jsx            │
└───────────────────────────────────────────────────────────────────────────────────┘
```

1. **Prioritas 1 (Urgent Bug Fix):**
   * Perbarui `calculateTutupKasirRecap` di `helpers.js` dan query `struk` di `CafePOS.jsx` untuk memasukkan `nominal_cash` dan `nominal_qris` dari transaksi `SPLIT`.
2. **Prioritas 2 (Security Hardening):**
   * Buat file `.gitignore` di root folder aplikasi.
   * Migrasikan kredensial `VITE_WACRM_API_KEY` ke Supabase Edge Functions.
3. **Prioritas 3 (Data Integrity):**
   * Ganti fungsi `generateUUID` dengan format standar RFC4122 v4 untuk mencegah kegagalan insert transaksi pada perangkat lama.
4. **Prioritas 4 (Performance & Scalability):**
   * Pasang filter tanggal pada `fetchAllRows` di halaman `Finance.jsx` dan `Karyawan.jsx`.
   * Terapkan lazy-loading rute di `App.jsx`.
5. **Prioritas 5 (Code Maintainability):**
   * Pecah file raksasa `CafePOS.jsx` (3.248 baris) menjadi subkomponen modular (`CartDrawer.jsx`, `CarwashModal.jsx`, `SplitPaymentModal.jsx`, `TutupKasirModal.jsx`).

---
*Laporan ini disusun sebagai dokumen evaluasi teknis resmi untuk memastikan stabilitas, keamanan, dan efisiensi aplikasi POS Jaya Bersama.*
