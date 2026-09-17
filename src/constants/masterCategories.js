/**
 * Master Standard Categories for SaaS ERP & POS (Jaya Bersama)
 * Standardized hierarchical classification for Expenses & Incomes
 * with Chart of Accounts (COA) mapping and cashier access permissions (boleh_kasir).
 */

import { DEFAULT_TENANT_ID } from './erpConfig.js'

export const DEFAULT_MASTER_CATEGORIES = [
  // ==========================================
  // A. PENGELUARAN (EXPENSES)
  // ==========================================

  // 1. Pengeluaran Cafe (Segmen F&B)
  {
    id: 'kat_cafe_bahan_baku',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Bahan Baku F&B (Kopi, Susu, Sirup, Es, Cup, Makanan)',
    jenis: 'Pengeluaran Cafe',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_5001', // HPP - Bahan Baku F&B Cafe
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Pembelian bahan baku harian cafe seperti susu, kopi, cup, sirup, es kristal'
  },
  {
    id: 'kat_cafe_listrik_gas',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Listrik & Gas Cafe',
    jenis: 'Pengeluaran Cafe',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6002', // Beban Listrik, Air & Utilitas
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Token listrik cafe dan isi ulang tabung gas LPG'
  },
  {
    id: 'kat_cafe_perlengkapan',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Perlengkapan & Alat Cafe (Tissue, sedotan, blender)',
    jenis: 'Pengeluaran Cafe',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6004', // Beban Operasional & Perlengkapan
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Perlengkapan habis pakai cafe (sedotan, tissue, kantong plastik, sendok/garpu)'
  },
  {
    id: 'kat_cafe_servis_mesin',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Servis & Perawatan Mesin Cafe (Mesin espresso, grinder)',
    jenis: 'Pengeluaran Cafe',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6003', // Beban Perawatan & Servis Mesin
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'Biaya teknisi dan servis berkala mesin kopi, grinder, kulkas/freezer'
  },

  // 2. Pengeluaran Carwash (Segmen Cuci)
  {
    id: 'kat_carwash_chemical',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Bahan Cuci & Chemical (Shampoo, Semir Ban STP, Kanebo)',
    jenis: 'Pengeluaran Carwash',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_5002', // HPP - Shampoo & Chemical Carwash
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Bahan kimia cuci mobil, snow shampoo, semir ban, spons, lap kanebo & microfiber'
  },
  {
    id: 'kat_carwash_listrik',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Listrik Carwash',
    jenis: 'Pengeluaran Carwash',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6002', // Beban Listrik, Air & Utilitas
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Token listrik operasional carwash'
  },
  {
    id: 'kat_carwash_air_pam',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Air PAM / Perawatan Mesin Air',
    jenis: 'Pengeluaran Carwash',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6002', // Beban Listrik, Air & Utilitas
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'Tagihan air PDAM atau biaya servis pompa/filter air'
  },
  {
    id: 'kat_carwash_servis_hidrolik',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Servis & Perawatan Hidrolik / Kompresor',
    jenis: 'Pengeluaran Carwash',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6003', // Beban Perawatan & Servis Mesin
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'Perawatan oli hidrolik, servis kompresor angin dan high pressure pump'
  },
  {
    id: 'kat_carwash_perlengkapan',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Perlengkapan Cuci Mobil (Selang, gun cuci, kuas velg)',
    jenis: 'Pengeluaran Carwash',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6004', // Beban Operasional & Perlengkapan
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Penggantian selang air, gun washer, kuas velg, ember, botol sprayer'
  },

  // 3. Pengeluaran Bersama (Umum & Konsolidasi)
  {
    id: 'kat_bersama_sewa_tempat',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Sewa Tempat Usaha (Bang Awal)',
    jenis: 'Pengeluaran Bersama',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6004', // Beban Operasional Umum & Sewa
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'Pembayaran sewa lahan/bangunan usaha (Bang Awal)'
  },
  {
    id: 'kat_bersama_gaji_tetap',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Gaji Karyawan Tetap & Leader',
    jenis: 'Pengeluaran Bersama',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6001', // Beban Komisi & Upah Cuci Mobil / Gaji
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'Gaji bulanan staf tetap, admin, kasir dan team leader'
  },
  {
    id: 'kat_bersama_casbon',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Casbon Karyawan',
    jenis: 'Pengeluaran Bersama',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_1200', // Piutang Usaha / Karyawan
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Pinjaman sementara/kasbon karyawan yang akan dipotong saat gajian'
  },
  {
    id: 'kat_bersama_wifi_keamanan',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Wifi, Keamanan & Sampah',
    jenis: 'Pengeluaran Bersama',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6002', // Beban Listrik, Air & Utilitas
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Iuran internet/wifi, retribusi sampah lingkungan dan keamanan pos'
  },
  {
    id: 'kat_bersama_biaya_admin',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Biaya Admin Bank / QRIS',
    jenis: 'Pengeluaran Bersama',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_6004', // Beban Operasional & Perlengkapan
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'MDR fee transaksi QRIS/EDC dan biaya administrasi perbankan bulanan'
  },

  // 4. Non-Beban (Mutasi Kas / Pribadi)
  {
    id: 'kat_nonbeban_pindah_saldo',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Pindah Saldo Antar Rekening (Kas -> Bank, dsb.)',
    jenis: 'Non-Beban (Mutasi Kas / Pribadi)',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_1002', // Kas Bank / QRIS Settlement
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Setoran fisik uang kasir ke bank atau transfer antar rekening'
  },
  {
    id: 'kat_nonbeban_prive',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Prive / Penarikan Pribadi Owner (Pengeluaran Non-Usaha)',
    jenis: 'Non-Beban (Mutasi Kas / Pribadi)',
    tipe_arus: 'PENGELUARAN',
    account_id: 'acc_3002', // Prive / Penarikan Laba Owner
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'Penarikan dana laba atau kebutuhan pribadi owner (non-operasional usaha)'
  },

  // ==========================================
  // B. PEMASUKAN (INCOME)
  // ==========================================
  {
    id: 'kat_in_sewa_tenant',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Pendapatan Sewa Tenant (Burger, Jus, Angkringan, Tempe)',
    jenis: 'Pemasukan Non-POS',
    tipe_arus: 'PEMASUKAN',
    account_id: 'acc_4003', // Pendapatan Sewa Tenant / Kemitraan
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Penerimaan sewa stan/lapak dari mitra tenant luar di lokasi'
  },
  {
    id: 'kat_in_modal_disetor',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Modal Disetor / Tambahan Modal Pemilik',
    jenis: 'Pemasukan Non-POS',
    tipe_arus: 'PEMASUKAN',
    account_id: 'acc_3001', // Modal Disetor Pemilik
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'Injeksi dana segar / modal tambahan dari pemilik usaha'
  },
  {
    id: 'kat_in_kembali_casbon',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Pengembalian Casbon / Pelunasan Piutang',
    jenis: 'Pemasukan Non-POS',
    tipe_arus: 'PEMASUKAN',
    account_id: 'acc_1200', // Piutang Usaha (AR)
    boleh_kasir: true,
    is_active: true,
    deskripsi: 'Penerimaan kembali uang pinjaman/casbon karyawan secara tunai/transfer'
  },
  {
    id: 'kat_in_pendapatan_lain',
    tenant_id: DEFAULT_TENANT_ID,
    nama_kategori: 'Pendapatan Lain-lain (Non-Operasional)',
    jenis: 'Pemasukan Non-POS',
    tipe_arus: 'PEMASUKAN',
    account_id: 'acc_4003', // Pendapatan Retail & Lain-lain
    boleh_kasir: false,
    is_active: true,
    deskripsi: 'Pendapatan non-operasional lain di luar penjualan harian POS'
  }
];

export const JENIS_GROUPS = [
  'Pengeluaran Cafe',
  'Pengeluaran Carwash',
  'Pengeluaran Bersama',
  'Non-Beban (Mutasi Kas / Pribadi)',
  'Pemasukan Non-POS'
];

export function filterCategoriesByRole(categories = DEFAULT_MASTER_CATEGORIES, userRole = 'Owner', tipeArus = null) {
  const isOwner = !userRole || ['owner', 'superadmin', 'admin', 'leader'].includes(String(userRole).toLowerCase());
  return (categories || []).filter(c => {
    if (c.is_active === false) return false;
    if (tipeArus && c.tipe_arus !== tipeArus) return false;
    if (isOwner) return true;
    return !!c.boleh_kasir;
  });
}
