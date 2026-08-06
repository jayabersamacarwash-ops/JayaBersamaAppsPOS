const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// 1. Memuat Kredensial Supabase dari JB.env
const envPath = path.resolve(__dirname, '../JB.env');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#') || !line.includes('=')) return;
    const [key, ...valueParts] = line.split('=');
    const val = valueParts.join('=').trim();
    const cleanKey = key.trim();
    let cleanVal = val;
    if ((cleanVal.startsWith('"') && cleanVal.endsWith('"')) || 
        (cleanVal.startsWith("'") && cleanVal.endsWith("'"))) {
      cleanVal = cleanVal.slice(1, -1);
    }
    if (cleanKey === 'VITE_SUPABASE_URL') supabaseUrl = cleanVal;
    if (cleanKey === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = cleanVal;
  });
}

// Bersihkan path rest/v1 jika tidak sengaja tersalin
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim();
  if (supabaseUrl.endsWith('/rest/v1')) supabaseUrl = supabaseUrl.replace('/rest/v1', '');
  if (supabaseUrl.endsWith('/')) supabaseUrl = supabaseUrl.slice(0, -1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Kredensial Supabase tidak ditemukan di JB.env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Fungsi Pembantu (Helpers)
function stringToUUID(str) {
  if (!str) return null;
  const hash = crypto.createHash('sha1').update(str.trim()).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

function parseMoney(str) {
  if (!str) return 0;
  // e.g. "Rp25.000" -> 25000, "Rp12.167.937,00" -> 12167937
  const clean = str.replace(/Rp/g, '').replace(/\./g, '').split(',')[0].trim();
  return parseFloat(clean) || 0;
}

function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return new Date().toISOString();
  const parts = dateStr.split(/[-/]/);
  if (parts.length !== 3) return new Date().toISOString();
  const d = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  const y = parts[2];
  const timeClean = timeStr ? timeStr.replace(/\./g, ':') : '00:00:00';
  return `${y}-${m}-${d}T${timeClean}Z`;
}

function parseCSV(content) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push("");
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== "") lines.push(row);
  
  if (lines.length === 0) return [];
  const headers = lines[0].map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 1 && line[0] === "") continue;
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = line[index] ? line[index].trim() : "";
    });
    data.push(obj);
  }
  return data;
}

async function insertInBatches(table, data, batchSize = 100) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`❌ Error inserting into ${table} at index ${i}:`, error.message);
    } else {
      console.log(`✅ Inserted ${batch.length} rows into ${table} (${i + batch.length}/${data.length})`);
    }
  }
}

// 3. Proses Utama Migrasi
async function runMigration() {
  console.log('🚀 Memulai migrasi data dari CSV ke Supabase...');
  const csvDir = path.resolve(__dirname, '../csv file');

  const DUMMY_STRUK_ID = stringToUUID('DUMMY_STRUK_MIGRATION');
  const DUMMY_PENGELUARAN_ID = stringToUUID('DUMMY_PENGELUARAN_MIGRATION');
  const DUMMY_CAFE_DETAIL_ID = stringToUUID('DUMMY_CAFE_DETAIL_MIGRATION');

  // --- A. Master Stok Barang ---
  console.log('\n📦 Memigrasikan Stok Barang...');
  const stokContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Stok Barang.csv'), 'utf-8');
  const stokRows = parseCSV(stokContent);
  const mappedStok = stokRows.map(row => {
    // Normalisasi Satuan
    let rawSatuan = row['Satuan'] || 'Gram';
    if (rawSatuan === 'Gram/Ml') rawSatuan = 'Gram/Ml';
    else if (rawSatuan.toLowerCase() === 'btl') rawSatuan = 'Btl';
    else if (rawSatuan.toLowerCase() === 'ml') rawSatuan = 'Ml';
    else if (rawSatuan.toLowerCase() === 'pcs') rawSatuan = 'Pcs';
    else if (rawSatuan.toLowerCase() === 'gram') rawSatuan = 'Gram';
    
    return {
      nama_bahan: row['Nama Produk'],
      stok: 0, // default stok awal di-set 0 (akan bertambah dari log barang masuk)
      satuan: rawSatuan
    };
  }).filter(r => r.nama_bahan);

  await insertInBatches('stok_barang', mappedStok);

  // --- B. Master Daftar Harga Menu ---
  console.log('\n🍽️ Memigrasikan Daftar Harga Menu...');
  const menuContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Daftar Harga Menu.csv'), 'utf-8');
  const menuRows = parseCSV(menuContent);
  const mappedMenus = menuRows.map(row => {
    const isBundling = row['Daftar Menu'].toLowerCase().includes('bundling');
    return {
      nama_menu: row['Daftar Menu'],
      harga: parseMoney(row['Harga']),
      kategori: isBundling ? 'Promo/Bundling' : 'Cafe',
      is_bundling: isBundling,
      is_active: true
    };
  }).filter(m => m.nama_menu);

  // Tambahkan paket cuci mobil bawaan sebagai menu kategori 'Carwash' agar terdaftar
  const defaultCarwashPackages = [
    { nama_menu: 'KACA BENING (JAMUR KACA)', harga: 30000, kategori: 'Carwash', is_bundling: false, is_active: true },
    { nama_menu: 'DAUN TALAS (WAX KACA)', harga: 35000, kategori: 'Carwash', is_bundling: false, is_active: true },
    { nama_menu: 'JURAGAN (JAMUR KACA + WAX KACA)', harga: 60000, kategori: 'Carwash', is_bundling: false, is_active: true },
    { nama_menu: 'GLOW UP (WAX BODY)', harga: 50000, kategori: 'Carwash', is_bundling: false, is_active: true },
    { nama_menu: 'PEJABAT (JAMUR BODY + WAX BODY)', harga: 90000, kategori: 'Carwash', is_bundling: false, is_active: true },
    { nama_menu: 'SULTAN (JAMUR KACA-BODY + WAX KACA-BODY)', harga: 130000, kategori: 'Carwash', is_bundling: false, is_active: true }
  ];

  await insertInBatches('daftar_harga_menu', [...mappedMenus, ...defaultCarwashPackages]);

  // --- C. Resep ---
  console.log('\n📝 Memigrasikan Resep Menu...');
  const resepContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Resep.csv'), 'utf-8');
  const resepRows = parseCSV(resepContent);
  const mappedResep = resepRows.map(row => {
    let rawSatuan = row['Satuan'] || 'Gram';
    if (rawSatuan.toLowerCase() === 'btl') rawSatuan = 'Btl';
    else if (rawSatuan.toLowerCase() === 'ml') rawSatuan = 'Ml';
    else if (rawSatuan.toLowerCase() === 'pcs') rawSatuan = 'Pcs';
    else if (rawSatuan.toLowerCase() === 'gram') rawSatuan = 'Gram';
    else if (rawSatuan === 'Gram/Ml') rawSatuan = 'Gram/Ml';

    return {
      nama_menu: row['Nama Menu'],
      nama_bahan: row['Nama Bahan'],
      jumlah_dibutuhkan: parseFloat(row['Jumlah']) || 0,
      satuan: rawSatuan
    };
  }).filter(r => r.nama_menu && r.nama_bahan);

  // Pastikan menu dan bahan terdaftar untuk menghindari constraint error
  const validResep = mappedResep.filter(r => {
    const hasMenu = mappedMenus.some(m => m.nama_menu === r.nama_menu);
    const hasBahan = mappedStok.some(s => s.nama_bahan === r.nama_bahan);
    return hasMenu && hasBahan;
  });

  await insertInBatches('resep', validResep);

  // --- D. Transaksi Cashflow ---
  console.log('\n💰 Memigrasikan Data Cashflow...');
  const cfContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Cashflow.csv'), 'utf-8');
  const cfRows = parseCSV(cfContent);
  const mappedCashflow = cfRows.map(row => {
    const isPemasukan = row['Jenis'].toLowerCase().includes('pemasukan') || row['Jenis'].toLowerCase().includes('omzet');
    let rawPos = row['POS'] || 'SALDO CASH';
    if (rawPos.includes('REKENING Y')) rawPos = 'SALDO REKENING Y';
    else if (rawPos.includes('REKENING N')) rawPos = 'SALDO REKENING N';
    else rawPos = 'SALDO CASH';

    return {
      id: stringToUUID(row['ID_Cashflow']),
      tanggal: parseDateTime(row['TANGGAL'], '00.00.00'),
      tipe: isPemasukan ? 'Pemasukan' : 'Pengeluaran',
      pos: rawPos,
      jumlah: parseMoney(row['Pemasukan']) || parseMoney(row['pengeluaran']) || 0,
      keterangan: row['KETERANGAN/TRANSAKSI'],
      referensi_id: row['ID_Sumber'] ? stringToUUID(row['ID_Sumber']) : null
    };
  }).filter(c => c.id);

  await insertInBatches('cashflow', mappedCashflow);

  // --- E. Transaksi Struk ---
  console.log('\n🧾 Memigrasikan Transaksi Struk...');
  const strukContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Struk.csv'), 'utf-8');
  const strukRows = parseCSV(strukContent);

  // 1. Ekstrak Kasir & Metode Bayar unik
  const uniqueCashiers = [...new Set(strukRows.map(r => r['Kasir'].trim().toUpperCase()))].filter(Boolean);
  const uniquePayments = [...new Set(strukRows.map(r => r['Metode_Bayar'].trim().toUpperCase()))].filter(Boolean);

  console.log('👤 Memasukkan nama kasir baru...');
  await insertInBatches('kasir', uniqueCashiers.map(n => ({ nama: n, is_active: true })));
  console.log('💳 Memasukkan metode pembayaran baru...');
  await insertInBatches('metode_bayar', uniquePayments.map(n => ({ nama: n, is_active: true })));

  // 2. Insert dummy struk untuk transaksi orphan
  await insertInBatches('struk', [{
    id: DUMMY_STRUK_ID,
    created_at: new Date('2026-01-01').toISOString(),
    metode_bayar: uniquePayments[0] || 'CASH',
    status_bayar: 'Selesai',
    kasir: uniqueCashiers[0] || 'ALEXA',
    total_harga: 0
  }]);

  // 3. Map Struk
  const mappedStruk = strukRows.map(row => {
    let rawStatus = 'Selesai';
    if (row['Status_Bayar'].toLowerCase() === 'pending') rawStatus = 'Pending';

    return {
      id: stringToUUID(row['ID_Struk']),
      created_at: parseDateTime(row['Tanggal'], row['Jam']),
      metode_bayar: row['Metode_Bayar'].trim().toUpperCase(),
      status_bayar: rawStatus,
      kasir: row['Kasir'].trim().toUpperCase(),
      total_harga: parseFloat(row['Total_Tagihan']) || 0
    };
  }).filter(s => s.id);

  await insertInBatches('struk', mappedStruk);

  // --- F. Detail Cafe ---
  console.log('\n☕ Memigrasikan Detail Penjualan Cafe...');
  const cafeContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Cafe.csv'), 'utf-8');
  const cafeRows = parseCSV(cafeContent);

  // Buat list menu terdaftar untuk memotong item yang salah nama menu
  const registeredMenuNames = [...mappedMenus.map(m => m.nama_menu), ...defaultCarwashPackages.map(p => p.nama_menu)];

  const mappedCafe = cafeRows.map(row => {
    const hasStruk = row['ID_Struk'] ? true : false;
    let menuName = row['Nama_Menu'];
    
    // Normalisasi nama menu jika ada sedikit perbedaan
    if (menuName === 'badak') menuName = 'Badak';
    else if (menuName === 'badak susu') menuName = 'Badak Susu';
    else if (menuName === 'Air Mineral') menuName = 'Air Mineral';
    
    // Validasi apakah menu ada
    const isValidMenu = registeredMenuNames.includes(menuName);

    return {
      id: stringToUUID(row['ID_Detail']),
      id_struk: hasStruk ? stringToUUID(row['ID_Struk']) : DUMMY_STRUK_ID,
      nama_menu: menuName,
      jumlah: parseInt(row['Qty']) || 1,
      harga_satuan: parseMoney(row['Harga_Satuan']) || (parseMoney(row['Subtotal']) / (parseInt(row['Qty']) || 1)) || 0,
      isValid: isValidMenu
    };
  }).filter(c => c.id && c.isValid);

  await insertInBatches('cafe', mappedCafe.map(({ isValid, ...rest }) => rest));

  // --- G. Detail Carwash ---
  console.log('\n🧼 Memigrasikan Detail Cucian Mobil (Carwash)...');
  const cwContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Carwash.csv'), 'utf-8');
  const cwRows = parseCSV(cwContent);
  const mappedCarwash = cwRows.map(row => {
    const hasStruk = row['ID_Struk'] ? true : false;

    // Normalisasi kehadiran
    let rawKehadiran = 'TUNGGU';
    if (row['Kehadiran'] && row['Kehadiran'].trim().toUpperCase() === 'TINGGAL') rawKehadiran = 'TINGGAL';

    // Normalisasi variant
    let rawVariant = 'Regular';
    if (row['VARIANT'] && row['VARIANT'].trim().toLowerCase().includes('body only')) rawVariant = 'Body only';

    // Normalisasi ukuran
    let rawUkuran = 'Medium';
    const cleanUkuran = row['UKURAN'] ? row['UKURAN'].trim().toLowerCase() : '';
    if (cleanUkuran.includes('small')) rawUkuran = 'Small';
    else if (cleanUkuran.includes('medium')) rawUkuran = 'Medium';
    else if (cleanUkuran.includes('large')) rawUkuran = 'Large';
    else if (cleanUkuran.includes('extra large')) rawUkuran = 'Extra Large';
    else if (cleanUkuran.includes('custom')) rawUkuran = 'Custom';

    // Paket cuci mobil
    const cleanPaket = row['PAKET'] ? row['PAKET'].trim() : 'GLOW UP (WAX BODY)';

    return {
      id: stringToUUID(row['ID_Transaksi']),
      id_struk: hasStruk ? stringToUUID(row['ID_Struk']) : DUMMY_STRUK_ID,
      kehadiran: rawKehadiran,
      variant: rawVariant,
      ukuran: rawUkuran,
      paket: cleanPaket,
      anggota_1: row['ANGGOTA 1'] ? row['ANGGOTA 1'].trim().toUpperCase() : 'STAFF',
      anggota_2: row['ANGGOTA 2'] ? row['ANGGOTA 2'].trim().toUpperCase() : null,
      plat_nomor: row['PLAT'] ? row['PLAT'].trim().toUpperCase() : 'BK DUMMY',
      harga: parseMoney(row['HARGA']) || parseMoney(row['HARGA_CUCI']) || 0
    };
  }).filter(cw => cw.id);

  await insertInBatches('carwash', mappedCarwash);

  // --- H. Pengeluaran ---
  console.log('\n💸 Memigrasikan Pengeluaran...');
  const expContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Pengeluaran.csv'), 'utf-8');
  const expRows = parseCSV(expContent);

  // Masukkan dummy pengeluaran untuk barang masuk orphan
  await insertInBatches('pengeluaran', [{
    id: DUMMY_PENGELUARAN_ID,
    tanggal: new Date('2026-01-01').toISOString(),
    jenis: 'Pengeluaran',
    kategori: 'Operasional',
    total_harga: 0,
    keterangan: 'Dummy Pengeluaran untuk Detail Barang Masuk Tanpa Link'
  }]);

  const mappedPengeluaran = expRows.map(row => {
    // Normalisasi jenis
    let rawJenis = 'Pengeluaran';
    const cleanJenis = row['Jenis'].toLowerCase();
    if (cleanJenis.includes('cafe')) rawJenis = 'pengeluaran Cafe';
    else if (cleanJenis.includes('carwash')) rawJenis = 'pengeluaran Carwash';
    else if (cleanJenis.includes('casbon')) rawJenis = 'Casbon';

    // Normalisasi kategori
    let rawKategori = 'Operasional';
    const cleanKategori = row['Kategori'].toLowerCase();
    if (cleanKategori.includes('bahan')) rawKategori = 'Bahan Baku';
    else if (cleanKategori.includes('casbon')) rawKategori = 'Casbon';
    else if (cleanKategori.includes('barang')) rawKategori = 'Barang';

    // Cari id_cashflow dari cashflow terdaftar yang mereferensikan pengeluaran ini
    const matchingCashflow = mappedCashflow.find(cf => cf.referensi_id === stringToUUID(row['ID_Pengeluaran']));

    return {
      id: stringToUUID(row['ID_Pengeluaran']),
      tanggal: parseDateTime(row['Tanggal'], row['Jam']),
      jenis: rawJenis,
      kategori: rawKategori,
      total_harga: parseMoney(row['Jumlah']),
      keterangan: row['Nama Pengeluaran'],
      id_cashflow: matchingCashflow ? matchingCashflow.id : null
    };
  }).filter(e => e.id);

  await insertInBatches('pengeluaran', mappedPengeluaran);

  // --- I. Detail Barang Masuk (Restok) ---
  console.log('\n📥 Memigrasikan Detail Barang Masuk...');
  const bmContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Barang Masuk.csv'), 'utf-8');
  const bmRows = parseCSV(bmContent);
  const mappedBarangMasuk = bmRows.map(row => {
    const hasPengeluaran = row['ID_Pengeluaran'] ? true : false;
    return {
      id: stringToUUID(row['ID Masuk']),
      id_pengeluaran: hasPengeluaran ? stringToUUID(row['ID_Pengeluaran']) : DUMMY_PENGELUARAN_ID,
      id_bahan_baku: row['Nama Produk'], // references stok_barang(nama_bahan)
      jumlah: parseFloat(row['Jumlah Masuk']) || 0,
      harga_satuan: parseFloat(row['Harga Satuan']) || 0
    };
  }).filter(bm => bm.id && bm.id_bahan_baku);

  await insertInBatches('barang_masuk', mappedBarangMasuk);

  // --- J. Detail Barang Keluar (Log) ---
  console.log('\n📤 Memigrasikan Detail Barang Keluar...');
  const bkContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Barang Keluar.csv'), 'utf-8');
  const bkRows = parseCSV(bkContent);

  // Masukkan dummy cafe detail untuk log barang keluar orphan
  await insertInBatches('cafe', [{
    id: DUMMY_CAFE_DETAIL_ID,
    id_struk: DUMMY_STRUK_ID,
    nama_menu: mappedMenus[0]?.nama_menu || 'Air Mineral',
    jumlah: 1,
    harga_satuan: 0
  }]);

  const mappedBarangKeluar = bkRows.map(row => {
    const hasCafeDetail = row['ID_Detail'] ? true : false;
    return {
      id: stringToUUID(row['ID_Keluar (Key)']),
      id_detail: hasCafeDetail ? stringToUUID(row['ID_Detail']) : DUMMY_CAFE_DETAIL_ID,
      nama_bahan_baku: row['Nama Bahan Baku'], // references stok_barang(nama_bahan)
      jumlah: parseFloat(row['Jumlah_Keluar']) || 0,
      tanggal: parseDateTime(row['Tanggal'] ? row['Tanggal'].split(' ')[0] : '', '')
    };
  }).filter(bk => bk.id && bk.nama_bahan_baku);

  await insertInBatches('barang_keluar', mappedBarangKeluar);

  // --- K. Hitung Ulang Saldo Stok Fisik Akhir ---
  console.log('\n🔄 Menghitung ulang saldo stok fisik bahan baku...');
  // Untuk setiap bahan baku, stok akhir = Sum(Barang Masuk) - Sum(Barang Keluar)
  for (const bahan of mappedStok) {
    const totalMasuk = mappedBarangMasuk
      .filter(bm => bm.id_bahan_baku === bahan.nama_bahan)
      .reduce((sum, item) => sum + item.jumlah, 0);

    const totalKeluar = mappedBarangKeluar
      .filter(bk => bk.nama_bahan_baku === bahan.nama_bahan)
      .reduce((sum, item) => sum + item.jumlah, 0);

    const stokAkhir = totalMasuk - totalKeluar;

    await supabase
      .from('stok_barang')
      .update({ stok: Math.max(0, stokAkhir) })
      .eq('nama_bahan', bahan.nama_bahan);
  }
  console.log('✅ Perhitungan ulang stok selesai.');

  console.log('\n🎉 PROSES MIGRASI DATA SELESAI DENGAN SUKSES!');
}

runMigration().catch(err => {
  console.error('❌ Terjadi kesalahan fatal saat migrasi:', err);
});
