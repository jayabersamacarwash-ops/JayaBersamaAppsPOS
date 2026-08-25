import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Trash2,
  AlertCircle,
  CheckCircle,
  FileText,
  TrendingDown,
  Car
} from 'lucide-react'
import { formatRupiah, parseDateSafe } from '../utils/helpers'
import {
  validateExpenseForm,
  formatExpensePayload,
  validateIncomeForm,
  formatIncomePayload
} from '../utils/financeHelpers'

const fetchAllRows = async (table, select = '*') => {
  let allData = []
  let from = 0
  const step = 1000
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + step - 1)
    if (error || !data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < step) break
    from += step
  }
  return allData
}

const Finance = () => {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Custom Alert / Confirm Modal State
  const [customAlert, setCustomAlert] = useState(null)

  const showAlert = (message, title = 'Informasi') => {
    return new Promise((resolve) => {
      setCustomAlert({
        title,
        message,
        type: 'alert',
        onConfirm: () => {
          setCustomAlert(null)
          resolve(true)
        }
      })
    })
  }

  const showConfirm = (message, title = 'Konfirmasi') => {
    return new Promise((resolve) => {
      setCustomAlert({
        title,
        message,
        type: 'confirm',
        onConfirm: () => {
          setCustomAlert(null)
          resolve(true)
        },
        onCancel: () => {
          setCustomAlert(null)
          resolve(false)
        }
      })
    })
  }

  // Database Data
  const [cashflowLogs, setCashflowLogs] = useState([])
  const [stokBahan, setStokBahan] = useState([])

  // Modal / Form States
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    jenis: 'pengeluaran Cafe',
    kategori: 'Operasional',
    total_harga: 0,
    keterangan: '',
    pos: 'SALDO CASH'
  })

  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [incomeForm, setIncomeForm] = useState({
    nominal: '',
    keterangan: '',
    kategori: 'Pemasukan Lain-lain',
    pos: 'SALDO CASH'
  })
  
  // State khusus untuk Barang Masuk (Restok Bahan Baku) jika Kategori === 'Bahan Baku'
  const [barangMasukList, setBarangMasukList] = useState([])

  // ENUM Options
  const jenisOptions = ['pengeluaran Cafe', 'pengeluaran Carwash', 'Pengeluaran', 'Casbon']
  const kategoriOptions = ['Bahan Baku', 'Casbon', 'Operasional', 'Barang']
  const incomeKategoriOptions = ['Pemasukan Lain-lain', 'Modal Awal', 'Pemasukan Cafe', 'Pemasukan Carwash']
  const posOptions = ['SALDO CASH', 'SALDO REKENING Y', 'SALDO REKENING N']

  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    totalBalance: 0
  })

  // Carwash Finance Custom Metrics State
  const [cwFinanceMetricsRaw, setCwFinanceMetricsRaw] = useState({ rawCw: [], rawCf: [] })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toLocaleDateString('en-CA').substring(0, 7)
  })

  const fetchFinanceData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Finance Summary (bypasses 1000-row API limit)
      const { data: sumData, error: sumErr } = await supabase
        .from('finance_summary')
        .select('*')
        .single()

      if (sumErr) throw sumErr

      if (sumData) {
        setSummary({
          totalIncome: parseFloat(sumData.total_income) || 0,
          totalExpense: parseFloat(sumData.total_expense) || 0,
          totalBalance: parseFloat(sumData.total_balance) || 0
        })
      }

      // 2. Fetch Cashflow Logs (limited to 1000)
      const { data: cfData, error: cfErr } = await supabase
        .from('cashflow')
        .select('*')
        .order('tanggal', { ascending: false })
        .limit(1000)

      if (cfErr) throw cfErr

      // 3. Fetch Stok Bahan (untuk opsi dropdown restok)
      const { data: sbData, error: sbErr } = await supabase
        .from('stok_barang')
        .select('id_bahan_baku, nama_produk, satuan')

      if (sbErr) throw sbErr

      // Format cashflow data dari database tanpa fallback
      const formattedCashflow = cfData?.length ? cfData.map(item => ({
        id: item.id_cashflow,
        tanggal: item.tanggal,
        tipe: item.jenis,
        pos: item.pos,
        jumlah: parseFloat(item.pemasukan) > 0 ? parseFloat(item.pemasukan) : parseFloat(item.pengeluaran),
        isPemasukan: parseFloat(item.pemasukan) > 0,
        keterangan: item.keterangan_transaksi
      })) : []

      const formattedStok = sbData?.length ? sbData.map(b => ({
        nama_bahan: b.id_bahan_baku,
        nama_produk: b.nama_produk,
        satuan: b.satuan
      })) : []

      setCashflowLogs(formattedCashflow)
      setStokBahan(formattedStok)

      // 4. Fetch all carwash records to compute total cw revenue
      // 4. Fetch all carwash records to compute total cw revenue
      const cwData = await fetchAllRows('carwash', 'harga, status, tanggal')
      // 5. Fetch all cashflow records to compute metric deductions
      const allCfData = await fetchAllRows('cashflow', 'jenis, kategori, keterangan_transaksi, pengeluaran, tanggal')

      setCwFinanceMetricsRaw({
        rawCw: cwData || [],
        rawCf: allCfData || []
      })
    } catch (err) {
      console.error('Error fetching finance data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFinanceData()
  }, [])

  // Generate options for the last 12 months
  const monthOptions = useMemo(() => {
    const options = []
    const currentDate = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const value = d.toLocaleDateString('en-CA').substring(0, 7) // YYYY-MM
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }, [])

  // Memoized filtered metrics based on selectedMonth
  const filteredCwMetrics = useMemo(() => {
    const { rawCw, rawCf } = cwFinanceMetricsRaw

    // Filter carwash records for the selected month
    const filteredCw = (rawCw || []).filter(c => {
      if (!c.tanggal) return false
      return c.tanggal.startsWith(selectedMonth) && c.status === 'Selesai'
    })
    const totalCwRevenue = filteredCw.reduce((sum, c) => sum + (parseFloat(c.harga) || 0), 0)

    // Filter cashflow records for the selected month
    const filteredCf = (rawCf || []).filter(c => {
      if (!c.tanggal) return false
      return c.tanggal.startsWith(selectedMonth)
    })

    // A. Owner: 1/3 of total cw revenue - accumulated expenses with description "bang awal"
    const totalBangAwal = filteredCf
      .filter(c => parseFloat(c.pengeluaran || 0) > 0 && String(c.keterangan_transaksi || '').toLowerCase().includes('bang awal'))
      .reduce((sum, c) => sum + parseFloat(c.pengeluaran || 0), 0)
    const ownerMetric = (totalCwRevenue / 3) - totalBangAwal

    // B. Operasional: 1/3 of total cw revenue - accumulated expenses carwash saja, di luar gaji karyawan & casbon
    const totalCwExpNoWages = filteredCf
      .filter(c => {
        const isCw = String(c.jenis || '').toLowerCase().includes('carwash')
        const isExp = parseFloat(c.pengeluaran || 0) > 0
        const isWageOrCasbon = String(c.keterangan_transaksi || '').toLowerCase().includes('gaji') ||
                               String(c.keterangan_transaksi || '').toLowerCase().includes('wage') ||
                               String(c.keterangan_transaksi || '').toLowerCase().includes('pencuci') ||
                               String(c.keterangan_transaksi || '').toLowerCase().includes('casbon') ||
                               String(c.kategori || '').toLowerCase().includes('karyawan') ||
                               String(c.kategori || '').toLowerCase().includes('casbon') ||
                               String(c.jenis || '').toLowerCase().includes('casbon')
        return isCw && isExp && !isWageOrCasbon
      })
      .reduce((sum, c) => sum + parseFloat(c.pengeluaran || 0), 0)
    const operasionalMetric = (totalCwRevenue / 3) - totalCwExpNoWages

    // C. Gaji Karyawan Cuci: 1/3 of total cw revenue - expenses with description "gaji karyawan cuci"
    const totalWagesCw = filteredCf
      .filter(c => parseFloat(c.pengeluaran || 0) > 0 && String(c.keterangan_transaksi || '').toLowerCase().includes('gaji karyawan cuci'))
      .reduce((sum, c) => sum + parseFloat(c.pengeluaran || 0), 0)
    const gajiKaryawanMetric = (totalCwRevenue / 3) - totalWagesCw

    return {
      owner: ownerMetric,
      operasional: operasionalMetric,
      gajiKaryawan: gajiKaryawanMetric,
      totalCwRevenue
    }
  }, [cwFinanceMetricsRaw, selectedMonth])

  // Tambah item barang masuk (restok) di form
  const addBarangMasukItem = () => {
    const defaultBahan = stokBahan[0]?.nama_bahan || ''
    const defaultSatuan = stokBahan[0]?.satuan || 'Gram'
    setBarangMasukList(prev => [
      ...prev,
      { id_bahan_baku: defaultBahan, jumlah: 1, harga_satuan: 10000, satuan: defaultSatuan }
    ])
  }

  const removeBarangMasukItem = (index) => {
    setBarangMasukList(prev => prev.filter((_, i) => i !== index))
  }

  const updateBarangMasukItem = (index, field, value) => {
    setBarangMasukList(prev => 
      prev.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value }
          if (field === 'id_bahan_baku') {
            const match = stokBahan.find(b => b.nama_bahan === value)
            if (match) updated.satuan = match.satuan
          }
          return updated
        }
        return item
      })
    )
  }

  // Hitung total harga pengeluaran otomatis dari barang masuk jika Kategori === 'Bahan Baku'
  useEffect(() => {
    if (expenseForm.kategori === 'Bahan Baku' && barangMasukList.length > 0) {
      const computedTotal = barangMasukList.reduce((sum, item) => sum + (item.jumlah * item.harga_satuan), 0)
      setExpenseForm(prev => ({ ...prev, total_harga: computedTotal }))
    }
  }, [barangMasukList, expenseForm.kategori])

  // Submit Expense Handler
  // Submit Expense Handler
  const handleSaveExpense = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validation = validateExpenseForm(expenseForm, barangMasukList)
    if (!validation.isValid) {
      return setError(validation.error)
    }

    setSubmitting(true)
    try {
      const newCfId = generateUUID()
      const todayDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
      const timestamp = new Date().toISOString()

      const payload = formatExpensePayload({
        form: expenseForm,
        barangMasukList,
        stokBahan,
        newCfId,
        todayDate,
        timestamp
      })

      // 1. Simpan langsung ke tabel Cashflow
      const { error: cfErr } = await supabase
        .from('cashflow')
        .insert(payload.cashflow)

      if (cfErr) throw cfErr

      // 2. Simpan Detail Barang Masuk (Jika Bahan Baku)
      if (payload.details && payload.details.length > 0) {
        const { error: bmErr } = await supabase
          .from('barang_masuk')
          .insert(payload.details)

        if (bmErr) throw bmErr
      }

      setSuccess('Pengeluaran berhasil dicatat langsung ke Cashflow!')
      setExpenseForm({
        jenis: 'pengeluaran Cafe',
        kategori: 'Operasional',
        total_harga: 0,
        keterangan: '',
        pos: 'SALDO CASH'
      })
      setBarangMasukList([])
      setShowExpenseModal(false)
      await fetchFinanceData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving expense:', err)
      setError(err.message || 'Gagal menyimpan pengeluaran.')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Income Handler
  const handleSaveIncome = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validation = validateIncomeForm(incomeForm)
    if (!validation.isValid) {
      return setError(validation.error)
    }

    setSubmitting(true)
    try {
      const newCfId = generateUUID()
      const todayDate = new Date().toLocaleDateString('en-CA')
      const timestamp = new Date().toISOString()

      const payload = formatIncomePayload({
        form: incomeForm,
        newCfId,
        todayDate,
        timestamp
      })

      const { error: cfErr } = await supabase
        .from('cashflow')
        .insert(payload)

      if (cfErr) throw cfErr

      setSuccess('Pemasukan manual berhasil dicatat!')
      setIncomeForm({
        nominal: '',
        keterangan: '',
        kategori: 'Pemasukan Lain-lain',
        pos: 'SALDO CASH'
      })
      setShowIncomeModal(false)
      await fetchFinanceData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving income:', err)
      setError(err.message || 'Gagal menyimpan pemasukan.')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Cashflow Handler
  const handleDeleteCashflow = async (idCashflow) => {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus log cashflow ini secara permanen?', 'Hapus Cashflow')
    if (!confirmed) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      // Hapus log dari cashflow
      const { error: cfErr } = await supabase
        .from('cashflow')
        .delete()
        .eq('id_cashflow', idCashflow)

      if (cfErr) throw cfErr

      // Hapus juga detail restok dari barang_masuk jika ada yang mereferensikan id_cashflow ini
      await supabase
        .from('barang_masuk')
        .delete()
        .eq('id_cashflow', idCashflow)

      setSuccess('Log cashflow berhasil dihapus!')
      await fetchFinanceData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting cashflow:', err)
      setError(err.message || 'Gagal menghapus log cashflow.')
    } finally {
      setLoading(false)
    }
  }

  // Mengambil total dari summary state (agregasi database view)
  const totalBalance = summary.totalBalance
  const totalIncome = summary.totalIncome
  const totalExpense = summary.totalExpense


  return (
    <div className="p-6 pb-24 md:pb-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent flex items-center gap-3">
            <DollarSign size={32} className="text-brand-emerald" />
            Laporan Keuangan
          </h1>
          <p className="text-slate-400 text-sm mt-1">Kelola cashflow, pengeluaran, dan restok gudang</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowIncomeModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-emerald hover:bg-emerald-400 active:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-brand-emerald/25 transition-all text-sm"
          >
            <Plus size={16} />
            Catat Pemasukan (Income)
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-rose hover:bg-rose-500 active:bg-rose-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-brand-rose/25 transition-all text-sm"
          >
            <Plus size={16} />
            Catat Pengeluaran (Expense)
          </button>
        </div>
      </div>

      {/* Alert */}
      {success && (
        <div className="p-4 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald text-sm flex items-center gap-3">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Finance Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Saldo */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-slate-800/80">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Kas Bersih</p>
          <h3 className={`text-2xl font-black mt-2 ${totalBalance >= 0 ? 'text-brand-emerald' : 'text-rose-400'}`}>
            {formatRupiah(totalBalance)}
          </h3>
          <span className="text-[10px] text-slate-500 mt-2 block">Net dari seluruh pemasukan & pengeluaran</span>
        </div>

        {/* Pemasukan */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-slate-800/80">
          <div className="flex justify-between items-center">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Pemasukan</p>
            <ArrowUpRight size={16} className="text-brand-emerald" />
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">
            {formatRupiah(totalIncome)}
          </h3>
          <span className="text-[10px] text-slate-500 mt-2 block">Akumulasi struk berstatus Selesai</span>
        </div>

        {/* Pengeluaran */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-slate-800/80">
          <div className="flex justify-between items-center">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Pengeluaran</p>
            <ArrowDownRight size={16} className="text-brand-rose" />
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">
            {formatRupiah(totalExpense)}
          </h3>
          <span className="text-[10px] text-slate-500 mt-2 block">Operasional, bahan baku, & casbon</span>
        </div>
      </div>

      {/* Keuangan Carwash */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Car size={20} className="text-brand-emerald" />
              Keuangan Carwash
            </h2>
            <p className="text-slate-400 text-xs mt-1">Pembagian 1/3 total omzet carwash setelah dikurangi beban masing-masing segmen</p>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Bulan:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-brand-emerald cursor-pointer"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Owner */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-slate-800/80">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Owner</p>
            <h3 className={`text-2xl font-black mt-2 ${filteredCwMetrics.owner >= 0 ? 'text-brand-emerald' : 'text-rose-400'}`}>
              {formatRupiah(filteredCwMetrics.owner)}
            </h3>
            <span className="text-[10px] text-slate-500 mt-2 block">
              1/3 Omzet ({formatRupiah(filteredCwMetrics.totalCwRevenue / 3)}) - Pengeluaran "bang awal"
            </span>
          </div>

          {/* Operasional */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-slate-800/80">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Operasional</p>
            <h3 className={`text-2xl font-black mt-2 ${filteredCwMetrics.operasional >= 0 ? 'text-brand-emerald' : 'text-rose-400'}`}>
              {formatRupiah(filteredCwMetrics.operasional)}
            </h3>
            <span className="text-[10px] text-slate-500 mt-2 block">
              1/3 Omzet ({formatRupiah(filteredCwMetrics.totalCwRevenue / 3)}) - Operasional Murni
            </span>
          </div>

          {/* Gaji Karyawan Cuci */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-slate-800/80">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Gaji Karyawan Cuci</p>
            <h3 className={`text-2xl font-black mt-2 ${filteredCwMetrics.gajiKaryawan >= 0 ? 'text-brand-emerald' : 'text-rose-400'}`}>
              {formatRupiah(filteredCwMetrics.gajiKaryawan)}
            </h3>
            <span className="text-[10px] text-slate-500 mt-2 block">
              1/3 Omzet ({formatRupiah(filteredCwMetrics.totalCwRevenue / 3)}) - Gaji Karyawan Cuci
            </span>
          </div>
        </div>
      </div>

      {/* Cashflow Logs Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
        <h3 className="text-lg font-bold text-white mb-4">Log Transaksi Cashflow Lengkap</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm text-slate-300">
             <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="pb-3">Tanggal</th>
                <th className="pb-3">Tipe</th>
                <th className="pb-3">Keterangan</th>
                <th className="pb-3">POS Kas</th>
                <th className="pb-3 text-right">Jumlah</th>
                <th className="pb-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {cashflowLogs.map((log) => {
                const isPemasukan = log.isPemasukan
                return (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 text-xs text-slate-500">
                      {parseDateSafe(log.tanggal).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        isPemasukan ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-brand-rose/10 text-brand-rose'
                      }`}>
                        {log.tipe}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-200 font-medium">{log.keterangan}</td>
                    <td className="py-3.5">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {log.pos}
                      </span>
                    </td>
                    <td className={`py-3.5 text-right font-bold ${isPemasukan ? 'text-brand-emerald' : 'text-brand-rose'}`}>
                      {isPemasukan ? '+' : '-'} {formatRupiah(log.jumlah)}
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => handleDeleteCashflow(log.id)}
                        className="text-rose-500 hover:text-rose-450 font-bold px-2 py-1 text-xs"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Pengeluaran */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl shadow-2xl border border-slate-800 max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingDown className="text-brand-rose" />
                  Catat Pengeluaran Baru
                </h3>
                <button 
                  onClick={() => {
                    setShowExpenseModal(false)
                    setBarangMasukList([])
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSaveExpense} className="space-y-4 overflow-y-auto max-h-[50vh] pr-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Jenis Pengeluaran
                    </label>
                    <select
                      value={expenseForm.jenis}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, jenis: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                    >
                      {jenisOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Kategori
                    </label>
                    <select
                      value={expenseForm.kategori}
                      onChange={(e) => {
                        const newCat = e.target.value
                        setExpenseForm(prev => ({ 
                          ...prev, 
                          kategori: newCat,
                          total_harga: newCat === 'Bahan Baku' ? 0 : prev.total_harga
                        }))
                        if (newCat !== 'Bahan Baku') setBarangMasukList([])
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                    >
                      {kategoriOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      POS Kas
                    </label>
                    <select
                      value={expenseForm.pos}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, pos: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                    >
                      {posOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Keterangan
                  </label>
                  <textarea
                    placeholder="Beli sabun cuci mobil, bayar listrik cafe, casbon staff..."
                    value={expenseForm.keterangan}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, keterangan: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm h-20 placeholder-slate-600 focus:outline-none focus:border-brand-rose"
                  />
                </div>

                {expenseForm.kategori !== 'Bahan Baku' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Total Nominal (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={expenseForm.total_harga}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, total_harga: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-brand-rose"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Detail Restok Bahan Baku (Barang Masuk)
                      </span>
                      <button
                        type="button"
                        onClick={addBarangMasukItem}
                        className="px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue font-bold rounded-lg text-xs"
                      >
                        + Tambah Item
                      </button>
                    </div>

                    {barangMasukList.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        {/* Bahan Baku */}
                        <div className="flex-1 min-w-[120px]">
                          <select
                            value={item.id_bahan_baku}
                            onChange={(e) => updateBarangMasukItem(idx, 'id_bahan_baku', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-white text-xs"
                          >
                            {stokBahan.map(b => (
                              <option key={b.nama_bahan} value={b.nama_bahan}>{b.nama_bahan}</option>
                            ))}
                          </select>
                        </div>
                        {/* Qty */}
                        <div className="w-16">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.jumlah}
                            onChange={(e) => updateBarangMasukItem(idx, 'jumlah', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-white text-xs text-center"
                          />
                        </div>
                        {/* Satuan */}
                        <span className="text-[10px] text-slate-500 w-12 font-mono">{item.satuan}</span>
                        {/* Harga Satuan */}
                        <div className="flex-1 min-w-[80px]">
                          <input
                            type="number"
                            placeholder="Harga Satuan"
                            value={item.harga_satuan}
                            onChange={(e) => updateBarangMasukItem(idx, 'harga_satuan', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-white text-xs text-right"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBarangMasukItem(idx)}
                          className="text-rose-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    <div className="p-3 rounded-lg bg-brand-rose/5 border border-brand-rose/10 flex justify-between items-center text-xs font-bold mt-2">
                      <span className="text-slate-400">Total Biaya Restok</span>
                      <span className="text-brand-rose text-sm font-black">{formatRupiah(expenseForm.total_harga)}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowExpenseModal(false)
                  setBarangMasukList([])
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                onClick={handleSaveExpense}
                disabled={submitting}
                className="px-4 py-2 bg-brand-rose hover:bg-rose-500 active:bg-rose-600 text-slate-950 font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catat Pemasukan */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl shadow-2xl border border-slate-800 max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="text-brand-emerald" />
                  Catat Pemasukan Baru
                </h3>
                <button 
                  onClick={() => setShowIncomeModal(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSaveIncome} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Kategori Pemasukan
                    </label>
                    <select
                      value={incomeForm.kategori}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, kategori: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-brand-emerald"
                    >
                      {incomeKategoriOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      POS Kas Tujuan
                    </label>
                    <select
                      value={incomeForm.pos}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, pos: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-brand-emerald"
                    >
                      {posOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Setoran modal awal owner, pendapatan iklan..."
                    value={incomeForm.keterangan}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, keterangan: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-brand-emerald"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nominal Pemasukan (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={incomeForm.nominal}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, nominal: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm font-mono focus:outline-none focus:border-brand-emerald"
                  />
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setShowIncomeModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                onClick={handleSaveIncome}
                disabled={submitting}
                className="px-4 py-2 bg-brand-emerald hover:bg-emerald-400 active:bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM MODAL: Alert / Confirm */}
      {customAlert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-slate-800 shadow-[0_0_50px_rgba(16,185,129,0.08)] animate-pop-in text-center">
            <div className="mb-4">
              {customAlert.title === 'Sukses' ? (
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="text-emerald-400" size={24} />
                </div>
              ) : customAlert.title === 'Error' || customAlert.title === 'Hapus Cashflow' ? (
                <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center">
                  <AlertCircle className="text-rose-400" size={24} />
                </div>
              ) : (
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="text-amber-400" size={24} />
                </div>
              )}
            </div>
            
            <h4 className="text-base font-extrabold text-white mb-2">
              {customAlert.title}
            </h4>
            <p className="text-xs text-slate-350 leading-relaxed mb-6">
              {customAlert.message}
            </p>
            
            <div className="flex justify-center gap-3">
              {customAlert.type === 'confirm' && (
                <button
                  type="button"
                  onClick={customAlert.onCancel}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold rounded-xl text-xs transition-all w-24"
                >
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={customAlert.onConfirm}
                className={`px-4 py-2 active:scale-95 font-bold rounded-xl text-xs transition-all w-24 ${
                  customAlert.title === 'Error' || customAlert.title === 'Hapus Cashflow'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-brand-emerald hover:bg-emerald-500 text-slate-950'
                }`}
              >
                {customAlert.type === 'confirm' ? 'Ya' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Finance
