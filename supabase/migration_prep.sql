-- RUN IN SQL EDITOR BEFORE RUNNING MIGRATION SCRIPT
-- 1. Disable Row Level Security (RLS)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kasir DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.metode_bayar DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_barang DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daftar_harga_menu DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resep DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.struk DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.carwash DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang_masuk DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang_keluar DISABLE ROW LEVEL SECURITY;

-- 2. Disable Custom Triggers only (to avoid system constraint triggers error)
ALTER TABLE public.cafe DISABLE TRIGGER trg_cafe_sale_ingredients;
ALTER TABLE public.barang_masuk DISABLE TRIGGER trg_barang_masuk_stock;
ALTER TABLE public.struk DISABLE TRIGGER trg_struk_cashflow;
ALTER TABLE public.pengeluaran DISABLE TRIGGER trg_pengeluaran_cashflow;
