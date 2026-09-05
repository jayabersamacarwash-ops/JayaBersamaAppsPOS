import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import {
  TrendingUp,
  Car,
  Coffee,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  Users,
  Calendar,
  Award,
  ChevronRight,
  Filter,
  DollarSign,
  PieChart,
  BarChart3,
  Sparkles,
  Clock,
  CheckCircle,
  ShieldCheck,
  ChevronDown,
  Layers,
  TrendingDown,
  ShoppingCart,
  Printer,
  FileText
} from 'lucide-react'
import InteractiveCalendar from '../components/InteractiveCalendar'
import { formatRupiah, parseDateSafe } from '../utils/helpers'

// Helper function to fetch all rows beyond Supabase's default 1000 row REST limit
// Now supports server-side filtering by date column
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
      // For endDate, we include the whole day by adding 23:59:59 if it's just YYYY-MM-DD
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
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'cafe', 'carwash', 'finance', 'customers', 'reports'
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
  const [resepList, setResepList] = useState([])
  const [stokList, setStokList] = useState([])
  const [posBalances, setPosBalances] = useState({ cash: 0, rekY: 0, rekN: 0, rekR: 0 })
  const [allCarwashList, setAllCarwashList] = useState([])

  // Customer Filter & Search State
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerFilterType, setCustomerFilterType] = useState('ALL') // 'ALL', 'LOYAL' (>=5), 'REGULAR' (2-4), 'NEW' (1)
  const [selectedCustomerPlat, setSelectedCustomerPlat] = useState(null)
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState(null)

  // Table column filters
  const [financeFilters, setFinanceFilters] = useState({ jenis: 'ALL', kategori: 'ALL' })
  const [cafeFilters, setCafeFilters] = useState({ kategori: 'ALL' })
  const [carwashFilters, setCarwashFilters] = useState({ kategori: 'ALL' })
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null)

  // Fetch All Master Analytics Data with Pagination Helper
  const fetchAllAnalyticsData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // Helper to compute date range for Supabase
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
          // last day of month
          const lastDay = new Date(y, now.getMonth() + 1, 0)
          filterEnd = lastDay.toLocaleDateString('en-CA')
        } else if (timeRange === 'custom' && startDate && endDate) {
          filterStart = startDate
          filterEnd = endDate
        }
      }

      // Fetch ALL tables concurrently using Promise.all
      // Pass the date column and ranges for tables that can be filtered server-side
      const [dbStruk, dbCw, dbCafe, dbCf, dbResep, dbStok] = await Promise.all([
        fetchAllRows('struk', '*', 'tanggal', filterStart, filterEnd),
        fetchAllRows('carwash', '*', 'tanggal', filterStart, filterEnd),
        fetchCafeRows(filterStart, filterEnd),
        fetchAllRows('cashflow', '*', 'tanggal', filterStart, filterEnd),
        fetchAllRows('resep'), // Master data, no date filter
        fetchAllRows('stok_barang') // Master data, no date filter
      ])

      // 6. Fetch Pos Balances
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
      setResepList(dbResep || [])
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
    // Only re-fetch if not in custom mode waiting for dates, or if custom dates are ready
    if (timeRange === 'custom' && (!startDate || !endDate)) return
    fetchAllAnalyticsData()
  }, [timeRange, startDate, endDate])

  useEffect(() => {
    // Fetch all-time carwash list once on mount for the customer report
    const loadAllCarwashData = async () => {
      try {
        const dbCwAll = await fetchAllRows('carwash', '*')
        setAllCarwashList(dbCwAll || [])
      } catch (e) {
        console.error('Error fetching all carwash records:', e)
      }
    }
    loadAllCarwashData()
  }, [])

  // Helper formatting

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
    return true // 'all'
  }, [timeRange, startDate, endDate])

  // Filter Struk Data by Time Range (Excluding Calibration & Canceled)
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

  // Filter Carwash Data by Time Range directly (Excluding Calibration, Canceled & Zero-price)
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

  // Filter Cafe Data by Time Range directly (Excluding Calibration, Canceled & Zero-price)
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

  const uniqueFinanceValues = useMemo(() => {
    const list = filteredCashflowLogs.filter(c => {
      const p = parseFloat(c.pengeluaran || 0)
      if (p <= 0) return false
      const jenisLower = String(c.jenis || '').toLowerCase()
      return !jenisLower.includes('pindah') && !jenisLower.includes('casbon')
    })
    const jenisSet = new Set()
    const kategoriSet = new Set()
    list.forEach(c => {
      if (c.jenis) jenisSet.add(c.jenis.trim())
      if (c.kategori) kategoriSet.add(c.kategori.trim())
    })
    return {
      jenis: Array.from(jenisSet).sort(),
      kategori: Array.from(kategoriSet).sort()
    }
  }, [filteredCashflowLogs])

  const uniqueCafeValues = useMemo(() => {
    const list = filteredCashflowLogs.filter(c => {
      const p = parseFloat(c.pengeluaran || 0)
      if (p <= 0) return false
      const jenisLower = String(c.jenis || '').toLowerCase()
      return jenisLower === 'pengeluaran cafe'
    })
    const kategoriSet = new Set()
    list.forEach(c => {
      if (c.kategori) kategoriSet.add(c.kategori.trim())
    })
    return {
      kategori: Array.from(kategoriSet).sort()
    }
  }, [filteredCashflowLogs])

  const uniqueCarwashValues = useMemo(() => {
    const list = filteredCashflowLogs.filter(c => {
      const p = parseFloat(c.pengeluaran || 0)
      if (p <= 0) return false
      const jenisLower = String(c.jenis || '').toLowerCase()
      return jenisLower === 'pengeluaran carwash'
    })
    const kategoriSet = new Set()
    list.forEach(c => {
      if (c.kategori) kategoriSet.add(c.kategori.trim())
    })
    return {
      kategori: Array.from(kategoriSet).sort()
    }
  }, [filteredCashflowLogs])

  const filteredFinanceLogs = useMemo(() => {
    return filteredCashflowLogs
      .filter(c => {
        const p = parseFloat(c.pengeluaran || 0)
        if (p <= 0) return false
        const jenisLower = String(c.jenis || '').toLowerCase()
        if (jenisLower.includes('pindah') || jenisLower.includes('casbon')) return false
        if (financeFilters.jenis !== 'ALL' && c.jenis !== financeFilters.jenis) return false
        if (financeFilters.kategori !== 'ALL' && c.kategori !== financeFilters.kategori) return false
        return true
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
  }, [filteredCashflowLogs, financeFilters])

  const filteredCafeLogs = useMemo(() => {
    return filteredCashflowLogs
      .filter(c => {
        const p = parseFloat(c.pengeluaran || 0)
        if (p <= 0) return false
        const jenisLower = String(c.jenis || '').toLowerCase()
        if (jenisLower !== 'pengeluaran cafe') return false
        if (cafeFilters.kategori !== 'ALL' && c.kategori !== cafeFilters.kategori) return false
        return true
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
  }, [filteredCashflowLogs, cafeFilters])

  const filteredCarwashLogs = useMemo(() => {
    return filteredCashflowLogs
      .filter(c => {
        const p = parseFloat(c.pengeluaran || 0)
        if (p <= 0) return false
        const jenisLower = String(c.jenis || '').toLowerCase()
        if (jenisLower !== 'pengeluaran carwash') return false
        if (carwashFilters.kategori !== 'ALL' && c.kategori !== carwashFilters.kategori) return false
        return true
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
  }, [filteredCashflowLogs, carwashFilters])

  const renderColumnFilterDropdown = (tableKey, columnKey, uniqueValues, currentFilters, setFilters) => {
    const isOpen = openFilterDropdown === `${tableKey}-${columnKey}`
    const currentValue = currentFilters[columnKey] || 'ALL'

    return (
      <div className="relative inline-block ml-1.5 align-middle">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpenFilterDropdown(isOpen ? null : `${tableKey}-${columnKey}`)
          }}
          className={`p-1 rounded hover:bg-slate-800 transition-colors ${currentValue !== 'ALL' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-350'}`}
          title="Filter kolom"
        >
          <Filter size={11} className="inline" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpenFilterDropdown(null)}
            />
            <div className="absolute left-0 mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 text-left normal-case tracking-normal max-h-56 overflow-y-auto">
              <button
                onClick={() => {
                  setFilters({ ...currentFilters, [columnKey]: 'ALL' })
                  setOpenFilterDropdown(null)
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between ${currentValue === 'ALL' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <span>Semua</span>
                {currentValue === 'ALL' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </button>
              {uniqueValues.map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setFilters({ ...currentFilters, [columnKey]: val })
                    setOpenFilterDropdown(null)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between truncate ${currentValue === val ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  title={val}
                >
                  <span className="truncate">{val}</span>
                  {currentValue === val && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Calculate total operating days for average calculations
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

  // Overview Stats (Hari Ini & General)
  const overviewStats = useMemo(() => {
    // Period-level totals (based on filtered lists which already reflect the timeRange)
    const periodRevenue = filteredStrukByTime.reduce((sum, item) => sum + parseFloat(item.total_tagihan || 0), 0)
    const periodCwCount = filteredCarwashList.length
    const periodCafeCount = filteredCafeList.reduce((sum, c) => sum + (c.qty || 0), 0)

    const periodCashStruks = filteredStrukByTime.filter(s => s.metode_bayar === 'CASH')
    const periodCashIn = periodCashStruks.reduce((sum, s) => sum + parseFloat(s.total_tagihan || 0), 0)

    const periodCashOut = filteredCashflowLogs.reduce((sum, c) => {
      const exp = parseFloat(c.pengeluaran || 0)
      const jenisLower = String(c.jenis || '').toLowerCase()
      if (jenisLower.includes('pindah') || jenisLower.includes('casbon')) return sum
      return sum + exp
    }, 0)
    const avgCarsPerDay = (filteredCarwashList.length / operatingDays).toFixed(1)

    return {
      todayRevenue: periodRevenue,
      todayCwCount: periodCwCount,
      todayCafeCount: periodCafeCount,
      todayCashIn: periodCashIn,
      todayCashOut: periodCashOut,
      avgCarsPerDay
    }
  }, [filteredStrukByTime, filteredCarwashList, filteredCafeList, filteredCashflowLogs, operatingDays])

  // Categorized Expenses from Cashflow & Pengeluaran
  const expenseBreakdown = useMemo(() => {
    const carwashCategories = {}
    const cafeCategories = {}
    const sharedCategories = {}

    // Process Cashflow outflow
    filteredCashflowLogs.forEach(c => {
      const amt = parseFloat(c.pengeluaran || 0)
      if (amt <= 0) return
      const ket = (c.keterangan_transaksi || 'Pengeluaran').trim()
      const cat = (c.kategori && c.kategori.trim()) ? c.kategori.trim() : 'Lain-lain'
      const date = c.tanggal ? c.tanggal.substring(0, 10) : ''

      const jenisLower = String(c.jenis || '').toLowerCase()
      const isCarwashRelated = jenisLower === 'pengeluaran carwash'
      const isCafeRelated = jenisLower === 'pengeluaran cafe'
      const isShared = jenisLower === 'pengeluaran bersama' || jenisLower === 'pengeluaran' || (!isCarwashRelated && !isCafeRelated && !jenisLower.includes('casbon') && !jenisLower.includes('pindah'))

      if (isCarwashRelated) {
        if (!carwashCategories[cat]) {
          carwashCategories[cat] = { amount: 0, items: [] }
        }
        carwashCategories[cat].amount += amt
        carwashCategories[cat].items.push({ tanggal: date, keterangan: ket, nominal: amt })
      } else if (isCafeRelated) {
        if (!cafeCategories[cat]) {
          cafeCategories[cat] = { amount: 0, items: [] }
        }
        cafeCategories[cat].amount += amt
        cafeCategories[cat].items.push({ tanggal: date, keterangan: ket, nominal: amt })
      } else if (isShared) {
        if (!sharedCategories[cat]) {
          sharedCategories[cat] = { amount: 0, items: [] }
        }
        sharedCategories[cat].amount += amt
        sharedCategories[cat].items.push({ tanggal: date, keterangan: ket, nominal: amt })
      }
    })

    const totalCarwashExpense = Object.values(carwashCategories).reduce((sum, v) => sum + v.amount, 0)
    const totalCafeExpense = Object.values(cafeCategories).reduce((sum, v) => sum + v.amount, 0)
    const totalSharedExpense = Object.values(sharedCategories).reduce((sum, v) => sum + v.amount, 0)

    return {
      carwashCategories,
      totalCarwashExpense,
      cafeCategories,
      totalCafeExpense,
      sharedCategories,
      totalSharedExpense
    }
  }, [filteredCashflowLogs])

  // Cafe Analytics Aggregation
  const cafeAnalytics = useMemo(() => {
    let totalRevenue = 0
    let totalItems = 0
    let totalHpp = 0
    const menuMap = {}
    const categoryMap = {}

    // Fallback spreadsheet values (Rp)
    const fallbackPrices = {
      'MB-01': 2000,      // Le Mineral
      'MB-02': 5625,      // Badak
      'BK-01': 223,       // Biji Kopi
      'BK-02': 31,        // SKM
      'BK-03': 15,        // Gula Aren
      'BK-04': 9,         // Gula Putih
      'BK-05': 21,        // Susu UHT
      'BK-06': 660,       // Teh
      'BM-01': 12000,     // Segala Tempe
      'BMK-01': 8500,     // Ayam
      'BMK-02': 16,       // Nasi
      'BMK-03': 500,      // Bumbu Nasi Goreng
      'BMK-04': 32,       // Nugget
      'BMK-05': 1500,     // Sosis
      'BMK-06': 30,       // Kentang
      'BMK-07': 3500,     // Indomie Kuah
      'BMK-08': 3500,     // Indomie Goreng
      'BMK-09': 24,       // Minyak Goreng
      'BMK-10': 1900,     // Telur
    }

    // Build price map dynamically from database, falling back to spreadsheet defaults
    const ingredientPriceMap = { ...fallbackPrices }
    stokList.forEach(item => {
      const id = item.id_bahan_baku
      const price = parseFloat(item.harga_satuan)
      if (id) {
        if (!isNaN(price) && (price > 0 || !fallbackPrices[id])) {
          ingredientPriceMap[id] = price
        }
      }
    })

    // Group resep by menu name (lowercase)
    const recipeMap = {}
    resepList.forEach(r => {
      const menuName = String(r.nama_menu || '').trim().toLowerCase()
      if (!recipeMap[menuName]) recipeMap[menuName] = []
      recipeMap[menuName].push(r)
    })

    // Calculate total cafe revenue and expenses
    totalRevenue = filteredCafeList.reduce((sum, item) => sum + parseFloat(item.subtotal || item.harga_satuan * item.qty || 0), 0)
    let totalBahanBakuDibeli = 0
    let totalPengeluaranLainnya = 0

    filteredCashflowLogs.forEach(c => {
      const jenisLower = String(c.jenis || '').toLowerCase()
      const kategoriLower = String(c.kategori || '').toLowerCase()
      const exp = parseFloat(c.pengeluaran || 0)

      if (jenisLower === 'pengeluaran cafe') {
        if (kategoriLower === 'bahan baku') {
          totalBahanBakuDibeli += exp
        } else {
          totalPengeluaranLainnya += exp
        }
      }
    })

    // Process sold items
    filteredCafeList.forEach(item => {
      const subtotal = parseFloat(item.subtotal || item.harga_satuan * item.qty || 0)
      const qty = item.qty || 1
      totalItems += qty

      // Calculate HPP based on static recipe prices or 35% default fallback
      const name = item.nama_menu || 'Unknown Item'
      const nameLower = String(name).trim().toLowerCase()
      const recipeIngredients = recipeMap[nameLower] || []

      let itemHppUnit = 0
      if (recipeIngredients.length > 0) {
        recipeIngredients.forEach(ing => {
          const ingId = ing.id_bahan_baku
          const qtyUsed = parseFloat(ing.jumlah || 0)
          const unitCost = ingredientPriceMap[ingId] || 0
          itemHppUnit += qtyUsed * unitCost
        })
      } else {
        const itemSalesPrice = parseFloat(item.harga_satuan || (qty > 0 ? subtotal / qty : 0))
        itemHppUnit = itemSalesPrice * 0.35
      }

      const itemTotalHpp = itemHppUnit * qty
      totalHpp += itemTotalHpp
      const netProfit = subtotal - itemTotalHpp

      // Menu Aggregation
      if (!menuMap[name]) {
        menuMap[name] = { nama: name, qty: 0, revenue: 0, hpp: 0, profit: 0 }
      }
      menuMap[name].qty += qty
      menuMap[name].revenue += subtotal
      menuMap[name].hpp += itemTotalHpp
      menuMap[name].profit += netProfit

      // Category Aggregation
      let category = 'Lain-lain'
      const n = nameLower
      if (n.includes('kopi') || n.includes('americano') || n.includes('latte') || n.includes('espresso') || n.includes('susu')) category = 'Kopi'
      else if (n.includes('nasi') || n.includes('croissant') || n.includes('goreng') || n.includes('mie') || n.includes('snack')) category = 'Makanan'
      else if (n.includes('bundling') || n.includes('promo') || n.includes('paket')) category = 'Bundling'
      else if (n.includes('tea') || n.includes('matcha') || n.includes('ice') || n.includes('badak') || n.includes('botol') || n.includes('air')) category = 'Minuman Non-Kopi'

      if (!categoryMap[category]) categoryMap[category] = { category, qty: 0, revenue: 0, hpp: 0, profit: 0 }
      categoryMap[category].qty += qty
      categoryMap[category].revenue += subtotal
      categoryMap[category].hpp += itemTotalHpp
      categoryMap[category].profit += netProfit
    })

    const topMenus = Object.values(menuMap).sort((a, b) => b.qty - a.qty)
    const categories = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue)
    const aov = filteredStrukByTime.length ? totalRevenue / filteredStrukByTime.length : 0
    const avgItemsPerDay = (totalItems / operatingDays).toFixed(1)
    const netProfitCafe = totalRevenue - totalHpp - totalPengeluaranLainnya

    return {
      totalRevenue,
      totalItems,
      totalHpp,
      totalBahanBakuDibeli,
      totalPengeluaranLainnya,
      netProfitCafe,
      topMenus,
      categories,
      aov,
      avgItemsPerDay
    }
  }, [filteredCafeList, filteredStrukByTime, operatingDays, resepList, filteredCashflowLogs, stokList])

  // Carwash Analytics Aggregation
  const carwashAnalytics = useMemo(() => {
    let totalRevenue = 0
    let totalUnits = filteredCarwashList.length
    const packageMap = {}
    const sizeMap = {}
    const crewMap = {}

    filteredCarwashList.forEach(cw => {
      const price = parseFloat(cw.harga || 0)
      totalRevenue += price

      // Package Aggregation
      const paket = (cw.paket && cw.paket.trim()) ? cw.paket.trim() : 'PAKET CUCI BIASA'
      if (!packageMap[paket]) packageMap[paket] = { paket, count: 0, revenue: 0 }
      packageMap[paket].count += 1
      packageMap[paket].revenue += price

      // Size Aggregation
      const size = cw.ukuran || 'Medium'
      if (!sizeMap[size]) sizeMap[size] = { size, count: 0 }
      sizeMap[size].count += 1

      // Crew Aggregation
      if (cw.anggota_1) {
        if (!crewMap[cw.anggota_1]) crewMap[cw.anggota_1] = { name: cw.anggota_1, count: 0, wages: 0 }
        crewMap[cw.anggota_1].count += 1
        crewMap[cw.anggota_1].wages += parseFloat(cw.gaji_anggota || cw.gaji_pencuci || 0)
      }
      if (cw.anggota_2) {
        if (!crewMap[cw.anggota_2]) crewMap[cw.anggota_2] = { name: cw.anggota_2, count: 0, wages: 0 }
        crewMap[cw.anggota_2].count += 1
        crewMap[cw.anggota_2].wages += parseFloat(cw.gaji_anggota || 0)
      }
    })

    const packages = Object.values(packageMap).sort((a, b) => b.count - a.count)
    const sizes = Object.values(sizeMap).sort((a, b) => b.count - a.count)
    const crewStats = Object.values(crewMap).sort((a, b) => b.count - a.count)
    const avgCarsPerDay = (totalUnits / operatingDays).toFixed(1)

    return {
      totalRevenue,
      totalUnits,
      packages,
      sizes,
      crewStats,
      avgCarsPerDay
    }
  }, [filteredCarwashList, operatingDays])

  // Advanced KPIs
  const advancedKPIs = useMemo(() => {
    const carwashStrukIds = new Set(filteredCarwashList.map(c => c.id_struk).filter(Boolean))
    const cafeStrukIds = new Set(filteredCafeList.map(c => c.id_struk).filter(Boolean))

    let crossCount = 0
    carwashStrukIds.forEach(id => {
      if (cafeStrukIds.has(id)) {
        crossCount++
      }
    })

    const totalCarwashStruks = carwashStrukIds.size
    const crossConversionRate = totalCarwashStruks > 0 ? ((crossCount / totalCarwashStruks) * 100).toFixed(1) : 0

    const uniqueStrukIds = new Set(filteredStrukByTime.map(s => s.id_struk).filter(Boolean))
    const totalUniqueStruks = uniqueStrukIds.size
    let periodRevenue = 0
    filteredStrukByTime.forEach(s => periodRevenue += parseFloat(s.total_tagihan || 0))
    const combinedARPU = totalUniqueStruks > 0 ? (periodRevenue / totalUniqueStruks) : 0

    const MAX_CARS_PER_DAY = 30
    const capacityEfficiency = operatingDays > 0 ? ((filteredCarwashList.length / (MAX_CARS_PER_DAY * operatingDays)) * 100).toFixed(1) : 0

    return {
      crossConversionRate,
      combinedARPU,
      capacityEfficiency,
      crossCount,
      totalCarwashStruks
    }
  }, [filteredCarwashList, filteredCafeList, filteredStrukByTime, operatingDays])

  // Financial Trend Analytics Aggregation (Grouped by Date)
  const financialAnalytics = useMemo(() => {
    const dailyMap = {}

    // Add revenues and expenses from cashflow logs directly
    filteredCashflowLogs.forEach(c => {
      const jenisLower = String(c.jenis || '').toLowerCase()
      if (jenisLower.includes('pindah') || jenisLower.includes('casbon')) return

      const dateKey = c.tanggal ? c.tanggal.substring(0, 10) : 'Unknown'
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, omzet: 0, cash: 0, qris: 0, pengeluaran: 0 }
      }
      const rev = parseFloat(c.pemasukan || 0)
      const exp = parseFloat(c.pengeluaran || 0)

      dailyMap[dateKey].omzet += rev
      dailyMap[dateKey].pengeluaran += exp

      // Split cash/qris based on POS
      const posUpper = String(c.pos || '').toUpperCase()
      if (rev > 0) {
        if (posUpper.includes('CASH')) {
          dailyMap[dateKey].cash += rev
        } else {
          dailyMap[dateKey].qris += rev
        }
      }
    })

    const trendData = Object.values(dailyMap)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const totalOmzet = trendData.reduce((sum, d) => sum + d.omzet, 0)
    const totalPengeluaran = trendData.reduce((sum, d) => sum + d.pengeluaran, 0)
    const netProfit = totalOmzet - totalPengeluaran

    return {
      trendData,
      totalOmzet,
      totalPengeluaran,
      netProfit
    }
  }, [filteredCashflowLogs])

  // Laporan Akuntansi Consolidated Memo
  const reportsAnalytics = useMemo(() => {
    // Cafe
    const cafeRevenue = cafeAnalytics.totalRevenue
    const cafeHpp = cafeAnalytics.totalHpp
    const cafeGrossProfit = cafeRevenue - cafeHpp

    // Carwash
    const carwashRevenue = carwashAnalytics.totalRevenue
    const carwashHpp = carwashAnalytics.crewStats.reduce((sum, c) => sum + (c.wages || 0), 0)
    const carwashGrossProfit = carwashRevenue - carwashHpp

    // Consolidated
    const consolidatedRevenue = cafeRevenue + carwashRevenue
    const consolidatedHpp = cafeHpp + carwashHpp
    const consolidatedGrossProfit = cafeGrossProfit + carwashGrossProfit

    // Expenses
    let totalCasbon = 0
    let expGajiBersih = 0
    let expOperasionalMurni = 0
    let expBahanBakuRestok = 0
    let expLainLain = 0

    let otherIncome = 0

    filteredCashflowLogs.forEach(c => {
      const exp = parseFloat(c.pengeluaran || 0)
      const rev = parseFloat(c.pemasukan || 0)
      const cat = (c.kategori || '').trim()
      const ket = (c.keterangan_transaksi || '').trim()
      const jenisLower = String(c.jenis || '').toLowerCase()
      const catLower = cat.toLowerCase()
      const ketLower = ket.toLowerCase()

      if (exp > 0) {
        if (jenisLower.includes('pindah')) return // abaikan mutasi bank/kas

        // 1. Cek Casbon
        if (jenisLower.includes('casbon') || catLower.includes('casbon')) {
          totalCasbon += exp
        }
        // 2. Cek Gaji Bersih (dari deskripsi)
        else if (ketLower.includes('gaji') || catLower === 'gaji') {
          expGajiBersih += exp
        }
        // 3. Cek Restok Bahan Baku
        else if (catLower === 'bahan baku') {
          expBahanBakuRestok += exp
        }
        // 4. Cek Operasional Murni
        else if (catLower === 'operasional') {
          expOperasionalMurni += exp
        }
        // 5. Lain-lain
        else {
          expLainLain += exp
        }
      }

      if (rev > 0) {
        // Hanya hitung pemasukan manual luar kasir
        if (c.jenis === 'Pemasukan' && !c.id_sumber) {
          otherIncome += rev
        }
      }
    })

    // Reklasifikasi Gaji
    const totalBebanGaji = expGajiBersih + totalCasbon
    const totalOperatingExpenses = expOperasionalMurni + expBahanBakuRestok + expLainLain + totalBebanGaji
    const consolidatedNetProfit = consolidatedGrossProfit - totalOperatingExpenses + otherIncome

    return {
      cafeRevenue,
      cafeHpp,
      cafeGrossProfit,
      carwashRevenue,
      carwashHpp,
      carwashGrossProfit,
      consolidatedRevenue,
      consolidatedHpp,
      consolidatedGrossProfit,
      totalCasbon,
      expGajiBersih,
      totalBebanGaji,
      expBahanBakuRestok,
      expOperasionalMurni,
      expLainLain,
      otherIncome,
      totalOperatingExpenses,
      consolidatedNetProfit
    }
  }, [cafeAnalytics, carwashAnalytics, filteredCashflowLogs])

  // Customer Loyalty & Visit Counter Report Aggregation
  const customerReport = useMemo(() => {
    const customerMap = {}

    // Sort all-time carwash records chronologically
    const sortedCw = [...allCarwashList].sort((a, b) => new Date(a.created_at || a.tanggal).getTime() - new Date(b.created_at || b.tanggal).getTime())

    sortedCw.forEach(cw => {
      if (!cw.plat || !cw.plat.trim()) return
      const plat = cw.plat.trim().toUpperCase().replace(/\s+/g, ' ')

      if (!customerMap[plat]) {
        customerMap[plat] = {
          plat,
          model: cw.model || 'Mobil',
          noTelepon: cw.no_telepon || '-',
          totalVisits: 0,
          totalSpent: 0,
          firstVisit: cw.tanggal || cw.created_at,
          lastVisit: cw.tanggal || cw.created_at,
          favoritePackageMap: {},
          visitsHistory: []
        }
      }

      customerMap[plat].totalVisits += 1
      const price = parseFloat(cw.harga || 0)
      customerMap[plat].totalSpent += price
      customerMap[plat].lastVisit = cw.tanggal || cw.created_at
      if (cw.model) customerMap[plat].model = cw.model
      if (cw.no_telepon) customerMap[plat].noTelepon = cw.no_telepon

      // Count package preference
      const pkt = (cw.paket && cw.paket.trim()) ? cw.paket.trim() : 'PAKET CUCI BIASA'
      customerMap[plat].favoritePackageMap[pkt] = (customerMap[plat].favoritePackageMap[pkt] || 0) + 1

      // Add to visit history
      customerMap[plat].visitsHistory.push({
        visitNumber: customerMap[plat].totalVisits,
        tanggal: cw.tanggal || cw.created_at,
        jam: cw.jam,
        paket: pkt,
        ukuran: cw.ukuran || 'Medium',
        variant: cw.variant || 'Regular',
        harga: price,
        pencuci: `${cw.anggota_1 || ''} ${cw.anggota_2 ? '+ ' + cw.anggota_2 : ''}`.trim()
      })
    })

    // Compute favorite package and customer status category
    const list = Object.values(customerMap).map(cust => {
      let favPkg = 'PAKET CUCI BIASA'
      let maxCount = 0
      Object.entries(cust.favoritePackageMap).forEach(([pkg, count]) => {
        if (count > maxCount) {
          maxCount = count
          favPkg = pkg
        }
      })

      let category = 'Pelanggan Baru'
      let categoryColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      if (cust.totalVisits >= 5) {
        category = 'Pelanggan Setia (VIP)'
        categoryColor = 'bg-brand-emerald/15 text-brand-emerald border-brand-emerald/30'
      } else if (cust.totalVisits >= 2) {
        category = 'Pelanggan Reguler'
        categoryColor = 'bg-purple-500/15 text-purple-400 border-purple-500/20'
      }

      return {
        ...cust,
        favPkg,
        category,
        categoryColor
      }
    }).sort((a, b) => b.totalVisits - a.totalVisits)

    return list
  }, [allCarwashList])

  // Visit Histogram calculation (Kunjungan Ke 1, 2, 3, 4, ...)
  const visitHistogram = useMemo(() => {
    const counts = {}
    customerReport.forEach(c => {
      const v = c.totalVisits
      counts[v] = (counts[v] || 0) + 1
    })
    return counts
  }, [customerReport])

  // Filtered Customers based on Search & Category Filter
  const filteredCustomers = useMemo(() => {
    return customerReport.filter(cust => {
      const matchesSearch = cust.plat.toLowerCase().includes(customerSearch.toLowerCase()) ||
        cust.favPkg.toLowerCase().includes(customerSearch.toLowerCase())

      let matchesFilter = true
      if (customerFilterType === 'LOYAL') matchesFilter = cust.totalVisits >= 5
      else if (customerFilterType === 'REGULAR') matchesFilter = cust.totalVisits >= 2 && cust.totalVisits < 5
      else if (customerFilterType === 'NEW') matchesFilter = cust.totalVisits === 1

      return matchesSearch && matchesFilter
    })
  }, [customerReport, customerSearch, customerFilterType])

  // Detail Modal Customer selected
  const activeCustomerDetail = useMemo(() => {
    if (!selectedCustomerPlat) return null
    return customerReport.find(c => c.plat === selectedCustomerPlat) || null
  }, [customerReport, selectedCustomerPlat])

  // Custom SVG Trend Line & Bar Chart Generator
  const renderTrendChart = () => {
    const data = financialAnalytics.trendData
    if (!data || data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-slate-600 text-xs font-semibold">
          Belum cukup data transaksi untuk menampilkan grafik trend.
        </div>
      )
    }

    const maxVal = Math.max(...data.map(d => Math.max(d.omzet, d.pengeluaran)), 100000)
    const svgWidth = 600
    const svgHeight = 200
    const padding = 30

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
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-52 overflow-visible">
            {/* Background Grid Lines */}
            <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
            <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
            <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#334155" strokeWidth="1" />

            {/* Omzet Line */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsOmzet}
              className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />

            {/* Pengeluaran Line */}
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

            {/* Data Dots & Tooltips */}
            {data.map((d, i) => {
              const labelInterval = Math.max(Math.ceil(data.length / 10), 1)
              const showLabel = i % labelInterval === 0 || i === data.length - 1
              const x = padding + (i / Math.max(data.length - 1, 1)) * (svgWidth - padding * 2)
              const yOmzet = svgHeight - padding - (d.omzet / maxVal) * (svgHeight - padding * 2)
              const yExp = svgHeight - padding - (d.pengeluaran / maxVal) * (svgHeight - padding * 2)
              const tooltipY = Math.max(5, Math.min(yOmzet, yExp) - 50) // <--- Deklarasikan di sini
              const dateLabel = d.date ? d.date.substring(5) : ''


              return (
                <g key={i} className="group cursor-pointer">
                  {/*sensor transparan untuk mempermudah sentuhan (touch target) di mobile*/}
                  <rect x={x - 8} y={Math.min(yOmzet, yExp) - 8} width="16" height={Math.abs(yOmzet - yExp) + 16} fill="transparent" />
                  {/* Omzet Dot */}
                  <circle cx={x} cy={yOmzet} r="5" fill="#10b981" className="transition-all group-hover:r-7 group-hover:fill-emerald-300" />
                  {/*Exp Dot*/}
                  <circle cx={x} cy={yExp} r="4" fill="#f43f5e" className="transition-all group-hover:r-6 group-hover:fill-rose-300" />
                  {/*tool tip gabungan */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <rect x={x - 60} y={tooltipY} width="120" height="38" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                    {/*teks omzet (hijau)*/}
                    <text x={x} y={tooltipY + 10} fontSize="9" fill="#10b981" fontWeight="bold" textAnchor="middle">
                      {formatRupiah(d.omzet)}
                    </text>
                    {/*teks pengeluaran (merah)*/}
                    <text x={x} y={tooltipY + 30} fontSize="9" fill="#f43f5e" fontWeight="bold" textAnchor="middle">
                      {formatRupiah(d.pengeluaran)}
                    </text>
                  </g>

                  {/* X Axis Label */}
                  {showLabel && (
                    <text x={x} y={svgHeight - 10} fontSize="8" fill="#94a3b8" textAnchor="middle" className="font-mono">
                      {dateLabel}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          <div className="flex justify-center items-center gap-6 mt-2 text-xs font-semibold">
            <span className="flex items-center gap-2 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-brand-emerald shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              Omzet Penjualan
            </span>
            <span className="flex items-center gap-2 text-rose-400">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500"></span>
              Pengeluaran Operasional
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Refresh */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <BarChart3 size={32} className="text-brand-emerald" />
            Dashboard Performa Bisnis
          </h1>
          <p className="text-slate-400 text-sm mt-1">Laporan analitik Cafe, Carwash, Keuangan & Counter Kunjungan Customer</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector Wrapper */}
          <div className="relative flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
            <button
              onClick={() => {
                setTimeRange('today')
                setShowCustomCalendar(false)
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-200 ${timeRange === 'today' ? 'bg-brand-emerald text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => {
                setTimeRange('month')
                setShowCustomCalendar(false)
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-200 ${timeRange === 'month' ? 'bg-brand-emerald text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => {
                setTimeRange('custom')
                setShowCustomCalendar(true)
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-200 ${timeRange === 'custom' ? 'bg-brand-emerald text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Kustom Tanggal
            </button>
            <button
              onClick={() => {
                setTimeRange('all')
                setShowCustomCalendar(false)
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-200 ${timeRange === 'all' ? 'bg-brand-emerald text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Semua Waktu
            </button>

            {/* Absolute Custom Date Popover */}
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
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="p-2 rounded-2xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-900/40 border border-slate-800/85 shadow-inner">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 ${activeTab === 'overview'
            ? 'bg-brand-emerald text-slate-950 shadow-lg shadow-brand-emerald/15 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <PieChart size={15} />
          Overview
        </button>

        <button
          onClick={() => setActiveTab('cafe')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 ${activeTab === 'cafe'
            ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/15 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <Coffee size={15} />
          Performa Cafe ({cafeAnalytics.totalItems})
        </button>

        <button
          onClick={() => setActiveTab('carwash')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 ${activeTab === 'carwash'
            ? 'bg-brand-blue text-slate-950 shadow-lg shadow-brand-blue/15 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <Car size={15} />
          Performa Carwash ({carwashAnalytics.totalUnits})
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 ${activeTab === 'finance'
            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/15 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <TrendingUp size={15} />
          Performa Keuangan
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 ${activeTab === 'customers'
            ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/15 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <Users size={15} />
          Laporan Customer ({customerReport.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 ${activeTab === 'reports'
            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/15 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <FileText size={15} />
          Laporan Akuntansi
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/15">
                  <TrendingUp size={20} />
                </div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-brand-emerald/10 text-brand-emerald uppercase border border-brand-emerald/15">
                  {timeRange === 'today' ? 'Hari Ini' : timeRange === 'month' ? 'Bulan Ini' : timeRange === 'custom' ? 'Kustom' : 'Semua Waktu'}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Omzet Penjualan</p>
              <h3 className="text-2xl font-black text-brand-emerald mt-1.5">{formatRupiah(overviewStats.todayRevenue)}</h3>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
                  <Car size={20} />
                </div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue uppercase border border-brand-blue/15">
                  {timeRange === 'today' ? 'Hari Ini' : timeRange === 'month' ? 'Bulan Ini' : timeRange === 'custom' ? 'Kustom' : 'Semua Waktu'}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cucian Mobil</p>
              <h3 className="text-2xl font-black text-brand-blue mt-1.5">{overviewStats.todayCwCount} <span className="text-xs text-slate-500 font-bold uppercase">Mobil</span></h3>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/15">
                  <Users size={20} />
                </div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-cyan-400/10 text-cyan-400 uppercase border border-cyan-400/15">
                  Rata-rata
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Mobil / Hari</p>
              <h3 className="text-2xl font-black text-cyan-400 mt-1.5">{overviewStats.avgCarsPerDay} <span className="text-xs text-slate-500 font-bold uppercase">Mobil</span></h3>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/15">
                  <Coffee size={20} />
                </div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 uppercase border border-amber-500/15">
                  {timeRange === 'today' ? 'Hari Ini' : timeRange === 'month' ? 'Bulan Ini' : timeRange === 'custom' ? 'Kustom' : 'Semua Waktu'}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Layanan Cafe</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1.5">{overviewStats.todayCafeCount} <span className="text-xs text-slate-500 font-bold uppercase">Item</span></h3>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/15">
                  <Wallet size={20} />
                </div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 uppercase border border-purple-500/15">
                  Kas Laci
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Saldo Uang Cash</p>
              <h3 className="text-2xl font-black text-purple-400 mt-1.5">{formatRupiah(posBalances.cash)}</h3>
            </div>
          </div>

          {/* Advanced Business KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-amber-500/30 hover:border-amber-500/70 transition-all duration-300">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Tingkat Konversi Silang (Cross-selling)</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-black text-amber-400">{advancedKPIs.crossConversionRate}%</h3>
                <span className="text-xs text-slate-500 mb-1">{advancedKPIs.crossCount} dari {advancedKPIs.totalCarwashStruks} Mobil</span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-brand-emerald/30 hover:border-brand-emerald/70 transition-all duration-300">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">ARPU Gabungan (Rata-rata Pendapatan per Pengguna)</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-black text-brand-emerald">{formatRupiah(advancedKPIs.combinedARPU)}</h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-brand-blue/30 hover:border-brand-blue/70 transition-all duration-300">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Efisiensi Kapasitas (Asumsi: 30 Mobil/Hari)</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-black text-brand-blue">{advancedKPIs.capacityEfficiency}%</h3>
                <span className="text-xs text-slate-500 mb-1">Load Kapasitas</span>
              </div>
            </div>
          </div>

          {/* Saldo Bank & Rekening */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl flex justify-between items-center border border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  Y
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Saldo Rekening Y (Mandiri)</p>
                  <h4 className="text-lg font-bold text-white mt-0.5">{formatRupiah(posBalances.rekY)}</h4>
                </div>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full font-medium">Mandiri Utama</span>
            </div>

            <div className="glass-panel p-4 rounded-xl flex justify-between items-center border border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold">
                  N
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Saldo Rekening N (Mandiri)</p>
                  <h4 className="text-lg font-bold text-white mt-0.5">{formatRupiah(posBalances.rekN)}</h4>
                </div>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full font-medium">Mandiri Operational</span>
            </div>

            <div className="glass-panel p-4 rounded-xl flex justify-between items-center border border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  R
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Saldo Rekening R</p>
                  <h4 className="text-lg font-bold text-white mt-0.5">{formatRupiah(posBalances.rekR)}</h4>
                </div>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full font-medium">Rekening R</span>
            </div>
          </div>

          {/* Trend Line Chart Component */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Grafik Trend Omzet vs Pengeluaran</h3>
                <p className="text-xs text-slate-500">Pergerakan finansial harian dalam kurun waktu terpilih</p>
              </div>
            </div>
            {renderTrendChart()}
          </div>
        </div>
      )}

      {/* TAB 2: PERFORMA CAFE */}
      {activeTab === 'cafe' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/15">
                  <Coffee size={20} />
                </div>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Omzet Cafe</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1.5">{formatRupiah(cafeAnalytics.totalRevenue)}</h3>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-rose-500/10 text-brand-rose border border-rose-500/15">
                  <TrendingDown size={20} />
                </div>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Bahan Terjual (HPP)</p>
              <h3 className="text-2xl font-black text-rose-400 mt-1.5">{formatRupiah(cafeAnalytics.totalHpp)}</h3>
              <div className="text-[10px] text-slate-500 mt-1 font-semibold border-t border-slate-800/80 pt-1">
                Baku Dibeli: <span className="text-slate-350 font-bold">{formatRupiah(cafeAnalytics.totalBahanBakuDibeli)}</span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/15">
                  <TrendingUp size={20} />
                </div>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Profit Bersih Cafe</p>
              <h3 className="text-2xl font-black text-brand-emerald mt-1.5">{formatRupiah(cafeAnalytics.netProfitCafe)}</h3>
            </div>

            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/85 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/50">
                  <ShoppingCart size={20} />
                </div>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Item Terjual</p>
              <h3 className="text-2xl font-black text-white mt-1.5">{cafeAnalytics.totalItems} <span className="text-xs text-slate-500 font-bold uppercase">Pcs</span></h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Menu Terlaris */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Coffee size={20} className="text-amber-500" />
                Menu Cafe Terlaris (Top 10)
              </h3>
              <div className="space-y-3">
                {cafeAnalytics.topMenus.slice(0, 10).map((menu, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-200 truncate">{menu.nama}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-amber-400">{menu.qty} Pcs</span>
                      <div className="flex flex-col text-[10px] text-slate-500 mt-1 space-y-0.5 font-semibold">
                        <span>Omzet: <span className="text-slate-300">{formatRupiah(menu.revenue)}</span></span>
                        <span>Bahan: <span className="text-rose-400">{formatRupiah(menu.hpp)}</span></span>
                        <span>Profit: <span className="text-brand-emerald font-extrabold">{formatRupiah(menu.profit)}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown Pengeluaran Cafe per Kategori */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingDown size={20} className="text-rose-400" />
                  Pengeluaran Cafe per Kategori (Klik untuk Detail)
                </h3>
                <div className="space-y-3">
                  {Object.entries(expenseBreakdown.cafeCategories).map(([catName, catData], idx) => (
                    <div
                      key={idx}
                      onClick={() => catData.items.length > 0 && setSelectedExpenseDetail({ name: catName, items: catData.items })}
                      className={`flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 transition-all ${catData.items.length > 0 ? 'cursor-pointer hover:bg-slate-850 hover:scale-[1.01] hover:border-rose-500/30' : 'opacity-70'
                        }`}
                    >
                      <span className="text-xs font-semibold text-slate-300">{catName}</span>
                      <span className="text-xs font-black text-rose-400">{formatRupiah(catData.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 border-t border-slate-800/80 pt-4 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pengeluaran Cafe</span>
                <span className="text-sm font-black text-rose-455">{formatRupiah(expenseBreakdown.totalCafeExpense)}</span>
              </div>
            </div>
          </div>

          {/* Tabel Rincian Pengeluaran Cafe */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Daftar Rincian Pengeluaran Cafe</h3>
                <p className="text-xs text-slate-400">Daftar seluruh transaksi pengeluaran khusus unit cafe dalam periode terpilih</p>
              </div>
              {cafeFilters.kategori !== 'ALL' && (
                <button
                  onClick={() => setCafeFilters({ kategori: 'ALL' })}
                  className="self-start sm:self-auto px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-400 font-bold hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Reset Filter Kolom
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/20 max-h-[600px] overflow-y-auto">
              <table className="w-full min-w-[650px] text-left text-sm text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold text-xs uppercase tracking-wider bg-slate-900/40">
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5">
                      Kategori
                      {renderColumnFilterDropdown('cafe', 'kategori', uniqueCafeValues.kategori, cafeFilters, setCafeFilters)}
                    </th>
                    <th className="p-3.5">Keterangan</th>
                    <th className="p-3.5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredCafeLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-500 italic">
                        Tidak ada data pengeluaran cafe yang sesuai filter kolom.
                      </td>
                    </tr>
                  ) : (
                    filteredCafeLogs.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                          {item.tanggal ? item.tanggal.substring(0, 10) : '-'}
                        </td>
                        <td className="p-3.5 text-slate-200 font-semibold">
                          {item.kategori || '-'}
                        </td>
                        <td className="p-3.5 text-slate-200 font-medium max-w-sm truncate" title={item.keterangan_transaksi}>
                          {item.keterangan_transaksi || '-'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-brand-rose whitespace-nowrap">
                          {formatRupiah(item.pengeluaran)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMA CARWASH */}
      {activeTab === 'carwash' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-brand-blue/20 bg-brand-blue/5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Omzet Carwash</span>
              <h3 className="text-2xl font-black text-brand-blue mt-1">{formatRupiah(carwashAnalytics.totalRevenue)}</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Unit Mobil Dicuci</span>
              <h3 className="text-2xl font-black text-white mt-1">{carwashAnalytics.totalUnits} Mobil</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Rata-rata Mobil / Hari</span>
              <h3 className="text-2xl font-black text-cyan-400 mt-1">{carwashAnalytics.avgCarsPerDay} <span className="text-xs text-slate-400 font-normal">Mobil</span></h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Pengeluaran Carwash</span>
              <h3 className="text-2xl font-black text-rose-400 mt-1">{formatRupiah(expenseBreakdown.totalCarwashExpense)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Breakdown Pengeluaran Carwash per Kategori */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingDown size={20} className="text-rose-400" />
                Pengeluaran Carwash per Kategori (Klik untuk Detail)
              </h3>
              <div className="space-y-3">
                {Object.entries(expenseBreakdown.carwashCategories).map(([catName, catData], idx) => (
                  <div
                    key={idx}
                    onClick={() => catData.items.length > 0 && setSelectedExpenseDetail({ name: catName, items: catData.items })}
                    className={`flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 transition-all ${catData.items.length > 0 ? 'cursor-pointer hover:bg-slate-850 hover:scale-[1.01] hover:border-rose-500/30' : 'opacity-70'
                      }`}
                  >
                    <span className="text-xs font-semibold text-slate-300">{catName}</span>
                    <span className="text-xs font-black text-rose-400">{formatRupiah(catData.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown Paket Cuci */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Car size={20} className="text-brand-blue" />
                Popularitas Paket Layanan Cuci
              </h3>
              <div className="space-y-3">
                {carwashAnalytics.packages.map((pkg, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div>
                      <h5 className="font-bold text-xs text-white">{pkg.paket}</h5>
                      <span className="text-[10px] text-slate-500">{pkg.count} kali dipilih</span>
                    </div>
                    <span className="text-xs font-bold text-brand-blue">{formatRupiah(pkg.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabel Rincian Pengeluaran Carwash */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Daftar Rincian Pengeluaran Carwash</h3>
                <p className="text-xs text-slate-400">Daftar seluruh transaksi pengeluaran khusus unit carwash dalam periode terpilih</p>
              </div>
              {carwashFilters.kategori !== 'ALL' && (
                <button
                  onClick={() => setCarwashFilters({ kategori: 'ALL' })}
                  className="self-start sm:self-auto px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-400 font-bold hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Reset Filter Kolom
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/20 max-h-[600px] overflow-y-auto">
              <table className="w-full min-w-[650px] text-left text-sm text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold text-xs uppercase tracking-wider bg-slate-900/40">
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5">
                      Kategori
                      {renderColumnFilterDropdown('carwash', 'kategori', uniqueCarwashValues.kategori, carwashFilters, setCarwashFilters)}
                    </th>
                    <th className="p-3.5">Keterangan</th>
                    <th className="p-3.5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredCarwashLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-500 italic">
                        Tidak ada data pengeluaran carwash yang sesuai filter kolom.
                      </td>
                    </tr>
                  ) : (
                    filteredCarwashLogs.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                          {item.tanggal ? item.tanggal.substring(0, 10) : '-'}
                        </td>
                        <td className="p-3.5 text-slate-200 font-semibold">
                          {item.kategori || '-'}
                        </td>
                        <td className="p-3.5 text-slate-200 font-medium max-w-sm truncate" title={item.keterangan_transaksi}>
                          {item.keterangan_transaksi || '-'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-brand-rose whitespace-nowrap">
                          {formatRupiah(item.pengeluaran)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERFORMA KEUANGAN */}
      {activeTab === 'finance' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-brand-emerald/20 bg-brand-emerald/5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Omzet Penjualan</span>
              <h3 className="text-2xl font-black text-brand-emerald mt-1">{formatRupiah(financialAnalytics.totalOmzet)}</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Pengeluaran</span>
              <h3 className="text-2xl font-black text-rose-400 mt-1">{formatRupiah(financialAnalytics.totalPengeluaran)}</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-purple-500/5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Estimasi Net Profit</span>
              <h3 className="text-2xl font-black text-purple-400 mt-1">{formatRupiah(financialAnalytics.netProfit)}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <h3 className="text-lg font-bold text-white mb-4">Grafik Tren Keuangan Kompleks</h3>
            {renderTrendChart()}
          </div>

          {/* Tabel Rincian Seluruh Pengeluaran */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Daftar Rincian Seluruh Pengeluaran</h3>
                <p className="text-xs text-slate-400">Daftar transaksi pengeluaran riil dari log cashflow dalam periode terpilih (di luar Pindah & Casbon)</p>
              </div>
              {/* Reset filter indicators */}
              {(financeFilters.jenis !== 'ALL' || financeFilters.kategori !== 'ALL') && (
                <button
                  onClick={() => setFinanceFilters({ jenis: 'ALL', kategori: 'ALL' })}
                  className="self-start sm:self-auto px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-400 font-bold hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Reset Filter Kolom
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/20 max-h-[600px] overflow-y-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold text-xs uppercase tracking-wider bg-slate-900/40">
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5">
                      Jenis
                      {renderColumnFilterDropdown('finance', 'jenis', uniqueFinanceValues.jenis, financeFilters, setFinanceFilters)}
                    </th>
                    <th className="p-3.5">
                      Kategori
                      {renderColumnFilterDropdown('finance', 'kategori', uniqueFinanceValues.kategori, financeFilters, setFinanceFilters)}
                    </th>
                    <th className="p-3.5">Keterangan</th>
                    <th className="p-3.5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredFinanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500 italic">
                        Tidak ada data pengeluaran yang sesuai filter kolom.
                      </td>
                    </tr>
                  ) : (
                    filteredFinanceLogs.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                          {item.tanggal ? item.tanggal.substring(0, 10) : '-'}
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${String(item.jenis).toLowerCase().includes('cafe')
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : String(item.jenis).toLowerCase().includes('carwash')
                              ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                            {item.jenis || 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-200 font-semibold">
                          {item.kategori || '-'}
                        </td>
                        <td className="p-3.5 text-slate-200 font-medium max-w-sm truncate" title={item.keterangan_transaksi}>
                          {item.keterangan_transaksi || '-'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-brand-rose whitespace-nowrap">
                          {formatRupiah(item.pengeluaran)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LAPORAN KUNJUNGAN CUSTOMER & COUNTER MOBIL */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-fade-in">
          {/* Histogram Summary Box */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Award size={20} className="text-cyan-400" />
              Tabel Histogram Frekuensi Kunjungan Kendaraan
            </h3>
            <p className="text-xs text-slate-400 mb-4">Distribusi jumlah mobil berdasarkan frekuensi kedatangan (Kunjungan Ke-N)</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 text-center">
              {Object.keys(visitHistogram).sort((a, b) => Number(a) - Number(b)).map(visitNum => (
                <div key={visitNum} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-semibold block">Kunjungan {visitNum}</span>
                  <span className="text-base font-extrabold text-cyan-400 mt-0.5 block">{visitHistogram[visitNum]}</span>
                  <span className="text-[9px] text-slate-600 block">Mobil</span>
                </div>
              ))}
            </div>
          </div>

          {/* Header & Search Bar */}
          <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-800">
            {/* Filter Pills */}
            <div className="flex bg-slate-950 p-1.5 rounded-lg border border-slate-800 self-start md:self-auto overflow-x-auto max-w-full">
              <button
                onClick={() => setCustomerFilterType('ALL')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${customerFilterType === 'ALL' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Semua Customer ({customerReport.length})
              </button>
              <button
                onClick={() => setCustomerFilterType('LOYAL')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${customerFilterType === 'LOYAL' ? 'bg-brand-emerald text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Setia / VIP (≥5x) ({customerReport.filter(c => c.totalVisits >= 5).length})
              </button>
              <button
                onClick={() => setCustomerFilterType('REGULAR')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${customerFilterType === 'REGULAR' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Reguler (2-4x) ({customerReport.filter(c => c.totalVisits >= 2 && c.totalVisits < 5).length})
              </button>
              <button
                onClick={() => setCustomerFilterType('NEW')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${customerFilterType === 'NEW' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Baru (1x) ({customerReport.filter(c => c.totalVisits === 1).length})
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Cari plat nomor mobil..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs uppercase placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono tracking-wider font-bold"
              />
            </div>
          </div>

          {/* Customer Table Grid */}
          {filteredCustomers.length === 0 ? (
            <div className="glass-panel p-16 rounded-2xl text-center text-slate-600 border border-slate-800">
              <Users size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">Tidak ada data customer yang sesuai pencarian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((cust) => (
                <div
                  key={cust.plat}
                  onClick={() => setSelectedCustomerPlat(cust.plat)}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-mono text-2xl font-black text-white tracking-widest uppercase group-hover:text-cyan-400 transition-colors">
                        {cust.plat}
                      </span>
                      <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase border ${cust.categoryColor}`}>
                        {cust.category}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                        <span className="text-slate-400 font-medium">Counter Kunjungan</span>
                        <span className="font-extrabold text-cyan-400 text-sm font-mono">
                          Kunjungan Ke-{cust.totalVisits}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Total Belanja (LTV):</span>
                        <span className="font-bold text-brand-emerald">{formatRupiah(cust.totalSpent)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Merk/Model:</span>
                        <span className="font-semibold text-slate-300 capitalize truncate max-w-[150px]">{cust.model}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">No Telepon:</span>
                        <span className="font-semibold text-slate-300 font-mono text-[11px]">{cust.noTelepon}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Paket Favorit:</span>
                        <span className="font-semibold text-slate-300 text-[11px] truncate max-w-[150px]">{cust.favPkg}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500">
                    <span>Terakhir: {cust.lastVisit ? String(cust.lastVisit).substring(0, 10) : '-'}</span>
                    <span className="text-cyan-400 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Lihat Histori <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: LAPORAN AKUNTANSI KONSOLIDASI */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in print:space-y-4">
          {/* Controls Bar */}
          <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 shadow-md print:hidden flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-sm text-white">Laporan Keuangan Konsolidasi</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Ekspor atau cetak laporan keuangan resmi berdasarkan standar EMKM</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all text-xs"
            >
              <Printer size={14} />
              Cetak Laporan (PDF)
            </button>
          </div>

          {/* Printable Report Sheet */}
          <div id="print-area" className="glass-panel p-8 rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-200 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">

            {/* Header Laporan */}
            <div className="text-center border-b-2 border-slate-800 pb-6 mb-6 print:border-black print:pb-4 print:mb-4">
              <h2 className="text-2xl font-black tracking-tight text-white print:text-black">JAYA BERSAMA CARWASH & CAFE</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold print:text-slate-600">Laporan Keuangan Konsolidasi (Segmen Usaha)</p>
              <p className="text-xs text-cyan-400 font-mono mt-1 font-bold print:text-slate-700">
                Periode: {timeRange === 'all' ? 'Seluruh Periode' : `${parseDateSafe(startDate || '2026-07-01').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} s/d ${parseDateSafe(endDate || new Date().toLocaleDateString('en-CA')).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`}
              </p>
              <span className="text-[10px] text-slate-500 block mt-2 print:text-slate-500 font-medium">Mata Uang: Rupiah (IDR)</span>
            </div>

            {/* Bagian 1: Laporan Laba Rugi Segmen */}
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
                    {/* Pendapatan */}
                    <tr className="hover:bg-slate-900/10 print:hover:bg-transparent">
                      <td className="py-3 font-semibold text-slate-200 print:text-black">PENDAPATAN USAHA</td>
                      <td className="py-3 text-right pr-6 text-emerald-400 font-bold print:text-black">{formatRupiah(reportsAnalytics.cafeRevenue)}</td>
                      <td className="py-3 text-right pr-6 text-emerald-400 font-bold print:text-black">{formatRupiah(reportsAnalytics.carwashRevenue)}</td>
                      <td className="py-3 text-right font-bold text-emerald-400 print:text-black">{formatRupiah(reportsAnalytics.consolidatedRevenue)}</td>
                    </tr>
                    <tr className="hover:bg-slate-900/10 print:hover:bg-transparent">
                      <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Pendapatan Lain-lain (Manual)</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right text-slate-300 print:text-black">{formatRupiah(reportsAnalytics.otherIncome)}</td>
                    </tr>
                    <tr className="bg-slate-900/20 font-bold border-y border-slate-800/80 print:bg-slate-100 print:border-black">
                      <td className="py-3 text-white print:text-black">TOTAL PENDAPATAN</td>
                      <td className="py-3 text-right pr-6 print:text-black">{formatRupiah(reportsAnalytics.cafeRevenue)}</td>
                      <td className="py-3 text-right pr-6 print:text-black">{formatRupiah(reportsAnalytics.carwashRevenue)}</td>
                      <td className="py-3 text-right font-black print:text-black">{formatRupiah(reportsAnalytics.consolidatedRevenue + reportsAnalytics.otherIncome)}</td>
                    </tr>

                    {/* HPP */}
                    <tr className="hover:bg-slate-900/10 print:hover:bg-transparent">
                      <td className="py-3 font-semibold text-slate-200 print:text-black">HARGA POKOK PENJUALAN (HPP)</td>
                      <td className="py-3 text-right pr-6 text-rose-400 print:text-black">({formatRupiah(reportsAnalytics.cafeHpp)})</td>
                      <td className="py-3 text-right pr-6 text-rose-400 print:text-black">({formatRupiah(reportsAnalytics.carwashHpp)})</td>
                      <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(reportsAnalytics.consolidatedHpp)})</td>
                    </tr>
                    <tr className="bg-slate-900/30 font-bold border-y border-slate-800/60 print:bg-slate-50 print:border-black">
                      <td className="py-3 text-white print:text-black">LABA KOTOR (GROSS PROFIT)</td>
                      <td className="py-3 text-right pr-6 text-emerald-400 print:text-black">{formatRupiah(reportsAnalytics.cafeGrossProfit)}</td>
                      <td className="py-3 text-right pr-6 text-emerald-400 print:text-black">{formatRupiah(reportsAnalytics.carwashGrossProfit)}</td>
                      <td className="py-3 text-right font-black text-emerald-400 print:text-black">{formatRupiah(reportsAnalytics.consolidatedGrossProfit)}</td>
                    </tr>

                    {/* Beban Operasional */}
                    <tr>
                      <td className="py-3 font-semibold text-slate-200 print:text-black" colSpan={3}>BEBAN OPERASIONAL KONSOLIDASI</td>
                      <td className="py-3 text-right pr-6 font-bold text-slate-500">-</td>
                    </tr>
                    <tr className="hover:bg-slate-900/10 print:hover:bg-transparent">
                      <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Beban Gaji Karyawan (Gaji Bersih + Casbon)</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(reportsAnalytics.totalBebanGaji)})</td>
                    </tr>
                    <tr className="hover:bg-slate-900/10 print:hover:bg-transparent">
                      <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Beban Bahan Baku (Restok Gudang)</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(reportsAnalytics.expBahanBakuRestok)})</td>
                    </tr>
                    <tr className="hover:bg-slate-900/10 print:hover:bg-transparent">
                      <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Beban Operasional Murni (Listrik, Air, Gas, Sabun, dll)</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(reportsAnalytics.expOperasionalMurni)})</td>
                    </tr>
                    <tr className="hover:bg-slate-900/10 print:hover:bg-transparent">
                      <td className="py-3 pl-4 text-slate-400 print:text-slate-600">Beban Pengeluaran Lain-lain</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right text-rose-400 print:text-black">({formatRupiah(reportsAnalytics.expLainLain)})</td>
                    </tr>
                    <tr className="bg-slate-900/20 font-bold border-y border-slate-800/80 print:bg-slate-100 print:border-black">
                      <td className="py-3 text-white print:text-black">TOTAL BEBAN OPERASIONAL</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right pr-6 text-slate-500">-</td>
                      <td className="py-3 text-right font-black text-rose-400 print:text-black">({formatRupiah(reportsAnalytics.totalOperatingExpenses)})</td>
                    </tr>

                    {/* Laba Bersih */}
                    <tr className="bg-rose-500/10 border-y-2 border-slate-700 font-extrabold text-sm print:bg-slate-200 print:border-black print:text-black">
                      <td className="py-3.5 text-white print:text-black">LABA BERSIH BERJALAN (NET PROFIT)</td>
                      <td className="py-3.5 text-right pr-6 text-slate-400">-</td>
                      <td className="py-3.5 text-right pr-6 text-slate-400">-</td>
                      <td className={`py-3.5 text-right font-black text-sm ${reportsAnalytics.consolidatedNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} print:text-black`}>
                        {formatRupiah(reportsAnalytics.consolidatedNetProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bagian 2: Laporan Posisi Kas */}
            <div className="space-y-4 mt-8">
              <h3 className="text-sm font-extrabold text-white border-l-4 border-rose-500 pl-2.5 uppercase tracking-wider print:text-black print:border-black">
                II. Laporan Rekonsiliasi & Posisi Saldo Kas (Cash Position)
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 text-center print:border-black print:bg-transparent">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold print:text-black">Saldo Tunai (Laci Cash)</span>
                  <h4 className="text-lg font-black text-white mt-1 print:text-black">{formatRupiah(posBalances.cash)}</h4>
                </div>
                <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 text-center print:border-black print:bg-transparent">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold print:text-black">Saldo Rekening Y</span>
                  <h4 className="text-lg font-black text-white mt-1 print:text-black">{formatRupiah(posBalances.rekY)}</h4>
                </div>
                <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 text-center print:border-black print:bg-transparent">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold print:text-black">Saldo Rekening N</span>
                  <h4 className="text-lg font-black text-white mt-1 print:text-black">{formatRupiah(posBalances.rekN)}</h4>
                </div>
                <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 text-center print:border-black print:bg-transparent">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold print:text-black">Saldo Rekening R</span>
                  <h4 className="text-lg font-black text-white mt-1 print:text-black">{formatRupiah(posBalances.rekR)}</h4>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 flex justify-between items-center text-xs font-bold print:border-black print:bg-slate-100">
                <span className="text-slate-400 print:text-black">TOTAL KAS BERSIH PERUSAHAAN</span>
                <span className="text-brand-emerald text-sm font-black print:text-black">
                  {formatRupiah(posBalances.cash + posBalances.rekY + posBalances.rekN + posBalances.rekR)}
                </span>
              </div>
            </div>

            {/* Bagian 3: Catatan Penunjang Laporan Keuangan */}
            <div className="space-y-4 mt-8 print:mt-6">
              <h3 className="text-sm font-extrabold text-white border-l-4 border-rose-500 pl-2.5 uppercase tracking-wider print:text-black print:border-black">
                III. Catatan Penunjang Laporan (Usaha & Metrik)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 text-xs">
                {/* Metrik Cafe */}
                <div className="p-4 rounded-xl border border-slate-850 bg-slate-900/20 space-y-3 print:border-black print:bg-transparent">
                  <h4 className="font-bold text-amber-500 uppercase tracking-wide print:text-black">Segmen Cafe</h4>
                  <ul className="space-y-1.5 text-slate-350 print:text-black">
                    <li className="flex justify-between">
                      <span className="text-slate-500 print:text-slate-600">Total Produk Terjual:</span>
                      <span className="font-bold text-white print:text-black">{cafeAnalytics.totalItems} unit</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500 print:text-slate-600">Rata-rata Penjualan Harian:</span>
                      <span className="font-bold text-white print:text-black">{cafeAnalytics.avgItemsPerDay} unit</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500 print:text-slate-600">Rata-rata Nilai Struk (AOV):</span>
                      <span className="font-bold text-white print:text-black">{formatRupiah(cafeAnalytics.aov)}</span>
                    </li>
                  </ul>
                </div>

                {/* Metrik Carwash */}
                <div className="p-4 rounded-xl border border-slate-850 bg-slate-900/20 space-y-3 print:border-black print:bg-transparent">
                  <h4 className="font-bold text-brand-blue uppercase tracking-wide print:text-black">Segmen Carwash</h4>
                  <ul className="space-y-1.5 text-slate-350 print:text-black">
                    <li className="flex justify-between">
                      <span className="text-slate-500 print:text-slate-600">Total Kendaraan Dicuci:</span>
                      <span className="font-bold text-white print:text-black">{carwashAnalytics.totalUnits} unit</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500 print:text-slate-600">Rata-rata Cuci Harian:</span>
                      <span className="font-bold text-white print:text-black">{carwashAnalytics.avgCarsPerDay} unit</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500 print:text-slate-600">Pengeluaran Komisi Pencuci:</span>
                      <span className="font-bold text-white print:text-black">{formatRupiah(reportsAnalytics.carwashHpp)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer Lembar Laporan Cetak */}
            <div className="hidden print:flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-200 mt-12 pt-4">
              <span>Dicetak otomatis oleh Jaya Bersama POS System</span>
              <span>Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</span>
              <div className="flex flex-col items-center gap-1">
                <span>Divalidasi Oleh:</span>
                <span className="font-bold mt-8 text-black border-t border-black px-6 text-center">Owner / Manajemen</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL KUNJUNGAN CUSTOMER */}
      {activeCustomerDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-slate-700 shadow-2xl animate-pop-in space-y-6 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 shrink-0">
              <div>
                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${activeCustomerDetail.categoryColor}`}>
                  {activeCustomerDetail.category}
                </span>
                <h3 className="font-mono text-3xl font-black text-white tracking-widest uppercase mt-1">
                  {activeCustomerDetail.plat}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 capitalize">
                  🚗 {activeCustomerDetail.model} • 📞 {activeCustomerDetail.noTelepon}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerPlat(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Kunjungan</span>
                <h4 className="text-xl font-black text-cyan-400 mt-0.5">{activeCustomerDetail.totalVisits} Kali</h4>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Pengeluaran</span>
                <h4 className="text-base font-black text-brand-emerald mt-0.5">{formatRupiah(activeCustomerDetail.totalSpent)}</h4>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Paket Favorit</span>
                <h4 className="text-xs font-bold text-amber-400 truncate mt-1">{activeCustomerDetail.favPkg}</h4>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="font-bold text-sm text-slate-300">Histori Lengkap Kunjungan:</h4>
              {activeCustomerDetail.visitsHistory.map((visit, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-cyan-400 text-xs">
                        Kunjungan Ke-{visit.visitNumber}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {visit.tanggal} {visit.jam && `• ${visit.jam}`}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-200">{visit.paket}</p>
                    <p className="text-[10px] text-slate-500">
                      Ukuran: {visit.ukuran} • Variant: {visit.variant} • Pencuci: {visit.pencuci}
                    </p>
                  </div>
                  <span className="font-extrabold text-emerald-400 text-sm shrink-0">
                    {formatRupiah(visit.harga)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL TRANSAKSI PENGELUARAN */}
      {selectedExpenseDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-700 shadow-2xl animate-pop-in space-y-4 max-h-[75vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-white">Rincian Transaksi Pengeluaran</h3>
                <p className="text-[10px] text-rose-450 font-bold uppercase tracking-wider">{selectedExpenseDetail.name}</p>
              </div>
              <button
                onClick={() => setSelectedExpenseDetail(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedExpenseDetail.items.length === 0 ? (
                <p className="text-slate-500 text-xs italic text-center py-8">Tidak ada rincian transaksi.</p>
              ) : (
                [...selectedExpenseDetail.items]
                  .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                  .map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex justify-between items-center text-xs">
                      <div className="space-y-1 max-w-[70%]">
                        <span className="text-[10px] text-slate-500 font-semibold block">{item.tanggal}</span>
                        <p className="font-semibold text-slate-200 leading-relaxed">{item.keterangan}</p>
                      </div>
                      <span className="font-black text-rose-400 text-sm shrink-0">
                        {formatRupiah(item.nominal)}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
