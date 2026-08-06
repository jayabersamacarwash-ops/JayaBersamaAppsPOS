import React, { useState, useEffect } from 'react'
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
  TrendingDown
} from 'lucide-react'

const Finance = () => {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
  })
  
  // State khusus untuk Barang Masuk (Restok Bahan Baku) jika Kategori === 'Bahan Baku'
  const [barangMasukList, setBarangMasukList] = useState([])

  // ENUM Options
  const jenisOptions = ['pengeluaran Cafe', 'pengeluaran Carwash', 'Pengeluaran', 'Casbon']
  const kategoriOptions = ['Bahan Baku', 'Casbon', 'Operasional', 'Barang']

  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    totalBalance: 0
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
    } catch (err) {
      console.error('Error fetching finance data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFinanceData()
  }, [])

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
  const handleSaveExpense = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const totalVal = parseFloat(expenseForm.total_harga)
    if (isNaN(totalVal) || totalVal <= 0) {
      return setError('Total harga pengeluaran harus lebih besar dari 0.')
    }
    if (expenseForm.kategori === 'Bahan Baku' && barangMasukList.length === 0) {
      return setError('Daftar barang masuk/restok wajib diisi untuk kategori Bahan Baku.')
    }

    setSubmitting(true)
    try {
      const newExpId = self.crypto.randomUUID()
      const todayDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
      const currentTime = new Date().toTimeString().split(' ')[0] // HH:MM:SS

      const isBahanBaku = expenseForm.kategori === 'Bahan Baku' && barangMasukList.length > 0
      const firstBaku = isBahanBaku ? barangMasukList[0] : null

      // 1. Simpan Pengeluaran
      const { error: expErr } = await supabase
        .from('pengeluaran')
        .insert({
          id_pengeluaran: newExpId,
          tanggal: todayDate,
          jam: currentTime,
          jenis: expenseForm.jenis,
          kategori: expenseForm.kategori,
          nominal: totalVal,
          nama_pengeluaran: expenseForm.keterangan,
          apakah_stok: isBahanBaku ? 'Ya' : 'Tidak',
          id_bahan_baku: firstBaku ? firstBaku.id_bahan_baku : '',
          qty: firstBaku ? parseFloat(firstBaku.jumlah) : 0
        })

      if (expErr) throw expErr

      // 2. Simpan Detail Barang Masuk (Jika Bahan Baku)
      if (isBahanBaku) {
        const insertDetails = barangMasukList.map(item => {
          const matchingBahan = stokBahan.find(b => b.nama_bahan === item.id_bahan_baku)
          return {
            id_masuk: self.crypto.randomUUID(),
            id_pengeluaran: newExpId,
            id_bahan_baku: item.id_bahan_baku,
            tanggal: todayDate,
            nama_produk: matchingBahan ? (matchingBahan.nama_produk || matchingBahan.nama_bahan) : item.id_bahan_baku,
            jumlah_masuk: parseFloat(item.jumlah),
            harga_satuan: parseFloat(item.harga_satuan)
          }
        })

        const { error: bmErr } = await supabase
          .from('barang_masuk')
          .insert(insertDetails)

        if (bmErr) throw bmErr
      }

      setSuccess('Pengeluaran berhasil dicatat dan stok telah diperbarui!')
      setExpenseForm({
        jenis: 'pengeluaran Cafe',
        kategori: 'Operasional',
        total_harga: 0,
        keterangan: '',
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

  // Mengambil total dari summary state (agregasi database view)
  const totalBalance = summary.totalBalance
  const totalIncome = summary.totalIncome
  const totalExpense = summary.totalExpense

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val)
  }

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return new Date()
    if (dateStr instanceof Date) return dateStr

    const str = String(dateStr).trim()
    if (str.includes('T')) {
      const d = new Date(str)
      if (!isNaN(d.getTime())) return d
    }

    const parts = str.split(/[\sT]+/)
    const datePart = parts[0]
    const timePart = parts[1] || '00:00:00'

    const dateSplit = datePart.split(/[-/]/)
    if (dateSplit.length === 3) {
      let day, month, year
      if (dateSplit[0].length === 4) {
        year = parseInt(dateSplit[0], 10)
        month = parseInt(dateSplit[1], 10) - 1
        day = parseInt(dateSplit[2], 10)
      } else {
        day = parseInt(dateSplit[0], 10)
        month = parseInt(dateSplit[1], 10) - 1
        year = parseInt(dateSplit[2], 10)

        if (month > 11) {
          const temp = month
          month = day - 1
          day = temp + 1
        }
      }

      const timeSplit = timePart.replace(/\./g, ':').split(':')
      const hour = parseInt(timeSplit[0], 10) || 0
      const minute = parseInt(timeSplit[1], 10) || 0
      const second = parseInt(timeSplit[2], 10) || 0

      return new Date(year, month, day, hour, minute, second)
    }

    const finalFallback = new Date(str)
    return isNaN(finalFallback.getTime()) ? new Date() : finalFallback
  }

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
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-rose hover:bg-rose-500 active:bg-rose-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-brand-rose/25 transition-all text-sm"
        >
          <Plus size={16} />
          Catat Pengeluaran (Expense)
        </button>
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
                <div className="grid grid-cols-2 gap-4">
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
    </div>
  )
}

export default Finance
