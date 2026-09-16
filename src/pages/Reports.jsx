import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import {
  FileText,
  Printer,
  Calendar,
  RefreshCw,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building,
  CheckCircle2,
  Scale
} from 'lucide-react'
import InteractiveCalendar from '../components/InteractiveCalendar'
import { formatRupiah, parseDateSafe } from '../utils/helpers'
import GeneralLedgerView from '../components/reports/GeneralLedgerView'
import { DEFAULT_TENANT_ID } from '../constants/erpConfig.js'

const fetchAllRows = async (table, select = '*', dateColumn = null, start = null, end = null) => {
  let allData = []
  let from = 0
  const step = 1000
  while (true) {
    let query = supabase.from(table).select(select)
    if (dateColumn && start) {
      query = query.gte(dateColumn, start)
    }
    if (dateColumn && end) {
      const safeEnd = end.length <= 10 ? `${end}T23:59:59.999Z` : end
      query = query.lte(dateColumn, safeEnd)
    }
    const { data, error } = await query.range(from, from + step - 1)
    if (error || !data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < step) break
    from += step
  }
  return allData
}

const fetchCafeRows = async (start = null, end = null) => {
  let allData = []
  let from = 0
  const step = 1000
  while (true) {
    let query = supabase.from('cafe').select('*, struk!inner(tanggal)')
    if (start) {
      query = query.gte('struk.tanggal', start)
    }
    if (end) {
      query = query.lte('struk.tanggal', end)
    }
    const { data, error } = await query.range(from, from + step - 1)
    if (error || !data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < step) break
    from += step
  }
  return allData
}

const Reports = () => {
  const [reportViewMode, setReportViewMode] = useState('general_ledger') // 'general_ledger' | 'operational'
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month') // 'today', 'month', 'custom', 'all'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCustomCalendar, setShowCustomCalendar] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [strukList, setStrukList] = useState([])
  const [carwashList, setCarwashList] = useState([])
  const [cafeList, setCafeList] = useState([])
  const [cashflowLogs, setCashflowLogs] = useState([])
  const [posBalances, setPosBalances] = useState({ cash: 0, rekY: 0, rekN: 0, rekR: 0 })

  const fetchReportsData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      let filterStart = null
      let filterEnd = null

      if (timeRange !== 'all') {
        const now = new Date()
        if (timeRange === 'today') {
          filterStart = now.toLocaleDateString('en-CA')
          filterEnd = filterStart
        } else if (timeRange === 'month') {
          const y = now.getFullYear()
          const m = String(now.getMonth() + 1).padStart(2, '0')
          filterStart = `${y}-${m}-01`
          const lastDay = new Date(y, now.getMonth() + 1, 0)
          filterEnd = lastDay.toLocaleDateString('en-CA')
        } else if (timeRange === 'custom' && startDate && endDate) {
          filterStart = startDate
          filterEnd = endDate
        }
      }

      const [dbStruk, dbCw, dbCafe, dbCf] = await Promise.all([
        fetchAllRows('struk', '*', 'tanggal', filterStart, filterEnd),
        fetchAllRows('carwash', '*', 'tanggal', filterStart, filterEnd),
        fetchCafeRows(filterStart, filterEnd),
        fetchAllRows('cashflow', '*', 'tanggal', filterStart, filterEnd)
      ])

      const { data: dbBal, error: balErr } = await supabase
        .from('pos_balances')
        .select('*')

      if (balErr) throw balErr

      let cash = 0, rekY = 0, rekN = 0, rekR = 0
      if (dbBal) {
        dbBal.forEach(item => {
          const bal = parseFloat(item.balance) || 0
          if (item.pos === 'SALDO CASH') cash = bal
          else if (item.pos === 'SALDO REKENING Y') rekY = bal
          else if (item.pos === 'SALDO REKENING N') rekN = bal
          else if (item.pos === 'SALDO REKENING R') rekR = bal
        })
      }

      setStrukList(dbStruk || [])
      setCarwashList(dbCw || [])
      setCafeList(dbCafe || [])
      setCashflowLogs(dbCf || [])
      setPosBalances({ cash, rekY, rekN, rekR })

    } catch (err) {
      console.error('Error fetching reports data:', err)
      setErrorMsg(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (timeRange === 'custom' && (!startDate || !endDate)) return
    fetchReportsData()
  }, [timeRange, startDate, endDate])

  const isDateInRange = useCallback((dateStr) => {
    if (!dateStr) return false
    const todayDate = new Date().toLocaleDateString('en-CA')
    if (timeRange === 'today') {
      return String(dateStr).startsWith(todayDate)
    }
    if (timeRange === 'month') {
      const now = new Date()
      const startVal = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime()
      const endVal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime()
      const currentDayVal = parseDateSafe(dateStr).getTime()
      return currentDayVal >= startVal && currentDayVal <= endVal
    }
    if (timeRange === 'custom') {
      const currentVal = parseDateSafe(dateStr).getTime()
      let startVal = 0
      if (startDate) {
        const sParts = startDate.split('-')
        startVal = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10), 0, 0, 0).getTime()
      }
      let endVal = Infinity
      if (endDate) {
        const eParts = endDate.split('-')
        endVal = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10), 23, 59, 59).getTime()
      }
      return currentVal >= startVal && currentVal <= endVal
    }
    return true
  }, [timeRange, startDate, endDate])

  const filteredStrukByTime = useMemo(() => {
    let list = strukList
    if (timeRange !== 'all') {
      list = strukList.filter(s => isDateInRange(s.tanggal))
    }
    return list.filter(s => {
      const ket = String(s.keterangan || '').toLowerCase()
      return !ket.includes('kalibrasi') && !ket.includes('test') && s.status_bayar !== 'Batal'
    })
  }, [strukList, isDateInRange, timeRange])

  const filteredCarwashList = useMemo(() => {
    let list = carwashList
    if (timeRange !== 'all') {
      list = carwashList.filter(cw => isDateInRange(cw.tanggal))
    }
    return list.filter(cw => {
      const parentStruk = strukList.find(s => s.id_struk === cw.id_struk)
      if (parentStruk) {
        const ket = String(parentStruk.keterangan || '').toLowerCase()
        if (ket.includes('kalibrasi') || ket.includes('test') || parentStruk.status_bayar === 'Batal') {
          return false
        }
      }
      return cw.status !== 'Batal' && cw.status !== 'Cancelled' && parseFloat(cw.harga || 0) > 0
    })
  }, [carwashList, strukList, isDateInRange, timeRange])

  const filteredCafeList = useMemo(() => {
    let list = cafeList
    if (timeRange !== 'all') {
      list = cafeList.filter(c => {
        const parentStruk = strukList.find(s => s.id_struk === c.id_struk)
        const dateStr = parentStruk?.tanggal || c.struk?.tanggal || c.created_at
        return isDateInRange(dateStr)
      })
    }
    return list.filter(c => {
      const parentStruk = strukList.find(s => s.id_struk === c.id_struk)
      if (parentStruk) {
        const ket = String(parentStruk.keterangan || '').toLowerCase()
        if (ket.includes('kalibrasi') || ket.includes('test') || parentStruk.status_bayar === 'Batal') {
          return false
        }
      }
      return c.status !== 'Batal' && c.status !== 'Cancelled' && parseFloat(c.subtotal) > 0
    })
  }, [cafeList, strukList, isDateInRange, timeRange])

  const filteredCashflowLogs = useMemo(() => {
    if (timeRange === 'all') return cashflowLogs
    return cashflowLogs.filter(c => isDateInRange(c.tanggal))
  }, [cashflowLogs, isDateInRange, timeRange])

  // Consolidated Statement Computations
  const statements = useMemo(() => {
    let cafeRevenue = 0
    filteredCafeList.forEach(item => {
      cafeRevenue += parseFloat(item.subtotal || item.harga_satuan * item.qty || 0)
    })

    let carwashRevenue = 0
    let carwashCommission = 0
    filteredCarwashList.forEach(cw => {
      carwashRevenue += parseFloat(cw.harga || 0)
      carwashCommission += (parseFloat(cw.komisi_1 || 0) + parseFloat(cw.komisi_2 || 0))
    })

    let otherIncome = 0
    let expGajiBersih = 0
    let totalCasbon = 0
    let expBahanBaku = 0
    let expOperasionalMurni = 0
    let expLainLain = 0

    filteredCashflowLogs.forEach(c => {
      const exp = parseFloat(c.pengeluaran || 0)
      const inc = parseFloat(c.pemasukan || 0)
      const jenisLower = String(c.jenis || '').toLowerCase()
      const ketLower = String(c.keterangan_transaksi || '').toLowerCase()
      const katLower = String(c.kategori || '').toLowerCase()

      if (inc > 0 && jenisLower !== 'pendapatan pos' && jenisLower !== 'pendapatan carwash' && jenisLower !== 'pendapatan cafe') {
        otherIncome += inc
      }

      if (exp > 0) {
        if (ketLower.includes('casbon') || katLower.includes('casbon')) {
          totalCasbon += exp
        } else if (katLower.includes('gaji') || ketLower.includes('gaji') || ketLower.includes('upah')) {
          expGajiBersih += exp
        } else if (katLower.includes('bahan baku') || ketLower.includes('belanja bahan') || ketLower.includes('kulakan')) {
          expBahanBaku += exp
        } else if (katLower.includes('operasional') || ketLower.includes('listrik') || ketLower.includes('air') || ketLower.includes('sabun')) {
          expOperasionalMurni += exp
        } else if (!jenisLower.includes('pindah')) {
          expLainLain += exp
        }
      }
    })

    const totalBebanGaji = expGajiBersih + totalCasbon
    const totalOperatingExpenses = totalBebanGaji + expBahanBaku + expOperasionalMurni + expLainLain
    const consolidatedRevenue = cafeRevenue + carwashRevenue
    const totalRevenue = consolidatedRevenue + otherIncome
    const netProfit = totalRevenue - totalOperatingExpenses
    const totalLiquid = posBalances.cash + posBalances.rekY + posBalances.rekN + posBalances.rekR

    return {
      cafeRevenue,
      carwashRevenue,
      consolidatedRevenue,
      otherIncome,
      totalRevenue,
      carwashCommission,
      totalBebanGaji,
      expBahanBaku,
      expOperasionalMurni,
      expLainLain,
      totalOperatingExpenses,
      netProfit,
      totalLiquid,
      totalCafeItems: filteredCafeList.reduce((sum, c) => sum + (c.qty || 1), 0),
      totalCars: filteredCarwashList.length,
      aov: filteredStrukByTime.length > 0 ? Math.round(totalRevenue / filteredStrukByTime.length) : 0
    }
  }, [filteredCafeList, filteredCarwashList, filteredCashflowLogs, filteredStrukByTime, posBalances])

  return (
    <div className="p-6 pb-24 md:pb-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800/80 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Laporan Keuangan Konsolidasi
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase tracking-wider">
                  Standar EMKM
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">Rekonsiliasi Laba Rugi Segmen Usaha, Posisi Saldo Kas & Rekapitulasi Neraca</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Time Range Filter */}
          <div className="relative flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
            <button
              onClick={() => { setTimeRange('today'); setShowCustomCalendar(false) }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'today' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => { setTimeRange('month'); setShowCustomCalendar(false) }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'month' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => { setTimeRange('custom'); setShowCustomCalendar(!showCustomCalendar) }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'custom' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Kustom
            </button>
            <button
              onClick={() => { setTimeRange('all'); setShowCustomCalendar(false) }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'all' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Semua
            </button>

            {timeRange === 'custom' && showCustomCalendar && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <InteractiveCalendar
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(start, end) => {
                    setStartDate(start)
                    setEndDate(end)
                  }}
                  onClose={() => setShowCustomCalendar(false)}
                />
              </div>
            )}
          </div>

          <button
            onClick={fetchReportsData}
            disabled={loading}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all text-xs active:scale-95"
          >
            <Printer size={15} />
            Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 print:hidden">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Report Mode Switcher: General Ledger (ERP) vs Operational Segment */}
      <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 w-fit print:hidden">
        <button
          onClick={() => setReportViewMode('general_ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            reportViewMode === 'general_ledger'
              ? 'bg-brand-emerald text-slate-950 shadow-lg shadow-brand-emerald/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scale size={16} />
          Buku Besar & Akuntansi ERP (Double-Entry)
        </button>
        <button
          onClick={() => setReportViewMode('operational')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            reportViewMode === 'operational'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText size={16} />
          Rekap Operasional Segmen (Kasir POS)
        </button>
      </div>

      {reportViewMode === 'general_ledger' ? (
        <GeneralLedgerView tenantId={DEFAULT_TENANT_ID} />
      ) : (
        /* Printable Sheet Area */
        <div id="print-area" className="glass-panel p-8 rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-200 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none space-y-8">
        {/* Header Laporan Resmi */}
        <div className="text-center border-b-2 border-slate-800 pb-6 print:border-black print:pb-4">
          <div className="flex justify-center items-center gap-2 mb-1">
            <Building size={20} className="text-rose-500 print:text-black" />
            <h2 className="text-2xl font-black tracking-tight text-white print:text-black">JAYA BERSAMA CARWASH & CAFE</h2>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold print:text-slate-600">Laporan Keuangan Konsolidasi (Segmen Usaha Terpadu)</p>
          <p className="text-xs text-cyan-400 font-mono mt-1 font-bold print:text-slate-700">
            Periode: {timeRange === 'all' ? 'Seluruh Periode' : `${parseDateSafe(startDate || '2026-07-01').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} s/d ${parseDateSafe(endDate || new Date().toLocaleDateString('en-CA')).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`}
          </p>
          <span className="text-[10px] text-slate-500 block mt-1.5 print:text-slate-500 font-medium">Mata Uang: Rupiah Indonesia (IDR) • Basis Pencatatan: Akrual & Kas Riil</span>
        </div>

        {/* Section 1: Laporan Laba Rugi Segmen */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-white border-l-4 border-rose-500 pl-2.5 uppercase tracking-wider print:text-black print:border-black">
            I. Laporan Laba Rugi Segmen (Consolidated Profit & Loss)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase print:border-black print:text-black">
                  <th className="py-2.5">Deskripsi Akun</th>
                  <th className="py-2.5 text-right pr-6">Segmen Cafe</th>
                  <th className="py-2.5 text-right pr-6">Segmen Carwash</th>
                  <th className="py-2.5 text-right font-black">Konsolidasi (Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 print:divide-slate-200">
                <tr>
                  <td className="py-3 font-semibold text-slate-200 print:text-black">PENDAPATAN USAHA (OMZET)</td>
                  <td className="py-3 text-right pr-6 text-emerald-400 font-bold print:text-black">{formatRupiah(statements.cafeRevenue)}</td>
                  <td className="py-3 text-right pr-6 text-emerald-400 font-bold print:text-black">{formatRupiah(statements.carwashRevenue)}</td>
                  <td className="py-3 text-right font-bold text-emerald-400 print:text-black">{formatRupiah(statements.consolidatedRevenue)}</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Pendapatan Lain-lain (Non-Operasional)</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right text-slate-300 print:text-black">{formatRupiah(statements.otherIncome)}</td>
                </tr>
                <tr className="bg-slate-900/20 font-bold border-y border-slate-800/80 print:bg-slate-100 print:border-black">
                  <td className="py-3 text-white print:text-black">TOTAL PENDAPATAN KOTOR</td>
                  <td className="py-3 text-right pr-6 print:text-black">{formatRupiah(statements.cafeRevenue)}</td>
                  <td className="py-3 text-right pr-6 print:text-black">{formatRupiah(statements.carwashRevenue)}</td>
                  <td className="py-3 text-right font-black print:text-black">{formatRupiah(statements.totalRevenue)}</td>
                </tr>

                {/* Beban Operasional */}
                <tr>
                  <td className="py-3 font-semibold text-slate-200 print:text-black" colSpan={3}>BEBAN OPERASIONAL KONSOLIDASI</td>
                  <td className="py-3 text-right pr-6 font-bold text-slate-500">-</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Beban Gaji Karyawan & Casbon</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(statements.totalBebanGaji)})</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Beban Bahan Baku & Kulakan</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(statements.expBahanBaku)})</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Beban Operasional Murni (Listrik, Air, Sabun)</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(statements.expOperasionalMurni)})</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Beban Pengeluaran Lain-lain</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(statements.expLainLain)})</td>
                </tr>
                <tr className="bg-slate-900/20 font-bold border-y border-slate-800/80 print:bg-slate-100 print:border-black">
                  <td className="py-3 text-white print:text-black">TOTAL BEBAN OPERASIONAL</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right pr-6 text-slate-500">-</td>
                  <td className="py-3 text-right font-black text-rose-400 print:text-black">({formatRupiah(statements.totalOperatingExpenses)})</td>
                </tr>

                {/* Net Profit */}
                <tr className="bg-rose-500/10 border-y-2 border-slate-700 font-extrabold text-sm print:bg-slate-200 print:border-black print:text-black">
                  <td className="py-3.5 text-white print:text-black">LABA BERSIH BERJALAN (NET PROFIT)</td>
                  <td className="py-3.5 text-right pr-6 text-slate-400">-</td>
                  <td className="py-3.5 text-right pr-6 text-slate-400">-</td>
                  <td className={`py-3.5 text-right font-black ${statements.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} print:text-black`}>
                    {formatRupiah(statements.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Posisi Saldo Kas & Rekening */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-white border-l-4 border-rose-500 pl-2.5 uppercase tracking-wider print:text-black print:border-black">
            II. Laporan Rekonsiliasi & Posisi Saldo Kas (Cash Position)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-center print:border-black print:bg-transparent">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Kas Laci Kasir</span>
              <h4 className="text-lg font-black text-white mt-1 print:text-black">{formatRupiah(posBalances.cash)}</h4>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-center print:border-black print:bg-transparent">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Rekening Mandiri Y</span>
              <h4 className="text-lg font-black text-white mt-1 print:text-black">{formatRupiah(posBalances.rekY)}</h4>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-center print:border-black print:bg-transparent">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Rekening Mandiri N</span>
              <h4 className="text-lg font-black text-white mt-1 print:text-black">{formatRupiah(posBalances.rekN)}</h4>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-center print:border-black print:bg-transparent">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Rekening Simpanan R</span>
              <h4 className="text-lg font-black text-white mt-1 print:text-black">{formatRupiah(posBalances.rekR)}</h4>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 flex justify-between items-center text-xs font-bold print:border-black print:bg-slate-100">
            <span className="text-slate-400 print:text-black">TOTAL KAS LIKUID PERUSAHAAN (CASH & EQUIVALENTS)</span>
            <span className="text-brand-emerald text-sm font-black print:text-black">
              {formatRupiah(statements.totalLiquid)}
            </span>
          </div>
        </div>

        {/* Section 3: Catatan Metrik Penunjang */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-white border-l-4 border-rose-500 pl-2.5 uppercase tracking-wider print:text-black print:border-black">
            III. Catatan Penunjang Laporan (Usaha & Metrik Operasional)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 text-xs">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 space-y-2 print:border-black print:bg-transparent">
              <h4 className="font-bold text-amber-400 uppercase tracking-wide print:text-black">Segmen Cafe</h4>
              <div className="space-y-1 text-slate-300 print:text-black">
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">Total Porsi / Cup Terjual:</span>
                  <span className="font-bold text-white print:text-black">{statements.totalCafeItems} unit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">Rata-rata Transaksi (AOV):</span>
                  <span className="font-bold text-white print:text-black">{formatRupiah(statements.aov)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 space-y-2 print:border-black print:bg-transparent">
              <h4 className="font-bold text-brand-blue uppercase tracking-wide print:text-black">Segmen Carwash</h4>
              <div className="space-y-1 text-slate-300 print:text-black">
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">Total Unit Mobil Dicuci:</span>
                  <span className="font-bold text-white print:text-black">{statements.totalCars} unit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">Total Alokasi Komisi Kru:</span>
                  <span className="font-bold text-white print:text-black">{formatRupiah(statements.carwashCommission)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Lembar Cetak */}
        <div className="hidden print:flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-200 mt-12 pt-4">
          <span>Dicetak otomatis oleh Sistem ERP Jaya Bersama</span>
          <span>Waktu Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</span>
          <div className="flex flex-col items-center gap-1">
            <span>Disetujui Oleh:</span>
            <span className="font-bold mt-8 text-black border-t border-black px-8 text-center">Owner / Manajemen</span>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

export default Reports
