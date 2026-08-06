import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('JB.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''
envContent.split(/\r?\n/).forEach(line => {
  if (line.trim().startsWith('#') || !line.includes('=')) return
  const [key, ...valueParts] = line.split('=')
  const val = valueParts.join('=').trim()
  if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = val
  if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = val
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const tables = ['profiles', 'kasir', 'metode_bayar', 'stok_barang', 'daftar_harga_menu', 'resep', 'cashflow', 'struk', 'cafe', 'carwash', 'pengeluaran', 'barang_masuk', 'barang_keluar']
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
    console.log(`Table "${t}": ${count} rows, Error:`, error)
  }
}
run()
