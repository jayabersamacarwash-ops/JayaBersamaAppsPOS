-- 0. Bersihkan Tabel & Tipe Lama (Reset Slate)
DROP TABLE IF EXISTS public.barang_keluar CASCADE;
DROP TABLE IF EXISTS public.barang_masuk CASCADE;
DROP TABLE IF EXISTS public.pengeluaran CASCADE;
DROP TABLE IF EXISTS public.carwash CASCADE;
DROP TABLE IF EXISTS public.cafe CASCADE;
DROP TABLE IF EXISTS public.struk CASCADE;
DROP TABLE IF EXISTS public.cashflow CASCADE;
DROP TABLE IF EXISTS public.resep CASCADE;
DROP TABLE IF EXISTS public.daftar_harga_menu CASCADE;
DROP TABLE IF EXISTS public.stok_barang CASCADE;
DROP TABLE IF EXISTS public.metode_bayar CASCADE;
DROP TABLE IF EXISTS public.kasir CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.karyawan_cuci CASCADE;

-- 1. Pembuatan Tabel Dinamis untuk Pengelolaan Admin

-- Tabel Kasir
CREATE TABLE kasir (
    nama TEXT PRIMARY KEY,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Metode Bayar
CREATE TABLE metode_bayar (
    nama TEXT PRIMARY KEY,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Stok Barang (Bahan Baku)
CREATE TABLE stok_barang (
    id_bahan_baku TEXT PRIMARY KEY,
    nama_produk TEXT NOT NULL,
    satuan TEXT NOT NULL,
    stok NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Daftar Harga Menu (Mendukung Promo & Bundling)
CREATE TABLE daftar_harga_menu (
    id_menu TEXT PRIMARY KEY,
    daftar_menu TEXT NOT NULL,
    harga NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    kategori TEXT NOT NULL DEFAULT 'Cafe',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Resep (Menghubungkan Menu dengan Bahan Baku)
CREATE TABLE resep (
    id_resep UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_bahan_baku TEXT NOT NULL REFERENCES stok_barang(id_bahan_baku) ON UPDATE CASCADE ON DELETE RESTRICT,
    id_menu TEXT NOT NULL REFERENCES daftar_harga_menu(id_menu) ON UPDATE CASCADE ON DELETE CASCADE,
    nama_menu TEXT NOT NULL,
    nama_bahan TEXT NOT NULL,
    jumlah NUMERIC(12, 4) NOT NULL,
    satuan TEXT NOT NULL,
    UNIQUE(id_menu, id_bahan_baku)
);

-- Tabel Cashflow (Aliran Kas Utama)
CREATE TABLE cashflow (
    id_cashflow TEXT PRIMARY KEY,
    id_sumber TEXT,
    tanggal TEXT NOT NULL,
    keterangan_transaksi TEXT,
    jenis TEXT,
    kategori TEXT,
    pemasukan NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pengeluaran NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pos TEXT,
    saldo_kas NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    apakah_stok TEXT,
    id_bahan_baku TEXT,
    qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_rekening_n NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_rekening_y NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Struk (Parent Transaksi)
CREATE TABLE struk (
    id_struk TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    jam TEXT,
    nama_pelanggan TEXT,
    keterangan TEXT,
    metode_bayar TEXT NOT NULL REFERENCES metode_bayar(nama) ON DELETE RESTRICT,
    status_bayar TEXT NOT NULL DEFAULT 'Pending',
    kasir TEXT NOT NULL REFERENCES kasir(nama) ON DELETE RESTRICT,
    total_tagihan NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    waktu_dibuat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    waktu_dibayar TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Detail Transaksi Cafe (Child dari Struk)
CREATE TABLE cafe (
    id_detail TEXT PRIMARY KEY,
    id_struk TEXT NOT NULL REFERENCES struk(id_struk) ON DELETE CASCADE,
    nama_menu TEXT NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    harga_satuan NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- Tabel Detail Transaksi Carwash (Child dari Struk)
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
    harga NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    harga_cuci NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    harga_paket NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    harga_custom NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    anggota_1 TEXT NOT NULL,
    anggota_2 TEXT,
    keterangan TEXT,
    shift TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    gaji_anggota NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gaji_pencuci NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Pengeluaran (Parent Pembelian/Casbon/dll)
CREATE TABLE pengeluaran (
    id_pengeluaran TEXT PRIMARY KEY,
    id_cashflow TEXT REFERENCES cashflow(id_cashflow) ON DELETE SET NULL,
    no INTEGER,
    tanggal TEXT NOT NULL,
    jam TEXT,
    nama_pengeluaran TEXT,
    jenis TEXT,
    kategori TEXT,
    nominal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    apakah_stok TEXT,
    id_bahan_baku TEXT,
    qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Detail Barang Masuk (Child dari Pengeluaran)
CREATE TABLE barang_masuk (
    id_masuk TEXT PRIMARY KEY,
    id_pengeluaran TEXT REFERENCES pengeluaran(id_pengeluaran) ON DELETE CASCADE,
    id_cashflow TEXT REFERENCES cashflow(id_cashflow) ON DELETE SET NULL,
    id_bahan_baku TEXT NOT NULL REFERENCES stok_barang(id_bahan_baku) ON DELETE RESTRICT,
    tanggal TEXT NOT NULL,
    nama_produk TEXT NOT NULL,
    jumlah_masuk NUMERIC(12, 2) NOT NULL CHECK (jumlah_masuk > 0),
    harga_satuan NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Detail Barang Keluar (Log Pengurangan Stok Otomatis)
CREATE TABLE barang_keluar (
    id_keluar TEXT PRIMARY KEY,
    id_detail TEXT REFERENCES cafe(id_detail) ON DELETE CASCADE,
    id_bahan_baku TEXT NOT NULL REFERENCES stok_barang(id_bahan_baku) ON DELETE RESTRICT,
    tanggal TEXT NOT NULL,
    nama_bahan_baku TEXT NOT NULL,
    jumlah_keluar NUMERIC(12, 2) NOT NULL CHECK (jumlah_keluar > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Karyawan Cuci (Kru Carwash)
CREATE TABLE karyawan_cuci (
    id BIGSERIAL PRIMARY KEY,
    nama TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Profil Pengguna & Hak Akses (RBAC)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Owner', 'Kasir')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Triggers & Functions (Otomatisasi Logika Bisnis)

-- A. Cafe -> Barang Keluar & Stok
CREATE OR REPLACE FUNCTION process_cafe_sale_ingredients()
RETURNS TRIGGER AS $$
DECLARE
    r_resep RECORD;
    v_jumlah_keluar NUMERIC(12,2);
    v_tanggal TEXT;
BEGIN
    SELECT tanggal INTO v_tanggal FROM public.struk WHERE id_struk = NEW.id_struk;
    IF v_tanggal IS NULL THEN
        v_tanggal := NOW()::text;
    END IF;

    FOR r_resep IN 
        SELECT id_bahan_baku, nama_bahan, jumlah 
        FROM resep 
        WHERE nama_menu = NEW.nama_menu
    LOOP
        v_jumlah_keluar := r_resep.jumlah * NEW.qty;
        
        -- Catat log barang keluar
        INSERT INTO barang_keluar (id_keluar, id_detail, id_bahan_baku, nama_bahan_baku, jumlah_keluar, tanggal)
        VALUES (gen_random_uuid()::text, NEW.id_detail, r_resep.id_bahan_baku, r_resep.nama_bahan, v_jumlah_keluar, v_tanggal);
        
        -- Kurangi stok fisik
        UPDATE stok_barang
        SET stok = stok - v_jumlah_keluar
        WHERE id_bahan_baku = r_resep.id_bahan_baku;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cafe_sale_ingredients
AFTER INSERT ON cafe
FOR EACH ROW
EXECUTE FUNCTION process_cafe_sale_ingredients();

-- B. Barang Masuk -> Tambah Stok
CREATE OR REPLACE FUNCTION process_barang_masuk_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stok_barang
    SET stok = stok + NEW.jumlah_masuk
    WHERE id_bahan_baku = NEW.id_bahan_baku;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_barang_masuk_stock
AFTER INSERT ON barang_masuk
FOR EACH ROW
EXECUTE FUNCTION process_barang_masuk_stock();

-- C. Struk Selesai -> Cashflow Pemasukan
CREATE OR REPLACE FUNCTION sync_struk_to_cashflow()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status_bayar = 'Selesai') OR 
        (TG_OP = 'UPDATE' AND OLD.status_bayar != 'Selesai' AND NEW.status_bayar = 'Selesai') THEN
        IF NOT EXISTS (SELECT 1 FROM cashflow WHERE id_sumber = NEW.id_struk) THEN
            INSERT INTO cashflow (id_cashflow, id_sumber, tanggal, keterangan_transaksi, jenis, pemasukan, pengeluaran, pos)
            VALUES (
                gen_random_uuid()::text,
                NEW.id_struk,
                NEW.tanggal::date,
                'Pemasukan Kasir (' || NEW.kasir || ') - Struk ID: ' || SUBSTRING(NEW.id_struk, 1, 8),
                'Pemasukan',
                NEW.total_tagihan,
                0.00,
                CASE 
                    WHEN NEW.metode_bayar = 'QRIS' THEN 'SALDO REKENING Y'
                    ELSE 'SALDO CASH'
                END
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_struk_cashflow
AFTER INSERT OR UPDATE ON struk
FOR EACH ROW
EXECUTE FUNCTION sync_struk_to_cashflow();

-- D. Pengeluaran -> Cashflow Pengeluaran
CREATE OR REPLACE FUNCTION sync_pengeluaran_to_cashflow()
RETURNS TRIGGER AS $$
DECLARE
    v_cashflow_id TEXT;
BEGIN
    v_cashflow_id := gen_random_uuid()::text;
    
    INSERT INTO cashflow (id_cashflow, id_sumber, tanggal, keterangan_transaksi, jenis, kategori, pemasukan, pengeluaran, pos)
    VALUES (
        v_cashflow_id,
        NEW.id_pengeluaran,
        NEW.tanggal::date,
        'Pengeluaran ' || NEW.jenis || ' (' || NEW.kategori || '): ' || COALESCE(NEW.nama_pengeluaran, 'Tanpa detail'),
        NEW.jenis,
        NEW.kategori,
        0.00,
        NEW.nominal,
        'SALDO CASH'
    );

    UPDATE pengeluaran
    SET id_cashflow = v_cashflow_id
    WHERE id_pengeluaran = NEW.id_pengeluaran;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pengeluaran_cashflow
AFTER INSERT ON pengeluaran
FOR EACH ROW
EXECUTE FUNCTION sync_pengeluaran_to_cashflow();

-- E. Registrasi Otomatis Profil dari Auth User
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nama, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama', 'Staff Baru'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Kasir')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_profile();


-- 3. Kebijakan Keamanan Supabase (Row Level Security / RLS)

-- Aktifkan RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kasir ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metode_bayar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daftar_harga_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.struk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carwash ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karyawan_cuci ENABLE ROW LEVEL SECURITY;

-- Helper Function untuk Cek Role Pengguna
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aturan RLS Owner (Akses penuh ke semua tabel)
CREATE POLICY owner_all_profiles ON public.profiles FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_kasir ON public.kasir FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_metode ON public.metode_bayar FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_stok ON public.stok_barang FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_menu ON public.daftar_harga_menu FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_resep ON public.resep FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_cashflow ON public.cashflow FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_struk ON public.struk FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_cafe ON public.cafe FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_carwash ON public.carwash FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_pengeluaran ON public.pengeluaran FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_masuk ON public.barang_masuk FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_keluar ON public.barang_keluar FOR ALL TO authenticated USING (get_user_role() = 'Owner');
CREATE POLICY owner_all_karyawan_cuci ON public.karyawan_cuci FOR ALL TO authenticated USING (get_user_role() = 'Owner');

-- Aturan RLS Kasir (Akses Terbatas)
CREATE POLICY kasir_read_self_profile ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY kasir_read_kasir ON public.kasir FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY kasir_read_metode ON public.metode_bayar FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY kasir_read_menu ON public.daftar_harga_menu FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY kasir_read_stok ON public.stok_barang FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY kasir_read_resep ON public.resep FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY kasir_write_struk ON public.struk FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'Kasir');
CREATE POLICY kasir_read_struk ON public.struk FOR SELECT TO authenticated USING (get_user_role() = 'Kasir');
CREATE POLICY kasir_update_struk ON public.struk FOR UPDATE TO authenticated USING (get_user_role() = 'Kasir') WITH CHECK (status_bayar = 'Pending');

CREATE POLICY kasir_write_cafe ON public.cafe FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'Kasir');
CREATE POLICY kasir_read_cafe ON public.cafe FOR SELECT TO authenticated USING (get_user_role() = 'Kasir');

CREATE POLICY kasir_write_carwash ON public.carwash FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'Kasir');
CREATE POLICY kasir_read_carwash ON public.carwash FOR SELECT TO authenticated USING (get_user_role() = 'Kasir');
CREATE POLICY kasir_read_karyawan_cuci ON public.karyawan_cuci FOR SELECT TO authenticated USING (TRUE);


-- 4. View Agregasi Saldo POS Keuangan
CREATE OR REPLACE VIEW public.pos_balances WITH (security_invoker = true) AS
SELECT 
    pos,
    COALESCE(SUM(pemasukan - pengeluaran), 0.00) as balance
FROM public.cashflow
WHERE pos IS NOT NULL AND pos != ''
GROUP BY pos;

-- 5. View Agregasi Ringkasan Keuangan Global
CREATE OR REPLACE VIEW public.finance_summary WITH (security_invoker = true) AS
SELECT 
    COALESCE(SUM(pemasukan), 0.00) as total_income,
    COALESCE(SUM(pengeluaran), 0.00) as total_expense,
    COALESCE(SUM(pemasukan - pengeluaran), 0.00) as total_balance
FROM public.cashflow;
