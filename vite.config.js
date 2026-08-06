import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Parsing manual berkas JB.env
const customEnv = {}
const envPath = path.resolve(__dirname, 'JB.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split(/\r?\n/).forEach(line => {
    // Abaikan komentar dan baris kosong
    if (line.trim().startsWith('#') || !line.includes('=')) return
    const [key, ...valueParts] = line.split('=')
    const val = valueParts.join('=').trim()
    const cleanKey = key.trim()
    let cleanVal = val
    // Hapus kutip jika ada
    if ((cleanVal.startsWith('"') && cleanVal.endsWith('"')) || 
        (cleanVal.startsWith("'") && cleanVal.endsWith("'"))) {
      cleanVal = cleanVal.slice(1, -1)
    }
    if (cleanKey.startsWith('VITE_')) {
      customEnv[cleanKey] = cleanVal
    }
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    // Ekspos variabel VITE_ dari JB.env ke client-side import.meta.env
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(customEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(customEnv.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '')
  }
})


