import fs from 'fs'
import path from 'path'

// 1. Baca kredensial Supabase dari file .env / JB.env
function loadEnv() {
  const envFiles = ['JB.env', '.env.local', '.env']
  const env = {}
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8')
      content.split(/\r?\n/).forEach((line) => {
        if (line.trim().startsWith('#') || !line.includes('=')) return
        const [key, ...val] = line.split('=')
        env[key.trim()] = val.join('=').trim().replace(/(^"|"$|^'|'$)/g, '')
      })
    }
  }
  return env
}

const env = loadEnv()
let supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''

if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Kredensial Supabase tidak ditemukan di file .env atau JB.env')
  process.exit(1)
}

// Helper escape string SQLite
function sqlVal(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return val
  if (typeof val === 'boolean') return val ? 1 : 0
  const str = String(val).replace(/'/g, "''")
  return `'${str}'`
}

async function exportTable(tableName) {
  console.log(`📦 Mengambil data dari tabel: ${tableName}...`)
  try {
    const url = `${supabaseUrl}/rest/v1/${tableName}?select=*`
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`⚠️ Peringatan tabel ${tableName} (${res.status}):`, errText)
      return []
    }

    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn(`⚠️ Gagal mengambil tabel ${tableName}:`, err.message)
    return []
  }
}

async function main() {
  console.log('🚀 Memulai ekspor data snapshot dari Supabase ke Cloudflare D1...')

  const tables = [
    'kasir',
    'metode_bayar',
    'stok_barang',
    'daftar_harga_menu',
    'resep',
    'karyawan_cuci',
    'profiles',
    'struk',
    'cafe',
    'carwash',
    'pengeluaran',
    'barang_masuk',
    'barang_keluar',
    'cashflow',
  ]

  let sqlOutput = '-- Snapshot Data dari Supabase untuk Cloudflare D1\n'
  sqlOutput += '-- Generated: ' + new Date().toISOString() + '\n\n'

  for (const table of tables) {
    const rows = await exportTable(table)
    if (rows.length === 0) continue

    sqlOutput += `-- Data Tabel ${table} (${rows.length} baris)\n`
    for (const row of rows) {
      const keys = Object.keys(row)
      const cols = keys.join(', ')
      const vals = keys.map((k) => sqlVal(row[k])).join(', ')
      sqlOutput += `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals});\n`
    }
    sqlOutput += '\n'
  }

  const outputDir = path.resolve('cloudflare')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, 'seed_from_supabase.sql')
  fs.writeFileSync(outputPath, sqlOutput, 'utf-8')
  console.log(`\n✅ Selesai! Berkas SQL berhasil dibuat: ${outputPath}`)
  console.log(`💡 File ini berisi seluruh snapshot data dari Supabase yang siap di-import ke D1.`)
}

main().catch((err) => {
  console.error('❌ Gagal mengekspor data:', err)
})
