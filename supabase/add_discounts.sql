-- 1. Buat Tabel Diskon Baru dengan Kolom Tipe (Rupiah / Persen)
CREATE TABLE IF NOT EXISTS public.diskon (
    id_diskon UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT UNIQUE NOT NULL,
    nominal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tipe TEXT NOT NULL CHECK (tipe IN ('Rupiah', 'Persen')),
    kategori TEXT NOT NULL CHECK (kategori IN ('Carwash', 'Cafe', 'Semua')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aktifkan RLS untuk keamanan data
ALTER TABLE public.diskon ENABLE ROW LEVEL SECURITY;

-- 3. Buat Aturan Kebijakan (RLS Policies)
-- Hapus policy lama jika ada untuk mencegah error
DROP POLICY IF EXISTS owner_all_diskon ON public.diskon;
DROP POLICY IF EXISTS kasir_read_diskon ON public.diskon;

-- Owner memiliki akses penuh
CREATE POLICY owner_all_diskon ON public.diskon FOR ALL TO authenticated USING (get_user_role() = 'Owner');
-- Kasir hanya memiliki akses baca (select)
CREATE POLICY kasir_read_diskon ON public.diskon FOR SELECT TO authenticated USING (TRUE);

-- 4. Tambah kolom diskon (Rupiah hasil kalkulasi) pada tabel struk
ALTER TABLE public.struk 
ADD COLUMN IF NOT EXISTS diskon_carwash NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS diskon_cafe NUMERIC(12, 2) DEFAULT 0.00;
