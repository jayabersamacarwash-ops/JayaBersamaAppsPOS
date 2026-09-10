-- Reset Slate & Buat Ulang Skema D1 SQLite
DROP TABLE IF EXISTS barang_keluar;
DROP TABLE IF EXISTS barang_masuk;
DROP TABLE IF EXISTS pengeluaran;
DROP TABLE IF EXISTS carwash;
DROP TABLE IF EXISTS cafe;
DROP TABLE IF EXISTS struk;
DROP TABLE IF EXISTS cashflow;
DROP TABLE IF EXISTS resep;
DROP TABLE IF EXISTS daftar_harga_menu;
DROP TABLE IF EXISTS stok_barang;
DROP TABLE IF EXISTS metode_bayar;
DROP TABLE IF EXISTS kasir;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS karyawan_cuci;

-- 1. Tabel Autentikasi & Profil Pengguna
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Owner', 'Kasir')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE profiles (
    id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Owner', 'Kasir')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 2. Master Data
CREATE TABLE kasir (
    nama TEXT PRIMARY KEY,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE metode_bayar (
    nama TEXT PRIMARY KEY,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE stok_barang (
    id_bahan_baku TEXT PRIMARY KEY,
    nama_produk TEXT NOT NULL,
    satuan TEXT NOT NULL,
    stok REAL NOT NULL DEFAULT 0.0,
    harga_satuan REAL DEFAULT 0.0,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE daftar_harga_menu (
    id_menu TEXT PRIMARY KEY,
    daftar_menu TEXT NOT NULL,
    harga REAL NOT NULL DEFAULT 0.0,
    kategori TEXT NOT NULL DEFAULT 'Cafe',
    deskripsi TEXT,
    is_bundling INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE resep (
    id_resep TEXT PRIMARY KEY,
    id_bahan_baku TEXT NOT NULL REFERENCES stok_barang(id_bahan_baku) ON UPDATE CASCADE ON DELETE RESTRICT,
    id_menu TEXT NOT NULL REFERENCES daftar_harga_menu(id_menu) ON UPDATE CASCADE ON DELETE CASCADE,
    nama_menu TEXT NOT NULL,
    nama_bahan TEXT NOT NULL,
    jumlah REAL NOT NULL,
    satuan TEXT NOT NULL,
    UNIQUE(id_menu, id_bahan_baku)
);

CREATE TABLE karyawan_cuci (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 3. Transaksi & Keuangan
CREATE TABLE cashflow (
    id_cashflow TEXT PRIMARY KEY,
    id_sumber TEXT,
    tanggal TEXT NOT NULL,
    keterangan_transaksi TEXT,
    jenis TEXT,
    kategori TEXT,
    pemasukan REAL NOT NULL DEFAULT 0.0,
    pengeluaran REAL NOT NULL DEFAULT 0.0,
    pos TEXT,
    saldo_kas REAL NOT NULL DEFAULT 0.0,
    apakah_stok TEXT,
    id_bahan_baku TEXT,
    qty REAL NOT NULL DEFAULT 0.0,
    saldo_cash REAL NOT NULL DEFAULT 0.0,
    saldo_rekening_n REAL NOT NULL DEFAULT 0.0,
    saldo_rekening_y REAL NOT NULL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE struk (
    id_struk TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    jam TEXT,
    nama_pelanggan TEXT,
    keterangan TEXT,
    metode_bayar TEXT NOT NULL,
    status_bayar TEXT NOT NULL DEFAULT 'Pending',
    kasir TEXT NOT NULL,
    total_tagihan REAL NOT NULL DEFAULT 0.0,
    nominal_cash REAL DEFAULT 0.0,
    nominal_qris REAL DEFAULT 0.0,
    diskon_carwash REAL DEFAULT 0.0,
    diskon_cafe REAL DEFAULT 0.0,
    waktu_dibuat TEXT DEFAULT (datetime('now', 'localtime')),
    waktu_dibayar TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE cafe (
    id_detail TEXT PRIMARY KEY,
    id_struk TEXT NOT NULL REFERENCES struk(id_struk) ON DELETE CASCADE,
    nama_menu TEXT NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    harga_satuan REAL NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0.0,
    status TEXT
);

CREATE TABLE carwash (
    id_transaksi TEXT PRIMARY KEY,
    id_struk TEXT REFERENCES struk(id_struk) ON DELETE CASCADE,
    no INTEGER,
    tanggal TEXT,
    jam TEXT,
    kehadiran TEXT,
    model TEXT,
    plat TEXT NOT NULL,
    variant TEXT,
    ukuran TEXT,
    paket TEXT,
    metode TEXT,
    harga REAL NOT NULL DEFAULT 0.0,
    harga_cuci REAL NOT NULL DEFAULT 0.0,
    harga_paket REAL NOT NULL DEFAULT 0.0,
    harga_custom REAL NOT NULL DEFAULT 0.0,
    anggota_1 TEXT NOT NULL,
    anggota_2 TEXT,
    keterangan TEXT,
    shift TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    gaji_anggota REAL NOT NULL DEFAULT 0.0,
    gaji_pencuci REAL NOT NULL DEFAULT 0.0,
    no_telepon TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE pengeluaran (
    id_pengeluaran TEXT PRIMARY KEY,
    id_cashflow TEXT REFERENCES cashflow(id_cashflow) ON DELETE SET NULL,
    no INTEGER,
    tanggal TEXT NOT NULL,
    jam TEXT,
    nama_pengeluaran TEXT,
    jenis TEXT,
    kategori TEXT,
    nominal REAL NOT NULL DEFAULT 0.0,
    apakah_stok TEXT,
    id_bahan_baku TEXT,
    qty REAL NOT NULL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE barang_masuk (
    id_masuk TEXT PRIMARY KEY,
    id_pengeluaran TEXT REFERENCES pengeluaran(id_pengeluaran) ON DELETE CASCADE,
    id_cashflow TEXT REFERENCES cashflow(id_cashflow) ON DELETE SET NULL,
    id_bahan_baku TEXT NOT NULL REFERENCES stok_barang(id_bahan_baku) ON DELETE RESTRICT,
    tanggal TEXT NOT NULL,
    nama_produk TEXT NOT NULL,
    jumlah_masuk REAL NOT NULL CHECK (jumlah_masuk > 0),
    harga_satuan REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE barang_keluar (
    id_keluar TEXT PRIMARY KEY,
    id_detail TEXT REFERENCES cafe(id_detail) ON DELETE CASCADE,
    id_bahan_baku TEXT NOT NULL REFERENCES stok_barang(id_bahan_baku) ON DELETE RESTRICT,
    tanggal TEXT NOT NULL,
    nama_bahan_baku TEXT NOT NULL,
    jumlah_keluar REAL NOT NULL CHECK (jumlah_keluar > 0),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Indeks Performa
CREATE INDEX IF NOT EXISTS idx_struk_tanggal ON struk(tanggal);
CREATE INDEX IF NOT EXISTS idx_struk_status ON struk(status_bayar);
CREATE INDEX IF NOT EXISTS idx_carwash_tanggal ON carwash(tanggal);
CREATE INDEX IF NOT EXISTS idx_carwash_status ON carwash(status);
CREATE INDEX IF NOT EXISTS idx_cashflow_tanggal ON cashflow(tanggal);
CREATE INDEX IF NOT EXISTS idx_cashflow_pos ON cashflow(pos);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_tanggal ON pengeluaran(tanggal);
CREATE INDEX IF NOT EXISTS idx_cafe_id_struk ON cafe(id_struk);
