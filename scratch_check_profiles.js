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
  const { data: loginData } = await supabase.auth.signInWithPassword({
    email: 'qa_owner@jb.local',
    password: 'password123'
  })
  console.log('Logged in!')

  const { data, error } = await supabase.from('cashflow').select('*')
  console.log('Cashflow rows:', data?.length, error)
  if (data && data.length > 0) {
    console.log('First 3 rows:', data.slice(0, 3))
  }
}
run()
