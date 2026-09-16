import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import {
  TrendingUp,
  Car,
  Coffee,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  ExternalLink,
  Layers,
  ArrowRight,
  DollarSign
} from 'lucide-react'
import InteractiveCalendar from '../components/InteractiveCalendar'
import { formatRupiah, parseDateSafe } from '../utils/helpers'

// Helper function to fetch all rows beyond Supabase's default 1000 row REST limit
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

const Dashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month') // 'today', 'month', 'custom', 'all'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCustomCalendar, setShowCustomCalendar] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Raw DB Data
  const [strukList, setStrukList] = useState([])
  const [carwashList, setCarwashList] = useState([])
  const [cafeList, setCafeList] = useState([])
  const [cashflowLogs, setCashflowLogs] = useState([])
  const [stokList, setStokList] = useState([])
  const [posBalances, setPosBalances] = useState({ cash: 0, rekY: 0, rekN: 0, rekR: 0 })

  // Fetch Master Analytics Data
  const fetchAllAnalyticsData = async () => {
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

      const [dbStruk, dbCw, dbCafe, dbCf, dbStok] = await Promise.all([
        fetchAllRows('struk', '*', 'tanggal', filterStart, filterEnd),
        fetchAllRows('carwash', '*', 'tanggal', filterStart, filterEnd),
        fetchCafeRows(filterStart, filterEnd),
        fetchAllRows('cashflow', '*', 'tanggal', filterStart, filterEnd),
        fetchAllRows('stok_barang')
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
      setStokList(dbStok || [])
      setPosBalances({ cash, rekY, rekN, rekR })

    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setErrorMsg(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (timeRange === 'custom' && (!startDate || !endDate)) return
    fetchAllAnalyticsData()
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
      if (c.status === 'Batal' || c.status === 'Cancelled') {
        return false
      }
      return parseFloat(c.subtotal) > 0
    })
  }, [cafeList, strukList, isDateInRange, timeRange])

  const filteredCashflowLogs = useMemo(() => {
    if (timeRange === 'all') return cashflowLogs
    return cashflowLogs.filter(c => isDateInRange(c.tanggal))
  }, [cashflowLogs, isDateInRange, timeRange])

  const operatingDays = useMemo(() => {
    if (timeRange === 'today') return 1
    if (timeRange === 'month') {
      const now = new Date()
      return now.getDate()
    }
    if (timeRange === 'custom') {
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const diffTime = Math.abs(end - start)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        return isNaN(diffDays) ? 1 : diffDays
      }
      return 1
    }
    const uniqueDays = new Set(filteredCarwashList.map(cw => cw.tanggal).filter(Boolean))
    return Math.max(uniqueDays.size, 1)
  }, [filteredCarwashList, timeRange, startDate, endDate])

  // Cafe Analytics
  const cafeAnalytics = useMemo(() => {
    let totalRevenue = 0
    let totalItems = 0
    const menuCountMap = {}

    filteredCafeList.forEach(item => {
      const subtotal = parseFloat(item.subtotal || item.harga_satuan * item.qty || 0)
      const qty = item.qty || 1
      totalRevenue += subtotal
      totalItems += qty

      const nama = item.nama_menu || 'Menu Lain'
      menuCountMap[nama] = (menuCountMap[nama] || 0) + qty
    })

    const topMenus = Object.entries(menuCountMap)
      .map(([nama, qty]) => ({ nama, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3)

    return {
      totalRevenue,
      totalItems,
      topMenus
    }
  }, [filteredCafeList])

  // Carwash Analytics
  const carwashAnalytics = useMemo(() => {
    let totalRevenue = 0
    const modelCountMap = {}

    filteredCarwashList.forEach(cw => {
      const price = parseFloat(cw.harga || 0)
      totalRevenue += price
      const m = cw.model ? cw.model.trim() : 'Mobil Lain'
      modelCountMap[m] = (modelCountMap[m] || 0) + 1
    })

    const topModels = Object.entries(modelCountMap)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return {
      totalRevenue,
      totalUnits: filteredCarwashList.length,
      avgCarsPerDay: (filteredCarwashList.length / operatingDays).toFixed(1),
      topModels
    }
  }, [filteredCarwashList, operatingDays])

  // Financial Analytics & Trend Data
  const financialAnalytics = useMemo(() => {
    let totalExp = 0
    const dailyDataMap = {}

    filteredStrukByTime.forEach(s => {
      const d = s.tanggal ? s.tanggal.substring(0, 10) : ''
      if (!d) return
      if (!dailyDataMap[d]) dailyDataMap[d] = { date: d, omzet: 0, pengeluaran: 0 }
      dailyDataMap[d].omzet += parseFloat(s.total_tagihan || 0)
    })

    filteredCashflowLogs.forEach(c => {
      const d = c.tanggal ? c.tanggal.substring(0, 10) : ''
      const exp = parseFloat(c.pengeluaran || 0)
      const jenisLower = String(c.jenis || '').toLowerCase()

      if (jenisLower.includes('pindah') || jenisLower.includes('casbon')) return

      if (exp > 0) {
        totalExp += exp
        if (d) {
          if (!dailyDataMap[d]) dailyDataMap[d] = { date: d, omzet: 0, pengeluaran: 0 }
          dailyDataMap[d].pengeluaran += exp
        }
      }
    })

    const trendData = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalExpenses: totalExp,
      trendData
    }
  }, [filteredStrukByTime, filteredCashflowLogs])

  // Overview Stats
  const overviewStats = useMemo(() => {
    const totalRevenue = filteredStrukByTime.reduce((sum, item) => sum + parseFloat(item.total_tagihan || 0), 0)
    const netProfit = totalRevenue - financialAnalytics.totalExpenses
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0
    const totalLiquid = posBalances.cash + posBalances.rekY + posBalances.rekN + posBalances.rekR

    return {
      totalRevenue,
      netProfit,
      profitMargin,
      totalLiquid,
      todayCwCount: carwashAnalytics.totalUnits,
      todayCafeCount: cafeAnalytics.totalItems,
      avgCarsPerDay: carwashAnalytics.avgCarsPerDay
    }
  }, [filteredStrukByTime, financialAnalytics, posBalances, carwashAnalytics, cafeAnalytics])

  // Advanced Business Efficiency
  const advancedKPIs = useMemo(() => {
    // 1. Kumpulkan semua id_struk dari transaksi Carwash aktif dalam rentang waktu terpilih
    const carwashStrukIds = new Set()
    filteredCarwashList.forEach(cw => {
      if (cw.id_struk) carwashStrukIds.add(cw.id_struk)
    })

    // 2. Kumpulkan semua id_struk dari transaksi Cafe aktif dalam rentang waktu terpilih
    const cafeStrukIds = new Set()
    filteredCafeList.forEach(c => {
      if (c.id_struk) cafeStrukIds.add(c.id_struk)
    })

    // Fallback jika objek struk memiliki nested array (item_carwash / item_cafe)
    filteredStrukByTime.forEach(s => {
      if (s.item_carwash && s.item_carwash.length > 0 && s.id_struk) carwashStrukIds.add(s.id_struk)
      if (s.item_cafe && s.item_cafe.length > 0 && s.id_struk) cafeStrukIds.add(s.id_struk)
    })

    const totalCarwashStruks = carwashStrukIds.size
    let crossSellingStruks = 0
    for (const id of carwashStrukIds) {
      if (cafeStrukIds.has(id)) {
        crossSellingStruks++
      }
    }

    const crossRate = totalCarwashStruks > 0 ? ((crossSellingStruks / totalCarwashStruks) * 100).toFixed(1) : '0.0'
    const totalCustomers = Math.max(filteredStrukByTime.length, 1)
    const combinedARPU = Math.round(overviewStats.totalRevenue / totalCustomers)
    const capacityEfficiency = Math.min(Math.round((parseFloat(carwashAnalytics.avgCarsPerDay) / 30) * 100), 100)

    return {
      crossConversionRate: crossRate,
      crossCount: crossSellingStruks,
      totalCarwashStruks,
      combinedARPU,
      capacityEfficiency
    }
  }, [filteredStrukByTime, filteredCarwashList, filteredCafeList, overviewStats.totalRevenue, carwashAnalytics.avgCarsPerDay])

  // Operational Alerts: Critical Stock
  const criticalStockItems = useMemo(() => {
    return stokList.filter(item => {
      const stokNum = parseFloat(item.stok || 0)
      return stokNum <= 100
    }).slice(0, 4)
  }, [stokList])

  // Operational Activity: Active queue today
  const activeQueueSummary = useMemo(() => {
    const todayDate = new Date().toLocaleDateString('en-CA')
    const todayWashes = carwashList.filter(cw => String(cw.tanggal || '').startsWith(todayDate))
    const completed = todayWashes.filter(cw => cw.status === 'Selesai' || !cw.status).length
    const inProgress = todayWashes.filter(cw => cw.status === 'Sedang Cuci' || cw.status === 'Antre').length
    return {
      totalToday: todayWashes.length,
      completed,
      inProgress
    }
  }, [carwashList])

  // Custom SVG Trend Line Chart
  const renderTrendChart = () => {
    const data = financialAnalytics.trendData
    if (!data || data.length === 0) {
      return (
        <div className="h-44 flex items-center justify-center text-slate-600 text-xs font-semibold">
          Belum ada riwayat transaksi pada rentang waktu ini.
        </div>
      )
    }

    const maxVal = Math.max(...data.map(d => Math.max(d.omzet, d.pengeluaran)), 100000)
    const svgWidth = 600
    const svgHeight = 180
    const padding = 28

    const pointsOmzet = data.map((d, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * (svgWidth - padding * 2)
      const y = svgHeight - padding - (d.omzet / maxVal) * (svgHeight - padding * 2)
      return `${x},${y}`
    }).join(' ')

    const pointsExp = data.map((d, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * (svgWidth - padding * 2)
      const y = svgHeight - padding - (d.pengeluaran / maxVal) * (svgHeight - padding * 2)
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="w-full overflow-x-auto">
        <div className="min-w-[500px]">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 overflow-visible">
            <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
            <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
            <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#334155" strokeWidth="1" />

            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsOmzet}
              className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />

            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsExp}
              className="drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
            />

            {data.map((d, i) => {
              const labelInterval = Math.max(Math.ceil(data.length / 8), 1)
              const showLabel = i % labelInterval === 0 || i === data.length - 1
              const x = padding + (i / Math.max(data.length - 1, 1)) * (svgWidth - padding * 2)
              const yOmzet = svgHeight - padding - (d.omzet / maxVal) * (svgHeight - padding * 2)
              const yExp = svgHeight - padding - (d.pengeluaran / maxVal) * (svgHeight - padding * 2)
              const tooltipY = Math.max(5, Math.min(yOmzet, yExp) - 42)
              const dateLabel = d.date ? d.date.substring(5) : ''

              return (
                <g key={i} className="group cursor-pointer">
                  <rect x={x - 8} y={Math.min(yOmzet, yExp) - 8} width="16" height={Math.abs(yOmzet - yExp) + 16} fill="transparent" />
                  <circle cx={x} cy={yOmzet} r="4" fill="#10b981" className="transition-all group-hover:r-6" />
                  <circle cx={x} cy={yExp} r="3.5" fill="#f43f5e" className="transition-all group-hover:r-5" />
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <rect x={x - 55} y={tooltipY} width="110" height="34" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                    <text x={x} y={tooltipY + 12} fontSize="8" fill="#10b981" fontWeight="bold" textAnchor="middle">
                      {formatRupiah(d.omzet)}
                    </text>
                    <text x={x} y={tooltipY + 26} fontSize="8" fill="#f43f5e" fontWeight="bold" textAnchor="middle">
                      {formatRupiah(d.pengeluaran)}
                    </text>
                  </g>
                  {showLabel && (
                    <text x={x} y={svgHeight - 8} fontSize="8" fill="#94a3b8" textAnchor="middle" className="font-mono">
                      {dateLabel}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          <div className="flex justify-center items-center gap-6 mt-3 text-xs font-semibold">
            <span className="flex items-center gap-2 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              Omzet Penjualan
            </span>
            <span className="flex items-center gap-2 text-rose-400">
              <span className="w-2.5 h-0.5 border-t-2 border-dashed border-rose-500"></span>
              Pengeluaran Operasional
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24 md:pb-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Context Controls */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-emerald/20 to-brand-blue/20 border border-brand-emerald/30 flex items-center justify-center text-brand-emerald shadow-lg shadow-brand-emerald/10">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Executive Cockpit
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/25 uppercase tracking-wider">
                  ERP Live
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">Monitoring performa bisnis, likuiditas finansial & status operasional harian</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Direct Route Links */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
            <button
              onClick={() => navigate('/reports')}
              className="px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <FileText size={14} className="text-rose-400" />
              Laporan Akuntansi →
            </button>
            <button
              onClick={() => navigate('/crm')}
              className="px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Users size={14} className="text-cyan-400" />
              Data Pelanggan (CRM) →
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="relative flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
            <button
              onClick={() => { setTimeRange('today'); setShowCustomCalendar(false) }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'today' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => { setTimeRange('month'); setShowCustomCalendar(false) }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'month' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => { setTimeRange('custom'); setShowCustomCalendar(!showCustomCalendar) }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'custom' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Kustom
            </button>
            <button
              onClick={() => { setTimeRange('all'); setShowCustomCalendar(false) }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${timeRange === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
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
            onClick={fetchAllAnalyticsData}
            disabled={loading}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Shortcuts Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Sparkles size={16} className="text-amber-400" />
          <span>Pusat Aksi Cepat Operasional:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/pos')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Coffee size={14} />
            Buka Kasir POS
          </button>
          <button
            onClick={() => navigate('/queue')}
            className="px-3 py-1.5 rounded-xl bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/20 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Car size={14} />
            Antrean Carwash
          </button>
          <button
            onClick={() => navigate('/finance')}
            className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <DollarSign size={14} />
            Buku Kas Keuangan
          </button>
          <button
            onClick={() => navigate('/database')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Layers size={14} />
            Database Master
          </button>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Omzet */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 rounded-xl bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/15">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/15 uppercase">
              {timeRange === 'today' ? 'Hari Ini' : timeRange === 'month' ? 'Bulan Ini' : timeRange === 'custom' ? 'Kustom' : 'Semua'}
            </span>
          </div>
          <p className="text-slate-400 text-xs font-semibold">Total Omzet Penjualan</p>
          <h3 className="text-2xl font-black text-white mt-1.5 tracking-tight">
            {formatRupiah(overviewStats.totalRevenue)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Gabungan Cafe & Carwash</p>
        </div>

        {/* Card 2: Net Profit */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <div className={`p-3 rounded-xl border ${overviewStats.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' : 'bg-rose-500/10 text-rose-400 border-rose-500/15'}`}>
              {overviewStats.netProfit >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
              overviewStats.profitMargin >= 20 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              Margin {overviewStats.profitMargin}%
            </span>
          </div>
          <p className="text-slate-400 text-xs font-semibold">Estimasi Laba Bersih</p>
          <h3 className={`text-2xl font-black mt-1.5 tracking-tight ${overviewStats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatRupiah(overviewStats.netProfit)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Omzet dikurangi biaya riil</p>
        </div>

        {/* Card 3: Volume Operasional */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 rounded-xl bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              <Car size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue border border-brand-blue/15 uppercase">
              {overviewStats.avgCarsPerDay} Mobil / Hari
            </span>
          </div>
          <p className="text-slate-400 text-xs font-semibold">Volume Operasional</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <h3 className="text-2xl font-black text-white">{overviewStats.todayCwCount}</h3>
            <span className="text-xs text-slate-400 font-medium">Mobil Cuci</span>
            <span className="text-slate-600">|</span>
            <span className="text-lg font-bold text-amber-400">{overviewStats.todayCafeCount}</span>
            <span className="text-xs text-slate-400 font-medium">Cafe</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Trafik aktivitas harian</p>
        </div>

        {/* Card 4: Likuiditas Kas & Bank */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/15">
              <Wallet size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/15 uppercase">
              Likuiditas
            </span>
          </div>
          <p className="text-slate-400 text-xs font-semibold">Total Kas & Bank</p>
          <h3 className="text-2xl font-black text-purple-300 mt-1.5 tracking-tight">
            {formatRupiah(overviewStats.totalLiquid)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Saldo Kas Laci + 3 Rekening</p>
        </div>
      </div>

      {/* Operational Pulse & Critical Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Widget 1: Status Antrean Hari Ini */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock size={15} className="text-brand-blue" />
              Antrean Carwash Hari Ini
            </h4>
            <button
              onClick={() => navigate('/queue')}
              className="text-[11px] text-brand-blue hover:underline font-semibold flex items-center gap-1"
            >
              Kelola Bay <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Total Hari Ini</p>
              <p className="text-lg font-black text-white mt-0.5">{activeQueueSummary.totalToday}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <p className="text-[10px] text-emerald-400 uppercase font-bold">Selesai</p>
              <p className="text-lg font-black text-emerald-400 mt-0.5">{activeQueueSummary.completed}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <p className="text-[10px] text-amber-400 uppercase font-bold">Dalam Proses</p>
              <p className="text-lg font-black text-amber-400 mt-0.5">{activeQueueSummary.inProgress}</p>
            </div>
          </div>
        </div>

        {/* Widget 2: Peringatan Stok Bahan Baku Kritis */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              Peringatan Bahan Baku Kritis ({criticalStockItems.length})
            </h4>
            <button
              onClick={() => navigate('/database')}
              className="text-[11px] text-amber-400 hover:underline font-semibold flex items-center gap-1"
            >
              Buka Stok Gudang <ArrowRight size={12} />
            </button>
          </div>
          {criticalStockItems.length === 0 ? (
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle size={15} />
              <span>Semua bahan baku dalam batas stok aman. Tidak ada bahan kritis saat ini.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {criticalStockItems.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/15 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-white truncate">{item.nama_produk || item.nama_barang}</p>
                    <p className="text-[10px] text-slate-400">{item.id_bahan_baku} • Segera restok</p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold text-[11px] whitespace-nowrap">
                    {item.stok} {item.satuan || 'unit'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Posisi Kas Likuid & Saldo Rekening Terpadu */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Posisi Kas & Rekening Operasional</h3>
            <p className="text-xs text-slate-500">Saldo riil yang tercatat di mesin kasir dan rekening bank</p>
          </div>
          <button
            onClick={() => navigate('/finance')}
            className="text-xs text-purple-400 hover:underline font-semibold flex items-center gap-1"
          >
            Detail Mutasi Keuangan <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Kas Tunai Laci (Cash POS)</p>
            <h4 className="text-xl font-black text-emerald-400 mt-1">{formatRupiah(posBalances.cash)}</h4>
            <p className="text-[10px] text-slate-500 mt-1">Uang fisik di kasir</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Rekening Mandiri Y</p>
            <h4 className="text-xl font-black text-brand-blue mt-1">{formatRupiah(posBalances.rekY)}</h4>
            <p className="text-[10px] text-slate-500 mt-1">Rekening penerimaan utama</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Rekening Mandiri N</p>
            <h4 className="text-xl font-black text-cyan-400 mt-1">{formatRupiah(posBalances.rekN)}</h4>
            <p className="text-[10px] text-slate-500 mt-1">Rekening biaya operasional</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Rekening Cadangan R</p>
            <h4 className="text-xl font-black text-purple-400 mt-1">{formatRupiah(posBalances.rekR)}</h4>
            <p className="text-[10px] text-slate-500 mt-1">Rekening simpanan khusus</p>
          </div>
        </div>
      </div>

      {/* Trend Chart & Operational Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Trend Finansial (Omzet vs Pengeluaran)</h3>
              <p className="text-xs text-slate-500">Pergerakan arus kas masuk vs beban harian dalam periode terpilih</p>
            </div>
          </div>
          {renderTrendChart()}
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Efisiensi & Rasio Bisnis</h3>
            <p className="text-xs text-slate-500">Metrik konversi pelanggan & produktivitas</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Cross-selling Carwash-Cafe</span>
                <span className="font-bold text-amber-400">{advancedKPIs.crossConversionRate}%</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{advancedKPIs.crossCount} dari {advancedKPIs.totalCarwashStruks} mobil juga memesan menu cafe</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Rata-rata Transaksi (ARPU)</span>
                <span className="font-bold text-brand-emerald">{formatRupiah(advancedKPIs.combinedARPU)}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Rata-rata pembelanjaan tiap transaksi</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Utilisasi Kapasitas Cuci</span>
                <span className="font-bold text-brand-blue">{advancedKPIs.capacityEfficiency}%</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Berdasarkan kapasitas target 30 mobil/hari</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Basis Data Pelanggan CRM:</span>
            <button
              onClick={() => navigate('/crm')}
              className="text-cyan-400 hover:underline font-bold flex items-center gap-1"
            >
              Buka CRM Pelanggan <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Segment Performance Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cafe Summary Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/15">
                <Coffee size={18} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Performa Segmen Cafe</h4>
                <p className="text-[11px] text-slate-400">Total Omzet: {formatRupiah(cafeAnalytics.totalRevenue)}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/pos')}
              className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
            >
              Buka Kasir <ExternalLink size={12} />
            </button>
          </div>

          <div className="pt-2">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">3 Menu Terlaris Periode Ini:</p>
            <div className="space-y-1.5">
              {cafeAnalytics.topMenus.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada transaksi menu cafe</p>
              ) : (
                cafeAnalytics.topMenus.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-900/40">
                    <span className="font-medium text-slate-300 truncate">{i + 1}. {m.nama}</span>
                    <span className="font-bold text-amber-400 shrink-0">{m.qty} porsi/cup</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Carwash Summary Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
                <Car size={18} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Performa Segmen Carwash</h4>
                <p className="text-[11px] text-slate-400">Total Omzet: {formatRupiah(carwashAnalytics.totalRevenue)}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/queue')}
              className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1"
            >
              Log Antrean <ExternalLink size={12} />
            </button>
          </div>

          <div className="pt-2">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">3 Model Kendaraan Paling Sering Dicuci:</p>
            <div className="space-y-1.5">
              {carwashAnalytics.topModels.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada transaksi carwash</p>
              ) : (
                carwashAnalytics.topModels.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-900/40">
                    <span className="font-medium text-slate-300 truncate">{i + 1}. {m.model}</span>
                    <span className="font-bold text-brand-blue shrink-0">{m.count} unit</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
