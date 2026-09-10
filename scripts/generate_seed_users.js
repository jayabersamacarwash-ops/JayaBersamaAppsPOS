import fs from 'fs'
import crypto from 'crypto'

// Password hasher yang identik dengan Web Crypto API di functions/api/[[route]].js
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
}

const seedPath = 'cloudflare/seed_from_supabase.sql'
let content = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf-8') : ''

// Akun default untuk pengujian Cloudflare Sandbox
const defaultUsers = [
  { email: 'admin@jb.local', nama: 'Owner JB', role: 'Owner', pass: 'Admin123!' },
  { email: 'kasir@jb.local', nama: 'Kasir Staff', role: 'Kasir', pass: 'Kasir123!' },
]

let usersSql = '\n-- Default Akun Pengguna untuk Cloudflare Sandbox\n'
for (const u of defaultUsers) {
  const userId = crypto.randomUUID()
  const salt = crypto.randomUUID()
  const passHash = hashPassword(u.pass, salt)

  usersSql += `INSERT OR REPLACE INTO users (id, email, password_hash, salt, role) VALUES ('${userId}', '${u.email}', '${passHash}', '${salt}', '${u.role}');\n`
  usersSql += `INSERT OR REPLACE INTO profiles (id, nama, role) VALUES ('${userId}', '${u.nama}', '${u.role}');\n`
}

if (!content.includes('Default Akun Pengguna untuk Cloudflare Sandbox')) {
  fs.appendFileSync(seedPath, usersSql, 'utf-8')
  console.log('✅ Akun default sandbox berhasil ditambahkan ke seed_from_supabase.sql:')
  console.log('   - Owner: admin@jb.local (Password: Admin123!)')
  console.log('   - Kasir: kasir@jb.local (Password: Kasir123!)')
} else {
  console.log('ℹ️ Akun default sandbox sudah ada di file seed.')
}
