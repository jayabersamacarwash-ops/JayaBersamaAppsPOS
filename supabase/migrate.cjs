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
  const clean = str.replace(/Rp/g, '').replace(/\./g, '').split(',')[0].trim();
  return parseFloat(clean) || 0;
}

function detectDateFormat(rows, dateColumnName) {
  if (!rows || rows.length === 0 || !dateColumnName) return 'DD/MM/YYYY';
  for (const row of rows) {
    const dateStr = row[dateColumnName];
    if (dateStr) {
      const dateOnly = dateStr.trim().split(' ')[0];
      const parts = dateOnly.split(/[-/]/);
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        if (m > 12) {
          return 'MM/DD/YYYY';
        }
      }
    }
  }
  return 'DD/MM/YYYY';
}

function parseDateTime(dateStr, timeStr, format = 'DD/MM/YYYY') {
  if (!dateStr) return new Date().toISOString();
  const dateOnly = dateStr.trim().split(' ')[0];
  const parts = dateOnly.split(/[-/]/);
  if (parts.length !== 3) return new Date().toISOString();
  
  let dStr, mStr, yStr;
  if (format === 'MM/DD/YYYY') {
    mStr = parts[0].padStart(2, '0');
    dStr = parts[1].padStart(2, '0');
    yStr = parts[2];
  } else {
    dStr = parts[0].padStart(2, '0');
    mStr = parts[1].padStart(2, '0');
    yStr = parts[2];
  }
  
  if (parseInt(mStr, 10) > 12) {
    const temp = mStr;
    mStr = dStr;
    dStr = temp;
  }

  const timeClean = timeStr ? timeStr.replace(/\./g, ':').replace(/,/g, ':') : '00:00:00';
  return `${yStr}-${mStr}-${dStr}T${timeClean}+07:00`;
}

function formatToISODate(dateStr, format = 'DD/MM/YYYY') {
  if (!dateStr) return null;
  const dateOnly = dateStr.trim().split(' ')[0];
  const parts = dateOnly.split(/[-/]/);
  if (parts.length !== 3) return null;
  
  let dStr, mStr, yStr;
  if (format === 'MM/DD/YYYY') {
    mStr = parts[0].padStart(2, '0');
    dStr = parts[1].padStart(2, '0');
    yStr = parts[2];
  } else {
    dStr = parts[0].padStart(2, '0');
    mStr = parts[1].padStart(2, '0');
    yStr = parts[2];
  }
  
  if (parseInt(mStr, 10) > 12) {
    const temp = mStr;
    mStr = dStr;
    dStr = temp;
  }
  return `${yStr}-${mStr}-${dStr}`;
}

function formatToISOTime(timeStr) {
  if (!timeStr) return null;
  let clean = timeStr.trim().replace(/[\.,\s]/g, ':');
  const parts = clean.split(':');
  if (parts.length === 0 || !parts[0]) return null;
  let h = parts[0].padStart(2, '0');
  let m = (parts[1] || '00').padStart(2, '0');
  let s = (parts[2] || '00').padStart(2, '0');
  return `${h}:${m}:${s}`;
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

async function runMigration() {
  console.log('🚀 Memulai migrasi data dari CSV ke Supabase...');
  
  // Authenticate as owner to bypass RLS policies
  console.log('🔑 Mengautentikasi ke Supabase sebagai Owner...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'qa_owner@jb.local',
    password: 'password123'
  });
  if (authErr) {
    console.error('❌ Gagal mengautentikasi:', authErr.message);
    process.exit(1);
  }
  console.log('✅ Berhasil masuk sebagai Owner.');

  const csvDir = path.resolve(__dirname, '../csv file');

  const DUMMY_STRUK_ID = stringToUUID('DUMMY_STRUK_MIGRATION');
  const DUMMY_PENGELUARAN_ID = stringToUUID('DUMMY_PENGELUARAN_MIGRATION');
  const DUMMY_CAFE_DETAIL_ID = stringToUUID('DUMMY_CAFE_DETAIL_MIGRATION');

  // --- Bersihkan Data Lama Terlebih Dahulu ---
  console.log('\n🧹 Membersihkan data lama di database Supabase...');
  const tablesToClear = [
    { name: 'barang_keluar', key: 'id_keluar' },
    { name: 'barang_masuk', key: 'id_masuk' },
    { name: 'cafe', key: 'id_detail' },
    { name: 'carwash', key: 'id_transaksi' },
    { name: 'struk', key: 'id_struk' },
    { name: 'pengeluaran', key: 'id_pengeluaran' },
    { name: 'cashflow', key: 'id_cashflow' },
    { name: 'resep', key: 'id_resep' },
    { name: 'daftar_harga_menu', key: 'id_menu' },
    { name: 'stok_barang', key: 'id_bahan_baku' },
    { name: 'kasir', key: 'nama' },
    { name: 'metode_bayar', key: 'nama' }
  ];

  for (const table of tablesToClear) {
    const { error } = await supabase.from(table.name).delete().neq(table.key, '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.log(`⚠️ Warning: Gagal membersihkan tabel ${table.name}: ${error.message}`);
    } else {
      console.log(`🧹 Tabel ${table.name} berhasil dibersihkan.`);
    }
  }

  // --- A. Master Stok Barang ---
  console.log('\n📦 Memigrasikan Stok Barang...');
  const stokContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Stok Barang.csv'), 'utf-8');
  const stokRows = parseCSV(stokContent);
  const mappedStok = stokRows.map(row => {
    let rawSatuan = row['Satuan'] || 'Gram';
    if (rawSatuan === 'Gram/Ml') rawSatuan = 'Gram/Ml';
    else if (rawSatuan.toLowerCase() === 'btl') rawSatuan = 'Btl';
    else if (rawSatuan.toLowerCase() === 'ml') rawSatuan = 'Ml';
    else if (rawSatuan.toLowerCase() === 'pcs') rawSatuan = 'Pcs';
    else if (rawSatuan.toLowerCase() === 'gram') rawSatuan = 'Gram';
    
    return {
      id_bahan_baku: row['ID Bahan Baku'],
      nama_produk: row['Nama Produk'],
      satuan: rawSatuan,
      stok: 0
    };
  }).filter(r => r.id_bahan_baku);

  await insertInBatches('stok_barang', mappedStok);

  // --- B. Master Daftar Harga Menu ---
  console.log('\n🍽️ Memigrasikan Daftar Harga Menu...');
  const menuContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Daftar Harga Menu.csv'), 'utf-8');
  const menuRows = parseCSV(menuContent);
  const mappedMenus = menuRows.map(row => {
    return {
      id_menu: row['ID Menu'],
      daftar_menu: row['Daftar Menu'],
      harga: parseMoney(row['Harga']),
      kategori: 'Cafe'
    };
  }).filter(m => m.id_menu);

  const defaultCarwashPackages = [
    { id_menu: 'CW-KACA', daftar_menu: 'KACA BENING (JAMUR KACA)', harga: 30000, kategori: 'Carwash' },
    { id_menu: 'CW-TALAS', daftar_menu: 'DAUN TALAS (WAX KACA)', harga: 35000, kategori: 'Carwash' },
    { id_menu: 'CW-JURAGAN', daftar_menu: 'JURAGAN (JAMUR KACA + WAX KACA)', harga: 60000, kategori: 'Carwash' },
    { id_menu: 'CW-GLOWUP', daftar_menu: 'GLOW UP (WAX BODY)', harga: 50000, kategori: 'Carwash' },
    { id_menu: 'CW-PEJABAT', daftar_menu: 'PEJABAT (JAMUR BODY + WAX BODY)', harga: 90000, kategori: 'Carwash' },
    { id_menu: 'CW-SULTAN', daftar_menu: 'SULTAN (JAMUR KACA-BODY + WAX KACA-BODY)', harga: 130000, kategori: 'Carwash' }
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
      id_resep: stringToUUID(row['ID-Resep']),
      id_bahan_baku: row['ID Bahan Baku'],
      id_menu: row['ID Menu'],
      nama_menu: row['Nama Menu'],
      nama_bahan: row['Nama Bahan'],
      jumlah: parseFloat(row['Jumlah']) || 0,
      satuan: rawSatuan
    };
  }).filter(r => r.id_menu && r.id_bahan_baku);

  const validResep = mappedResep.filter(r => {
    const hasMenu = mappedMenus.some(m => m.id_menu === r.id_menu) || defaultCarwashPackages.some(m => m.id_menu === r.id_menu);
    const hasBahan = mappedStok.some(s => s.id_bahan_baku === r.id_bahan_baku);
    return hasMenu && hasBahan;
  });

  // Deduplikasi Resep berdasarkan (id_menu, id_bahan_baku) untuk menghindari UNIQUE constraint violation
  const uniqueResepMap = new Map();
  for (const r of validResep) {
    const key = `${r.id_menu}_${r.id_bahan_baku}`;
    if (!uniqueResepMap.has(key)) {
      uniqueResepMap.set(key, r);
    }
  }
  const deduplicatedResep = Array.from(uniqueResepMap.values());

  await insertInBatches('resep', deduplicatedResep);

  // --- D. Transaksi Cashflow ---
  console.log('\n💰 Memigrasikan Data Cashflow...');
  const cfContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Cashflow.csv'), 'utf-8');
  const cfRows = parseCSV(cfContent);
  const cfDateFormat = detectDateFormat(cfRows, 'TANGGAL');
  console.log(`ℹ️ Format tanggal terdeteksi untuk Cashflow: ${cfDateFormat}`);

  // Load Struk & Pengeluaran CSV files beforehand to map original transaction hours to cashflow
  const tempStrukContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Struk.csv'), 'utf-8');
  const tempStrukRows = parseCSV(tempStrukContent);
  const strukJamMap = {};
  tempStrukRows.forEach(r => {
    if (r['ID_Struk'] && r['Jam']) {
      strukJamMap[r['ID_Struk'].trim()] = r['Jam'].trim();
    }
  });

  const tempPengContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Pengeluaran.csv'), 'utf-8');
  const tempPengRows = parseCSV(tempPengContent);
  const pengJamMap = {};
  tempPengRows.forEach(r => {
    if (r['ID_Pengeluaran'] && r['JAM']) {
      pengJamMap[r['ID_Pengeluaran'].trim()] = r['JAM'].trim();
    }
  });

  const mappedCashflow = cfRows.map(row => {
    const pemAmount = parseMoney(row['Pemasukan']);
    const pengAmount = parseMoney(row['pengeluaran']);

    let rawPos = row['POS'] ? row['POS'].trim() : '';
    if (!rawPos) {
      rawPos = null;
    } else if (rawPos.includes('REKENING Y')) {
      rawPos = 'SALDO REKENING Y';
    } else if (rawPos.includes('REKENING N')) {
      rawPos = 'SALDO REKENING N';
    } else {
      rawPos = 'SALDO CASH';
    }

    const rawSumber = row['ID_Sumber'] ? row['ID_Sumber'].trim() : '';
    let jam = '00.00.00';
    if (rawSumber) {
      if (strukJamMap[rawSumber]) {
        jam = strukJamMap[rawSumber];
      } else if (pengJamMap[rawSumber]) {
        jam = pengJamMap[rawSumber];
      }
    }

    return {
      id_cashflow: stringToUUID(row['ID_Cashflow']),
      id_sumber: row['ID_Sumber'],
      tanggal: parseDateTime(row['TANGGAL'], jam, cfDateFormat),
      keterangan_transaksi: row['KETERANGAN/TRANSAKSI'],
      jenis: row['Jenis'],
      kategori: row['Kategori'],
      pemasukan: pemAmount,
      pengeluaran: pengAmount,
      pos: rawPos,
      saldo_kas: parseMoney(row['Saldo Kas']),
      apakah_stok: row['Apakah Stok?'],
      id_bahan_baku: row['ID Bahan Baku'],
      qty: parseFloat(row['Qty']) || 0,
      saldo_cash: parseMoney(row['SALDO CASH']),
      saldo_rekening_n: parseMoney(row['SALDO REKENING N']),
      saldo_rekening_y: parseMoney(row['SALDO REKENING Y'])
    };
  }).filter(c => c.id_cashflow);

  const seenCashflowIds = new Set();
  const deduplicatedCashflow = mappedCashflow.filter(c => {
    if (seenCashflowIds.has(c.id_cashflow)) return false;
    seenCashflowIds.add(c.id_cashflow);
    return true;
  });

  await insertInBatches('cashflow', deduplicatedCashflow);

  // --- E. Transaksi Struk ---
  console.log('\n🧾 Memigrasikan Transaksi Struk...');
  const strukContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Struk.csv'), 'utf-8');
  const strukRows = parseCSV(strukContent);
  const strukDateFormat = detectDateFormat(strukRows, 'Tanggal');
  console.log(`ℹ️ Format tanggal terdeteksi untuk Struk: ${strukDateFormat}`);

  const uniqueCashiers = [...new Set(strukRows.map(r => r['Kasir'] ? r['Kasir'].trim().toUpperCase() : 'ALEXA'))].filter(Boolean);
  if (!uniqueCashiers.includes('ALEXA')) uniqueCashiers.push('ALEXA');
  if (!uniqueCashiers.includes('STAFF')) uniqueCashiers.push('STAFF');

  const uniquePayments = [...new Set(strukRows.map(r => r['Metode_Bayar'] ? r['Metode_Bayar'].trim().toUpperCase() : 'CASH'))].filter(Boolean);
  if (!uniquePayments.includes('CASH')) uniquePayments.push('CASH');
  if (!uniquePayments.includes('QRIS')) uniquePayments.push('QRIS');

  console.log('👤 Memasukkan nama kasir baru...');
  await insertInBatches('kasir', uniqueCashiers.map(n => ({ nama: n, is_active: true })));
  console.log('💳 Memasukkan metode pembayaran baru...');
  await insertInBatches('metode_bayar', uniquePayments.map(n => ({ nama: n, is_active: true })));

  await insertInBatches('struk', [{
    id_struk: DUMMY_STRUK_ID,
    tanggal: '2026-01-01',
    jam: '00:00:00',
    metode_bayar: 'CASH',
    status_bayar: 'Selesai',
    kasir: 'ALEXA',
    total_tagihan: 0
  }]);

  const mappedStruk = strukRows.map(row => {
    let rawStatus = 'Selesai';
    if (row['Status_Bayar'] && row['Status_Bayar'].toLowerCase() === 'pending') rawStatus = 'Pending';

    let rawPayment = row['Metode_Bayar'] ? row['Metode_Bayar'].trim().toUpperCase() : 'CASH';
    if (!rawPayment) rawPayment = 'CASH';

    let rawKasir = row['Kasir'] ? row['Kasir'].trim().toUpperCase() : 'ALEXA';
    if (!rawKasir) rawKasir = 'ALEXA';

    return {
      id_struk: stringToUUID(row['ID_Struk']),
      tanggal: formatToISODate(row['Tanggal'], strukDateFormat) || row['Tanggal'],
      jam: formatToISOTime(row['Jam']),
      nama_pelanggan: row['Nama_Pelanggan'],
      keterangan: row['Keterangan'],
      metode_bayar: rawPayment,
      status_bayar: rawStatus,
      kasir: rawKasir,
      total_tagihan: parseFloat(row['Total_Tagihan']) || 0,
      created_at: parseDateTime(row['Tanggal'], row['Jam'], strukDateFormat)
    };
  }).filter(s => s.id_struk);

  await insertInBatches('struk', mappedStruk);

  // --- F. Detail Cafe ---
  console.log('\n☕ Memigrasikan Detail Penjualan Cafe...');
  const cafeContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Cafe.csv'), 'utf-8');
  const cafeRows = parseCSV(cafeContent);

  const registeredMenuNames = [...mappedMenus.map(m => m.daftar_menu), ...defaultCarwashPackages.map(p => p.daftar_menu)];

  const mappedCafe = cafeRows.map(row => {
    const hasStruk = row['ID_Struk'] ? true : false;
    let menuName = row['Nama_Menu'];
    
    if (menuName === 'badak') menuName = 'Badak';
    else if (menuName === 'badak susu') menuName = 'Badak Susu';
    else if (menuName === 'Air Mineral') menuName = 'Air Mineral';
    
    const isValidMenu = registeredMenuNames.includes(menuName);

    return {
      id_detail: stringToUUID(row['ID_Detail']),
      id_struk: hasStruk ? stringToUUID(row['ID_Struk']) : DUMMY_STRUK_ID,
      nama_menu: menuName,
      qty: parseInt(row['Qty']) || 1,
      harga_satuan: parseMoney(row['Harga_Satuan']) || (parseMoney(row['Subtotal']) / (parseInt(row['Qty']) || 1)) || 0,
      subtotal: parseMoney(row['Subtotal']) || 0,
      isValid: isValidMenu
    };
  }).filter(c => c.id_detail && c.isValid);

  await insertInBatches('cafe', mappedCafe.map(({ isValid, ...rest }) => rest));

  // --- G. Detail Carwash ---
  console.log('\n🧼 Memigrasikan Detail Cucian Mobil (Carwash)...');
  const cwContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Carwash.csv'), 'utf-8');
  const cwRows = parseCSV(cwContent);
  const cwDateFormat = detectDateFormat(cwRows, 'TANGGAL');
  console.log(`ℹ️ Format tanggal terdeteksi untuk Carwash: ${cwDateFormat}`);

  const mappedCarwash = cwRows.map(row => {
    const hasStruk = row['ID_Struk'] ? true : false;

    let rawKehadiran = 'TUNGGU';
    if (row['Kehadiran'] && row['Kehadiran'].trim().toUpperCase() === 'TINGGAL') rawKehadiran = 'TINGGAL';

    let rawVariant = 'Regular';
    if (row['VARIANT'] && row['VARIANT'].trim().toLowerCase().includes('body only')) rawVariant = 'Body only';

    let rawUkuran = 'Medium';
    const cleanUkuran = row['UKURAN'] ? row['UKURAN'].trim().toLowerCase() : '';
    if (cleanUkuran.includes('small')) rawUkuran = 'Small';
    else if (cleanUkuran.includes('medium')) rawUkuran = 'Medium';
    else if (cleanUkuran.includes('large')) rawUkuran = 'Large';
    else if (cleanUkuran.includes('extra large')) rawUkuran = 'Extra Large';
    else if (cleanUkuran.includes('custom')) rawUkuran = 'Custom';

    let cleanPaket = row['PAKET'] ? row['PAKET'].trim() : '';
    if (!cleanPaket) {
      cleanPaket = 'PAKET CUCI BIASA';
    }

    const hasAnggota2 = row['ANGGOTA 2'] && row['ANGGOTA 2'].trim() ? true : false;
    const gajiPerAnggota = parseMoney(row['Gaji /Anggota']);
    const totalGajiPencuci = gajiPerAnggota * (hasAnggota2 ? 2 : 1);

    return {
      id_transaksi: stringToUUID(row['ID_Transaksi']),
      id_struk: hasStruk ? stringToUUID(row['ID_Struk']) : DUMMY_STRUK_ID,
      no: parseInt(row['No']) || null,
      tanggal: formatToISODate(row['TANGGAL'], cwDateFormat) || row['TANGGAL'],
      jam: formatToISOTime(row['JAM']),
      kehadiran: rawKehadiran,
      model: row['MODEL'],
      plat: row['PLAT'] ? row['PLAT'].trim().toUpperCase() : 'BK DUMMY',
      variant: rawVariant,
      ukuran: rawUkuran,
      paket: cleanPaket,
      metode: row['METODE'],
      harga: parseMoney(row['HARGA']) || parseMoney(row['HARGA_CUCI']) || 0,
      harga_cuci: parseMoney(row['HARGA_CUCI']),
      harga_paket: parseMoney(row['HARGA_PAKET']),
      harga_custom: parseMoney(row['HARGA CUSTOM']),
      anggota_1: row['ANGGOTA 1'] ? row['ANGGOTA 1'].trim().toUpperCase() : 'STAFF',
      anggota_2: hasAnggota2 ? row['ANGGOTA 2'].trim().toUpperCase() : null,
      keterangan: row['Keterangan'],
      shift: row['Shift'],
      status: row['Status'] || 'Selesai',
      gaji_anggota: gajiPerAnggota,
      gaji_pencuci: totalGajiPencuci,
      created_at: parseDateTime(row['TANGGAL'], row['JAM'], cwDateFormat)
    };
  }).filter(cw => cw.id_transaksi);

  await insertInBatches('carwash', mappedCarwash);

  // --- H. Pengeluaran ---
  console.log('\n💸 Memigrasikan Pengeluaran...');
  const expContent = fs.readFileSync(path.join(csvDir, 'DatabaseTransaksi - Pengeluaran.csv'), 'utf-8');
  const expRows = parseCSV(expContent);
  const expDateFormat = detectDateFormat(expRows, 'Tanggal');
  console.log(`ℹ️ Format tanggal terdeteksi untuk Pengeluaran: ${expDateFormat}`);

  await insertInBatches('pengeluaran', [{
    id_pengeluaran: DUMMY_PENGELUARAN_ID,
    tanggal: '2026-01-01',
    jenis: 'Pengeluaran',
    kategori: 'Operasional',
    nominal: 0,
    nama_pengeluaran: 'Dummy Pengeluaran untuk Detail Barang Masuk Tanpa Link'
  }]);

  const mappedPengeluaran = expRows.map(row => {
    let rawJenis = 'Pengeluaran';
    const cleanJenis = row['Jenis'].toLowerCase();
    if (cleanJenis.includes('cafe')) rawJenis = 'pengeluaran Cafe';
    else if (cleanJenis.includes('carwash')) rawJenis = 'pengeluaran Carwash';
    else if (cleanJenis.includes('casbon')) rawJenis = 'Casbon';

    let rawKategori = 'Operasional';
    const cleanKategori = row['Kategori'].toLowerCase();
    if (cleanKategori.includes('bahan')) rawKategori = 'Bahan Baku';
    else if (cleanKategori.includes('casbon')) rawKategori = 'Casbon';
    else if (cleanKategori.includes('barang')) rawKategori = 'Barang';

    const matchingCashflow = mappedCashflow.find(cf => cf.id_sumber === row['ID_Pengeluaran']);

    return {
      id_pengeluaran: stringToUUID(row['ID_Pengeluaran']),
      tanggal: formatToISODate(row['Tanggal'], expDateFormat) || row['Tanggal'],
      jam: row['Jam'] ? row['Jam'].trim().replace(/\./g, ':') : null,
      nama_pengeluaran: row['Nama Pengeluaran'],
      jenis: rawJenis,
      kategori: rawKategori,
      nominal: parseMoney(row['Jumlah']),
      apakah_stok: row['Apakah Stok?'],
      id_bahan_baku: row['ID Bahan Baku'],
      qty: parseFloat(row['Qty']) || 0,
      id_cashflow: matchingCashflow ? matchingCashflow.id_cashflow : null
    };
  }).filter(e => e.id_pengeluaran);

  await insertInBatches('pengeluaran', mappedPengeluaran);

  // --- I. Detail Barang Masuk (Restok) ---
  console.log('\n📥 Memigrasikan Detail Barang Masuk...');
  const bmContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Barang Masuk.csv'), 'utf-8');
  const bmRows = parseCSV(bmContent);
  const bmDateFormat = detectDateFormat(bmRows, 'Tanggal');
  console.log(`ℹ️ Format tanggal terdeteksi untuk Barang Masuk: ${bmDateFormat}`);
  const mappedBarangMasuk = bmRows.map(row => {
    const hasPengeluaran = row['ID_Pengeluaran'] ? true : false;
    return {
      id_masuk: stringToUUID(row['ID Masuk']),
      id_pengeluaran: hasPengeluaran ? stringToUUID(row['ID_Pengeluaran']) : DUMMY_PENGELUARAN_ID,
      id_cashflow: row['ID_Cashflow'] ? stringToUUID(row['ID_Cashflow']) : null,
      id_bahan_baku: row['ID Bahan Baku'],
      tanggal: formatToISODate(row['Tanggal'], bmDateFormat) || row['Tanggal'],
      nama_produk: row['Nama Produk'],
      jumlah_masuk: parseFloat(row['Jumlah Masuk']) || 0,
      harga_satuan: parseFloat(row['Harga Satuan']) || 0
    };
  }).filter(bm => bm.id_masuk && bm.id_bahan_baku);

  await insertInBatches('barang_masuk', mappedBarangMasuk);

  // --- J. Detail Barang Keluar (Log) ---
  console.log('\n📤 Memigrasikan Detail Barang Keluar...');
  const bkContent = fs.readFileSync(path.join(csvDir, 'DatabaseStok - Barang Keluar.csv'), 'utf-8');
  const bkRows = parseCSV(bkContent);
  const bkDateFormat = detectDateFormat(bkRows, 'Tanggal');
  console.log(`ℹ️ Format tanggal terdeteksi untuk Barang Keluar: ${bkDateFormat}`);

  await insertInBatches('cafe', [{
    id_detail: DUMMY_CAFE_DETAIL_ID,
    id_struk: DUMMY_STRUK_ID,
    nama_menu: mappedMenus[0]?.daftar_menu || 'Air Mineral',
    qty: 1,
    harga_satuan: 0,
    subtotal: 0
  }]);

  const mappedBarangKeluar = bkRows.map(row => {
    const hasCafeDetail = row['ID_Detail'] ? true : false;
    return {
      id_keluar: stringToUUID(row['ID_Keluar (Key)']),
      id_detail: hasCafeDetail ? stringToUUID(row['ID_Detail']) : DUMMY_CAFE_DETAIL_ID,
      id_bahan_baku: row['ID Bahan Baku'],
      nama_bahan_baku: row['Nama Bahan Baku'],
      jumlah_keluar: parseFloat(row['Jumlah_Keluar']) || 0,
      tanggal: formatToISODate(row['Tanggal'], bkDateFormat) || row['Tanggal']
    };
  }).filter(bk => bk.id_keluar && bk.id_bahan_baku);

  await insertInBatches('barang_keluar', mappedBarangKeluar);

  // --- K. Hitung Ulang Saldo Stok Fisik Akhir ---
  console.log('\n🔄 Menghitung ulang saldo stok fisik bahan baku...');
  for (const bahan of mappedStok) {
    const totalMasuk = mappedBarangMasuk
      .filter(bm => bm.id_bahan_baku === bahan.id_bahan_baku)
      .reduce((sum, item) => sum + item.jumlah_masuk, 0);

    const totalKeluar = mappedBarangKeluar
      .filter(bk => bk.id_bahan_baku === bahan.id_bahan_baku)
      .reduce((sum, item) => sum + item.jumlah_keluar, 0);

    const stokAkhir = totalMasuk - totalKeluar;

    await supabase
      .from('stok_barang')
      .update({ stok: Math.max(0, stokAkhir) })
      .eq('id_bahan_baku', bahan.id_bahan_baku);
  }
  console.log('✅ Perhitungan ulang stok selesai.');

  console.log('\n🎉 PROSES MIGRASI DATA SELESAI DENGAN SUKSES!');
}

runMigration().catch(err => {
  console.error('❌ Terjadi kesalahan fatal saat migrasi:', err);
});
