import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Car, 
  Clock, 
  User, 
  Users, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react'

const CarwashQueue = () => {
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [filterType, setFilterType] = useState('ALL') // 'ALL', 'TUNGGU', 'TINGGAL'
  const [statusTab, setStatusTab] = useState('Pending') // 'Pending' or 'Selesai'
  const [searchQuery, setSearchQuery] = useState('')

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
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
        .eq('tanggal', selectedDate)
        .order('jam', { ascending: true })

      if (error) {
        console.error('Error fetching carwash queue:', error)
        setQueue([])
        return
      }

      let formattedData = []
      if (Array.isArray(data)) {
        formattedData = data.map((item) => ({
          id: item.id_transaksi || `cw_${Math.random()}`,
          platNomor: item.plat || '-',
          kehadiran: (item.kehadiran || 'TUNGGU').toUpperCase(),
          variant: item.variant || '-',
          ukuran: item.ukuran || 'Sedang',
          paket: item.paket || 'Cuci Standar',
          anggota1: item.anggota_1 || '-',
          anggota2: item.anggota_2 || '',
          harga: parseFloat(item.harga) || 0,
          strukId: item.id_struk || '',
          createdAt: item.created_at || '',
          tanggal: item.tanggal || selectedDate,
          jam: item.jam || '00:00:00',
          statusBayar: item.status || 'Pending',
          kasir: item.struk?.kasir || 'Staff',
        }))
      }

      setQueue(formattedData)

      // Auto-switch tab to Selesai if there are no pending cars, but completed cars exist
      const pendingCount = formattedData.filter((q) => q.statusBayar === 'Pending').length
      const selesaiCount = formattedData.filter((q) => q.statusBayar === 'Selesai').length
      if (pendingCount === 0 && selesaiCount > 0) {
        setStatusTab('Selesai')
      }
    } catch (err) {
      console.error('Unexpected error in fetchQueue:', err)
      setQueue([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  // Real-time subscription with resilient fallback
  useEffect(() => {
    fetchQueue()

    let channel = null
    try {
      if (typeof supabase?.channel === 'function') {
        channel = supabase
          .channel('carwash-queue-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'carwash' },
            () => {
              fetchQueue()
            }
          )
          .subscribe()
      }
    } catch (err) {
      console.warn('Realtime channel subscription skipped:', err)
    }

    return () => {
      try {
        if (channel && typeof supabase?.removeChannel === 'function') {
          supabase.removeChannel(channel)
        }
      } catch (err) {
        // Safe ignore
      }
    }
  }, [fetchQueue])

  const calculateDuration = (tanggal, jam) => {
    if (!tanggal || !jam) return 'Tidak diketahui'
    const cleanJam = jam.replace(/\./g, ':')
    const checkInDateTime = new Date(`${tanggal}T${cleanJam}`)
    
    if (isNaN(checkInDateTime.getTime())) return jam
    
    const diffMs = Date.now() - checkInDateTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 0) return 'Baru saja'
    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} menit`
    
    const diffHrs = Math.floor(diffMins / 60)
    const remainMins = diffMins % 60
    return remainMins > 0 ? `${diffHrs}j ${remainMins}m` : `${diffHrs} jam`
  }

  // Counts for Badges
  const pendingItems = queue.filter((item) => item.statusBayar === 'Pending')
  const selesaiItems = queue.filter((item) => item.statusBayar === 'Selesai')

  const filteredQueue = queue.filter((item) => {
    const matchesTab = item.statusBayar === statusTab
    const matchesFilter = filterType === 'ALL' || item.kehadiran === filterType
    const matchesSearch = 
      (item.platNomor || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.paket || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.anggota1 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.anggota2 || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesFilter && matchesSearch
  })

  const isToday = selectedDate === new Date().toLocaleDateString('en-CA')

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span className="p-2.5 bg-brand-blue/15 text-brand-blue rounded-xl border border-brand-blue/20">
              <Car size={24} />
            </span>
            Antrean Carwash
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Status pengerjaan cuci mobil & kru pencuci real-time
          </p>
        </div>

        {/* Date Selector & Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Calendar size={14} className="text-brand-blue shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs cursor-pointer font-medium"
            />
          </div>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA'))}
              className="px-3 py-1.5 bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue border border-brand-blue/30 rounded-xl text-xs font-bold transition-all"
            >
              Hari Ini
            </button>
          )}

          <button
            onClick={fetchQueue}
            disabled={loading}
            className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Antrean"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-brand-blue' : ''} />
          </button>
        </div>
      </div>

      {/* Status Tabs with Live Count Badges */}
      <div className="flex gap-4 border-b border-slate-800 pb-1">
        <button
          onClick={() => setStatusTab('Pending')}
          className={`pb-3 px-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2.5 relative ${
            statusTab === 'Pending'
              ? 'text-amber-400 border-amber-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Clock size={16} className={statusTab === 'Pending' && pendingItems.length > 0 ? 'animate-pulse' : ''} />
          <span>Dalam Proses</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            pendingItems.length > 0 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            {pendingItems.length}
          </span>
          {statusTab === 'Pending' && (
            <div className="absolute inset-x-0 -bottom-[2px] h-[2px] bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
          )}
        </button>

        <button
          onClick={() => setStatusTab('Selesai')}
          className={`pb-3 px-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2.5 relative ${
            statusTab === 'Selesai'
              ? 'text-emerald-400 border-emerald-500'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <CheckCircle size={16} />
          <span>Selesai Dicuci</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            selesaiItems.length > 0 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            {selesaiItems.length}
          </span>
          {statusTab === 'Selesai' && (
            <div className="absolute inset-x-0 -bottom-[2px] h-[2px] bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
          )}
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-slate-900/60 p-3.5 rounded-2xl flex flex-col md:flex-row justify-between gap-3 border border-slate-800/80 backdrop-blur-md">
        {/* Kehadiran Filter (Tunggu / Tinggal) */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'ALL' 
                ? 'bg-brand-blue text-slate-950 shadow-md shadow-brand-blue/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({queue.filter((q) => q.statusBayar === statusTab).length})
          </button>
          <button
            onClick={() => setFilterType('TUNGGU')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'TUNGGU' 
                ? 'bg-brand-blue text-slate-950 shadow-md shadow-brand-blue/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ditunggu ({queue.filter((q) => q.kehadiran === 'TUNGGU' && q.statusBayar === statusTab).length})
          </button>
          <button
            onClick={() => setFilterType('TINGGAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'TINGGAL' 
                ? 'bg-brand-blue text-slate-950 shadow-md shadow-brand-blue/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ditinggal ({queue.filter((q) => q.kehadiran === 'TINGGAL' && q.statusBayar === statusTab).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative md:w-80">
          <Search className="absolute left-3.5 top-2.5 text-slate-500" size={15} />
          <input
            type="text"
            placeholder="Cari plat nomor, paket, atau kru..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue text-xs transition-colors"
          />
        </div>
      </div>

      {/* Queue Card Grid / Empty State */}
      {loading ? (
        <div className="bg-slate-900/40 p-16 rounded-2xl flex flex-col items-center justify-center text-slate-400 border border-slate-800/80">
          <RefreshCw size={36} className="animate-spin text-brand-blue mb-3" />
          <p className="text-sm font-semibold text-slate-300">Memuat antrean carwash...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="bg-slate-900/40 p-12 sm:p-16 rounded-2xl flex flex-col items-center justify-center text-center border border-slate-800/80">
          {statusTab === 'Pending' && selesaiItems.length > 0 ? (
            <>
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
                <Sparkles size={28} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Semua Kendaraan Sudah Selesai Dicuci
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-5">
                Tidak ada mobil dalam proses antrean saat ini. Sebanyak <strong className="text-emerald-400">{selesaiItems.length} mobil</strong> telah selesai dikerjakan pada {selectedDate}.
              </p>
              <button
                onClick={() => setStatusTab('Selesai')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                <span>Lihat Mobil Selesai</span>
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-slate-800/60 text-slate-500 rounded-2xl flex items-center justify-center mb-4 border border-slate-800">
                <Car size={28} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Tidak Ada Antrean Cuci Mobil
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-2">
                Tidak ditemukan data kendaraan pada {selectedDate} untuk filter ini.
              </p>
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA'))}
                  className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-all border border-slate-700"
                >
                  Kembali ke Hari Ini
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredQueue.map((item, idx) => {
            const isTunggu = item.kehadiran === 'TUNGGU'
            const isSelesai = item.statusBayar === 'Selesai'

            return (
              <div
                key={item.id}
                className={`bg-slate-900/70 p-5 rounded-2xl border transition-all duration-300 relative flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl ${
                  isSelesai
                    ? 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50'
                    : isTunggu
                      ? 'border-brand-blue/30 bg-blue-950/10 hover:border-brand-blue/50'
                      : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Kehadiran & Status Bayar */}
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                      isTunggu
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    }`}
                  >
                    {item.kehadiran}
                  </span>

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 border ${
                      isSelesai
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isSelesai ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                    {item.statusBayar}
                  </span>
                </div>

                {/* Main Vehicle Information */}
                <div>
                  <h3 className="font-mono text-2xl font-black tracking-wider text-white uppercase group-hover:text-brand-blue transition-colors">
                    {item.platNomor}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-bold text-slate-300">{item.paket}</p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {item.ukuran} • {item.variant}
                    </p>
                  </div>
                </div>

                {/* Workers & Time Footer */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2.5">
                  {/* Crew Assignment */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      {item.anggota2 ? <Users size={13} className="text-slate-500" /> : <User size={13} className="text-slate-500" />}
                      Kru Pencuci:
                    </span>
                    <span className="font-bold text-slate-200">
                      {item.anggota1} {item.anggota2 ? `+ ${item.anggota2}` : ''}
                    </span>
                  </div>

                  {/* Check-in Jam / Waiting Time */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Clock size={13} />
                      Jam Masuk:
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {item.jam} ({calculateDuration(item.tanggal, item.jam)})
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
