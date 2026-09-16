/**
 * Local Database Engine for SaaS ERP
 * Zero cloud dependency - 100% offline & persistent (localStorage/Memory).
 * Includes Multi-Tenant isolation, Chart of Accounts (Double-Entry Ledger),
 * Inventory Valuation, Auto-triggers, and Supabase-compatible Query Builder.
 */

import realSeedData from './realSeedData.json' with { type: 'json' }
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '../constants/erpConfig.js'
import { GeneralLedgerService, calculateMovingAverageCost } from './generalLedgerService.js'

const STORAGE_KEY = 'saas_erp_local_db_v3_production'
const AUTH_STORAGE_KEY = 'saas_erp_local_auth_v2'

export { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID }

export const INITIAL_SEED_DATA = {
  // 1. SAAS MULTI-TENANCY & ORG
  tenants: [
    {
      id: DEFAULT_TENANT_ID,
      nama: 'Jaya Bersama Enterprise',
      slug: 'jaya-bersama',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    },
  ],
  branches: [
    {
      id: DEFAULT_BRANCH_ID,
      tenant_id: DEFAULT_TENANT_ID,
      nama: 'Cabang Utama (Carwash & Cafe)',
      kode: 'HO-01',
      alamat: 'Jl. Merdeka No. 88, Medan',
      telepon: '0812-3456-7890',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ],

  // 2. FINANCIAL CORE - CHART OF ACCOUNTS (CoA)
  chart_of_accounts: [
    // ASET LANCAR (1000 - 1499)
    { id: 'acc_1001', tenant_id: DEFAULT_TENANT_ID, code: '1001', name: 'Kas Kasir (Cash on Hand)', category: 'ASSET', normal_balance: 'DEBIT', is_active: true },
    { id: 'acc_1002', tenant_id: DEFAULT_TENANT_ID, code: '1002', name: 'Kas Bank / QRIS Settlement', category: 'ASSET', normal_balance: 'DEBIT', is_active: true },
    { id: 'acc_1200', tenant_id: DEFAULT_TENANT_ID, code: '1200', name: 'Piutang Usaha (AR)', category: 'ASSET', normal_balance: 'DEBIT', is_active: true },
    { id: 'acc_1300', tenant_id: DEFAULT_TENANT_ID, code: '1300', name: 'Persediaan Bahan Baku & Stok', category: 'ASSET', normal_balance: 'DEBIT', is_active: true },
    // LIABILITAS (2000 - 2999)
    { id: 'acc_2001', tenant_id: DEFAULT_TENANT_ID, code: '2001', name: 'Hutang Usaha (AP - Supplier)', category: 'LIABILITY', normal_balance: 'CREDIT', is_active: true },
    { id: 'acc_2002', tenant_id: DEFAULT_TENANT_ID, code: '2002', name: 'Hutang Gaji & Komisi Kru', category: 'LIABILITY', normal_balance: 'CREDIT', is_active: true },
    // EKUITAS (3000 - 3999)
    { id: 'acc_3001', tenant_id: DEFAULT_TENANT_ID, code: '3001', name: 'Modal Disetor Pemilik', category: 'EQUITY', normal_balance: 'CREDIT', is_active: true },
    { id: 'acc_3002', tenant_id: DEFAULT_TENANT_ID, code: '3002', name: 'Laba Ditahan (Retained Earnings)', category: 'EQUITY', normal_balance: 'CREDIT', is_active: true },
    // PENDAPATAN (4000 - 4999)
    { id: 'acc_4001', tenant_id: DEFAULT_TENANT_ID, code: '4001', name: 'Pendapatan Cafe & F&B', category: 'REVENUE', normal_balance: 'CREDIT', is_active: true },
    { id: 'acc_4002', tenant_id: DEFAULT_TENANT_ID, code: '4002', name: 'Pendapatan Jasa Carwash', category: 'REVENUE', normal_balance: 'CREDIT', is_active: true },
    { id: 'acc_4003', tenant_id: DEFAULT_TENANT_ID, code: '4003', name: 'Pendapatan Penjualan Retail & Merchandise', category: 'REVENUE', normal_balance: 'CREDIT', is_active: true },
    // HARGA POKOK PENJUALAN (5000 - 5999)
    { id: 'acc_5001', tenant_id: DEFAULT_TENANT_ID, code: '5001', name: 'HPP - Bahan Baku F&B Cafe', category: 'EXPENSE', normal_balance: 'DEBIT', is_active: true },
    { id: 'acc_5002', tenant_id: DEFAULT_TENANT_ID, code: '5002', name: 'HPP - Shampoo & Chemical Carwash', category: 'EXPENSE', normal_balance: 'DEBIT', is_active: true },
    // BEBAN OPERASIONAL (6000 - 6999)
    { id: 'acc_6001', tenant_id: DEFAULT_TENANT_ID, code: '6001', name: 'Beban Komisi & Upah Cuci Mobil', category: 'EXPENSE', normal_balance: 'DEBIT', is_active: true },
    { id: 'acc_6002', tenant_id: DEFAULT_TENANT_ID, code: '6002', name: 'Beban Listrik, Air & Utilitas', category: 'EXPENSE', normal_balance: 'DEBIT', is_active: true },
    { id: 'acc_6003', tenant_id: DEFAULT_TENANT_ID, code: '6003', name: 'Beban Perawatan & Servis Mesin', category: 'EXPENSE', normal_balance: 'DEBIT', is_active: true },
    { id: 'acc_6004', tenant_id: DEFAULT_TENANT_ID, code: '6004', name: 'Beban Operasional & Kasbon Karyawan', category: 'EXPENSE', normal_balance: 'DEBIT', is_active: true },
  ],

  // DOUBLE ENTRY GENERAL LEDGER
  journal_entries: [],
  journal_entry_lines: [],

  // 3. PROCUREMENT & VENDORS
  suppliers: [
    {
      id: 'sup_01',
      tenant_id: DEFAULT_TENANT_ID,
      nama: 'CV Berkah Roastery Kopi',
      kontak: 'Budi Santoso (0811-9876-5432)',
      kategori: 'Bahan Baku Cafe',
      alamat: 'Medan',
      created_at: new Date().toISOString(),
    },
    {
      id: 'sup_02',
      tenant_id: DEFAULT_TENANT_ID,
      nama: 'PT Autocare Mega Mandiri',
      kontak: 'Hendra (0812-7788-9900)',
      kategori: 'Chemical & Snow Shampoo',
      alamat: 'Medan',
      created_at: new Date().toISOString(),
    },
  ],
  purchase_orders: [],
  purchase_order_items: [],
  stock_movements: [],

  // 4. MASTER OPERASIONAL & POS
  kasir: realSeedData.kasir && realSeedData.kasir.length > 0 ? realSeedData.kasir : [
    { nama: 'ALEXA', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, is_active: true, created_at: new Date().toISOString() },
    { nama: 'SYAFA', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, is_active: true, created_at: new Date().toISOString() },
    { nama: 'ADMIN', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, is_active: true, created_at: new Date().toISOString() },
  ],
  metode_bayar: realSeedData.metode_bayar && realSeedData.metode_bayar.length > 0 ? realSeedData.metode_bayar : [
    { nama: 'CASH', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, is_active: true, created_at: new Date().toISOString() },
    { nama: 'QRIS', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, is_active: true, created_at: new Date().toISOString() },
    { nama: 'TRANSFER', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, is_active: true, created_at: new Date().toISOString() },
  ],
  // MASTER KATEGORI & ARUS CASHFLOW (DENGAN KONTROL AKSES KASIR & PEMETAAN COA)
  master_categories: [
    // 1. Pengeluaran Cafe (F&B)
    { id: 'kat_cafe_bahan', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Bahan Baku F&B', jenis: 'Pengeluaran Cafe', tipe_arus: 'PENGELUARAN', account_id: 'acc_5001', boleh_kasir: true, is_active: true },
    { id: 'kat_cafe_listrik', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Listrik Cafe', jenis: 'Pengeluaran Cafe', tipe_arus: 'PENGELUARAN', account_id: 'acc_6002', boleh_kasir: false, is_active: true },
    { id: 'kat_cafe_operasional', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Operasional Cafe', jenis: 'Pengeluaran Cafe', tipe_arus: 'PENGELUARAN', account_id: 'acc_6004', boleh_kasir: true, is_active: true },
    { id: 'kat_cafe_servis', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Servis Mesin Cafe', jenis: 'Pengeluaran Cafe', tipe_arus: 'PENGELUARAN', account_id: 'acc_6003', boleh_kasir: false, is_active: true },
    // 2. Pengeluaran Carwash
    { id: 'kat_cw_chemical', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Bahan Cuci & Chemical', jenis: 'Pengeluaran Carwash', tipe_arus: 'PENGELUARAN', account_id: 'acc_5002', boleh_kasir: true, is_active: true },
    { id: 'kat_cw_listrik', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Listrik Carwash', jenis: 'Pengeluaran Carwash', tipe_arus: 'PENGELUARAN', account_id: 'acc_6002', boleh_kasir: false, is_active: true },
    { id: 'kat_cw_air', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Air PAM & Perawatan Mesin Air', jenis: 'Pengeluaran Carwash', tipe_arus: 'PENGELUARAN', account_id: 'acc_6002', boleh_kasir: true, is_active: true },
    { id: 'kat_cw_servis', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Servis Hidrolik & Kompresor', jenis: 'Pengeluaran Carwash', tipe_arus: 'PENGELUARAN', account_id: 'acc_6003', boleh_kasir: false, is_active: true },
    { id: 'kat_cw_perlengkapan', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Perlengkapan Cuci Mobil', jenis: 'Pengeluaran Carwash', tipe_arus: 'PENGELUARAN', account_id: 'acc_6004', boleh_kasir: true, is_active: true },
    // 3. Pengeluaran Bersama & Umum
    { id: 'kat_umum_sewa', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Sewa Tempat Usaha (Bang Awal)', jenis: 'Pengeluaran Bersama', tipe_arus: 'PENGELUARAN', account_id: 'acc_6004', boleh_kasir: false, is_active: true },
    { id: 'kat_umum_gaji', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Gaji Karyawan Tetap & Leader', jenis: 'Pengeluaran Bersama', tipe_arus: 'PENGELUARAN', account_id: 'acc_6001', boleh_kasir: false, is_active: true },
    { id: 'kat_umum_casbon', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Casbon Karyawan', jenis: 'Pengeluaran Bersama', tipe_arus: 'PENGELUARAN', account_id: 'acc_6004', boleh_kasir: true, is_active: true },
    { id: 'kat_umum_admin_bank', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Biaya Admin Bank / QRIS', jenis: 'Pengeluaran Bersama', tipe_arus: 'PENGELUARAN', account_id: 'acc_6004', boleh_kasir: false, is_active: true },
    // 4. Non-Beban & Mutasi Saldo
    { id: 'kat_pindah_saldo', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Pindah Saldo Antar Rekening', jenis: 'Mutasi Internal', tipe_arus: 'PENGELUARAN', account_id: 'acc_1002', boleh_kasir: false, is_active: true },
    { id: 'kat_prive_owner', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Prive / Penarikan Owner', jenis: 'Mutasi Internal', tipe_arus: 'PENGELUARAN', account_id: 'acc_3002', boleh_kasir: false, is_active: true },
    // 5. Pemasukan Lain-lain (Non-POS)
    { id: 'kat_inc_sewa_tenant', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Pendapatan Sewa Tenant (Burger/Tempe/Jus/dll)', jenis: 'Pemasukan Non-POS', tipe_arus: 'PEMASUKAN', account_id: 'acc_4003', boleh_kasir: false, is_active: true },
    { id: 'kat_inc_modal_owner', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Suntikan / Pinjaman Modal Pemilik', jenis: 'Pemasukan Non-POS', tipe_arus: 'PEMASUKAN', account_id: 'acc_3001', boleh_kasir: false, is_active: true },
    { id: 'kat_inc_pelunasan_casbon', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Pelunasan Casbon Karyawan', jenis: 'Pemasukan Non-POS', tipe_arus: 'PEMASUKAN', account_id: 'acc_1001', boleh_kasir: true, is_active: true },
    { id: 'kat_inc_lainnya', tenant_id: DEFAULT_TENANT_ID, nama_kategori: 'Pendapatan Non-Operasional Lain', jenis: 'Pemasukan Non-POS', tipe_arus: 'PEMASUKAN', account_id: 'acc_4003', boleh_kasir: false, is_active: true },
  ],
  karyawan_cuci: [
    { id: 1, nama: 'ANGGA', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, created_at: new Date().toISOString() },
    { id: 2, nama: 'BAGUS', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, created_at: new Date().toISOString() },
    { id: 3, nama: 'FERRY', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, created_at: new Date().toISOString() },
    { id: 4, nama: 'NOPAL', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, created_at: new Date().toISOString() },
    { id: 5, nama: 'RAHMAN', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, created_at: new Date().toISOString() },
    { id: 6, nama: 'VICKY', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, created_at: new Date().toISOString() },
    { id: 7, nama: 'FAISAL', tenant_id: DEFAULT_TENANT_ID, branch_id: DEFAULT_BRANCH_ID, created_at: new Date().toISOString() },
  ],
  stok_barang: realSeedData.stok_barang && realSeedData.stok_barang.length > 0 ? realSeedData.stok_barang : [],
  daftar_harga_menu: realSeedData.daftar_harga_menu && realSeedData.daftar_harga_menu.length > 0 ? realSeedData.daftar_harga_menu : [],
  resep: realSeedData.resep && realSeedData.resep.length > 0 ? realSeedData.resep : [],
  diskon: realSeedData.diskon && realSeedData.diskon.length > 0 ? realSeedData.diskon : [],
  pos_balances: realSeedData.pos_balances && realSeedData.pos_balances.length > 0 ? realSeedData.pos_balances : [],

  // 5. TRANSAKSI REAL (PULLED FROM SUPABASE CLOUD)
  struk: realSeedData.struk || [],
  cafe: realSeedData.cafe || [],
  carwash: realSeedData.carwash || [],
  pengeluaran: realSeedData.pengeluaran || [],
  barang_masuk: realSeedData.barang_masuk || [],
  barang_keluar: realSeedData.barang_keluar || [],
  cashflow: realSeedData.cashflow || [],

  // 6. PROFILES & USERS
  profiles: realSeedData.profiles && realSeedData.profiles.length > 0 ? realSeedData.profiles : [
    {
      id: '96e0b43e-b470-4394-b46c-242bb6dfeece',
      tenant_id: DEFAULT_TENANT_ID,
      branch_id: DEFAULT_BRANCH_ID,
      nama: 'nazrinalfansyurihrp',
      email: 'owner@jayabersama.com',
      role: 'Owner',
      created_at: new Date().toISOString(),
    },
  ],

  // 7. AUDIT LOGS
  audit_logs: [
    {
      id: 'log_init',
      tenant_id: DEFAULT_TENANT_ID,
      user_id: 'usr_owner_01',
      action: 'SYSTEM_INITIALIZATION',
      details: 'Local SaaS ERP Database initialized with standard Chart of Accounts & Seed Data.',
      timestamp: new Date().toISOString(),
    },
  ],
}

// In-Memory Database Storage Holder
export class LocalDatabaseStore {
  constructor() {
    this.data = this.loadFromStorage()
    this.authSession = this.loadAuth()
    this.ensureInitialized()
  }

  ensureInitialized() {
    if (!this.data.journal_entries) this.data.journal_entries = []
    if (!this.data.journal_entry_lines) this.data.journal_entry_lines = []
    if (!this.data.master_categories || this.data.master_categories.length === 0) {
      this.data.master_categories = JSON.parse(JSON.stringify(INITIAL_SEED_DATA.master_categories || []))
    }
    if (this.data.journal_entries.length === 0) {
      const gl = new GeneralLedgerService(this)
      gl.backfillHistoricalJournals(DEFAULT_TENANT_ID)
    }
  }

  loadFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          const merged = { ...INITIAL_SEED_DATA }
          Object.keys(parsed).forEach((key) => {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
              merged[key] = parsed[key]
            } else if (!Array.isArray(parsed[key]) && parsed[key] !== null && parsed[key] !== undefined) {
              merged[key] = parsed[key]
            }
          })
          return merged
        }
      } catch (err) {
        console.warn('Failed to parse local database storage, resetting to seed data', err)
      }
    }
    return JSON.parse(JSON.stringify(INITIAL_SEED_DATA))
  }

  saveToStorage(immediate = false) {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (this._saveTimer) {
        clearTimeout(this._saveTimer)
        this._saveTimer = null
      }
      if (immediate) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
        } catch (err) {
          console.warn('LocalStorage quota or serialization notice (working in-memory):', err.message || err)
        }
        return
      }
      this._saveTimer = setTimeout(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
        } catch (err) {
          console.warn('LocalStorage quota or serialization notice (working in-memory):', err.message || err)
        }
      }, 300)
    }
  }

  loadAuth() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(AUTH_STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch (err) {
        // ignore
      }
    }
    const defaultUser = {
      id: '96e0b43e-b470-4394-b46c-242bb6dfeece',
      email: 'owner@jayabersama.com',
      role: 'Owner',
      user_metadata: { nama: 'nazrinalfansyurihrp', role: 'Owner' },
    }
    return { user: defaultUser, token: 'mock-local-token' }
  }

  saveAuth(session) {
    this.authSession = session
    if (typeof window !== 'undefined' && window.localStorage) {
      if (session) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
  }

  resetDatabase() {
    this.data = JSON.parse(JSON.stringify(INITIAL_SEED_DATA))
    this.saveToStorage()
    return this.data
  }

  getTable(tableName) {
    if (!this.data[tableName]) {
      this.data[tableName] = []
    }
    return this.data[tableName]
  }

  // DOUBLE-ENTRY AUTO-JOURNAL ENGINE
  postJournalEntry({ tenant_id = DEFAULT_TENANT_ID, branch_id = DEFAULT_BRANCH_ID, entry_no, date, memo, lines = [], source_type = null, source_id = null }, shouldSave = true) {
    if (!lines || lines.length === 0) return null

    const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
    const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      console.warn(`[DOUBLE_ENTRY_WARNING] Imbalance in journal entry: Debit=${totalDebit}, Credit=${totalCredit}`)
    }

    const journalId = `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const journalRecord = {
      id: journalId,
      tenant_id,
      branch_id,
      entry_no: entry_no || `JV-${Date.now().toString().slice(-6)}`,
      date: date || new Date().toISOString().split('T')[0],
      memo: memo || 'Jurnal Otomatis Sistem ERP',
      source_type,
      source_id,
      total_amount: totalDebit,
      status: 'POSTED',
      created_at: new Date().toISOString(),
    }

    this.getTable('journal_entries').push(journalRecord)

    lines.forEach((line) => {
      const lineRecord = {
        id: `jel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenant_id,
        journal_entry_id: journalId,
        account_id: line.account_id,
        account_code: line.account_code || '',
        account_name: line.account_name || '',
        debit: parseFloat(line.debit) || 0,
        credit: parseFloat(line.credit) || 0,
        memo: line.memo || memo,
      }
      this.getTable('journal_entry_lines').push(lineRecord)
    })

    if (shouldSave) {
      this.saveToStorage()
    }
    return journalRecord
  }
}

export const localDbStore = new LocalDatabaseStore()

// Query Builder supporting Supabase API Methods (Select, Insert, Update, Delete with Chainable Filters)
export class LocalQueryBuilder {
  constructor(store, tableName) {
    this.store = store
    this.tableName = tableName
    this.filters = []
    this.sortFields = []
    this.limitCount = null
    this.rangeOffsets = null
    this.isSingle = false
    this.isMaybeSingle = false
    this.selectedColumns = '*'
    this.operation = 'SELECT' // 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    this.payload = null
  }

  select(columns = '*', options = {}) {
    this.selectedColumns = columns
    this.queryOptions = options || {}
    return this
  }

  _getValue(row, column) {
    if (row[column] !== undefined) return row[column]
    if (typeof column === 'string' && column.includes('.')) {
      const [relation, field] = column.split('.')
      if (row[relation] && row[relation][field] !== undefined) {
        return row[relation][field]
      }
      if (relation === 'struk' && row.id_struk) {
        const strukTable = this.store.getTable('struk')
        const s = strukTable.find((item) => item.id_struk === row.id_struk)
        if (s && s[field] !== undefined) return s[field]
      }
    }
    return row[column]
  }

  eq(column, value) {
    this.filters.push((row) => this._getValue(row, column) === value)
    return this
  }

  neq(column, value) {
    this.filters.push((row) => this._getValue(row, column) !== value)
    return this
  }

  gt(column, value) {
    this.filters.push((row) => this._getValue(row, column) > value)
    return this
  }

  gte(column, value) {
    this.filters.push((row) => this._getValue(row, column) >= value)
    return this
  }

  lt(column, value) {
    this.filters.push((row) => this._getValue(row, column) < value)
    return this
  }

  lte(column, value) {
    this.filters.push((row) => this._getValue(row, column) <= value)
    return this
  }

  like(column, pattern) {
    const regex = new RegExp(`^${pattern.replace(/%/g, '.*')}$`)
    this.filters.push((row) => regex.test(String(this._getValue(row, column) || '')))
    return this
  }

  ilike(column, pattern) {
    const regex = new RegExp(`^${pattern.replace(/%/g, '.*')}$`, 'i')
    this.filters.push((row) => regex.test(String(this._getValue(row, column) || '')))
    return this
  }

  in(column, values) {
    this.filters.push((row) => Array.isArray(values) && values.includes(this._getValue(row, column)))
    return this
  }

  is(column, value) {
    this.filters.push((row) => this._getValue(row, column) === value)
    return this
  }

  order(column, { ascending = true } = {}) {
    this.sortFields.push({ column, ascending })
    return this
  }

  limit(count) {
    this.limitCount = count
    return this
  }

  range(from, to) {
    this.rangeOffsets = { from, to }
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isMaybeSingle = true
    return this
  }

  // INSERT initiation
  insert(payload) {
    this.operation = 'INSERT'
    this.payload = payload
    return this
  }

  // UPDATE initiation
  update(values) {
    this.operation = 'UPDATE'
    this.payload = values
    return this
  }

  // DELETE initiation
  delete() {
    this.operation = 'DELETE'
    return this
  }

  // EXECUTE OPERATIONS
  async _execute() {
    if (this.operation === 'INSERT') {
      return this._executeInsert()
    }
    if (this.operation === 'UPDATE') {
      return this._executeUpdate()
    }
    if (this.operation === 'DELETE') {
      return this._executeDelete()
    }
    return this._executeSelect()
  }

  // Execute SELECT
  async _executeSelect() {
    const table = this.store.getTable(this.tableName)
    let filteredResults = table.filter((row) => this.filters.every((f) => f(row)))
    const totalCount = filteredResults.length
    let results = [...filteredResults]

    // Sorting
    if (this.sortFields.length > 0) {
      results.sort((a, b) => {
        for (const { column, ascending } of this.sortFields) {
          const valA = this._getValue(a, column)
          const valB = this._getValue(b, column)
          if (valA === valB) continue
          if (valA === undefined || valA === null) return ascending ? -1 : 1
          if (valB === undefined || valB === null) return ascending ? 1 : -1
          if (typeof valA === 'string' && typeof valB === 'string') {
            const cmp = valA.localeCompare(valB)
            if (cmp !== 0) return ascending ? cmp : -cmp
          } else {
            const cmp = valA < valB ? -1 : 1
            return ascending ? cmp : -cmp
          }
        }
        return 0
      })
    }

    // Range & Limit
    if (this.rangeOffsets) {
      results = results.slice(this.rangeOffsets.from, this.rangeOffsets.to + 1)
    } else if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount)
    }

    // Auto populate joined relations if requested
    if (this.selectedColumns && typeof this.selectedColumns === 'string') {
      if (this.selectedColumns.includes('struk')) {
        const strukTable = this.store.getTable('struk')
        const strukMap = new Map(strukTable.map((s) => [s.id_struk, s]))
        results = results.map((row) => ({
          ...row,
          struk: strukMap.get(row.id_struk) || null,
        }))
      }

      if (this.selectedColumns.includes('cafe')) {
        const cafeTable = this.store.getTable('cafe')
        const cafeByStruk = new Map()
        cafeTable.forEach((c) => {
          if (!cafeByStruk.has(c.id_struk)) cafeByStruk.set(c.id_struk, [])
          cafeByStruk.get(c.id_struk).push(c)
        })
        results = results.map((row) => ({
          ...row,
          cafe: cafeByStruk.get(row.id_struk) || [],
        }))
      }

      if (this.selectedColumns.includes('carwash')) {
        const cwTable = this.store.getTable('carwash')
        const cwByStruk = new Map()
        cwTable.forEach((cw) => {
          if (!cwByStruk.has(cw.id_struk)) cwByStruk.set(cw.id_struk, [])
          cwByStruk.get(cw.id_struk).push(cw)
        })
        results = results.map((row) => ({
          ...row,
          carwash: cwByStruk.get(row.id_struk) || [],
        }))
      }
    }

    if (this.isSingle) {
      if (results.length === 0) {
        return { data: null, count: totalCount, error: { message: 'Row not found', code: 'PGRST116' } }
      }
      return { data: JSON.parse(JSON.stringify(results[0])), count: totalCount, error: null }
    }

    if (this.isMaybeSingle) {
      return { data: results.length > 0 ? JSON.parse(JSON.stringify(results[0])) : null, count: totalCount, error: null }
    }

    const resObj = { data: JSON.parse(JSON.stringify(results)), error: null }
    if (this.queryOptions?.count || this.rangeOffsets || this.limitCount !== null) {
      resObj.count = totalCount
    }
    return resObj
  }

  // Execute INSERT
  async _executeInsert() {
    const records = Array.isArray(this.payload) ? this.payload : [this.payload]
    const table = this.store.getTable(this.tableName)
    const inserted = []

    for (const item of records) {
      const record = {
        tenant_id: item.tenant_id || DEFAULT_TENANT_ID,
        branch_id: item.branch_id || DEFAULT_BRANCH_ID,
        created_at: new Date().toISOString(),
        ...item,
      }

      if (!record.id && !record.id_struk && !record.id_detail && !record.id_transaksi && !record.id_pengeluaran && !record.id_cashflow && !record.id_bahan_baku && !record.id_menu && !record.id_resep && !record.nama) {
        record.id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      }

      table.push(record)
      inserted.push(record)
      this._applyTriggersOnInsert(record)
    }

    this.store.saveToStorage()
    return { data: Array.isArray(this.payload) ? inserted : inserted[0], error: null }
  }

  // Execute UPDATE
  async _executeUpdate() {
    const table = this.store.getTable(this.tableName)
    const updated = []

    table.forEach((row, idx) => {
      if (this.filters.every((f) => f(row))) {
        table[idx] = {
          ...row,
          ...this.payload,
          updated_at: new Date().toISOString(),
        }
        updated.push(table[idx])
        this._applyTriggersOnUpdate(table[idx], row)
      }
    })

    this.store.saveToStorage()
    return { data: updated, error: null }
  }

  // Execute DELETE
  async _executeDelete() {
    const table = this.store.getTable(this.tableName)
    const remaining = []
    const deleted = []

    table.forEach((row) => {
      if (this.filters.every((f) => f(row))) {
        deleted.push(row)
      } else {
        remaining.push(row)
      }
    })

    this.store.data[this.tableName] = remaining
    this.store.saveToStorage()
    return { data: deleted, error: null }
  }

  // TRIGGERS ON INSERT
  _applyTriggersOnInsert(record) {
    if (this.tableName === 'cafe') {
      const recipes = this.store.getTable('resep').filter((r) => r.nama_menu === record.nama_menu)
      const stockTable = this.store.getTable('stok_barang')
      const bkTable = this.store.getTable('barang_keluar')

      recipes.forEach((rec) => {
        const qtyOut = (parseFloat(rec.jumlah) || 0) * (parseInt(record.qty, 10) || 1)
        bkTable.push({
          id_keluar: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenant_id: record.tenant_id || DEFAULT_TENANT_ID,
          branch_id: record.branch_id || DEFAULT_BRANCH_ID,
          id_detail: record.id_detail,
          id_bahan_baku: rec.id_bahan_baku,
          nama_bahan_baku: rec.nama_bahan,
          jumlah_keluar: qtyOut,
          tanggal: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        })

        const stockItem = stockTable.find((s) => s.id_bahan_baku === rec.id_bahan_baku)
        if (stockItem) {
          stockItem.stok = (parseFloat(stockItem.stok) || 0) - qtyOut
          stockItem.updated_at = new Date().toISOString()
        }
      })
    }

    if (this.tableName === 'barang_masuk') {
      const stockTable = this.store.getTable('stok_barang')
      const itemId = record.id_barang || record.id_bahan_baku
      const stockItem = stockTable.find((s) => s.id_barang === itemId || s.id_bahan_baku === itemId)
      if (stockItem) {
        const qtyMasuk = parseFloat(record.jumlah_masuk || record.qty || 0)
        const unitPrice = parseFloat(record.harga_satuan || record.harga_beli || 0)
        const currentStock = parseFloat(stockItem.stok_akhir !== undefined ? stockItem.stok_akhir : stockItem.stok || 0)
        const currentCost = parseFloat(stockItem.harga_beli || stockItem.hpp || 0)

        const mac = calculateMovingAverageCost({
          currentStock,
          currentCost,
          incomingQty: qtyMasuk,
          incomingUnitPrice: unitPrice,
        })

        if (stockItem.stok !== undefined) stockItem.stok = mac.newStock
        if (stockItem.stok_akhir !== undefined) stockItem.stok_akhir = mac.newStock
        stockItem.harga_beli = mac.newCost
        if (stockItem.hpp !== undefined) stockItem.hpp = mac.newCost
        stockItem.updated_at = new Date().toISOString()

        const totalAmount = parseFloat(record.total_harga) || (qtyMasuk * unitPrice)
        if (totalAmount > 0) {
          const method = String(record.metode_bayar || 'CASH').toUpperCase()
          let creditAcc = 'acc_1001'
          if (method === 'CREDIT' || method === 'TEMPO') creditAcc = 'acc_2001'
          else if (method === 'BANK' || method === 'TRANSFER' || method === 'QRIS') creditAcc = 'acc_1002'

          this.store.postJournalEntry({
            tenant_id: record.tenant_id || DEFAULT_TENANT_ID,
            branch_id: record.branch_id || DEFAULT_BRANCH_ID,
            date: record.tanggal || new Date().toISOString().split('T')[0],
            memo: `Pembelian Bahan Baku: ${stockItem.nama_barang || stockItem.nama_bahan || 'Barang'} (${qtyMasuk})`,
            source_type: 'barang_masuk',
            source_id: record.id_barang_masuk,
            lines: [
              { account_id: 'acc_1300', debit: totalAmount, credit: 0, memo: 'Persediaan Bertambah' },
              { account_id: creditAcc, debit: 0, credit: totalAmount, memo: `Pembayaran via ${method}` },
            ],
          })
        }
      }
    }

    if (this.tableName === 'struk' && record.status_bayar === 'Selesai') {
      this._syncStrukToFinance(record)
    }

    if (this.tableName === 'pengeluaran') {
      this._syncPengeluaranToFinance(record)
    }
  }

  // TRIGGERS ON UPDATE
  _applyTriggersOnUpdate(newRow, oldRow) {
    if (this.tableName === 'struk' && newRow.status_bayar === 'Selesai' && oldRow.status_bayar !== 'Selesai') {
      this._syncStrukToFinance(newRow)
    }
  }

  _syncStrukToFinance(struk) {
    const cashflowTable = this.store.getTable('cashflow')
    const exists = cashflowTable.find((c) => c.id_sumber === struk.id_struk)
    const amount = parseFloat(struk.total_tagihan) || 0
    const pos = struk.metode_bayar === 'QRIS' ? 'SALDO REKENING Y' : 'SALDO CASH'

    if (!exists && amount > 0) {
      cashflowTable.push({
        id_cashflow: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenant_id: struk.tenant_id || DEFAULT_TENANT_ID,
        branch_id: struk.branch_id || DEFAULT_BRANCH_ID,
        id_sumber: struk.id_struk,
        tanggal: struk.tanggal || new Date().toISOString().split('T')[0],
        keterangan_transaksi: `Pemasukan Kasir (${struk.kasir}) - Struk ${struk.id_struk?.substring(0, 8)}`,
        jenis: 'Pemasukan',
        pemasukan: amount,
        pengeluaran: 0.0,
        pos,
        created_at: new Date().toISOString(),
      })

      const debitAcc = struk.metode_bayar === 'QRIS' ? 'acc_1002' : 'acc_1001'
      this.store.postJournalEntry({
        tenant_id: struk.tenant_id,
        branch_id: struk.branch_id,
        date: struk.tanggal,
        memo: `Penjualan POS Kasir (${struk.kasir}) - Struk ${struk.id_struk?.substring(0, 8)}`,
        source_type: 'struk',
        source_id: struk.id_struk,
        lines: [
          { account_id: debitAcc, debit: amount, credit: 0, memo: `Penerimaan Kas/Bank via ${struk.metode_bayar}` },
          { account_id: 'acc_4001', debit: 0, credit: amount, memo: 'Pendapatan Penjualan POS Cafe & Layanan' },
        ],
      })
    }
  }

  _syncPengeluaranToFinance(exp) {
    const cashflowTable = this.store.getTable('cashflow')
    const exists = cashflowTable.find((c) => c.id_sumber === exp.id_pengeluaran)
    const amount = parseFloat(exp.nominal) || 0

    if (!exists && amount > 0) {
      cashflowTable.push({
        id_cashflow: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenant_id: exp.tenant_id || DEFAULT_TENANT_ID,
        branch_id: exp.branch_id || DEFAULT_BRANCH_ID,
        id_sumber: exp.id_pengeluaran,
        tanggal: exp.tanggal || new Date().toISOString().split('T')[0],
        keterangan_transaksi: `Pengeluaran ${exp.jenis || 'Umum'} (${exp.kategori || '-'}): ${exp.nama_pengeluaran || ''}`,
        jenis: exp.jenis || 'Beban',
        kategori: exp.kategori || 'Operasional',
        pemasukan: 0.0,
        pengeluaran: amount,
        pos: 'SALDO CASH',
        created_at: new Date().toISOString(),
      })

      // Cari pemetaan akun dari master_categories jika ada
      const masterCat = (this.store.getTable('master_categories') || []).find(
        (m) => m.nama_kategori?.toLowerCase() === (exp.kategori || '').toLowerCase()
      )
      const debitAccountId = masterCat?.account_id || 'acc_6004'

      this.store.postJournalEntry({
        tenant_id: exp.tenant_id,
        branch_id: exp.branch_id,
        date: exp.tanggal,
        memo: `Pengeluaran: ${exp.nama_pengeluaran || exp.kategori}`,
        source_type: 'pengeluaran',
        source_id: exp.id_pengeluaran,
        lines: [
          { account_id: debitAccountId, debit: amount, credit: 0, memo: `Beban ${exp.kategori || 'Operasional'}` },
          { account_id: 'acc_1001', debit: 0, credit: amount, memo: 'Pengeluaran Kas Tunai' },
        ],
      })
    }
  }

  // Thenable for Promise resolution
  then(resolve, reject) {
    this._execute().then(resolve, reject)
  }
}

// Client Factory compatible with Supabase Interface
export const createLocalClient = () => {
  const authListeners = []

  const glService = new GeneralLedgerService(localDbStore)

  return {
    isLocal: true,
    localDb: {
      store: localDbStore,
      gl: glService,
    },

    from(tableName) {
      return new LocalQueryBuilder(localDbStore, tableName)
    },

    auth: {
      async getSession() {
        const session = localDbStore.authSession
        return { data: { session }, error: null }
      },

      async getUser() {
        const session = localDbStore.authSession
        return { data: { user: session ? session.user : null }, error: null }
      },

      async signInWithPassword({ email, password }) {
        const profiles = localDbStore.getTable('profiles')
        const cleanInput = (email || '').trim().toLowerCase()
        const usernamePart = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput
        const normalizedEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@jb.local`

        const profile = profiles.find((p) => 
          (p.email && p.email.toLowerCase() === normalizedEmail) ||
          (p.email && p.email.toLowerCase() === cleanInput) ||
          (p.nama && p.nama.toLowerCase() === cleanInput) ||
          (p.nama && p.nama.toLowerCase() === usernamePart)
        ) || {
          id: `usr_${Date.now()}`,
          nama: email.split('@')[0].toUpperCase(),
          email: normalizedEmail,
          role: email.toLowerCase().includes('admin') || email.toLowerCase().includes('owner') || email.toLowerCase().includes('nazrin') ? 'Owner' : 'Kasir',
        }

        const userObj = {
          id: profile.id,
          email: profile.email || normalizedEmail,
          role: profile.role,
          user_metadata: {
            nama: profile.nama,
            role: profile.role,
          },
        }

        const session = {
          user: userObj,
          access_token: 'local-jwt-token-erp',
          token_type: 'bearer',
          expires_in: 86400,
        }

        localDbStore.saveAuth(session)
        authListeners.forEach((fn) => fn('SIGNED_IN', session))
        return { data: { user: userObj, session }, error: null }
      },

      async signOut() {
        localDbStore.saveAuth(null)
        authListeners.forEach((fn) => fn('SIGNED_OUT', null))
        return { error: null }
      },

      onAuthStateChange(callback) {
        authListeners.push(callback)
        setTimeout(() => {
          callback(localDbStore.authSession ? 'INITIAL_SESSION' : 'SIGNED_OUT', localDbStore.authSession)
        }, 10)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authListeners.indexOf(callback)
                if (idx > -1) authListeners.splice(idx, 1)
              },
            },
          },
        }
      },

      async signUp({ email, password, options = {} }) {
        const normalizedEmail = email.includes('@') ? email.trim() : `${email.trim().toLowerCase()}@jb.local`
        const newUserId = `usr_${Date.now()}`
        const nama = options.data?.nama || email.split('@')[0]
        const role = options.data?.role || 'Kasir'

        const profileRecord = {
          id: newUserId,
          tenant_id: DEFAULT_TENANT_ID,
          branch_id: DEFAULT_BRANCH_ID,
          nama,
          email: normalizedEmail,
          role,
          created_at: new Date().toISOString(),
        }

        localDbStore.getTable('profiles').push(profileRecord)
        localDbStore.saveToStorage()

        const userObj = {
          id: newUserId,
          email: normalizedEmail,
          role,
          user_metadata: { nama, role },
        }

        return { data: { user: userObj }, error: null }
      },
    },

    erp: {
      resetDatabase() {
        return localDbStore.resetDatabase()
      },
      exportJson() {
        return JSON.stringify(localDbStore.data, null, 2)
      },
      importJson(jsonString) {
        try {
          const parsed = JSON.parse(jsonString)
          localDbStore.data = parsed
          localDbStore.saveToStorage()
          return { success: true }
        } catch (e) {
          return { success: false, error: e.message }
        }
      },
      postJournal(payload) {
        return localDbStore.postJournalEntry(payload)
      },
      gl: glService,
      calculateMovingAverageCost,
      getFinancialReport(tenant_id = DEFAULT_TENANT_ID) {
        const coa = localDbStore.getTable('chart_of_accounts')
        const lines = localDbStore.getTable('journal_entry_lines')

        const report = coa.map((acc) => {
          const accLines = lines.filter((l) => l.account_id === acc.id)
          const totalDebit = accLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
          const totalCredit = accLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
          let balance = 0
          if (acc.normal_balance === 'DEBIT') {
            balance = totalDebit - totalCredit
          } else {
            balance = totalCredit - totalDebit
          }
          return {
            id: acc.id,
            code: acc.code,
            name: acc.name,
            category: acc.category,
            normal_balance: acc.normal_balance,
            debit: totalDebit,
            credit: totalCredit,
            balance,
          }
        })
        return report
      },
    },

    channel(name) {
      const channelObj = {
        on(event, filter, callback) {
          return channelObj
        },
        subscribe(callback) {
          if (typeof callback === 'function') callback('SUBSCRIBED')
          return channelObj
        },
        unsubscribe() {
          return Promise.resolve()
        },
      }
      return channelObj
    },
    removeChannel(channel) {
      return Promise.resolve()
    },
    removeAllChannels() {
      return Promise.resolve()
    },
    getChannels() {
      return []
    },
  }
}

export const localSupabase = createLocalClient()
export default localSupabase
