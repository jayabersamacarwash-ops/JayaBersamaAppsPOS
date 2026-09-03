import { describe, it, expect } from 'vitest'
import {
  validateExpenseForm,
  formatExpensePayload,
  validateIncomeForm,
  formatIncomePayload,
  validatePosExpenseForm,
  formatPosExpensePayload,
  validateEditCashflowForm,
  generateCSVString,
  isPindahSaldo
} from '../financeHelpers'

describe('Finance Helpers', () => {
  describe('Expense Form Validation & Formatting', () => {
    it('should fail validation if total price is invalid or <= 0', () => {
      const form = { total_harga: 0, kategori: 'Operasional', keterangan: 'Beli ATK' }
      const res = validateExpenseForm(form, [])
      expect(res.isValid).toBe(false)
      expect(res.error).toBe('Total harga pengeluaran harus lebih besar dari 0.')
    })

    it('should fail validation if category is Bahan Baku but barang masuk list is empty', () => {
      const form = { total_harga: 50000, kategori: 'Bahan Baku', keterangan: 'Restok Kopi' }
      const res = validateExpenseForm(form, [])
      expect(res.isValid).toBe(false)
      expect(res.error).toBe('Daftar barang masuk/restok wajib diisi untuk kategori Bahan Baku.')
    })

    it('should pass validation if inputs are valid', () => {
      const form = { total_harga: 50000, kategori: 'Bahan Baku', keterangan: 'Restok Kopi' }
      const barangMasukList = [{ id_bahan_baku: 'kopi-arabika', jumlah: 5, harga_satuan: 10000 }]
      const res = validateExpenseForm(form, barangMasukList)
      expect(res.isValid).toBe(true)
    })

    it('should format expense payload correctly for non-Bahan Baku', () => {
      const form = {
        total_harga: 30000,
        kategori: 'Operasional',
        keterangan: 'Bayar Wifi',
        jenis: 'pengeluaran Cafe',
        pos: 'SALDO CASH'
      }

      const payload = formatExpensePayload({
        form,
        barangMasukList: [],
        stokBahan: [],
        newCfId: 'cf-id-123',
        todayDate: '2026-08-06',
        timestamp: '2026-08-06T15:22:00.000Z'
      })

      expect(payload.cashflow).toEqual({
        id_cashflow: 'cf-id-123',
        id_sumber: null,
        tanggal: '2026-08-06',
        keterangan_transaksi: 'Bayar Wifi',
        jenis: 'pengeluaran Cafe',
        kategori: 'Operasional',
        pemasukan: 0,
        pengeluaran: 30000,
        pos: 'SALDO CASH',
        apakah_stok: 'Tidak',
        qty: 0,
        created_at: '2026-08-06T15:22:00.000Z'
      })
      expect(payload.details).toEqual([])
    })

    it('should format expense payload and details correctly for Bahan Baku', () => {
      const form = {
        total_harga: 50000,
        kategori: 'Bahan Baku',
        keterangan: 'Restok Bahan',
        jenis: 'pengeluaran Cafe',
        pos: 'SALDO CASH'
      }

      const barangMasukList = [
        { id_bahan_baku: 'B001', jumlah: 2, harga_satuan: 15000 },
        { id_bahan_baku: 'B002', jumlah: 1, harga_satuan: 20000 }
      ]

      const stokBahan = [
        { nama_bahan: 'B001', nama_produk: 'Kopi Arabika' },
        { nama_bahan: 'B002', nama_produk: 'Susu UHT' }
      ]

      const payload = formatExpensePayload({
        form,
        barangMasukList,
        stokBahan,
        newCfId: 'cf-id-456',
        todayDate: '2026-08-06',
        timestamp: '2026-08-06T15:22:00.000Z'
      })

      expect(payload.cashflow.apakah_stok).toBe('Ya')
      expect(payload.cashflow.qty).toBe(3) // 2 + 1
      expect(payload.details.length).toBe(2)

      expect(payload.details[0]).toEqual({
        id_masuk: expect.any(String),
        id_pengeluaran: null,
        id_cashflow: 'cf-id-456',
        id_bahan_baku: 'B001',
        tanggal: '2026-08-06',
        nama_produk: 'Kopi Arabika',
        jumlah_masuk: 2,
        harga_satuan: 15000
      })
    })
  })

  describe('Income Form Validation & Formatting', () => {
    it('should fail validation if keterangan is empty', () => {
      const form = { keterangan: ' ', nominal: 10000 }
      const res = validateIncomeForm(form)
      expect(res.isValid).toBe(false)
      expect(res.error).toBe('Keterangan pemasukan wajib diisi.')
    })

    it('should fail validation if nominal is invalid or <= 0', () => {
      const form = { keterangan: 'Sponsor', nominal: 0 }
      const res = validateIncomeForm(form)
      expect(res.isValid).toBe(false)
      expect(res.error).toBe('Nominal pemasukan harus lebih besar dari 0.')
    })

    it('should pass validation and format payload correctly', () => {
      const form = {
        keterangan: 'Bunga Bank',
        nominal: 15000,
        kategori: 'Pemasukan Lain-lain',
        pos: 'SALDO REKENING Y'
      }

      const res = validateIncomeForm(form)
      expect(res.isValid).toBe(true)

      const payload = formatIncomePayload({
        form,
        newCfId: 'cf-income-1',
        todayDate: '2026-08-06',
        timestamp: '2026-08-06T15:22:00.000Z'
      })

      expect(payload).toEqual({
        id_cashflow: 'cf-income-1',
        id_sumber: null,
        tanggal: '2026-08-06',
        keterangan_transaksi: 'Bunga Bank',
        jenis: 'Pemasukan',
        kategori: 'Pemasukan Lain-lain',
        pemasukan: 15000,
        pengeluaran: 0,
        pos: 'SALDO REKENING Y',
        created_at: '2026-08-06T15:22:00.000Z'
      })
    })
  })

  describe('POS Expense Validation & Formatting', () => {
    it('should validate POS expense form fields correctly', () => {
      expect(validatePosExpenseForm({ keterangan: '', nominal: 10 }).isValid).toBe(false)
      expect(validatePosExpenseForm({ keterangan: 'Beli Sabun', nominal: 0 }).isValid).toBe(false)
      expect(validatePosExpenseForm({ keterangan: 'Beli Sabun', nominal: 15000 }).isValid).toBe(true)
    })

    it('should format POS expense payload correctly', () => {
      const form = {
        keterangan: 'Beli Sabun Cuci',
        nominal: '25000',
        unit: 'Carwash',
        kategori: 'Operasional'
      }

      const payload = formatPosExpensePayload({
        form,
        todayDate: '2026-08-06',
        currentTime: '15:22:00',
        newExpId: 'exp-pos-1'
      })

      expect(payload).toEqual({
        id_pengeluaran: 'exp-pos-1',
        tanggal: '2026-08-06',
        jam: '15:22:00',
        jenis: 'pengeluaran Carwash',
        kategori: 'Operasional',
        nominal: 25000,
        nama_pengeluaran: 'Beli Sabun Cuci',
        apakah_stok: 'Tidak',
        id_bahan_baku: '',
        qty: 0
      })
    })
  })

  describe('Edit Cashflow Validation', () => {
    it('should validate edit cashflow form correctly', () => {
      expect(validateEditCashflowForm({ keterangan_transaksi: '', pemasukan: 1000 }).isValid).toBe(false)
      expect(validateEditCashflowForm({ keterangan_transaksi: 'Valid', pemasukan: 0, pengeluaran: 0 }).isValid).toBe(false)
      expect(validateEditCashflowForm({ keterangan_transaksi: 'Valid', pemasukan: 50000, pengeluaran: 0 }).isValid).toBe(true)
      expect(validateEditCashflowForm({ keterangan_transaksi: 'Valid', pemasukan: 0, pengeluaran: 25000 }).isValid).toBe(true)
    })
  })

  describe('CSV Generation Helper', () => {
    it('should generate properly escaped CSV with UTF-8 BOM', () => {
      const headers = [
        { label: 'Tanggal', key: 'tanggal' },
        { label: 'Keterangan', key: 'keterangan' },
        { label: 'Nominal', key: 'nominal' }
      ]

      const rows = [
        { tanggal: '2026-08-01', keterangan: 'Beli "Kopi" & Teh', nominal: 25000 },
        { tanggal: '2026-08-02', keterangan: 'Cuci Mobil, Paket Lengkap', nominal: 50000 }
      ]

      const csv = generateCSVString(headers, rows)
      expect(csv.startsWith('\uFEFF')).toBe(true)
      expect(csv).toContain('"Tanggal","Keterangan","Nominal"')
      expect(csv).toContain('"2026-08-01","Beli ""Kopi"" & Teh","25000"')
      expect(csv).toContain('"2026-08-02","Cuci Mobil, Paket Lengkap","50000"')
    })
  })

  describe('isPindahSaldo Helper', () => {
    it('should accurately detect internal account transfers (pindah saldo)', () => {
      expect(isPindahSaldo({ jenis: 'Pindah', kategori: 'Pindah', keterangan_transaksi: 'Pindah Saldo' })).toBe(true)
      expect(isPindahSaldo({ jenis: 'pindah', kategori: 'Transfer', keterangan_transaksi: 'Setor Kas ke Bank' })).toBe(true)
      expect(isPindahSaldo({ jenis: 'Pengeluaran', kategori: 'Operasional', keterangan_transaksi: 'Pindah Saldo Kas ke Rekening' })).toBe(true)
      expect(isPindahSaldo({ jenis: 'Pemasukan', kategori: 'Pemasukan Lain-lain', keterangan_transaksi: 'Mutasi Saldo Rekening Y' })).toBe(true)
    })

    it('should return false for real income or expenses', () => {
      expect(isPindahSaldo({ jenis: 'Pemasukan Cafe', kategori: 'Penjualan', keterangan_transaksi: 'Penjualan F&B' })).toBe(false)
      expect(isPindahSaldo({ jenis: 'pengeluaran Carwash', kategori: 'Operasional', keterangan_transaksi: 'Beli Sabun Cuci' })).toBe(false)
      expect(isPindahSaldo({ jenis: 'Casbon', kategori: 'Casbon', keterangan_transaksi: 'Casbon Staff' })).toBe(false)
      expect(isPindahSaldo(null)).toBe(false)
    })
  })
})

