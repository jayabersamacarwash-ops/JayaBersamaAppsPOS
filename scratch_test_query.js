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
  // Let's login first to simulate the authenticated user session
  // Wait, let's login as Owner first
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'qa_owner@jb.local',
    password: 'password123'
  })
  console.log('Login result:', loginData.user?.id, loginErr)

  if (loginData.session) {
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${loginData.session.access_token}`
        }
      }
    })

    const todayDate = new Date().toLocaleDateString('en-CA')
    console.log('Today Date:', todayDate)

    const { data, error } = await authSupabase
      .from('cashflow')
      .select('*')
      .eq('kategori', 'Modal Awal')
      .eq('pos', 'SALDO CASH')
      .eq('tanggal', todayDate)
      .limit(1)

    console.log('Query result:', data, error)
  }
}
run()
