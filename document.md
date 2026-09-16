# Proyek SAAS ERP APP

## 1. Ringkasan Inisialisasi Proyek
- **Tanggal Inisialisasi:** 11 September 2026
- **Sumber Kode:** `C:\code\JB POSS APS`
- **Lokasi Workspace Saat Ini:** `C:\Users\msi\Project\SAAS ERP APP`
- **Tujuan:** Transformasi aplikasi POS (Jaya Bersama POS) menjadi platform SaaS ERP Multi-Tenant kelas enterprise yang dapat diuji dan dijalankan 100% secara lokal offline tanpa ketergantungan cloud.

---

## 2. Struktur Proyek Hasil Migrasi & Refactoring Lokal
- **`src/services/localDbEngine.js`**: Mesin database lokal mandiri berbasis localStorage/memori dengan query builder chainable, isolasi multi-tenant (`tenant_id`, `branch_id`), Chart of Accounts standar, mesin pencatatan jurnal Double-Entry otomatis, dan pemotongan stok otomatis berbasis Bill of Materials (BOM/Resep).
- **`src/services/apiAdapter.js`**: Adapter API murni lokal yang terhubung langsung ke mesin database lokal.
- **`src/supabaseClient.js`**: Mengarahkan seluruh query aplikasi eksisting ke `localDbEngine` sehingga tidak ada network call keluar atau ketergantungan API key.
- **`src/context/AuthContext.jsx`**: Sistem autentikasi dan manajemen sesi lokal untuk peran Owner/Admin dan Kasir.
- **`src/services/__tests__/localDbEngine.test.js`**: Test suite pengujian otomatis untuk memverifikasi isolasi tenant, integritas double-entry ledger, dan trigger inventori.
- **`Documentation/`**: Dokumentasi historis sistem operasional POS.
- **`AGENTS.md`**: Master spesifikasi orkestrasi Multi-Agent.

---

## 3. Skema Data SaaS ERP Lokal (Core Tables)

1. **Multi-Tenancy & Organisasi**:
   - `tenants`: Menyimpan penyewa/perusahaan SaaS (`id`, `nama`, `slug`, `plan`, `status`).
   - `branches`: Menyimpan data cabang/outlet (`id`, `tenant_id`, `nama`, `kode`, `alamat`, `telepon`).

2. **Sistem Akuntansi (Double-Entry General Ledger)**:
   - `chart_of_accounts`: Master kode akun (Aset: Kas, Bank, Piutang, Persediaan; Liabilitas: Hutang Usaha; Ekuitas: Modal, Laba Ditahan; Pendapatan: Cafe, Carwash; Beban: HPP, Komisi Kru, Utilitas, Operasional).
   - `journal_entries`: Header transaksi jurnal umum (`id`, `tenant_id`, `branch_id`, `entry_no`, `date`, `memo`, `total_amount`, `status`).
   - `journal_entry_lines`: Baris rincian jurnal (`id`, `tenant_id`, `journal_entry_id`, `account_id`, `debit`, `credit`, `memo`).

3. **Pengadaan & Vendor (Procurement)**:
   - `suppliers`: Master data vendor dan pemasok bahan baku.
   - `purchase_orders` & `purchase_order_items`: Siklus pembelian bahan baku.
   - `stock_movements`: Log mutasi fisik dan valuasi persediaan.

4. **Operasional & POS Terintegrasi**:
   - `kasir`, `metode_bayar`, `stok_barang`, `daftar_harga_menu`, `resep`, `diskon`, `pos_balances`, `karyawan_cuci`, `struk`, `cafe`, `carwash`, `pengeluaran`, `barang_masuk`, `barang_keluar`, `cashflow`, `profiles`, `audit_logs`.

---

## 4. Log Perubahan & Status
- **[2026-09-11 16:13]** Penyalinan repositori dari `C:\code\JB POSS APS` ke `C:\Users\msi\Project\SAAS ERP APP`.
- **[2026-09-11 16:20]** Pembersihan menyeluruh koneksi cloud eksternal (menghapus konfigurasi Vercel, Cloudflare Pages/Workers, script D1).
- **[2026-09-11 16:22]** Implementasi `localDbEngine.js` dengan dukungan Multi-Tenant, Chart of Accounts, Double-Entry Journal auto-posting, serta query builder chainable yang kompatibel dengan Supabase client API.
- **[2026-09-11 16:23]** Pengujian otomatis TDD via Vitest: **4 Test Files (42 Tests) PASSED (100% Green)** dan pengujian build produksi Vite sukses tanpa kendala.
- **[2026-09-11 19:07]** Refactoring UI/UX Fase 1 (Pembersihan Dashboard & Executive Cockpit):
  - Mengeliminasi tab raksasa yang menduplikasi tabel transaksi POS, Queue, dan Finance dari halaman depan.
  - Membangun antarmuka Executive Cockpit 1-halaman yang bersih: 4 kartu metrik utama (Total Omzet, Estimasi Laba Bersih, Volume Operasional, Total Likuiditas Kas & Bank).
  - Menyematkan Pusat Aksi Cepat (*Quick Shortcuts*) langsung ke modul POS, Queue, Finance, dan Database.
  - Menambahkan Operational Pulse: Indikator Peringatan Bahan Baku Kritis otomatis dari `stok_barang` dan status antrean carwash hari ini.
  - Mengintegrasikan posisi saldo kas laci dan 3 rekening bank dalam layout terpadu.
  - Menyediakan View Switcher minimalis 3-mode: Ringkasan Eksekutif, Laporan Akuntansi Resmi (Laba Rugi & Neraca dengan fungsi cetak PDF), dan Data CRM Pelanggan.
  - Ukuran bundle `Dashboard.js` berkurang drastis dari ~115 kB menjadi 48.49 kB (penurunan >55%) dengan kecepatan rendering jauh lebih responsif. Build produksi dan 42 unit test 100% lulus.
- **[2026-09-11 20:07]** Refactoring UI/UX Fase 2 (Pemisahan Modul Mandiri CRM & Laporan Akuntansi):
  - Membuat rute mandiri `/reports` (`src/pages/Reports.jsx`): Laporan Keuangan Konsolidasi resmi standar EMKM (Laporan Laba Rugi Segmen Usaha Cafe & Carwash, Posisi Rekonsiliasi Kas Laci & 3 Rekening Bank, Catatan Penunjang Usaha, serta sheet cetak PDF `window.print()` dengan format dokumen cetak resmi).
  - Membuat rute mandiri `/crm` (`src/pages/CRM.jsx`): Manajemen Hubungan Pelanggan (CRM) & Carwash Loyalty. Dilengkapi 4 kartu ringkasan (Total Pelanggan, VIP ≥5x, Reguler 2-4x, Baru 1x), pencarian instan nomor plat/nama/paket, filter segmen, modal histori lengkap kunjungan dan kru pencuci, integrasi tautan langsung chat WhatsApp (`wa.me`), serta fitur ekspor CSV data pelanggan.
  - Memperbarui `src/App.jsx`: Mendaftarkan rute terlindungi `/reports` dan `/crm` dengan `ownerOnly={true}` secara lazy-loaded.
  - Memperbarui `src/components/Sidebar.jsx`: Menambahkan navigasi `Pelanggan & CRM` (`/crm`) dan `Laporan Akuntansi` (`/reports`).
  - Merampingkan `src/pages/Dashboard.jsx`: Menghapus duplikasi kode tampilan CRM dan Laporan Akuntansi dari Dashboard, sehingga Dashboard beroperasi murni sebagai Executive Cockpit ultra-ringan (ukuran bundle turun lagi menjadi hanya **31.70 kB**). Build Vite dan 42 test Vitest 100% Green.
- **[2026-09-11 20:35]** Integrasi Data Asli Supabase Cloud (Opsi 1: Safe Pull & Offline Seed):
  - **Jaminan Keamanan Mutlak (Zero Remote Mutation)**: Script penarik data `scripts/pull_data_from_supabase.js` hanya menjalankan kueri HTTP `GET` murni (SELECT) dengan pagination `Range: 0-999`, tanpa satu pun operasi `POST`, `PATCH`, `PUT`, atau `DELETE`. Database remote di Supabase cloud 100% utuh tanpa perubahan.
  - Berhasil menarik data snapshot riil ke direktori `pulled_supabase_data/`:
    - `struk`: 4.035 transaksi riil
    - `carwash`: 4.157 transaksi cucian riil
    - `cafe`: 1.437 transaksi pesanan cafe riil
    - `cashflow`: 1.698 riwayat mutasi kas & bank
    - `pengeluaran`: 743 riwayat beban usaha
    - `barang_keluar`: 2.176 log mutasi bahan baku
    - `stok_barang`: 19 item bahan baku
    - `daftar_harga_menu`: 37 item menu cafe
    - `resep`: 63 relasi BOM resep
    - `pos_balances`: 4 saldo kas & bank riil (Cash: Rp 3.241.500, Rek Y: Rp 2.452.250, Rek N: -Rp 240.038, Rek R: Rp 3.778.696)
    - `profiles`: 10 akun riil (termasuk Owner Nazrin dan seluruh kasir)
  - Membuat `scripts/prepare_real_seed.js` untuk memetakan data dengan isolasi multi-tenancy (`DEFAULT_TENANT_ID`, `DEFAULT_BRANCH_ID`) ke `src/services/realSeedData.json`.
  - Mengintegrasikan `realSeedData.json` ke dalam `src/services/localDbEngine.js` dengan fallback in-memory yang aman dari batasan browser localStorage quota.
  - Memperbarui konfigurasi `vite.config.js` dengan *manualChunks* terpisah (`real-seed-database`), menjaga bundle aplikasi utama tetap ramping (**270 kB** / 85 kB gzip).
  - Verifikasi otomatis: **42 Test Vitest PASSED (100% Green)** dan build produksi Vite sukses tanpa error.
- **[2026-09-11 20:40]** Bugfix & Penyempurnaan Halaman Antrean Carwash (`/queue`):
  - **Akar Masalah**: Panggilan `supabase.channel(...)` di `CarwashQueue.jsx` memicu `TypeError: supabase.channel is not a function` karena mock real-time channel belum diimplementasikan di `localDbEngine.js`, mengakibatkan halaman crash/blank saat dimuat.
  - **Perbaikan Engine**: Mengimplementasikan mock method `channel()`, `removeChannel()`, `removeAllChannels()`, dan `getChannels()` di `localDbEngine.js`, serta dukungan relasi auto-join `struk` pada kueri `carwash`.
  - **Peningkatan Antarmuka (`CarwashQueue.jsx`)**:
    - Menambahkan filter tanggal fleksibel (Date Picker) dan tombol pintas "Hari Ini".
    - Menambahkan Live Count Badges pada tab `Dalam Proses (Pending)` dan `Selesai Dicuci`.
    - Auto-switch tab pintar: jika tidak ada antrean pending hari ini namun terdapat mobil yang sudah selesai dicuci, otomatis mengarahkan ke tab `Selesai Dicuci` (lengkap dengan ucapan selesai dan tombol aksi).
    - Pencarian aman (null-safe) untuk plat nomor, paket, dan nama kru pencuci.
  - Verifikasi otomatis: Build produksi Vite sukses (2.41s) dan seluruh 42 test Vitest 100% lulus (Green).
- **[2026-09-11 20:48]** Audit Menyeluruh Seluruh Halaman & Korelasi Data Inter-Modul:
  - **Audit Halaman Database Master (`/database`)**:
    - Memperbaiki dukungan opsi `{ count: 'exact' }` pada query builder `localDbEngine.js` sehingga kalkulasi total data (misal 4.157 record carwash) dan paginasi halaman (Halaman 1 dari 84) bekerja 100% tanpa macet.
  - **Audit Halaman Dashboard (`/`) & Laporan Akuntansi (`/reports`)**:
    - Menambahkan dukungan resolusi kueri bertingkat *nested dot-notation* (seperti `struk.tanggal`) pada helper `_getValue(row, column)`. Memungkinkan pemfilteran data item cafe (`cafe!inner(tanggal)`) berdasarkan rentang tanggal struk secara otomatis, menghasilkan angka omzet cafe yang presisi.
  - **Audit Halaman Karyawan & Komisi (`/karyawan`)**:
    - Memvalidasi pembagian komisi cuci mobil (*wages calculation*) dari 4.157 record cucian riil untuk seluruh kru aktif (Anggota 1 & Anggota 2) serta korelasi otomatis pemotongan kasbon dari tabel `cashflow` dan `pengeluaran`.
  - **Audit CRM Pelanggan (`/crm`)**:
    - Memverifikasi agregasi 4.157 riwayat servis kendaraan menghasilkan 2.599 pelanggan unik (119 VIP, 558 Reguler, 1.922 Baru) dalam waktu pemrosesan ultra-cepat (~32 ms).
  - **Audit Autentikasi & Akun (`/login` & `/admin`)**:
    - Menambahkan pencocokan fleksibel username kasir maupun owner Nazrin (`nazrinalfansyurihrp`) pada fungsi `signInWithPassword`.
  - Verifikasi otomatis: **42 Automated Vitest Tests 100% Green** dan build produksi Vite sukses tanpa kendala.
- **[2026-09-11 21:00]** Penyempurnaan Tab "Tagihan Pending" & "Daftar Transaksi" Kasir POS (`/pos`):
  - **Akar Masalah**:
    1. Kueri tabel `struk` dengan relasi anak `cafe (...)` dan `carwash (...)` sebelumnya belum mengisi array relasi anak pada `localDbEngine.js`, menyebabkan detail item pesanan bernilai `undefined`.
    2. Cache `localStorage` lama pada peramban berpotensi menimpa state `struk` dengan array kosong jika tersimpan dari sesi sebelum data riil diinjeksi.
    3. Tab `history` (Daftar Transaksi) terkunci statis hanya pada tanggal hari kalender saat ini tanpa fasilitas pemilih tanggal fleksibel dan tanpa fitur pencarian cepat.
  - **Perbaikan Engine Database Lokal (`localDbEngine.js`)**:
    - Menambahkan mekanisme auto-join relasi satu-ke-banyak (one-to-many) saat kueri tabel `struk` meminta kolom relasi anak `cafe` dan `carwash`, sehingga seluruh item rincian pesanan terisi otomatis.
    - Memperbarui kunci penyimpanan ke `saas_erp_local_db_v3_production` dan menerapkan *smart merging* pada `loadFromStorage()` untuk memastikan ribuan transaksi riil selalu termuat utuh.
  - **Peningkatan Fitur Antarmuka (`CafePOS.jsx`)**:
    - **Tab Tagihan Pending**:
      - Menambahkan **Bar Pencarian Cerdas** (Search Bar) dengan fitur reset instan untuk memfilter bon gantung berdasarkan nomor struk (`#id`), nama kasir, tanggal, plat nomor kendaraan, paket carwash, maupun item menu cafe.
      - Menambahkan Live Count Badge (e.g. `101 Bon`) dan visualisasi status `PENDING` yang jelas.
    - **Tab Riwayat / Daftar Transaksi**:
      - Menambahkan **Bar Pencarian Cerdas** untuk mencari transaksi berdasarkan ID struk, kasir, nama pelanggan, metode pembayaran (`CASH`/`QRIS`/`TRANSFER`), status bayar, plat kendaraan, dan menu.
      - Menambahkan **Pemilih Tanggal Fleksibel (Date Picker)**, tombol pintas **"Hari Ini"**, dan tombol **Refresh** transaksi kasir.
      - Menambahkan ringkasan statistik harian: jumlah transaksi terpilih dan akumulasi total omzet tunai/lunas secara real-time.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**4.07s**).
- **[2026-09-11 21:15]** Implementasi Fitur Pemantauan Stok Gudang (Read-Only) di Kasir POS (`/pos` - `CafePOS.jsx`):
  - **Tujuan & Filosofi Hak Akses**:
    - Menyediakan antarmuka bagi tim kasir dan operasional lapangan untuk memantau sisa kuantitas stok bahan baku secara langsung saat melakukan pencocokan fisik (Stock Opname).
    - **Isolasi Kewenangan Mutlak (Read-Only)**: Kasir hanya memiliki akses pemantauan (*view & audit*) tanpa tombol edit, tambah stok, ataupun hapus data. Kewenangan perubahan master data dan mutasi restok tetap berada di bawah kendali penuh Owner/Admin di halaman Kelola Admin (`/admin`).
  - **Fitur Tab Stok Gudang (`activeTab === 'inventory'`)**:
    - **Navigasi Tab Baru**: Menambahkan tombol `Stok Gudang (19 Item)` dengan ikon `Boxes` pada bilah tab POS.
    - **Banner Peringatan Peran (Read-Only Guard)**: Penjelasan visual berlatar kuning bahwa penambahan/pengeditan stok wajib melalui Owner/Admin.
    - **4 Kartu Ringkasan Status Stok**:
      - Total Bahan Baku Terdaftar.
      - Stok Aman (> 10 satuan) berstatus hijau.
      - Stok Menipis (1 - 10 satuan) berstatus kuning.
      - Stok Habis / Kritis (≤ 0 satuan) berstatus merah.
    - **Bilah Pencarian Cerdas & Filter Kategori**:
      - Pencarian instan berdasarkan nama bahan baku (misal: *Biji Kopi*, *Gula Aren*, *Indomie*), kode ID (*BK-01*, *BMK-08*), ataupun satuan barang.
      - Tombol chip filter: *Semua*, *Aman*, *Menipis*, dan *Kritis/Habis*.
    - **Tabel Monitoring Terstruktur**:
      - Menampilkan No, Kode Bahan Baku (badge mono), Nama Produk, Satuan, Sisa Stok Sistem (angka tebal font-mono dengan pewarnaan status), Status Label (Aman, Menipis, Habis/Minus), serta Waktu Terakhir Diperbarui.
      - Tombol **Refresh Data** untuk sinkronisasi live terhadap pemotongan stok otomatis (BOM) sehabis transaksi kasir POS.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**2.43s**).
- **[2026-09-11 21:28]** Refactoring Tata Letak Kasir POS (Ergonomic Clean POS Layout) (`/pos` - `CafePOS.jsx`):
  - **Latar Belakang & Masalah**:
    - Halaman Kasir POS sebelumnya terasa padat (*cluttered / cognitive overload*) karena header atas memakan hingga ~300px tinggi layar akibat penumpukan 8 tab berjejer, 4 dropdown redundan, dan 4 kartu besar saldo kas.
    - Kolom checkout kanan (Struk Belanja) terkunci permanen di 1/3 layar, menyebabkan tab non-penjualan (seperti Stok Gudang dan Riwayat Transaksi) terhimpit sempit di 2/3 layar.
  - **Pembaruan Arsitektur Layout**:
    1. **Single-Line Header Ramping (~48px)**:
       - Mengelompokkan navigasi tab ke dalam 3 domain fungsional bersih:
         - **Penjualan**: `Cafe` & `Carwash` (badge aktif kontras).
         - **Audit & Lapangan**: `Bon Pending`, `Riwayat`, dan `Stok Gudang` (lengkap dengan live counter).
         - **Operasional Laci**: `Pengeluaran`, `Tukar Uang`, dan `Tutup Shift`.
       - Status kasir dan shift diintegrasikan rapi di sisi kanan dengan badge pulsasi aktif.
       - Mengubah 4 kotak besar kas laci menjadi **Pill Saldo Laci Interaktif (Popover)**: cukup klik pill untuk melihat rincian modal awal, cash masuk, cash keluar, dan saldo QRIS secara dinamis tanpa mengotori layar.
    2. **Pemindahan Dropdown Redundan ke Struk Checkout**:
       - Menghapus dropdown metode dan status bayar dari header atas, lalu mengintegrasikannya langsung ke dalam panel Struk Belanja (`Metode Bayar: CASH/QRIS/SPLIT/TRANSFER` & `Status: Selesai/Pending`). Alur transaksi kasir menjadi ergonomis dan intuitif.
    3. **Mode Adaptif Cerdas (Auto Full-Width)**:
       - Saat kasir berada di tab **Stok Gudang**, **Daftar Transaksi**, **Tagihan Pending**, **Pengeluaran**, atau **Tukar Uang**, kolom struk belanja kanan otomatis disembunyikan dan area tabel melebar menjadi **100% Full Width**.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**1.87s**).
- **[2026-09-11 21:38]** Standarisasi Hierarki Kontainer & Skala Layer Z-Index Halaman Kasir POS (`/pos` - `CafePOS.jsx`):
  - **Identifikasi Masalah Tabrakan Layer (Overlapping Containers)**:
    1. *Header vs Menu Cards*: Header atas (`glass-panel`) sebelumnya tidak memiliki `relative z-20`, sehingga ketika popover rincian kas dibuka, elemen kartu menu dan search bar di bawahnya (yang memiliki `backdrop-blur-xl`, `relative`, dan `transform: translateY`) membuat stacking context baru yang menembus dan menimpa popover kas.
    2. *Desktop Right Column Bleed*: Kolom struk belanja kanan memiliki properti `h-fit` di dalam grid induk `h-[calc(100vh-2rem)]`, sehingga saat item belanjaan bertambah, kolom tersebut memanjang tak terbatas ke bawah melewati batas viewport layar dan menumpuk dengan footer/padding.
    3. *Mobile Floating Cart Bar*: Menggunakan kelas Tailwind `bottom-18` yang tidak valid secara default sehingga posisi vertikalnya floating tidak stabil, serta `z-40` yang bentrok dengan menu navigasi mobile.
    4. *Konflik Modal z-index*: Modal `settlingBill` (Pelunasan Bon) dan `showModalModal` (Modal Awal) sama-sama berada di `z-50`, berisiko menutupi dialog konfirmasi atau tertimpa modal lainnya.
  - **Arsitektur Skala Z-Index & Solusi Tatanan Layer (Depan vs Belakang)**:
    - **Layer 0 (`z-0`) [Paling Belakang]**: Background canvas sistem dan radial gradient.
    - **Layer 10 (`z-10`) [Konten Kerja]**: Grid katalog menu, form antrean cuci, tabel stok gudang, tabel transaksi. Scrollbox dibatasi menggunakan `overflow-y-auto` di dalam `min-h-0`.
    - **Layer 20 (`relative z-20`) [Header & Sticky Bar]**: Header bar POS kasir terkunci di atas konten kerja sehingga dropdown dan pill tidak tertembus konten di bawahnya. Kolom Struk Belanja desktop diubah menjadi `h-full max-h-[calc(100vh-2rem)] sticky top-4 overflow-hidden` dengan scroll area mandiri.
    - **Layer 30 (`z-30`) [In-Page Popovers & Floating Actions]**: Popover arus kas laci (`showCashDrawerDetail`) berada di depan header dan dilengkapi backdrop klik luar (`fixed inset-0 z-20`). Tombol keranjang mobile distandarkan ke `fixed bottom-5 left-4 right-4 z-30`.
    - **Layer 40 (`z-40`) [App Shell]**: Sidebar desktop dan mobile header navigasi dari `Sidebar.jsx`.
    - **Layer 50 (`z-50`) [Mobile Slide-Over]**: Drawer keranjang belanja mobile (`showMobileCart`) dengan backdrop penuh.
    - **Layer 60 (`z-[60]`) [Action Modals]**: Modal Pelunasan Bon (`settlingBill`).
    - **Layer 70 (`z-[70]`) [Operational Guards]**: Modal Input Modal Awal Kasir (`showModalModal`).
    - **Layer 9999 (`z-[9999]`) [Paling Depan]**: Alert dialog sistem dan konfirmasi kritis (`customAlert`). Selalu berada di lapisan terdepan mutlak dan tidak akan pernah tertutup oleh modal lain.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**2.19s**).
- **[2026-09-11 22:04]** Eliminasi Total Scroll Samping pada Header Tab Kasir POS (`/pos` - `CafePOS.jsx`):
  - **Identifikasi Masalah**:
    - Header kasir sebelumnya ditempatkan di dalam kolom kiri (2/3 lebar layar `lg:col-span-2`), sehingga ruang horizontalnya terbatas (~700px) dan memaksa navigasi menggunakan `overflow-x-auto whitespace-nowrap` (scroll ke samping).
    - Kasir terpaksa harus menggeser/menggesek layar untuk mengakses tab seperti *Stok Gudang*, *Riwayat*, dan *Pengeluaran*.
  - **Solusi Arsitektur**:
    1. **Top Header Full-Width (100% Lebar Layar)**:
       - Memindahkan Header kasir keluar dari kolom 2/3 menjadi header global halaman POS di atas grid utama (`col-span-full` / `w-full`). Ruang kerja tab kini mencakup 100% lebar layar (1280px-1440px).
    2. **Dropdown Operasional Kas & Shift Terintegrasi**:
       - Mengemas 3 aksi operasional laci (*Catat Pengeluaran*, *Tukar Uang*, *Tutup Shift*) ke dalam 1 dropdown interaktif `[ 💵 Shift & Kas ▾ ]` dengan popover backdrop.
    3. **Navigasi Terbuka Tanpa Scroll Samping**:
       - Seluruh tab jualan (`Cafe`, `Carwash`) dan audit (`Bon Pending`, `Riwayat`, `Stok Gudang`) menggunakan `flex-wrap` dan tampil terbuka penuh di layar. Kasir dapat melihat dan memilih tab mana pun secara instan dengan 1 kali klik tanpa perlu scroll samping.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**2.71s**).
- **[2026-09-11 22:11]** Perbaikan Rendering Katalog Menu Cafe & Stabilisasi Layout Flexbox (`/pos` - `CafePOS.jsx`):
  - **Identifikasi Bug**:
    - Setelah restrukturisasi header, pembungkus area kerja utama menggunakan `grid` di dalam flex parent dengan `flex-1 min-h-0`.
    - Dalam spesifikasi CSS Grid, track baris dengan nilai `auto` menyebabkan kontainer kolom kiri (`h-full min-h-0`) dan tab menu cafe (`flex-1 min-h-0 flex-col overflow-hidden`) mengalami siklus kalkulasi tinggi tidak pasti (*cyclic height dependency*). Akibatnya, kontainer grid menu (`flex-1 overflow-y-auto`) menciut hingga `height: 0px`, membuat 37 kartu menu tersembunyi/tidak tampak di layar.
    - Selain itu, filter pencarian menu `filteredMenus` belum memiliki penanganan nilai null/undefined pada atribut `nama_menu`.
  - **Solusi Implementasi**:
    1. Mengubah pembungkus area kerja utama dari CSS Grid menjadi Flexbox murni: `flex-1 min-h-0 flex flex-col lg:flex-row gap-4 md:gap-6 w-full`.
    2. Kolom kiri menggunakan `lg:w-2/3` (atau `w-full`) dan kolom kanan checkout menggunakan `lg:w-1/3 shrink-0`, sehingga kedua kolom mendapatkan tinggi yang pasti dan terdistribusi sempurna secara otomatis.
    3. Kontainer Tab 1 (`Cafe`) dan grid katalog menu (`flex-1 min-h-0 overflow-y-auto`) kini memiliki tinggi viewport penuh (~600px+) dan merender seluruh 37 kartu menu cafe secara instan dan lancar di-scroll.
    4. Menambahkan perlindungan null-safety pada `filteredMenus` serta komponen *Empty State* interaktif dengan ikon kopi, keterangan loading, dan tombol reset pencarian jika tidak ada produk yang cocok.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**3.25s**).
- **[2026-09-11 22:20]** Audit Menyeluruh Menu Cafe: Instant State Hydration & CSS Min-Height Resilience (`src/pages/CafePOS.jsx`):
  - **Identifikasi Masalah**:
    - State `menuItems`, `cashiers`, dan `paymentMethods` awalnya diinisialisasi dengan array kosong `[]`. Jika peramban pengguna mengalami latensi async atau kendala parsing local storage, layar akan tetap kosong (*blank*) menunggu query `supabase.from()`.
    - Penggunaan `Promise.all` sebelumnya rentan melempar exception (*throw error*) jika salah satu dari 5 query mengalami kegagalan, yang menggagalkan pengisian seluruh state POS.
    - Ketergantungan persentase tinggi murni pada CSS Flex tanpa batas minimum (`min-h`) rentan terhadap anomali kalkulasi tinggi di berbagai peramban desktop/seluler.
  - **Solusi Rekayasa**:
    1. **Instant State Hydration**: Menginisialisasi state `menuItems`, `cashiers`, `paymentMethods`, `selectedCashier`, dan `selectedPayment` langsung dari `realSeedData.json` pada saat komponen di-mount. Menu cafe tampil seketika (*zero-delay render*) tanpa menunggu async database.
    2. **Resilient Data Loading (`Promise.allSettled`)**: Mengganti `Promise.all` menjadi `Promise.allSettled` pada `loadMasterData()`. Jika salah satu tabel mengalami kendala, tabel lain (terutama daftar menu) tetap berhasil dimuat dan diperbarui ke state tanpa melempar crash.
    3. **CSS Min-Height Resilience**: Menetapkan batas tinggi pasti `min-h-[500px]` pada kartu Tab 1 dan `min-h-[450px]` pada grid kartu menu, serta melepas `overflow-hidden` pembungkus kartu agar menu tidak pernah terpotong ke tinggi 0px.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**3.08s**).
- **[2026-09-11 22:30]** Resolusi Tuntas: Visual Kartu Menu Cafe & Rendering Struk Belanja Kasir POS (`src/pages/CafePOS.jsx`):
  - **Identifikasi Bug**:
    1. **Gambar Menu Tidak Tampil / Terjepit**:
       - Kartu menu sebelumnya tidak memiliki tinggi tetap (`fixed height`), dan bergantung pada URL gambar eksternal Unsplash yang rentan lambat, gagal muat karena koneksi offline/firewall ISP, atau me-reset styling saat error sehingga menyisakan tombol gepeng (~40px) tanpa visual.
       - Penanganan `onError` sebelumnya hanya menyembunyikan tag `img` tanpa mengaktifkan tampilan visual fallback, sehingga menyisakan area kosong gelap.
    2. **Item Keranjang Tidak Terlihat di Struk Belanja**:
       - Kontainer kolom kanan struk belanja dibatasi oleh `overflow-hidden` dan `h-[calc(100vh-2rem)]`, sedangkan area ringkasan pembayaran di bagian bawah memakan ruang vertikal signifikan (~280px).
       - Kontainer daftar item belanja (`flex-1 min-h-0`) tertekan ke bawah hingga tinggi mendekati 0px tanpa jaminan batas minimum (`min-h`), sehingga baris pesanan (`cart.map`) terpotong atau tidak terlihat di viewport layar yang kompak.
  - **Solusi Arsitektur**:
    1. **Kartu Menu Kaya Visual & Tahan Kegagalan Jaringan**:
       - Menerapkan helper arsitektur visual `getMenuTheme(menuName)` yang menyediakan palet warna gradien mewah, chip kategori unik, serta ikon/emoji tematik (☕ Kopi, 🍵 Teh, 🥤 Minuman Segar, 🍗 Makanan Berat, 🍚 Nasi Goreng, 🍜 Indomie, 🍟 Camilan).
       - Menetapkan dimensi kartu menu seragam `h-[185px] shrink-0` dengan banner visual `h-24` yang dilengkapi fallback visual elegan jika gambar offline/gagal muat.
       - Menambahkan lencana kuantitas hijau emerald (`inCartItem.qty`) di pojok kanan atas kartu menu sebagai konfirmasi visual instan saat kasir menekan tombol menu.
    2. **Stabilisasi Struk Belanja & Jaminan Ruang Vertikal**:
       - Menetapkan batas tinggi aman `min-h-[140px] max-h-[280px] overflow-y-auto` pada daftar item belanja, serta menambahkan kelas `shrink-0` pada setiap baris item pesanan (`cart.map`) agar tidak pernah terjepit atau hilang dari layar.
       - Menambahkan tombol *"Kosongkan"* di header struk saat keranjang berisi item, serta pemformatan visual kontras tinggi untuk nama menu, harga, tombol stepper kuantitas (`-` dan `+`), dan tombol hapus.
       - Mengubah kontainer halaman utama menjadi `min-h-[calc(100vh-4rem)] w-full` agar ramah terhadap berbagai resolusi monitor dan ukuran viewport browser.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**2.46s**).
- **[2026-09-11 22:45]** Penyesuaian Layout Kompak Struk Belanja (Opsi 2) & Auto-Hide Ikon Menu (`src/pages/CafePOS.jsx`):
  - **Kebutuhan Pengguna**:
    1. Mengubah div struk belanja agar tidak dipaksa sama tinggi dengan katalog menu (*Opsi 2: Model Kompak `h-fit`*), sehingga tinggi struk menyesuaikan secara dinamis dengan jumlah item tanpa menyisakan ruang kosong besar.
    2. Menyembunyikan (*hidden*) ikon/emoji fallback menu jika gambar foto menu berhasil termuat di browser (*onLoad*), dan hanya menampilkan ikon jika gambar offline atau error.
  - **Solusi Rekayasa**:
    1. **Layout Struk Kompak (Opsi 2)**:
       - Mengubah perataan kolom flex utama menjadi `items-start`.
       - Mengubah kontainer kolom kanan Struk Belanja dari `min-h-[520px] justify-between` menjadi `h-fit flex-col border border-slate-800/80`.
       - Panel ringkasan dan tombol pembayaran kini menempel pas tepat di bawah daftar produk pesanan, bergerak dinamis sesuai isi keranjang kasir.
    2. **Auto-Hide Ikon Menu saat Gambar Terpajang**:
       - Elemen fallback icon/emoji diberi kelas `.fallback-placeholder` di belakang tag `img` (`relative z-10`).
       - Menambahkan event `onLoad`: begitu foto produk berhasil di-decode oleh browser, script langsung mengeksekusi `fallback.style.display = 'none'`, sehingga foto tampil jernih tanpa bayangan ikon.
       - Pada event `onError`, jika koneksi internet terputus atau gambar tidak ditemukan, `img` disembunyikan dan `fallback.style.display = 'flex'` otomatis muncul sebagai pengaman visual tematik.
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**2.83s**).
- **[2026-09-11 22:55]** Perbaikan Metrik Cross-Selling Dashboard Bisnis (`src/pages/Dashboard.jsx`):
  - **Identifikasi Bug**:
    - Pada widget *Efisiensi & Rasio Bisnis* di Dashboard Executive, metrik **Cross-selling Carwash-Cafe** menampilkan angka `0.0%` (dan `0 dari 0 mobil`).
    - Penyebab: Kode sebelumnya mencoba memfilter array `filteredStrukByTime` dengan pengecekan `s.item_carwash && s.item_cafe`. Pada skema basis data relational Supabase/PostgreSQL, tabel `struk` hanya menyimpan header transaksi (`id_struk`, `tanggal`, `total_tagihan`, dll). Rincian transaksi disimpan di tabel terpisah yaitu `carwash` dan `cafe` yang berelasi melalui `id_struk`. Akibatnya, properti `s.item_carwash` selalu bernilai `undefined`, sehingga hasil perhitungan selalu nol.
  - **Solusi Rekayasa**:
    - Menghubungkan relasi antara transaksi carwash (`filteredCarwashList`) dan cafe (`filteredCafeList`) menggunakan pencocokan himpunan (*Set-based lookup*) ID struk:
      ```javascript
      const carwashStrukIds = new Set(filteredCarwashList.map(cw => cw.id_struk).filter(Boolean))
      const cafeStrukIds = new Set(filteredCafeList.map(c => c.id_struk).filter(Boolean))
      ```
    - Sebuah transaksi carwash dihitung sebagai *Cross-selling* apabila `id_struk` transaksi tersebut juga terdapat di dalam `cafeStrukIds`.
    - Metrik kini secara akurat menghitung tingkat konversi riil:
      - Bulan Berjalan (September 2026): **19.5%** (55 dari 282 mobil juga memesan menu cafe).
      - Seluruh Waktu (*All Time*): **23.4%** (870 dari 3.722 mobil cuci memesan cafe).
  - **Verifikasi**:
    - Vitest Suite: 4 suites passed (**42/42 tests 100% Green**).
    - Build Vite Produksi: Sukses tanpa error/warning (**3.20s**).
- **[2026-09-11 23:30]** Implementasi Core SaaS ERP Fase 3 (General Ledger Double-Entry, Moving Average Cost & Laporan Akuntansi Formal):
  - **Konteks & Sasaran**:
    - Bertransformasi dari sekadar "POS Kasir & Log Kasbon" menjadi "Micro-ERP Berstandar Akuntansi Formal".
    - Menyelesaikan masalah fluktuasi harga bahan baku dengan kalkulasi inventori otomatis (*Moving Average Cost Engine*).
    - Mengintegrasikan buku besar umum (*General Ledger*) berpasangan (Double-Entry: Debit & Kredit seimbang) yang terhubung langsung ke antarmuka laporan finansial.
  - **Solusi Rekayasa**:
    1. **Moving Average Cost (MAC) Engine (`src/services/generalLedgerService.js`)**:
       - Algoritma bobot rata-rata bergerak: `(Stok Lama * Harga Lama + Qty Masuk * Harga Beli) / (Stok Lama + Qty Masuk)` saat barang masuk diterima.
       - Presisi 4 desimal uang untuk mencegah *rounding drift*.
       - Terintegrasi dengan trigger database lokal `barang_masuk` di `src/services/localDbEngine.js` sehingga setiap kulakan bahan baku otomatis mengupdate `stok_barang` dan menerbitkan jurnal debit Persediaan (`acc_1300`) serta kredit Kas (`acc_1001`) atau Hutang Usaha (`acc_2001`).
    2. **General Ledger Service & Financial Statements Generator (`src/services/generalLedgerService.js`)**:
       - `getTrialBalance()`: Mengagregasi mutasi debit/kredit seluruh akun CoA (1xxx s/d 6xxx) dan memvalidasi `difference === 0` serta status keseimbangan `is_balanced`.
       - `getIncomeStatement()`: Menghitung Laba Rugi Akuntansi (Pendapatan Bersih dikurangi HPP bahan baku dan total beban operasional).
       - `getBalanceSheet()`: Menghitung Neraca Keuangan formal dan memvalidasi persamaan akuntansi: `Total Aset === Total Liabilitas + Total Ekuitas`.
       - `getAccountLedger()`: Menyediakan drilldown mutasi kronologis per akun dengan saldo berjalan (*running balance*).
       - `backfillHistoricalJournals()`: Sinkronisasi otomatis transaksi struk, carwash, dan pengeluaran historis ke dalam tabel `journal_entries` dan `journal_entry_lines`.
    3. **Komponen Antarmuka Laporan Akuntansi ERP (`src/components/reports/GeneralLedgerView.jsx` & `src/pages/Reports.jsx`)**:
       - Menambahkan View Switcher di header `/reports`: *Buku Besar & Akuntansi ERP (Double-Entry)* vs *Rekap Operasional Segmen (Kasir POS)*.
       - Menyediakan 4 tab interaktif: Neraca Saldo (dengan filter pencarian akun), Neraca Keuangan (tampilan 2 kolom Aset vs Liabilitas & Ekuitas), Laba Rugi P&L (Gross Profit & Net Profit), serta Drilldown Buku Besar (pilihan akun dan tabel mutasi).
       - Format angka monospaced rata kanan (`font-mono text-right`) dan indikator status balance real-time.
  - **Verifikasi Kualitas (Zero-Defect Gate)**:
    - Vitest Suite: 5 suites passed (**51/51 tests 100% Green**).
    - Menambahkan `src/services/__tests__/generalLedger.test.js` dengan 9 skenario pengujian komprehensif (MAC formula, Goods Receipt, Trial Balance, P&L, Balance Sheet, Multi-tenant Isolation, dan Historical Backfill).
    - Build Vite Produksi: Sukses tanpa error/warning (**3.00s**).
- **[2026-09-16 16:05]** Implementasi CRUD Master Kategori & Drilldown Two-Way Sync Laporan Akuntansi (Fase 1 - 5 Selesai):
  - **Identifikasi Kebutuhan & Masalah**:
    1. Kategori dan jenis transaksi pengeluaran/pemasukan sebelumnya belum terpusat dan masih bercampur dengan pencocokan string (*string matching*) yang rentan inkonsistensi.
    2. Kasir POS berpotensi mencatat pos pengeluaran strategis yang seharusnya menjadi wewenang eksklusif Owner (misal: penarikan prive modal, sewa lahan Bang Awal, beban utilitas besar carwash vs cafe).
    3. Angka di tabel laporan akuntansi sebelumnya bersifat statis/read-only tanpa kemampuan drilldown transaksi pembentuk dan tanpa kapabilitas koreksi langsung (*inline CRUD*).
  - **Solusi Rekayasa (5 Pilar Implementasi)**:
    1. **Master Categories Store (`src/services/localDbEngine.js`)**:
       - Membangun tabel data `master_categories` terisi data bawaan (*seed categories*) yang memisahkan Listrik Cafe, Listrik Carwash, Bahan Baku F&B, Belanja Chemical Carwash, Sewa Lahan Bang Awal, Gaji/Komisi, Prive, dan Sewa Tenant.
       - Menyematkan flag hak akses kasir (`boleh_kasir: boolean`) dan pemetaan ke akun Chart of Accounts (`account_id`).
    2. **Engine Mutasi Dua Arah / Two-Way Sync (`src/services/generalLedgerService.js`)**:
       - Menambahkan fungsi `createManualTransaction()`, `updateTransaction()`, dan `deleteTransaction()`.
       - Setiap mutasi dari laporan akuntansi otomatis memperbarui header/line jurnal pembentuknya DAN tabel operasional sumber aslinya (`pengeluaran` / `cashflow`) secara konsisten.
    3. **Antarmuka Admin CRUD Master Kategori (`src/pages/Admin.jsx`)**:
       - Menambahkan tab navigasi *Kategori & Akun Kasir* (`activeTab === 'categories'`).
       - Tabel daftar kategori dilengkapi tombol edit, hapus, badge tipe arus, badge izin akses kasir, dan modal form tambah/ubah kategori terintegrasi ke COA.
    4. **Standardisasi Form Input POS & Finance (`src/pages/CafePOS.jsx` & `src/pages/Finance.jsx`)**:
       - POS Kasir: Membaca secara dinamis kategori dari `master_categories` yang hanya memiliki `boleh_kasir: true` dan mengunci pos ke `SALDO CASH`.
       - Finance: Memuat seluruh master kategori terstruktur dan menggabungkannya secara harmonis ke dalam form pencatatan arus kas owner.
    5. **Interactive Clickable Rows & Drilldown CRUD di Laporan Akuntansi (`src/components/reports/GeneralLedgerView.jsx`)**:
       - Setiap baris akun di Neraca Saldo (*Trial Balance*), Neraca Keuangan (*Balance Sheet*), Laba Rugi (*Income Statement*), dan *GL Explorer* kini bersifat interaktif (*clickable* dengan efek visual hover).
       - Mengklik baris akan membuka **Modal Drilldown Rincian Transaksi** pembentuk akun tersebut.
       - Di dalam modal drilldown, pengguna dapat:
         - **Create (+)**: Mencatat transaksi baru langsung untuk akun tersebut tanpa berpindah halaman.
         - **Update (✏️)**: Mengoreksi tanggal, nominal, kategori, atau memo transaksi sumber secara langsung.
         - **Delete (🗑️)**: Menghapus transaksi pembentuk yang salah/dobel catat, dengan penghapusan otomatis ke jurnal dan tabel sumbernya.
  - **Verifikasi Kualitas (Quality Gate)**:
    - Vitest Suite: 5 suites passed (**52/52 tests 100% Green**), termasuk test baru *Master Categories & Two-Way Sync Manual Transaction*.
    - Build Vite Produksi: Berjalan sukses tanpa error/warning (**2.05s**).
- **[2026-09-14 14:30]** Bugfix Bridge Adapter General Ledger View (`src/services/localDbEngine.js` & `src/components/reports/GeneralLedgerView.jsx`):
  - **Identifikasi Masalah**:
    - Data pada tab **Laporan Akuntansi ERP (Buku Besar, Neraca Saldo, Neraca Keuangan, P&L)** tampil kosong atau loading terus-menerus.
    - Diagnosa akar masalah: `GeneralLedgerView.jsx` mengakses objek instance via `supabase.localDb.gl`, namun pada factory `createLocalClient()` di `src/services/localDbEngine.js`, property `localDb` belum diekspos ke instance client (hanya tersedia di bawah `supabase.erp.gl`). Akibatnya `supabase.localDb` bernilai `undefined`, pemanggilan kalkulasi laporan tidak pernah tereksekusi, dan state tabel akuntansi tetap `null`/kosong.
  - **Solusi Rekayasa**:
    1. Mengekspos namespace `localDb: { store: localDbStore, gl: glService }` pada factory `createLocalClient()` di `src/services/localDbEngine.js`.
    2. Menambahkan fallback aman pada `loadGlData()` di `src/components/reports/GeneralLedgerView.jsx`: `supabase.localDb?.gl || supabase.erp?.gl` agar data otomatis terbaca di semua environment.
  - **Hasil**:
    - Neraca Saldo (*Trial Balance*), Neraca Keuangan (*Balance Sheet*), Laba Rugi (*Income Statement*), dan *GL Explorer Drilldown* langsung terpopulasi dengan data jurnal mutasi real-time.
    - Seluruh pengujian otomatis tetap 100% Green (51/51 tests pass).
- **[2026-09-11 23:45]** Hotfix Layar Putih / Browser Main Thread Freezing (`src/services/localDbEngine.js` & `src/services/generalLedgerService.js`):
  - **Identifikasi Masalah**:
    - Browser Chrome menampilkan halaman kosong putih pekat (`#FFFFFF`) tanpa me-render React.
    - Diagnosa akar masalah: Pada inisialisasi awal `LocalDatabaseStore`, fungsi `backfillHistoricalJournals()` mengeksekusi loop pada ~9.000 data historis (`struk`, `carwash`, `pengeluaran`). Di dalam loop tersebut, `postJournalEntry()` memanggil `saveToStorage()`, yang melakukan serialisasi `JSON.stringify(this.data)` sebesar ~30MB ke `window.localStorage` sebanyak 9.000 kali secara sinkronis. Hal ini memicu loop serialisasi hingga ratusan Gigabyte data pada thread utama browser, menyebabkan browser hang/beku (*freeze/crash*) dan gagal merender DOM.
  - **Solusi Rekayasa**:
    1. **Debounce pada `saveToStorage()`**: Menjadikan penyimpanan ke `localStorage` berjalan secara asinkron dengan timer debounce 300ms, serta menambahkan parameter `immediate` untuk eksekusi batch manual.
    2. **Flag `shouldSave` pada `postJournalEntry()`**: Mengizinkan eksekusi posting jurnal secara massal (*bulk*) tanpa memicu disk writing berulang di setiap baris.
    3. **Batching Historical Backfill**: Membatasi backfill transaksi historis pada jendela transaksi terbaru (200 struk, 200 carwash, 100 pengeluaran) dan menyimpan ke storage hanya 1 kali di akhir proses.
    4. **Perbaikan Path Ekstensi Modul**: Memastikan seluruh import antar-modul internal (`erpConfig.js`, `generalLedgerService.js`) menggunakan ekstensi `.js` secara eksplisit sesuai standar ESM.
  - **Hasil**:
    - Waktu inisialisasi database lokal turun drastis dari **>180 detik (hang/timeout) menjadi hanya 255 milidetik**.
    - Layar browser tidak lagi beku/putih, React langsung termuat seketika.
    - 51/51 tests lulus 100% dan build produksi sukses (**3.27s**).

