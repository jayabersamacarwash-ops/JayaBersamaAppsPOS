# Dokumentasi Lengkap Aplikasi POS Jaya Bersama (Cafe & Carwash)

Dokumen ini berisi spesifikasi teknis, alur logika program, arsitektur basis data, sistem sinkronisasi Google Sheets, dan panduan integrasi CRM WhatsApp untuk sistem WebApp POS Jaya Bersama.

---

## 🏛️ 1. Arsitektur Akuntansi Dua-Tingkat (Two-Tier Accounting)

Aplikasi POS Jaya Bersama menggunakan desain arsitektur akuntansi dua tingkat untuk memisahkan pencatatan operasional harian (sub-ledger) dari pelaporan arus kas utama (general ledger). Hal ini memastikan performa analisis data operasional berjalan secara *real-time* tanpa mengganggu akurasi laci kas fisik.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LEVEL OPERASIONAL (SUB-LEDGER)                      │
│ - Mencatat detail transaksi satuan secara langsung saat struk dicetak.   │
│ - Tabel: [struk] (parent), [cafe] (makanan/minuman), [carwash] (jasa)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                        (DIPOSKAN DI AKHIR HARI)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LEVEL FINANSIAL (GENERAL LEDGER)                   │
│ - Rekapitulasi arus kas fisik masuk/keluar & pengeluaran operasional.    │
│ - Tabel: [cashflow] (arus kas), [pos_balances] (view saldo terkini)     │
└─────────────────────────────────────────────────────────────────────────┘
```

*   **Keuntungan Sistem**:
    *   **Kecepatan Kasir**: POS tidak memicu proses penulisan log cashflow untuk setiap cangkir kopi yang terjual. Log cashflow hanya diisi melalui rekap **Tutup Kasir (End of Day)** oleh kasir atau **Input Pengeluaran Manual** oleh kasir/owner.
    *   **Analisis Real-Time**: Omzet dan performa Cafe & Carwash di dashboard tetap terupdate instan dari tabel detail tanpa perlu menunggu proses tutup kasir di akhir shift.

---

## 📊 2. Diagram Alur Logika Data (Data Flow Architecture)

Berikut adalah visualisasi aliran data dari database Supabase hingga disajikan menjadi informasi KPI interaktif di halaman Dashboard kasir/owner:

```mermaid
graph TD
    subgraph Supabase Database
        DB_Struk[(struk)]
        DB_Cafe[(cafe)]
        DB_Cw[(carwash)]
        DB_Cf[(cashflow)]
        DB_Resep[(resep)]
        DB_Bal[(pos_balances)]
    end

    subgraph 1. Pengambilan Data (Data Fetching)
        F_Struk[strukList]
        F_Cafe[cafeList]
        F_Cw[carwashList]
        F_Cf[cashflowLogs]
        F_Resep[resepList]
        F_Bal[posBalances]
    end

    subgraph 2. Filter Waktu (Time Range Filtering)
        FilterTime{Filter Waktu Aktif?}
        FilterCustomDate[isDateInRange]
    end

    subgraph 3. Pemrosesan Logika (Memoization Hooks)
        L_Finance[financialAnalytics]
        L_Cafe[cafeAnalytics]
        L_Cw[carwashAnalytics]
        L_Cust[customerReport]
    end

    subgraph 4. Representasi UI/UX Dashboard
        UI_Over[Tab Overview]
        UI_Cafe[Tab Performa Cafe]
        UI_Cw[Tab Performa Carwash]
        UI_Cust[Tab Laporan Customer]
    end

    %% Database to Fetching
    DB_Struk -->|fetchAllRows| F_Struk
    DB_Cafe -->|fetchAllRows| F_Cafe
    DB_Cw -->|fetchAllRows| F_Cw
    DB_Cf -->|fetchAllRows| F_Cf
    DB_Resep -->|fetchAllRows| F_Resep
    DB_Bal -->|Supabase SELECT| F_Bal

    %% Fetching to Filter
    F_Struk & F_Cafe & F_Cw & F_Cf --> FilterTime
    FilterTime -->|today/month/all/custom| FilterCustomDate

    %% Filtered Data to logic
    FilterCustomDate -->|filteredCashflowLogs| L_Finance
    FilterCustomDate -->|filteredCafeList| L_Cafe
    FilterCustomDate -->|filteredCarwashList| L_Cw
    F_Cw -->|allCarwashList| L_Cust
    F_Resep -->|resepList| L_Cafe

    %% Logic to UI
    L_Finance --> UI_Over
    L_Cafe --> UI_Cafe
    L_Cw --> UI_Cw
    L_Cust --> UI_Cust
```

---

## ⚙️ 3. Skema Database Supabase & Relasi Tabel

Aplikasi ini menggunakan Supabase PostgreSQL dengan skema tabel terstruktur sebagai berikut:

### A. Tabel Master Data

1.  **`profiles`**: Menyimpan data user aplikasi (Owner dan Kasir).
    *   `id` (UUID, Primary Key)
    *   `nama` (TEXT)
    *   `role` (TEXT: `'Owner'` atau `'Kasir'`)
    *   `created_at` (TIMESTAMP)

2.  **`stok_barang`**: Bahan baku F&B Cafe dan stok Carwash.
    *   `id_bahan_baku` (TEXT, Primary Key)
    *   `nama_bahan` (TEXT)
    *   `stok` (NUMERIC)
    *   `satuan` (TEXT)

3.  **`daftar_harga_menu`**: Menu F&B Cafe terdaftar.
    *   `id_menu` (TEXT, Primary Key)
    *   `daftar_menu` (TEXT)
    *   `harga` (NUMERIC)

4.  **`resep`**: Komposisi bahan baku untuk setiap menu Cafe.
    *   `id_resep` (TEXT, Primary Key)
    *   `id_menu` (TEXT REFERENCES `daftar_harga_menu`)
    *   `id_bahan_baku` (TEXT REFERENCES `stok_barang`)
    *   `jumlah` (NUMERIC)

---

### B. Tabel Transaksi (Operasional / Sub-Ledger)

5.  **`struk`**: Parent tabel transaksi cetak pembayaran.
    *   `id_struk` (TEXT, Primary Key)
    *   `tanggal` (DATE)
    *   `jam` (TIME)
    *   `nama_pelanggan` (TEXT, Nullable)
    *   `metode_bayar` (TEXT: `'CASH'` atau `'QRIS'`)
    *   `status_bayar` (TEXT: `'Selesai'` atau `'Pending'`)
    *   `kasir` (TEXT)
    *   `total_tagihan` (NUMERIC)
    *   `created_at` (TIMESTAMP)

6.  **`cafe`**: Detail item F&B yang terjual per struk.
    *   `id_detail` (TEXT, Primary Key)
    *   `id_struk` (TEXT REFERENCES `struk` ON DELETE CASCADE)
    *   `nama_menu` (TEXT)
    *   `qty` (INTEGER)
    *   `harga_satuan` (NUMERIC)
    *   `subtotal` (NUMERIC, Auto-generated)

7.  **`carwash`**: Detail pengerjaan cuci mobil per struk.
    *   `id_transaksi` (TEXT, Primary Key)
    *   `id_struk` (TEXT REFERENCES `struk` ON DELETE CASCADE)
    *   `tanggal` (DATE)
    *   `jam` (TIME)
    *   `plat` (TEXT)
    *   `model` (TEXT) - *Menyimpan Merk/Tipe Mobil (Avanza, Fortuner, dll.)*
    *   `no_telepon` (TEXT, Nullable) - *Menyimpan nomor WhatsApp pelanggan untuk CRM*
    *   `ukuran` (TEXT: `'Small'`, `'Medium'`, `'Large'`, `'Extra Large'`, `'Custom'`)
    *   `variant` (TEXT: `'Regular'`, `'Body only'`)
    *   `paket` (TEXT)
    *   `harga` (NUMERIC)
    *   `anggota_1` (TEXT) - *Pencuci Utama*
    *   `anggota_2` (TEXT, Nullable) - *Pencuci Pembantu*
    *   `gaji_pencuci` (NUMERIC) - *Total Alokasi Gaji Cuci*
    *   `gaji_anggota` (NUMERIC) - *Komisi bersih per anggota pencuci*
    *   `status` (TEXT: `'Dalam Antrean'`, `'Sedang Dicuci'`, `'Selesai'`, `'Batal'`)

---

### C. Tabel Finansial (General Ledger)

8.  **`cashflow`**: Transaksi masuk/keluar keuangan riil.
    *   `id_cashflow` (TEXT, Primary Key)
    *   `id_sumber` (TEXT, Nullable) - *Menghubungkan ke `id_struk` (tutup kasir) atau `id_pengeluaran`*
    *   `tanggal` (DATE)
    *   `keterangan_transaksi` (TEXT)
    *   `jenis` (TEXT: `'Pemasukan'`, `'Pengeluaran'`, `'pengeluaran Cafe'`, `'pengeluaran Carwash'`, `'Casbon'`)
    *   `kategori` (TEXT: `'Omzet Harian (CASH)'`, `'Omzet Harian (QRIS)'`, `'Modal Awal'`, `'Bahan Baku'`, `'Operasional'`, `'Gaji'`, dll.)
    *   `pemasukan` (NUMERIC)
    *   `pengeluaran` (NUMERIC)
    *   `pos` (TEXT: `'SALDO CASH'`, `'SALDO REKENING Y'`, `'SALDO REKENING N'`)

9.  **`pengeluaran`**: Pencatatan beban pengeluaran harian.
    *   `id_pengeluaran` (TEXT, Primary Key)
    *   `id_cashflow` (TEXT REFERENCES `cashflow` ON DELETE SET NULL)
    *   `tanggal` (DATE)
    *   `jam` (TIME)
    *   `nama_pengeluaran` (TEXT)
    *   `jenis` (TEXT)
    *   `kategori` (TEXT)
    *   `nominal` (NUMERIC)

---

### D. Database Views (Kueri Agregasi Instan)

*   **`pos_balances`**: Menghitung saldo tersisa pada tiap POS Keuangan secara riil sepanjang masa.
    ```sql
    CREATE VIEW public.pos_balances AS
    SELECT pos, COALESCE(SUM(pemasukan - pengeluaran), 0.00) AS balance
    FROM public.cashflow
    GROUP BY pos;
    ```

---

## 🔄 4. Integrasi Sinkronisasi Google Sheets (AppSheet)

Agar aplikasi WebApp POS Jaya Bersama tetap sinkron dengan AppSheet, sistem menggunakan **Google Apps Script** yang dipasang pada Google Spreadsheet Anda.

### A. Kebijakan Keamanan (RLS - Row Level Security)
*   **Status Saat Ini**: **RLS Dinonaktifkan (Disabled)** pada seluruh tabel di Supabase.
*   **Alasan**: Google Apps Script melakukan panggilan API ke Supabase REST endpoint menggunakan **Anon Key** (Publishable Key). Karena Anon Key mendeteksi Apps Script sebagai *Anonymous Guest*, RLS yang aktif akan memblokir proses tulis data dari Google Sheets. Menonaktifkan RLS menjamin kelancaran sinkronisasi otomatis dari Sheets ke Supabase tanpa hambatan izin akses.

### B. Prosedur Menambahkan Kolom Baru
Jika Anda menambahkan kolom baru di Google Sheets (seperti kolom `No Telepon` di sheet `Carwash`):
1.  Tambahkan kolom baru di baris paling akhir Google Sheets dengan nama header yang sesuai (misal: **`No Telepon`**).
2.  Apps Script secara otomatis akan membaca nama kolom tersebut, mengubahnya menjadi format *snake_case* (`no_telepon`), dan mengirimkannya ke Supabase.
3.  Pastikan nama kolom di database Supabase cocok secara presisi (dalam huruf kecil/snake_case) dengan kolom yang dikirim dari Google Sheets.

---

## 🛒 5. Logika Modul Frontend Utama

### A. Modul POS Kasir & Antrean (`CafePOS.jsx`)
Kasir melayani transaksi F&B cafe dan mendaftarkan kendaraan carwash di halaman ini.

#### 1. Fitur Pencarian Otomatis Pintar (Smart Auto-Fill)
Saat kasir memasukkan data antrean carwash baru dan mengetik kolom **Plat Nomor Kendaraan**:
*   Sistem memicu *debounce* selama **600 milidetik** setelah kasir berhenti mengetik.
*   Jika plat nomor yang diketik memiliki panjang $\ge 4$ karakter, sistem memicu kueri pencarian riwayat terakhir di Supabase:
    ```javascript
    supabase.from('carwash')
      .select('model, no_telepon, ukuran, variant, paket')
      .eq('plat', cleanPlat)
      .order('created_at', { ascending: false }).limit(1)
    ```
*   Jika plat tersebut pernah bertransaksi sebelumnya, kolom **Merk/Model Mobil**, **No Telepon**, **Ukuran**, **Varian**, dan **Paket Cuci** akan **otomatis terisi sendiri (auto-fill)** pada form.
*   Kasir menghemat waktu mengetik hingga 80%, mencegah kesalahan input, dan mempercepat antrean fisik.

#### 2. Logika Alokasi Komisi Gaji Cuci Mobil
Ketika transaksi carwash disimpan:
*   Sistem menghitung pembagian komisi berdasarkan jumlah kru yang ditunjuk:
    $$\text{gajiPerAnggota} = \begin{cases} \text{gaji\_pencuci} & \text{jika hanya ada anggota\_1} \\ \frac{\text{gaji\_pencuci}}{2} & \text{jika ada anggota\_1 dan anggota\_2} \end{cases}$$
*   Nilai ini disimpan ke kolom `gaji_anggota` di database untuk laporan upah mingguan.

---

### B. Modul Dashboard Analitik (`Dashboard.jsx`)
Menyajikan visualisasi data operasional harian dan Laporan Customer CRM.

#### 1. Perhitungan HPP Cafe & Mekanisme Fallback
Untuk melacak keuntungan bersih F&B Cafe, sistem menghitung Harga Pokok Penjualan (HPP) untuk setiap item terfilter:
*   Sistem mencari bahan baku resep yang terdaftar pada tabel `resep` untuk menu tersebut.
*   **Formula HPP Resep**:
    $$\text{HPP Menu} = \sum (\text{Qty Bahan Terpakai} \times \text{Harga Satuan Bahan})$$
*   **Mekanisme Fallback (Food Cost 35%)**: Jika menu tersebut tidak memiliki formula resep terdaftar di database, sistem menerapkan standar HPP estimasi sebesar **35% dari Harga Jual**:
    $$\text{HPP Menu Fallback} = \text{Harga Jual} \times 0.35$$
*   **Laba Bersih Cafe** dihitung dengan formula:
    $$\text{Laba Bersih Cafe} = \text{Omzet Cafe} - \text{Total HPP Terjual} - \text{Pengeluaran Non-Bahan Baku Cafe}$$

#### 2. Profiling Laporan Kunjungan Customer
Tab **Laporan Customer** mengagregasikan data transaksi carwash secara dinamis sepanjang masa (`allCarwashList`):
*   Data dikelompokkan berdasarkan `plat` nomor unik.
*   Sistem menghitung total kunjungan, total LTV (Lifetime Value), paket cuci terfavorit, tanggal kunjungan terakhir, serta merk mobil dan nomor telepon terakhir mereka.
*   Customer dikelompokkan ke dalam kategori loyalitas:
    *   **Setia / VIP**: Kunjungan $\ge 5$ kali (badge hijau).
    *   **Reguler**: Kunjungan 2 s/d 4 kali (badge ungu).
    *   **Baru**: Kunjungan baru 1 kali (badge cyan).

---

### C. Modul Keuangan (`Finance.jsx`)
Digunakan oleh Owner/Kasir untuk melacak kas laci harian secara rinci.
*   Menampilkan total Saldo Laci Kasir, Saldo Rekening BCA (Y), dan Rekening Mandiri (N) secara dinamis dari database.
*   Menyediakan pencatatan pengeluaran operasional langsung ke tabel `pengeluaran` dan `cashflow`.
*   Menyajikan mutasi harian (pemasukan tutup kasir dan pengeluaran) dalam bentuk tabel ledger kas bersih.

---

## 💬 6. Panduan Integrasi CRM WhatsApp di Masa Depan

Dengan kolom `no_telepon` dan data `customerReport` yang sudah aktif, Anda siap mengintegrasikan sistem ini dengan API Gateway WhatsApp (seperti **Fonnte**, **Wablas**, atau **Womailer**).

### A. Contoh Skenario Otomatisasi WhatsApp CRM

1.  **Notifikasi Struk & Ucapan Terima Kasih (Auto-Send setelah Cuci)**
    *   *Kapan*: Sesaat setelah kasir menyimpan transaksi carwash ke database dengan status "Selesai".
    *   *Pemicu (Trigger)*: Melalui webhook Supabase Database Webhooks yang menembak API WhatsApp Gateway.
    *   *Template Pesan*:
        > *"Halo Kak [Nama/Plat]! Terima kasih telah mencuci mobil [Merk Mobil] di Jaya Bersama Carwash hari ini. Mobil Kakak sekarang sudah bersih berkilau dengan layanan [Paket Cuci]. Sampai jumpa di kunjungan berikutnya! 🚗✨"*

2.  **Loyalty Reward (Voucher VIP)**
    *   *Kapan*: Saat sistem mendeteksi jumlah kunjungan customer mencapai kelipatan 5 atau 10 (Status VIP).
    *   *Template Pesan*:
        > *"Selamat Kak! Mobil [Plat Nomor] telah melakukan 5x pencucian di Jaya Bersama. Sebagai apresiasi loyalitas Kakak, dapatkan GRATIS 1x Cuci Body pada kunjungan berikutnya. Tunjukkan pesan WhatsApp ini ke kasir kami ya! 🎁"*

3.  **Remind & Retention (Pengingat Kunjungan Ulang)**
    *   *Kapan*: Jika sistem mendeteksi tanggal `lastVisit` (kunjungan terakhir) customer sudah melewati **30 hari** dari tanggal hari ini.
    *   *Template Pesan*:
        > *"Halo Kak! Sudah 1 bulan mobil [Merk Mobil] ([Plat Nomor]) tidak mampir ke Jaya Bersama Carwash. Debu dan kotoran jalanan bisa merusak cat mobil jika dibiarkan lama loh. Yuk, mampir akhir pekan ini untuk cuci wax agar mobil Kakak kinclong kembali! 🧼🚿"*
