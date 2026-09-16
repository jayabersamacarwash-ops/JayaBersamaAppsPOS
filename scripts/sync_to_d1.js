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

async function main() {
  console.log('🚀 Memulai ekspor data snapshot dari pulled_supabase_data ke Cloudflare D1...')

  const tables = [
    'profiles',
    'kasir',
    'metode_bayar',
    'stok_barang',
    'daftar_harga_menu',
    'resep',
    'karyawan_cuci',
    'struk',
    'cafe',
    'carwash',
    'pengeluaran',
    'barang_masuk',
    'barang_keluar',
    'cashflow',
  ]

  const dataDir = path.resolve('pulled_supabase_data')
  let sqlOutput = '-- Snapshot Data dari Supabase untuk Cloudflare D1\n'
  sqlOutput += '-- Generated: ' + new Date().toISOString() + '\n\n'

  for (const table of tables) {
    const filePath = path.join(dataDir, `${table}.json`)
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File ${table}.json tidak ditemukan, dilewati.`)
      continue
    }

    const rows = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (!Array.isArray(rows) || rows.length === 0) continue

    console.log(`📦 Memproses tabel ${table} (${rows.length} baris)...`)
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
