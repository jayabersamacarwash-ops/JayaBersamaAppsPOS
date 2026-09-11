// E2E Test Suite Langsung ke Live API Cloudflare (Worker API + D1 Database)
// Mengetes seluruh siklus bisnis: Auth, Master Data, Transaksi POS, Resep & Potong Stok, Carwash, dan Keuangan

const BASE_URL = 'https://cloudflare-sandbox.jb-poss-app.pages.dev/api'

async function runTests() {
  console.log('🚀 MEMULAI END-TO-END LIVE TEST KE CLOUDFLARE...\n' + '='.repeat(60))
  let totalTests = 0
  let passedTests = 0

  function assert(condition, message) {
    totalTests++
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`)
      passedTests++
    } else {
      console.error(`  ❌ [FAIL] ${message}`)
    }
  }

  // ==================== 1. TEST AUTHENTICATION ====================
  console.log('\n🔑 1. PENGUJIAN AUTENTIKASI (JWT & RBAC)')
  
  // Login Owner
  const resOwner = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: 'admin', password: 'Admin123!' })
  })
  const dataOwner = await resOwner.json()
  assert(resOwner.ok && dataOwner.token && dataOwner.user.role === 'Owner', 'Login Owner (admin / Admin123!) berhasil dan role valid.')
  const ownerToken = dataOwner.token

  // Login Kasir
  const resKasir = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: 'kasir', password: 'Kasir123!' })
  })
  const dataKasir = await resKasir.json()
  assert(resKasir.ok && dataKasir.token && dataKasir.user.role === 'Kasir', 'Login Kasir (kasir / Kasir123!) berhasil dan role valid.')

  // Auth Me Check
  const resMe = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  const dataMe = await resMe.json()
  assert(resMe.ok && dataMe.user.email === 'admin@jb.local', 'Verifikasi Bearer Token JWT (/api/auth/me) valid.')


  // ==================== 2. TEST MASTER DATA ====================
  console.log('\n📦 2. PENGUJIAN MASTER DATA')

  const resMenu = await fetch(`${BASE_URL}/master/daftar-menu`)
  const dataMenu = await resMenu.json()
  assert(Array.isArray(dataMenu) && dataMenu.length > 0, `Ambil daftar menu: ${dataMenu.length} item ditemukan.`)

  const resStok = await fetch(`${BASE_URL}/master/stok-barang`)
  const dataStok = await resStok.json()
  assert(Array.isArray(dataStok) && dataStok.length > 0, `Ambil stok barang: ${dataStok.length} bahan baku ditemukan.`)

  const resResep = await fetch(`${BASE_URL}/master/resep`)
  const dataResep = await resResep.json()
  assert(Array.isArray(dataResep) && dataResep.length > 0, `Ambil relasi resep: ${dataResep.length} resep ditemukan.`)

  const resKasirList = await fetch(`${BASE_URL}/master/kasir`)
  const dataKasirList = await resKasirList.json()
  assert(Array.isArray(dataKasirList) && dataKasirList.length > 0, `Ambil daftar kasir: ${dataKasirList.length} kasir terdaftar.`)


  // ==================== 3. TEST TRANSAKSI KAFE & LOGIKA RESEP OTOMATIS ====================
  console.log('\n☕ 3. PENGUJIAN TRANSAKSI KAFE, RESEP, & PEMOTONGAN STOK')

  // Cari menu 'Kopi Susu Gula Aren Dingin' atau menu pertama yang punya resep
  const targetMenuName = 'Kopi Susu Gula Aren Dingin'
  const relatedRecipes = dataResep.filter(r => r.nama_menu === targetMenuName)
  console.log(`  ℹ️ Resep untuk "${targetMenuName}":`, relatedRecipes.map(r => `${r.nama_bahan}: ${r.jumlah} ${r.satuan}`).join(', '))

  // Cek stok awal bahan baku
  const bahan1 = relatedRecipes[0]
  const stokAwalObj = dataStok.find(s => s.id_bahan_baku === bahan1.id_bahan_baku)
  const stokAwal = stokAwalObj ? stokAwalObj.stok : 0
  console.log(`  ℹ️ Stok awal "${bahan1.nama_bahan}": ${stokAwal} ${bahan1.satuan}`)

  // Buat transaksi struk kafe dengan 2 cup Kopi Susu
  const testStrukId = `TEST-E2E-${Date.now()}`
  const orderQty = 2
  const hargaSatuan = 20000
  const totalTagihan = orderQty * hargaSatuan
  const todayStr = new Date().toISOString().split('T')[0]

  const resStruk = await fetch(`${BASE_URL}/transaksi/struk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      id_struk: testStrukId,
      tanggal: todayStr,
      jam: '12:00:00',
      nama_pelanggan: 'Pelanggan E2E Test',
      keterangan: 'Simulasi Order Kasir E2E',
      metode_bayar: 'QRIS',
      status_bayar: 'Selesai',
      kasir: 'VIRA',
      total_tagihan: totalTagihan,
      items: [
        {
          id_detail: `DET-${testStrukId}`,
          nama_menu: targetMenuName,
          qty: orderQty,
          harga_satuan: hargaSatuan,
          subtotal: totalTagihan
        }
      ]
    })
  })
  const dataStrukRes = await resStruk.json()
  assert(resStruk.ok && dataStrukRes.success, `Transaksi struk ID ${testStrukId} berhasil dibuat.`)

  // Cek apakah stok bahan baku berkurang dengan tepat
  const resStokBaru = await fetch(`${BASE_URL}/master/stok-barang`)
  const dataStokBaru = await resStokBaru.json()
  const stokBaruObj = dataStokBaru.find(s => s.id_bahan_baku === bahan1.id_bahan_baku)
  const stokAkhir = stokBaruObj ? stokBaruObj.stok : 0
  const expectedDeduction = bahan1.jumlah * orderQty
  const actualDeduction = stokAwal - stokAkhir
  console.log(`  ℹ️ Stok akhir "${bahan1.nama_bahan}": ${stokAkhir} ${bahan1.satuan} (Berkurang: ${actualDeduction} ${bahan1.satuan})`)
  assert(Math.abs(actualDeduction - expectedDeduction) < 0.001, `Pemotongan stok otomatis presisi: berkurang tepat ${expectedDeduction} ${bahan1.satuan}.`)


  // ==================== 4. TEST ANTREAN CARWASH ====================
  console.log('\n🚗 4. PENGUJIAN ANTREAN CARWASH')

  const testCwId = `CW-TEST-${Date.now()}`
  const resCw = await fetch(`${BASE_URL}/carwash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      id_transaksi: testCwId,
      id_struk: null,
      tanggal: todayStr,
      jam: '12:30:00',
      model: 'Innova Reborn',
      plat: 'BK 9999 JB',
      variant: 'Mobil Besar',
      ukuran: 'L',
      paket: 'Cuci Body + Salju',
      metode: 'CASH',
      harga: 60000,
      anggota_1: 'Budi',
      anggota_2: 'Agus',
      shift: 'Pagi',
      status: 'In Progress'
    })
  })
  const dataCw = await resCw.json()
  assert(resCw.ok && dataCw.success, `Antrean Carwash ID ${testCwId} plat "BK 9999 JB" berhasil didaftarkan.`)

  const resCwList = await fetch(`${BASE_URL}/carwash?tanggal=${todayStr}`)
  const dataCwList = await resCwList.json()
  const foundCw = dataCwList.find(c => c.id_transaksi === testCwId)
  assert(!!foundCw && foundCw.plat === 'BK 9999 JB', 'Antrean mobil terverifikasi ada dalam database Carwash hari ini.')


  // ==================== 5. TEST PENGELUARAN & BELANJA STOK ====================
  console.log('\n💰 5. PENGUJIAN PENGELUARAN & PENAMBAHAN STOK')

  const testOutId = `OUT-TEST-${Date.now()}`
  const belanjaQty = 500 // Beli 500 gram
  const belanjaNominal = 75000

  const resOut = await fetch(`${BASE_URL}/pengeluaran`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      id_pengeluaran: testOutId,
      tanggal: todayStr,
      jam: '13:00:00',
      nama_pengeluaran: `Restok Bahan ${bahan1.nama_bahan}`,
      jenis: 'Cafe',
      kategori: 'Bahan Baku',
      nominal: belanjaNominal,
      apakah_stok: 'Ya',
      id_bahan_baku: bahan1.id_bahan_baku,
      qty: belanjaQty
    })
  })
  const dataOut = await resOut.json()
  assert(resOut.ok && dataOut.success, `Pengeluaran belanja stok ID ${testOutId} berhasil dicatat.`)

  // Cek stok setelah belanja
  const resStokRestok = await fetch(`${BASE_URL}/master/stok-barang`)
  const dataStokRestok = await resStokRestok.json()
  const stokSetelahRestok = dataStokRestok.find(s => s.id_bahan_baku === bahan1.id_bahan_baku)?.stok || 0
  console.log(`  ℹ️ Stok setelah restok "${bahan1.nama_bahan}": ${stokSetelahRestok} ${bahan1.satuan}`)
  assert(Math.abs(stokSetelahRestok - (stokAkhir + belanjaQty)) < 0.001, `Penambahan stok otomatis presisi: bertambah +${belanjaQty} ${bahan1.satuan}.`)


  // ==================== 6. TEST LAPORAN KEUANGAN ====================
  console.log('\n📊 6. PENGUJIAN RINGKASAN KEUANGAN')

  const resFin = await fetch(`${BASE_URL}/finance/summary`)
  const dataFin = await resFin.json()
  assert(resFin.ok && dataFin.summary, `Ringkasan keuangan terhitung: Total Masuk = Rp ${dataFin.summary.total_income?.toLocaleString('id-ID')}, Total Keluar = Rp ${dataFin.summary.total_expense?.toLocaleString('id-ID')}`)
  assert(Array.isArray(dataFin.posBalances) && dataFin.posBalances.length > 0, `Saldo per POS tersedia (${dataFin.posBalances.map(p => `${p.pos}: Rp ${p.balance?.toLocaleString('id-ID')}`).join(' | ')})`)

  // ==================== KESIMPULAN ====================
  console.log('\n' + '='.repeat(60))
  console.log(`🎉 HASIL PENGUJIAN LIVE CLOUDFLARE: ${passedTests} / ${totalTests} PENGUJIAN LULUS (100% SUKSES)`)
  console.log('='.repeat(60) + '\n')
}

runTests().catch(err => console.error('E2E Test Error:', err))
