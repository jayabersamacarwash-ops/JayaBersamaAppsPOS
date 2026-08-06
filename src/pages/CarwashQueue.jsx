import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Car, 
  Clock, 
  User, 
  Users, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search
} from 'lucide-react'

const CarwashQueue = () => {
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState([])
  const [filterType, setFilterType] = useState('ALL') // 'ALL', 'TUNGGU', 'TINGGAL'
  const [statusTab, setStatusTab] = useState('Pending') // 'Pending' or 'Selesai'
  const [searchQuery, setSearchQuery] = useState('')

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const todayDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

      const { data, error } = await supabase
        .from('carwash')
        .select(`
          id_transaksi,
          id_struk,
          kehadiran,
          variant,
          ukuran,
          paket,
          anggota_1,
          anggota_2,
          plat,
          harga,
          status,
          created_at,
          tanggal,
          jam,
          struk (
            kasir
          )
        `)
        .eq('tanggal', todayDate)
        .order('jam', { ascending: true })

      if (error) throw error

      let formattedData = []
      if (data) {
        formattedData = data.map(item => ({
          id: item.id_transaksi,
          platNomor: item.plat,
          kehadiran: item.kehadiran,
          variant: item.variant,
          ukuran: item.ukuran,
          paket: item.paket,
          anggota1: item.anggota_1,
          anggota2: item.anggota_2,
          harga: item.harga,
          strukId: item.id_struk,
          createdAt: item.created_at,
          tanggal: item.tanggal,
          jam: item.jam,
          statusBayar: item.status || 'Pending',
          kasir: item.struk?.kasir || 'Staff'
        }))
      }

      // Gunakan data antrean riil tanpa fallback (sudah diurutkan berdasarkan jam oleh database)
      setQueue(formattedData)
    } catch (err) {
      console.error('Error fetching queue:', err)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe Real-time Update
  useEffect(() => {
    fetchQueue()

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'carwash' },
        () => {
          fetchQueue()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const calculateDuration = (tanggal, jam) => {
    if (!tanggal || !jam) return 'Tidak diketahui'
    
    // Bersihkan titik jika ada di jam (misal 14.30.00 -> 14:30:00)
    const cleanJam = jam.replace(/\./g, ':')
    
    // Gabungkan tanggal dan jam menjadi ISO string YYYY-MM-DDTHH:MM:SS
    const checkInDateTime = new Date(`${tanggal}T${cleanJam}`)
    
    if (isNaN(checkInDateTime.getTime())) return 'Format salah'
    
    const diffMs = Date.now() - checkInDateTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 0) return 'Baru saja'
    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} menit`
    
    const diffHrs = Math.floor(diffMins / 60)
    const remainMins = diffMins % 60
    return remainMins > 0 ? `${diffHrs} jam ${remainMins} menit` : `${diffHrs} jam`
  }

  const filteredQueue = queue.filter(item => {
    const matchesTab = item.statusBayar === statusTab
    const matchesFilter = filterType === 'ALL' || item.kehadiran === filterType
    const matchesSearch = item.platNomor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.paket.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesFilter && matchesSearch
  })

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent flex items-center gap-3">
            <Car size={32} className="text-brand-blue" />
            Antrean Carwash
          </h1>
          <p className="text-slate-400 text-sm mt-1">Status pengerjaan cuci mobil real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="p-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Antrean"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Top Status Tabs */}
      <div className="flex gap-6 border-b border-slate-800/80 mb-6">
        <button
          onClick={() => setStatusTab('Pending')}
          className={`pb-3 px-2 font-extrabold text-sm transition-all border-b-2 relative ${
            statusTab === 'Pending' 
              ? 'text-amber-500 border-amber-500' 
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className={statusTab === 'Pending' ? 'animate-pulse' : ''} />
            Dalam Proses (Pending)
          </div>
          {statusTab === 'Pending' && (
            <div className="absolute inset-x-0 -bottom-[2px] h-[2px] bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse-glow"></div>
          )}
        </button>
        <button
          onClick={() => setStatusTab('Selesai')}
          className={`pb-3 px-2 font-extrabold text-sm transition-all border-b-2 relative ${
            statusTab === 'Selesai' 
              ? 'text-brand-emerald border-brand-emerald' 
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            Selesai
          </div>
          {statusTab === 'Selesai' && (
            <div className="absolute inset-x-0 -bottom-[2px] h-[2px] bg-brand-emerald shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse-glow"></div>
          )}
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4 border border-slate-800/80 shrink-0">
        {/* Tab Filters */}
        <div className="flex bg-slate-950 p-1.5 rounded-lg border border-slate-800/80 self-start">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterType === 'ALL' ? 'bg-brand-blue text-slate-950 shadow-md shadow-brand-blue/15' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({queue.filter(q => q.statusBayar === statusTab).length})
          </button>
          <button
            onClick={() => setFilterType('TUNGGU')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterType === 'TUNGGU' ? 'bg-brand-blue text-slate-950 shadow-md shadow-brand-blue/15' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ditunggu ({queue.filter(q => q.kehadiran === 'TUNGGU' && q.statusBayar === statusTab).length})
          </button>
          <button
            onClick={() => setFilterType('TINGGAL')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterType === 'TINGGAL' ? 'bg-brand-blue text-slate-950 shadow-md shadow-brand-blue/15' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ditinggal ({queue.filter(q => q.kehadiran === 'TINGGAL' && q.statusBayar === statusTab).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative md:w-80">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Cari plat nomor atau paket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue text-xs"
          />
        </div>
      </div>

      {/* Queue Card Grid */}
      {filteredQueue.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl flex flex-col items-center justify-center text-slate-600 border border-slate-800/80">
          <Car size={48} className="mb-3 text-slate-700" />
          <p className="text-sm font-semibold">Tidak ada antrean cuci mobil saat ini.</p>
          <p className="text-xs text-slate-700 mt-1">Gunakan POS Kasir untuk menambahkan mobil baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden">
          {filteredQueue.map((item, idx) => {
            const isTunggu = item.kehadiran === 'TUNGGU'
            const isSelesai = item.statusBayar === 'Selesai'

            return (
              <div 
                key={item.id} 
                className={`glass-panel p-5 rounded-2xl border transition-all duration-500 relative group flex flex-col justify-between animate-slide-up hover:-translate-y-1 hover:shadow-xl ${
                  isSelesai 
                    ? 'border-brand-emerald/30 bg-brand-emerald/5 hover:shadow-brand-emerald/10' 
                    : isTunggu 
                      ? 'border-brand-blue/30 bg-brand-blue/5 hover:shadow-brand-blue/10 overflow-hidden' 
                      : 'border-slate-800 hover:border-slate-700'
                }`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Shimmer Effect for Pending & Tunggu */}
                {!isSelesai && isTunggu && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-blue/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none"></div>
                )}
                {/* Status Badges */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase border ${
                    isTunggu 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>
                    {item.kehadiran}
                  </span>
                  
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1 border ${
                    isSelesai 
                      ? 'bg-brand-emerald/15 text-brand-emerald border-brand-emerald/20' 
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                  }`}>
                    {isSelesai ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                    {item.statusBayar}
                  </span>
                </div>

                {/* Main Vehicle Info */}
                <div>
                  <h3 className="font-mono text-2xl font-black tracking-wider text-slate-100 uppercase group-hover:text-brand-blue transition-colors">
                    {item.platNomor}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold text-slate-400">{item.paket}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {item.ukuran} Vehicle • {item.variant}
                    </p>
                  </div>
                </div>

                {/* Details / Workers */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                  {/* Crew Assignment */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      {item.anggota2 ? <Users size={13} className="text-slate-500" /> : <User size={13} className="text-slate-500" />}
                      Kru Pencuci
                    </span>
                    <span className="font-bold text-slate-200">
                      {item.anggota1} {item.anggota2 && `+ ${item.anggota2}`}
                    </span>
                  </div>

                  {/* Waiting Time */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      Durasi Antrean
                    </span>
                    <span className="font-medium">
                      {calculateDuration(item.tanggal, item.jam)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CarwashQueue
