// Cloudflare Pages Functions - REST API Handler untuk JB POS
// Menangani Autentikasi (JWT), Master Data, Transaksi Kafe, Resep & Stok, Carwash, dan Keuangan

// ==================== HELPER UTILS ====================

// Response JSON helper
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Helper hashing password dengan Web Crypto API (SHA-256 + Salt)
async function hashPassword(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const rawKey = await crypto.subtle.exportKey('raw', key)
  return Array.from(new Uint8Array(rawKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Helper JWT Sign
async function signJWT(payload, secret) {
  const enc = new TextEncoder()
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const data = `${encodedHeader}.${encodedPayload}`

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'default-secret-key-jb-pos'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${data}.${encodedSignature}`
}

// Helper JWT Verify
async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, signatureB64] = parts
    const data = `${headerB64}.${payloadB64}`

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret || 'default-secret-key-jb-pos'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode signature
    const sigStr = atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'))
    const sigBytes = new Uint8Array(sigStr.length)
    for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i)

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data))
    if (!isValid) return null

    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(payloadJson)
  } catch (err) {
    return null
  }
}

// Autentikasi Middleware Helper
async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  return await verifyJWT(token, env.JWT_SECRET)
}

// ==================== MAIN ROUTER ====================

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/?/, '')
  const method = request.method

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  const db = env.DB
  if (!db) {
    return jsonResponse({ error: 'Database D1 belum dikonfigurasi pada environment Cloudflare.' }, 500)
  }

  try {
    // ---------------- AUTH ROUTES ----------------
    if (path === 'auth/login' && method === 'POST') {
      const { emailOrUsername, password } = await request.json()
      const email = emailOrUsername.includes('@') ? emailOrUsername.trim() : `${emailOrUsername.trim().toLowerCase()}@jb.local`
      
      const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
      if (!user) {
        return jsonResponse({ error: 'Username/Email atau password salah.' }, 401)
      }

      const calculatedHash = await hashPassword(password, user.salt)
      if (calculatedHash !== user.password_hash) {
        return jsonResponse({ error: 'Username/Email atau password salah.' }, 401)
      }

      const profile = await db.prepare('SELECT * FROM profiles WHERE id = ?').bind(user.id).first()
      const token = await signJWT({ id: user.id, email: user.email, role: user.role, nama: profile?.nama || '' }, env.JWT_SECRET)

      return jsonResponse({
        token,
        user: { id: user.id, email: user.email, role: user.role },
        profile: profile || { id: user.id, nama: user.email, role: user.role },
      })
    }

    if (path === 'auth/me' && method === 'GET') {
      const userAuth = await authenticate(request, env)
      if (!userAuth) return jsonResponse({ error: 'Unauthorized' }, 401)
      const profile = await db.prepare('SELECT * FROM profiles WHERE id = ?').bind(userAuth.id).first()
      return jsonResponse({ user: userAuth, profile })
    }

    if (path === 'auth/register-kasir' && method === 'POST') {
      const userAuth = await authenticate(request, env)
      if (!userAuth || userAuth.role !== 'Owner') {
        return jsonResponse({ error: 'Hanya Owner yang dapat mendaftarkan akun baru.' }, 403)
      }

      const { emailOrUsername, password, nama, role = 'Kasir' } = await request.json()
      const email = emailOrUsername.includes('@') ? emailOrUsername.trim() : `${emailOrUsername.trim().toLowerCase()}@jb.local`
      const userId = crypto.randomUUID()
      const salt = crypto.randomUUID()
      const passwordHash = await hashPassword(password, salt)

      await db.batch([
        db.prepare('INSERT INTO users (id, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)').bind(userId, email, passwordHash, salt, role),
        db.prepare('INSERT INTO profiles (id, nama, role) VALUES (?, ?, ?)').bind(userId, nama, role)
      ])

      return jsonResponse({ success: true, user: { id: userId, email, role, nama } })
    }

    // ---------------- MASTER DATA ROUTES ----------------
    if (path === 'master/kasir') {
      if (method === 'GET') {
        const res = await db.prepare('SELECT * FROM kasir ORDER BY nama ASC').all()
        return jsonResponse(res.results)
      }
      if (method === 'POST') {
        const { nama, is_active } = await request.json()
        await db.prepare('INSERT OR REPLACE INTO kasir (nama, is_active) VALUES (?, ?)').bind(nama, is_active !== false ? 1 : 0).run()
        return jsonResponse({ success: true })
      }
    }

    if (path === 'master/metode-bayar') {
      if (method === 'GET') {
        const res = await db.prepare('SELECT * FROM metode_bayar ORDER BY nama ASC').all()
        return jsonResponse(res.results)
      }
      if (method === 'POST') {
        const { nama, is_active } = await request.json()
        await db.prepare('INSERT OR REPLACE INTO metode_bayar (nama, is_active) VALUES (?, ?)').bind(nama, is_active !== false ? 1 : 0).run()
        return jsonResponse({ success: true })
      }
    }

    if (path === 'master/stok-barang') {
      if (method === 'GET') {
        const res = await db.prepare('SELECT * FROM stok_barang ORDER BY nama_produk ASC').all()
        return jsonResponse(res.results)
      }
      if (method === 'POST') {
        const { id_bahan_baku, nama_produk, satuan, stok } = await request.json()
        await db.prepare('INSERT OR REPLACE INTO stok_barang (id_bahan_baku, nama_produk, satuan, stok) VALUES (?, ?, ?, ?)').bind(id_bahan_baku, nama_produk, satuan, stok || 0).run()
        return jsonResponse({ success: true })
      }
    }

    if (path === 'master/daftar-menu') {
      if (method === 'GET') {
        const res = await db.prepare('SELECT * FROM daftar_harga_menu ORDER BY daftar_menu ASC').all()
        return jsonResponse(res.results)
      }
      if (method === 'POST') {
        const { id_menu, daftar_menu, harga, kategori } = await request.json()
        await db.prepare('INSERT OR REPLACE INTO daftar_harga_menu (id_menu, daftar_menu, harga, kategori) VALUES (?, ?, ?, ?)').bind(id_menu, daftar_menu, harga, kategori || 'Cafe').run()
        return jsonResponse({ success: true })
      }
    }

    if (path === 'master/resep') {
      if (method === 'GET') {
        const res = await db.prepare('SELECT * FROM resep ORDER BY nama_menu ASC').all()
        return jsonResponse(res.results)
      }
      if (method === 'POST') {
        const { id_resep, id_bahan_baku, id_menu, nama_menu, nama_bahan, jumlah, satuan } = await request.json()
        await db.prepare('INSERT OR REPLACE INTO resep (id_resep, id_bahan_baku, id_menu, nama_menu, nama_bahan, jumlah, satuan) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id_resep || crypto.randomUUID(), id_bahan_baku, id_menu, nama_menu, nama_bahan, jumlah, satuan).run()
        return jsonResponse({ success: true })
      }
    }

    if (path === 'master/karyawan-cuci') {
      if (method === 'GET') {
        const res = await db.prepare('SELECT * FROM karyawan_cuci ORDER BY nama ASC').all()
        return jsonResponse(res.results)
      }
      if (method === 'POST') {
        const { nama } = await request.json()
        await db.prepare('INSERT OR IGNORE INTO karyawan_cuci (nama) VALUES (?)').bind(nama).run()
        return jsonResponse({ success: true })
      }
    }

    // ---------------- TRANSAKSI KAFE & STRUK (DENGAN LOGIKA RESEP & CASHFLOW) ----------------
    if (path === 'transaksi/struk') {
      if (method === 'GET') {
        const tanggal = url.searchParams.get('tanggal')
        let query = 'SELECT * FROM struk'
        const binds = []
        if (tanggal) {
          query += ' WHERE tanggal = ?'
          binds.push(tanggal)
        }
        query += ' ORDER BY created_at DESC LIMIT 100'
        const res = await db.prepare(query).bind(...binds).all()
        return jsonResponse(res.results)
      }

      if (method === 'POST') {
        const body = await request.json()
        const { id_struk, tanggal, jam, nama_pelanggan, keterangan, metode_bayar, status_bayar = 'Selesai', kasir, total_tagihan, items = [] } = body
        const strukId = id_struk || `STRUK-${Date.now()}`
        const batchStatements = []

        // 1. Simpan Struk Utama
        batchStatements.push(
          db.prepare(`
            INSERT INTO struk (id_struk, tanggal, jam, nama_pelanggan, keterangan, metode_bayar, status_bayar, kasir, total_tagihan, waktu_dibayar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            strukId,
            tanggal,
            jam,
            nama_pelanggan || '',
            keterangan || '',
            metode_bayar,
            status_bayar,
            kasir,
            total_tagihan,
            status_bayar === 'Selesai' ? new Date().toISOString() : null
          )
        )

        // 2. Simpan Item Kafe & Kurangi Stok Berdasarkan Resep
        for (const item of items) {
          const detailId = item.id_detail || crypto.randomUUID()
          batchStatements.push(
            db.prepare('INSERT INTO cafe (id_detail, id_struk, nama_menu, qty, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?, ?)')
              .bind(detailId, strukId, item.nama_menu, item.qty, item.harga_satuan, item.subtotal || item.qty * item.harga_satuan)
          )

          // Cari bahan resep untuk menu ini
          const recipes = await db.prepare('SELECT * FROM resep WHERE nama_menu = ?').bind(item.nama_menu).all()
          for (const r of (recipes.results || [])) {
            const jumlahKeluar = r.jumlah * item.qty
            const keluarId = crypto.randomUUID()

            // Catat log barang keluar
            batchStatements.push(
              db.prepare('INSERT INTO barang_keluar (id_keluar, id_detail, id_bahan_baku, tanggal, nama_bahan_baku, jumlah_keluar) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(keluarId, detailId, r.id_bahan_baku, tanggal, r.nama_bahan, jumlahKeluar)
            )

            // Kurangi stok fisik bahan baku
            batchStatements.push(
              db.prepare('UPDATE stok_barang SET stok = stok - ? WHERE id_bahan_baku = ?')
                .bind(jumlahKeluar, r.id_bahan_baku)
            )
          }
        }

        // 3. Sinkronisasi Otomatis ke Cashflow jika status Selesai
        if (status_bayar === 'Selesai') {
          const cashflowId = crypto.randomUUID()
          const pos = (metode_bayar || '').toUpperCase() === 'QRIS' ? 'SALDO REKENING Y' : 'SALDO CASH'
          batchStatements.push(
            db.prepare(`
              INSERT INTO cashflow (id_cashflow, id_sumber, tanggal, keterangan_transaksi, jenis, pemasukan, pengeluaran, pos)
              VALUES (?, ?, ?, ?, 'Pemasukan', ?, 0.0, ?)
            `).bind(cashflowId, strukId, tanggal, `Pemasukan Kasir (${kasir}) - Struk ID: ${strukId.slice(0, 8)}`, total_tagihan, pos)
          )
        }

        await db.batch(batchStatements)
        return jsonResponse({ success: true, id_struk: strukId })
      }
    }

    // ---------------- CARWASH QUEUE ----------------
    if (path === 'carwash') {
      if (method === 'GET') {
        const tanggal = url.searchParams.get('tanggal')
        let query = 'SELECT * FROM carwash'
        const binds = []
        if (tanggal) {
          query += ' WHERE tanggal = ?'
          binds.push(tanggal)
        }
        query += ' ORDER BY created_at DESC'
        const res = await db.prepare(query).bind(...binds).all()
        return jsonResponse(res.results)
      }

      if (method === 'POST') {
        const body = await request.json()
        const id_transaksi = body.id_transaksi || `CW-${Date.now()}`
        await db.prepare(`
          INSERT INTO carwash (id_transaksi, id_struk, no, tanggal, jam, model, plat, variant, ukuran, paket, metode, harga, harga_cuci, harga_paket, harga_custom, anggota_1, anggota_2, keterangan, shift, status, gaji_anggota, gaji_pencuci)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id_transaksi, body.id_struk || null, body.no || 1, body.tanggal, body.jam, body.model, body.plat, body.variant, body.ukuran,
          body.paket, body.metode, body.harga || 0, body.harga_cuci || 0, body.harga_paket || 0, body.harga_custom || 0,
          body.anggota_1, body.anggota_2 || null, body.keterangan || '', body.shift || 'Pagi', body.status || 'Pending',
          body.gaji_anggota || 0, body.gaji_pencuci || 0
        ).run()
        return jsonResponse({ success: true, id_transaksi })
      }
    }

    // ---------------- PENGELUARAN & SINKRONISASI CASHFLOW ----------------
    if (path === 'pengeluaran') {
      if (method === 'GET') {
        const tanggal = url.searchParams.get('tanggal')
        let query = 'SELECT * FROM pengeluaran'
        const binds = []
        if (tanggal) {
          query += ' WHERE tanggal = ?'
          binds.push(tanggal)
        }
        query += ' ORDER BY created_at DESC'
        const res = await db.prepare(query).bind(...binds).all()
        return jsonResponse(res.results)
      }

      if (method === 'POST') {
        const body = await request.json()
        const id_pengeluaran = body.id_pengeluaran || `OUT-${Date.now()}`
        const cashflowId = crypto.randomUUID()
        const batchStatements = []

        // Simpan pengeluaran
        batchStatements.push(
          db.prepare(`
            INSERT INTO pengeluaran (id_pengeluaran, id_cashflow, tanggal, jam, nama_pengeluaran, jenis, kategori, nominal, apakah_stok, id_bahan_baku, qty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(id_pengeluaran, cashflowId, body.tanggal, body.jam, body.nama_pengeluaran, body.jenis, body.kategori, body.nominal, body.apakah_stok || 'Tidak', body.id_bahan_baku || null, body.qty || 0)
        )

        // Sinkronisasi otomatis ke cashflow
        batchStatements.push(
          db.prepare(`
            INSERT INTO cashflow (id_cashflow, id_sumber, tanggal, keterangan_transaksi, jenis, kategori, pemasukan, pengeluaran, pos)
            VALUES (?, ?, ?, ?, ?, ?, 0.0, ?, 'SALDO CASH')
          `).bind(cashflowId, id_pengeluaran, body.tanggal, `Pengeluaran ${body.jenis} (${body.kategori}): ${body.nama_pengeluaran || 'Tanpa detail'}`, body.jenis, body.kategori, body.nominal)
        )

        // Jika merupakan pembelian stok, update barang masuk & tambah stok
        if (body.apakah_stok === 'Ya' && body.id_bahan_baku) {
          const idMasuk = crypto.randomUUID()
          batchStatements.push(
            db.prepare(`
              INSERT INTO barang_masuk (id_masuk, id_pengeluaran, id_cashflow, id_bahan_baku, tanggal, nama_produk, jumlah_masuk, harga_satuan)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(idMasuk, id_pengeluaran, cashflowId, body.id_bahan_baku, body.tanggal, body.nama_pengeluaran, body.qty, body.nominal / (body.qty || 1))
          )
          batchStatements.push(
            db.prepare('UPDATE stok_barang SET stok = stok + ? WHERE id_bahan_baku = ?').bind(body.qty, body.id_bahan_baku)
          )
        }

        await db.batch(batchStatements)
        return jsonResponse({ success: true, id_pengeluaran })
      }
    }

    // ---------------- RINGKASAN KEUANGAN & DASHBOARD ----------------
    if (path === 'finance/summary') {
      const summary = await db.prepare(`
        SELECT 
          COALESCE(SUM(pemasukan), 0.0) as total_income,
          COALESCE(SUM(pengeluaran), 0.0) as total_expense,
          COALESCE(SUM(pemasukan - pengeluaran), 0.0) as total_balance
        FROM cashflow
      `).first()

      const posBalances = await db.prepare(`
        SELECT pos, COALESCE(SUM(pemasukan - pengeluaran), 0.0) as balance
        FROM cashflow
        WHERE pos IS NOT NULL AND pos != ''
        GROUP BY pos
      `).all()

      return jsonResponse({ summary, posBalances: posBalances.results })
    }

    return jsonResponse({ error: `Endpoint '${path}' tidak ditemukan` }, 404)
  } catch (err) {
    console.error('API Worker Error:', err)
    return jsonResponse({ error: err.message || 'Internal Server Error' }, 500)
  }
}
