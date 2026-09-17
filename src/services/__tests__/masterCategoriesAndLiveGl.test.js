import { describe, it, expect } from 'vitest'
import {
  DEFAULT_MASTER_CATEGORIES,
  JENIS_GROUPS,
  filterCategoriesByRole
} from '../../constants/masterCategories.js'
import { createLiveGlService, STANDARD_COA } from '../generalLedgerService.js'

describe('Master Categories & Live General Ledger Service Tests', () => {
  describe('1. Master Categories Structure & Role Access', () => {
    it('TC_01: should have valid categories with non-empty attributes', () => {
      expect(DEFAULT_MASTER_CATEGORIES.length).toBeGreaterThanOrEqual(15)
      DEFAULT_MASTER_CATEGORIES.forEach(cat => {
        expect(cat.id).toBeDefined()
        expect(cat.nama_kategori).toBeTruthy()
        expect(cat.jenis).toBeTruthy()
        expect(['PENGELUARAN', 'PEMASUKAN']).toContain(cat.tipe_arus)
        expect(cat.account_id).toMatch(/^acc_\d{4}$/)
        expect(typeof cat.boleh_kasir).toBe('boolean')
      })
    })

    it('TC_02: should filter categories strictly for Kasir role', () => {
      const kasirExpenses = filterCategoriesByRole(DEFAULT_MASTER_CATEGORIES, 'Kasir', 'PENGELUARAN')
      kasirExpenses.forEach(c => {
        expect(c.boleh_kasir).toBe(true)
      })

      // Prive, Sewa Bang Awal, Gaji Tetap should NOT be visible to kasir
      const priveCat = kasirExpenses.find(c => c.nama_kategori.toLowerCase().includes('prive'))
      expect(priveCat).toBeUndefined()

      const sewaCat = kasirExpenses.find(c => c.nama_kategori.toLowerCase().includes('sewa tempat usaha'))
      expect(sewaCat).toBeUndefined()
    })

    it('TC_03: should allow all categories for Owner/SuperAdmin', () => {
      const ownerExpenses = filterCategoriesByRole(DEFAULT_MASTER_CATEGORIES, 'Owner', 'PENGELUARAN')
      expect(ownerExpenses.length).toBe(DEFAULT_MASTER_CATEGORIES.filter(c => c.tipe_arus === 'PENGELUARAN').length)

      const priveCat = ownerExpenses.find(c => c.nama_kategori.toLowerCase().includes('prive'))
      expect(priveCat).toBeDefined()
    })
  })

  describe('2. Live General Ledger Hydration & Balance Invariant', () => {
    it('TC_04: should generate perfectly balanced Trial Balance from live Supabase streams', () => {
      const mockCashflow = [
        {
          id_cashflow: 'cf_1',
          tanggal: '2026-09-17',
          jenis: 'Pemasukan',
          kategori: 'Pendapatan Sewa Tenant (Burger, Jus, Angkringan, Tempe)',
          pemasukan: 1500000,
          pengeluaran: 0,
          pos: 'SALDO CASH',
          keterangan_transaksi: 'Sewa Tenant Burger September',
        },
        {
          id_cashflow: 'cf_2',
          tanggal: '2026-09-17',
          jenis: 'Pengeluaran',
          kategori: 'Bahan Baku F&B (Kopi, Susu, Sirup, Es, Cup, Makanan)',
          pemasukan: 0,
          pengeluaran: 450000,
          pos: 'SALDO CASH',
          keterangan_transaksi: 'Beli Susu & Biji Kopi',
        },
        {
          id_cashflow: 'cf_3',
          tanggal: '2026-09-17',
          jenis: 'Pindah Saldo',
          kategori: 'Pindah Saldo Antar Rekening (Kas -> Bank, dsb.)',
          pemasukan: 0,
          pengeluaran: 500000,
          pos: 'SALDO CASH',
          keterangan_transaksi: 'Setor Kas ke Bank Rekening Y',
        }
      ]

      const gl = createLiveGlService({
        cashflow: mockCashflow,
        barangMasuk: [],
        posBalances: [],
        masterCategories: DEFAULT_MASTER_CATEGORIES,
      })

      const tb = gl.getTrialBalance()
      expect(tb.is_balanced).toBe(true)
      expect(tb.difference).toBe(0)
      expect(tb.total_debit).toBe(tb.total_credit)

      const bs = gl.getBalanceSheet()
      expect(bs.is_balanced).toBe(true)

      const is = gl.getIncomeStatement()
      expect(is.total_revenue).toBe(1500000)
      expect(is.total_cogs).toBe(450000)
      expect(is.gross_profit).toBe(1050000)
      expect(is.net_profit).toBe(1050000)
    })
  })
})
