-- RUN IN SQL EDITOR AFTER RUNNING MIGRATION SCRIPT
-- 1. Enable Row Level Security (RLS)
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

-- 2. Enable Custom Triggers only
ALTER TABLE public.cafe ENABLE TRIGGER trg_cafe_sale_ingredients;
ALTER TABLE public.barang_masuk ENABLE TRIGGER trg_barang_masuk_stock;
ALTER TABLE public.struk ENABLE TRIGGER trg_struk_cashflow;
ALTER TABLE public.pengeluaran ENABLE TRIGGER trg_pengeluaran_cashflow;
