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

  // Check rows count in cashflow before
  const { data: cfBefore } = await supabase.from('cashflow').select('*')
  console.log('Cashflow rows before:', cfBefore?.length)

  // Insert into struk
  const id = '99999999-9999-9999-9999-999999999999'
  const { data: sData, error: sErr } = await supabase.from('struk').insert([{
    id_struk: id,
    tanggal: '2026-04-01',
    jam: '00:00:00',
    metode_bayar: 'CASH',
    status_bayar: 'Selesai',
    kasir: 'ALEXA',
    total_tagihan: 150000
  }]).select()
  console.log('Struk Insert result:', sData?.length, sErr)

  // Check rows count in cashflow after
  const { data: cfAfter } = await supabase.from('cashflow').select('*')
  console.log('Cashflow rows after:', cfAfter?.length)

  // Clean up
  if (sData) {
    await supabase.from('struk').delete().eq('id_struk', id)
  }
}
run()
