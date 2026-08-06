import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  ShoppingCart, 
  Car, 
  Coffee, 
  Search,
  CheckCircle,
  AlertCircle,
  Wallet,
  History,
  ChevronRight
} from 'lucide-react'

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const getMenuPhoto = (menuName) => {
  const name = String(menuName).toLowerCase()
  if (name.includes('le mineral') || name.includes('air mineral')) {
    return 'https://images.unsplash.com/photo-1608885898957-a599fb18ec3f?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('badak')) {
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('americano')) {
    return 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('sanger') || name.includes('kopi susu')) {
    return 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('late')) {
    return 'https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('teh')) {
    return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('ayam penyet') || name.includes('ayam geprek')) {
    return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('sosis')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('nugget')) {
    return 'https://images.unsplash.com/photo-1562967914-6c82c65e4ff8?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('kentang')) {
    return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('nasi goreng')) {
    return 'https://images.unsplash.com/photo-1617470703128-26a0fc9af10f?w=400&auto=format&fit=crop&q=60'
  }
  if (name.includes('indomie') || name.includes('mie')) {
    return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=60'
  }
  return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop&q=60'
}

const CafePOS = () => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('cafe') // 'cafe' or 'carwash'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Master Data dari DB
  const [cashiers, setCashiers] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [resepList, setResepList] = useState([])

  // Form State
  const [selectedCashier, setSelectedCashier] = useState('')
  const [selectedPayment, setSelectedPayment] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('Pending') // 'Pending' or 'Selesai'

  // Modal Hari Ini (Starting Capital)
  const [showModalModal, setShowModalModal] = useState(false)
  const [startingCapitalInput, setStartingCapitalInput] = useState('')
  const [hasStartingCapital, setHasStartingCapital] = useState(true)
  const [todayStartingCapital, setTodayStartingCapital] = useState(0)

  // Pending Bills States
  const [pendingBills, setPendingBills] = useState([])
  const [settlingBill, setSettlingBill] = useState(null)
  
  // Cashier Cash Register Stats
  const [cashierCash, setCashierCash] = useState({
    balance: 0,
    todayIn: 0,
    todayOut: 0,
    todayQRIS: 0
  })
  const [todayTransactions, setTodayTransactions] = useState([])
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('')

  // POS State - Cafe
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState([])
  const [showMobileCart, setShowMobileCart] = useState(false)

  // POS State - Carwash
  const [carwashForm, setCarwashForm] = useState({
    kehadiran: 'TUNGGU',
    variant: 'Regular',
    ukuran: 'Small',
    paket: 'PAKET CUCI BIASA',
    anggota1: 'ANGGA',
    anggota2: '',
    platNomor: '',
    model: 'Mobil',
    noTelepon: '',
    harga: 50000,
    customHarga: 100000,
    gaji_pencuci: 16000
  })
  const [hasCarwash, setHasCarwash] = useState(false)

  // ENUM Options (Static fields)
  const kehadiranOptions = ['TUNGGU', 'TINGGAL']
  const variantOptions = ['Regular', 'Body only']
  const ukuranOptions = ['Small', 'Medium', 'Large', 'Extra Large', 'Custom']

  const paketOptions = [
    { nama: 'PAKET CUCI BIASA' },
    { nama: 'PAKET KACA BENING (CUCI + JAMUR KACA)' },
    { nama: 'PAKET DAUN TALAS (CUCI + WAX KACA)' },
    { nama: 'PAKET JURAGAN (CUCI + JAMUR KACA + WAX KACA)' },
    { nama: 'PAKET GLOW UP (CUCI + WAX BODY)' },
    { nama: 'PAKET PEJABAT (CUCI + JAMUR BODY + WAX BODY)' },
    { nama: 'PAKET SULTAN (FULL EXTERIOR)' }
  ]
  const [anggotaOptions, setAnggotaOptions] = useState(['ANGGA', 'FERRY', 'RAHMAN', 'FAISAL', 'BAGUS', 'VICKY', 'NOPAL', 'EZA'])

  // Load Master Data
  const loadMasterData = async () => {
    try {
      const [dbCashiers, dbPayments, dbMenu, dbResep] = await Promise.all([
        supabase.from('kasir').select('*').eq('is_active', true),
        supabase.from('metode_bayar').select('*').eq('is_active', true),
        supabase.from('daftar_harga_menu').select('*'),
        supabase.from('resep').select('*')
      ])

      const defaultCashiers = dbCashiers.data || []
      const defaultPayments = dbPayments.data || []
      const defaultMenus = dbMenu.data 
        ? dbMenu.data.map(m => ({ ...m, nama_menu: m.daftar_menu }))
        : []
      const defaultResep = dbResep.data || []

      setCashiers(defaultCashiers)
      setPaymentMethods(defaultPayments)
      setMenuItems(defaultMenus)
      setResepList(defaultResep)

      // Fetch dynamic washing employees from karyawan_cuci
      try {
        const { data: dbKaryawan, error: karyawanErr } = await supabase
          .from('karyawan_cuci')
          .select('*')
          .order('nama', { ascending: true })

        if (!karyawanErr && dbKaryawan && dbKaryawan.length > 0) {
          const names = dbKaryawan.map(k => k.nama.toUpperCase().trim())
          setAnggotaOptions(names)
          setCarwashForm(prev => ({
            ...prev,
            anggota1: names[0] || 'ANGGA'
          }))
        }
      } catch (err) {
        console.warn('Fallback to static washing employees:', err)
      }

      if (profile && profile.role === 'Kasir') {
        setSelectedCashier(profile.nama ? profile.nama.toUpperCase() : '')
      } else if (defaultCashiers.length > 0) {
        setSelectedCashier(defaultCashiers[0].nama ? defaultCashiers[0].nama.toUpperCase() : '')
      }

      if (defaultPayments.length > 0) setSelectedPayment(defaultPayments[0].nama)

      await fetchPendingBills()
      await fetchCashierCash()
      await fetchTodayTransactions()

    } catch (err) {
      console.error('Error loading master data:', err)
    }
  }

  const fetchCashierCash = async () => {
    try {
      // 1. Fetch balance dari pos_balances
      const { data: balData } = await supabase
        .from('pos_balances')
        .select('*')
        .eq('pos', 'SALDO CASH')
        .single()
      
      const bal = balData ? parseFloat(balData.balance) : 0

      // 2. Fetch today's cash inflow
      const todayDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
      const { data: todayStruk } = await supabase
        .from('struk')
        .select('total_tagihan')
        .eq('status_bayar', 'Selesai')
        .eq('metode_bayar', 'CASH')
        .eq('tanggal', todayDate)
      
      const todayIn = todayStruk ? todayStruk.reduce((sum, item) => sum + parseFloat(item.total_tagihan || 0), 0) : 0

      // 3. Fetch today's cash outflow
      const { data: todayExp } = await supabase
        .from('pengeluaran')
        .select('nominal')
        .eq('tanggal', todayDate)

      const todayOut = todayExp ? todayExp.reduce((sum, item) => sum + parseFloat(item.nominal || 0), 0) : 0

      // 4. Fetch today's QRIS inflow
      const { data: todayQRISData } = await supabase
        .from('struk')
        .select('total_tagihan')
        .eq('status_bayar', 'Selesai')
        .eq('metode_bayar', 'QRIS')
        .eq('tanggal', todayDate)
      
      const todayQRIS = todayQRISData ? todayQRISData.reduce((sum, item) => sum + parseFloat(item.total_tagihan || 0), 0) : 0

      setCashierCash({
        balance: bal,
        todayIn: todayIn,
        todayOut: todayOut,
        todayQRIS: todayQRIS
      })
    } catch (err) {
      console.error('Error fetching cashier cash status:', err)
    }
  }

  const fetchTodayTransactions = async () => {
    try {
      const todayDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
      const { data, error } = await supabase
        .from('struk')
        .select(`
          id_struk,
          tanggal,
          jam,
          kasir,
          total_tagihan,
          metode_bayar,
          status_bayar,
          nama_pelanggan,
          cafe (nama_menu, qty, harga_satuan),
          carwash (paket, plat, harga)
        `)
        .eq('tanggal', todayDate)
        .order('jam', { ascending: false })

      if (error) throw error

      if (data) {
        const formatted = data.map(item => ({
          id: item.id_struk,
          jam: item.jam,
          kasir: item.kasir,
          total_harga: item.total_tagihan,
          metode_bayar: item.metode_bayar,
          status_bayar: item.status_bayar,
          nama_pelanggan: item.nama_pelanggan,
          cafe: (item.cafe || []).map(c => ({
            nama_menu: c.nama_menu,
            jumlah: c.qty,
            harga_satuan: c.harga_satuan
          })),
          carwash: (item.carwash || []).map(cw => ({
            paket: cw.paket,
            plat_nomor: cw.plat,
            harga: cw.harga
          }))
        }))
        setTodayTransactions(formatted)
      } else {
        setTodayTransactions([])
      }
    } catch (err) {
      console.error('Error fetching today transactions:', err)
    }
  }

  const fetchPendingBills = async () => {
    try {
      const { data, error } = await supabase
        .from('struk')
        .select(`
          id_struk,
          tanggal,
          jam,
          kasir,
          total_tagihan,
          metode_bayar,
          cafe (nama_menu, qty, harga_satuan),
          carwash (paket, plat, harga)
        `)
        .eq('status_bayar', 'Pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      if (data) {
        const formatted = data.map(item => ({
          id: item.id_struk,
          created_at: `${item.tanggal}T${item.jam || '00:00:00'}`,
          kasir: item.kasir,
          total_harga: item.total_tagihan,
          metode_bayar: item.metode_bayar,
          cafe: (item.cafe || []).map(c => ({
            nama_menu: c.nama_menu,
            jumlah: c.qty,
            harga_satuan: c.harga_satuan
          })),
          carwash: (item.carwash || []).map(cw => ({
            paket: cw.paket,
            plat_nomor: cw.plat,
            harga: cw.harga
          }))
        }))
        setPendingBills(formatted)
      } else {
        setPendingBills([])
      }
    } catch (err) {
      console.error('Error fetching pending bills:', err)
    }
  }

  const checkTodayStartingCapital = async () => {
    try {
      const todayDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
      const localCapital = localStorage.getItem(`starting_capital_${todayDate}`)
      
      if (localCapital !== null) {
        setHasStartingCapital(true)
        setTodayStartingCapital(parseFloat(localCapital) || 0)
      } else {
        setHasStartingCapital(false)
        setShowModalModal(true)
      }
    } catch (err) {
      console.error('Error checking starting capital:', err)
    }
  }

  const handleSaveStartingCapital = async (e) => {
    e.preventDefault()
    const amount = parseFloat(startingCapitalInput)
    if (isNaN(amount) || amount < 0) {
      return setError('Modal awal harus berupa angka positif.')
    }
    setLoading(true)
    setError('')
    try {
      const todayDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
      localStorage.setItem(`starting_capital_${todayDate}`, amount.toString())

      setHasStartingCapital(true)
      setShowModalModal(false)
      setTodayStartingCapital(amount)
      setStartingCapitalInput('')
      await fetchCashierCash()
    } catch (err) {
      console.error('Error saving starting capital:', err)
      setError('Gagal menyimpan modal awal secara lokal.')
    } finally {
      setLoading(false)
    }
  }

  const handleTutupKasir = async () => {
    if (!window.confirm('Apakah Anda yakin ingin Tutup Kasir hari ini? Ini akan merekap total omzet (Cash & QRIS) ke dalam tabel Cashflow. Lakukan ini HANYA SEKALI di akhir shift terakhir.')) return
    setLoading(true)
    setError('')
    try {
      const todayDate = new Date().toLocaleDateString('en-CA')
      
      const { data: strukHariIni, error: errStruk } = await supabase
        .from('struk')
        .select('total_tagihan, metode_bayar')
        .eq('status_bayar', 'Selesai')
        .eq('tanggal', todayDate)
        
      if (errStruk) throw errStruk

      let totalCash = 0
      let totalQRIS = 0
      
      if (strukHariIni) {
        strukHariIni.forEach(s => {
           if (s.metode_bayar === 'CASH') totalCash += parseFloat(s.total_tagihan || 0)
           else if (s.metode_bayar === 'QRIS') totalQRIS += parseFloat(s.total_tagihan || 0)
        })
      }

      const insertions = []
      const timestamp = new Date().toISOString()
      
      if (totalCash > 0) {
        insertions.push({
          id_cashflow: generateUUID(),
          tanggal: todayDate,
          jenis: 'Pemasukan',
          kategori: 'Omzet Harian (CASH)',
          pemasukan: totalCash,
          pengeluaran: 0,
          pos: 'SALDO CASH',
          keterangan_transaksi: `Rekap Tutup Kasir (CASH) - Kasir: ${selectedCashier}`,
          created_at: timestamp
        })
      }

      if (totalQRIS > 0) {
        insertions.push({
          id_cashflow: generateUUID(),
          tanggal: todayDate,
          jenis: 'Pemasukan',
          kategori: 'Omzet Harian (QRIS)',
          pemasukan: totalQRIS,
          pengeluaran: 0,
          pos: 'SALDO REKENING Y',
          keterangan_transaksi: `Rekap Tutup Kasir (QRIS) - Kasir: ${selectedCashier}`,
          created_at: timestamp
        })
      }

      if (insertions.length > 0) {
        const { error: insErr } = await supabase.from('cashflow').insert(insertions)
        if (insErr) throw insErr
      }

      window.alert('Berhasil Tutup Kasir. Rekap Omzet Harian telah masuk ke Cashflow.')
    } catch (err) {
      console.error('Error Tutup Kasir:', err)
      window.alert('Gagal tutup kasir: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSettleBill = async (e) => {
    e.preventDefault()
    if (!settlingBill) return
    if (!settlePaymentMethod) return setError('Pilih metode pembayaran terlebih dahulu.')
    setLoading(true)
    setError('')
    try {
      const { error: strukErr } = await supabase
        .from('struk')
        .update({
          status_bayar: 'Selesai',
          metode_bayar: settlePaymentMethod,
          waktu_dibayar: new Date().toISOString()
        })
        .eq('id_struk', settlingBill.id)

      if (strukErr) throw strukErr

      // Update status carwash jika ada
      await supabase
        .from('carwash')
        .update({ status: 'Selesai' })
        .eq('id_struk', settlingBill.id)

      // Update status cafe jika ada
      await supabase
        .from('cafe')
        .update({ status: 'Selesai' })
        .eq('id_struk', settlingBill.id)

      setSuccess(true)
      setSettlingBill(null)
      setSettlePaymentMethod('')
      await fetchPendingBills()
      await fetchCashierCash()
      await fetchTodayTransactions()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error settling bill:', err)
      setError(err.message || 'Gagal menyelesaikan pembayaran.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBill = async (billId) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan transaksi ini? Transaksi yang dibatalkan tidak dapat dikembalikan.')) return
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      // 1. Update status_bayar di struk menjadi 'Batal'
      const { error: strukErr } = await supabase
        .from('struk')
        .update({ status_bayar: 'Batal' })
        .eq('id_struk', billId)

      if (strukErr) throw strukErr

      // 2. Update status di carwash (jika ada) menjadi 'Batal'
      await supabase
        .from('carwash')
        .update({ status: 'Batal' })
        .eq('id_struk', billId)

      // 3. Update status di cafe (jika ada) menjadi 'Batal'
      await supabase
        .from('cafe')
        .update({ status: 'Batal' })
        .eq('id_struk', billId)

      setSuccess(true)
      await fetchPendingBills()
      await fetchTodayTransactions()
      await fetchCashierCash()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Cancel bill error:', err)
      setError(err.message || 'Gagal membatalkan transaksi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMasterData()
    checkTodayStartingCapital()
  }, [])

  // Auto-fill car details based on plate number
  useEffect(() => {
    const plat = carwashForm.platNomor;
    if (!plat || plat.trim().length < 4) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const cleanPlat = plat.replace(/\s+/g, '').toUpperCase();
        const { data, error } = await supabase
          .from('carwash')
          .select('model, no_telepon, ukuran, variant, paket')
          .eq('plat', cleanPlat)
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const latest = data[0];
          setCarwashForm(prev => ({
            ...prev,
            model: latest.model || prev.model,
            noTelepon: latest.no_telepon || prev.noTelepon,
            ukuran: latest.ukuran || prev.ukuran,
            variant: latest.variant || prev.variant,
            paket: latest.paket || prev.paket
          }));
        }
      } catch (err) {
        console.error('Error fetching customer history:', err);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [carwashForm.platNomor]);

  // Update Harga Carwash otomatis berdasarkan ukuran, variant, dan paket (Sesuai flyer JB Carwash)
  useEffect(() => {
    const prices = {
      'PAKET CUCI BIASA': {
        Small: { Regular: 50000, 'Body only': 35000 },
        Medium: { Regular: 55000, 'Body only': 40000 },
        Large: { Regular: 60000, 'Body only': 45000 },
        'Extra Large': { Regular: 80000, 'Body only': 80000 }
      },
      'PAKET KACA BENING (CUCI + JAMUR KACA)': {
        Small: { Regular: 150000, 'Body only': 135000 },
        Medium: { Regular: 155000, 'Body only': 140000 },
        Large: { Regular: 160000, 'Body only': 145000 },
        'Extra Large': { Regular: 180000, 'Body only': 180000 }
      },
      'PAKET DAUN TALAS (CUCI + WAX KACA)': {
        Small: { Regular: 100000, 'Body only': 85000 },
        Medium: { Regular: 105000, 'Body only': 90000 },
        Large: { Regular: 110000, 'Body only': 95000 },
        'Extra Large': { Regular: 130000, 'Body only': 130000 }
      },
      'PAKET JURAGAN (CUCI + JAMUR KACA + WAX KACA)': {
        Small: { Regular: 200000, 'Body only': 185000 },
        Medium: { Regular: 205000, 'Body only': 190000 },
        Large: { Regular: 210000, 'Body only': 195000 },
        'Extra Large': { Regular: 230000, 'Body only': 230000 }
      },
      'PAKET GLOW UP (CUCI + WAX BODY)': {
        Small: { Regular: 100000, 'Body only': 85000 },
        Medium: { Regular: 110000, 'Body only': 95000 },
        Large: { Regular: 120000, 'Body only': 105000 },
        'Extra Large': { Regular: 160000, 'Body only': 160000 }
      },
      'PAKET PEJABAT (CUCI + JAMUR BODY + WAX BODY)': {
        Small: { Regular: 180000, 'Body only': 165000 },
        Medium: { Regular: 200000, 'Body only': 185000 },
        Large: { Regular: 220000, 'Body only': 205000 },
        'Extra Large': { Regular: 300000, 'Body only': 300000 }
      },
      'PAKET SULTAN (FULL EXTERIOR)': {
        Small: { Regular: 310000, 'Body only': 295000 },
        Medium: { Regular: 330000, 'Body only': 315000 },
        Large: { Regular: 350000, 'Body only': 335000 },
        'Extra Large': { Regular: 430000, 'Body only': 430000 }
      }
    }

    let finalHarga = 0
    if (carwashForm.ukuran === 'Custom') {
      finalHarga = parseFloat(carwashForm.customHarga) || 0
    } else {
      const pData = prices[carwashForm.paket] || prices['PAKET CUCI BIASA']
      const sizeData = pData[carwashForm.ukuran] || pData['Large']
      finalHarga = sizeData[carwashForm.variant] || sizeData['Regular'] || 0
    }

    // Gaji Pencuci Calculation
    const basicWashPrices = {
      Small: { Regular: 50000, 'Body only': 35000 },
      Medium: { Regular: 55000, 'Body only': 40000 },
      Large: { Regular: 60000, 'Body only': 45000 },
      'Extra Large': { Regular: 80000, 'Body only': 80000 },
      Custom: { Regular: 80000, 'Body only': 80000 }
    }
    const basicSize = basicWashPrices[carwashForm.ukuran] ? carwashForm.ukuran : 'Custom'
    const basicVar = carwashForm.variant === 'Body only' ? 'Body only' : 'Regular'
    const basicWashPrice = basicWashPrices[basicSize][basicVar]

    // Gaji Cuci: 1/3 dari harga cuci dasar (dibulatkan ke bawah)
    let gajiCuci = 0
    let washPortion = basicWashPrice
    if (carwashForm.ukuran === 'Custom') {
      washPortion = Math.min(finalHarga, basicWashPrice)
    }
    gajiCuci = Math.floor(washPortion / 3)

    // Gaji Paket: 1/2 dari sisa harga paketan (dibulatkan ke bawah)
    const treatmentPrice = Math.max(0, finalHarga - washPortion)
    const gajiPaket = Math.floor(treatmentPrice / 2)

    const totalGaji = gajiCuci + gajiPaket

    setCarwashForm(prev => ({ 
      ...prev, 
      harga: finalHarga,
      gaji_pencuci: totalGaji
    }))
  }, [carwashForm.paket, carwashForm.ukuran, carwashForm.variant, carwashForm.customHarga])

  // Cart Handlers
  const addToCart = (menu) => {
    setCart(prev => {
      const existing = prev.find(item => item.nama_menu === menu.nama_menu)
      if (existing) {
        return prev.map(item => 
          item.nama_menu === menu.nama_menu ? { ...item, qty: item.qty + 1 } : item
        )
      }
      return [...prev, { ...menu, qty: 1 }]
    })
  }

  const updateQty = (menuName, delta) => {
    setCart(prev => 
      prev.map(item => {
        if (item.nama_menu === menuName) {
          const newQty = item.qty + delta
          return newQty > 0 ? { ...item, qty: newQty } : null
        }
        return item
      }).filter(Boolean)
    )
  }

  const removeFromCart = (menuName) => {
    setCart(prev => prev.filter(item => item.nama_menu !== menuName))
  }

  // Calculate Totals
  const cafeTotal = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0)
  const carwashTotal = hasCarwash ? parseFloat(carwashForm.harga) : 0
  const grandTotal = cafeTotal + carwashTotal

  const getShiftForCashier = (cashierName) => {
    if (!cashierName) return 'Shift 1'
    const name = cashierName.toUpperCase()
    if (name === 'SYAFA') return 'Shift 2'
    if (name === 'ALEXA') return 'Shift 1'
    if (name === 'VIRA') return 'Shift 1'
    
    // Default shift based on time: sebelum jam 14.00 adalah Shift 1, setelahnya Shift 2
    const currentHour = new Date().getHours()
    return currentHour < 14 ? 'Shift 1' : 'Shift 2'
  }

  // Checkout Handler
  const handleCheckout = async () => {
    if (!selectedCashier) return setError('Pilih kasir terlebih dahulu.')
    if (paymentStatus === 'Selesai' && !selectedPayment) return setError('Pilih metode pembayaran.')
    if (cart.length === 0 && !hasCarwash) return setError('Keranjang belanja kosong.')
    if (hasCarwash && !carwashForm.platNomor) return setError('Plat nomor mobil wajib diisi.')

    // Validasi Resep Bahan Baku
    if (cart.length > 0) {
      const missingRecipes = []
      for (const item of cart) {
        const hasRecipe = resepList.some(r => r.nama_menu.toLowerCase() === item.nama_menu.toLowerCase())
        // Kita abaikan minuman botol/kemasan jika tidak ada di resep, asalkan mereka terdaftar di tabel stok langsung.
        // Tapi asumsikan kebijakan: semua menu Cafe yang dijual HARUS memiliki resep di master data.
        if (!hasRecipe) {
          missingRecipes.push(item.nama_menu)
        }
      }
      if (missingRecipes.length > 0) {
        return setError(`Gagal Checkout: Menu berikut belum memiliki resep bahan baku: ${missingRecipes.join(', ')}. Silakan atur resep terlebih dahulu di Kelola Admin.`)
      }
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const newStrukId = generateUUID()
      const todayDate = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
      const currentTime = new Date().toTimeString().split(' ')[0] // HH:MM:SS

      // 1. Simpan Transaksi Struk
      const effectivePayment = paymentStatus === 'Selesai' ? selectedPayment : (selectedPayment || paymentMethods[0]?.nama || 'CASH')
      const { error: strukErr } = await supabase
        .from('struk')
        .insert({
          id_struk: newStrukId,
          tanggal: todayDate,
          jam: currentTime,
          metode_bayar: effectivePayment,
          status_bayar: paymentStatus,
          kasir: selectedCashier.toUpperCase(),
          total_tagihan: grandTotal,
          waktu_dibuat: new Date().toISOString(),
          waktu_dibayar: paymentStatus === 'Selesai' ? new Date().toISOString() : null
        })

      if (strukErr) throw strukErr

      // 2. Simpan Item Cafe (jika ada)
      if (cart.length > 0) {
        const cafeItems = cart.map(item => ({
          id_detail: generateUUID(),
          id_struk: newStrukId,
          nama_menu: item.nama_menu,
          qty: item.qty,
          harga_satuan: item.harga,
          subtotal: item.qty * item.harga,
          status: paymentStatus
        }))

        const { error: cafeErr } = await supabase
          .from('cafe')
          .insert(cafeItems)

        if (cafeErr) throw cafeErr
      }

      // 3. Simpan Item Carwash (jika ada)
      if (hasCarwash) {
        const hasAnggota2 = carwashForm.anggota2 && carwashForm.anggota2.trim() ? true : false;
        const gajiPerAnggota = hasAnggota2 ? carwashForm.gaji_pencuci / 2 : carwashForm.gaji_pencuci;

        // Hitung harga_cuci dan harga_paket dasar
        const basicWashPrices = {
          Small: { Regular: 50000, 'Body only': 35000 },
          Medium: { Regular: 55000, 'Body only': 40000 },
          Large: { Regular: 60000, 'Body only': 45000 },
          'Extra Large': { Regular: 80000, 'Body only': 80000 },
          Custom: { Regular: 80000, 'Body only': 80000 }
        }
        const basicSize = basicWashPrices[carwashForm.ukuran] ? carwashForm.ukuran : 'Custom';
        const basicVar = carwashForm.variant === 'Body only' ? 'Body only' : 'Regular';
        const basicWashPrice = basicWashPrices[basicSize][basicVar];
        const treatmentPrice = Math.max(0, carwashForm.harga - basicWashPrice);
        const cashierShift = getShiftForCashier(selectedCashier)

        const { error: cwErr } = await supabase
          .from('carwash')
          .insert({
            id_transaksi: generateUUID(),
            id_struk: newStrukId,
            tanggal: todayDate,
            jam: currentTime,
            kehadiran: carwashForm.kehadiran,
            model: carwashForm.model || 'Mobil',
            plat: (carwashForm.platNomor || '').replace(/\s+/g, '').toUpperCase(),
            no_telepon: carwashForm.noTelepon || null,
            variant: carwashForm.variant,
            ukuran: carwashForm.ukuran,
            paket: carwashForm.paket,
            metode: effectivePayment,
            harga: carwashForm.harga,
            harga_cuci: basicWashPrice,
            harga_paket: treatmentPrice,
            harga_custom: carwashForm.ukuran === 'Custom' ? carwashForm.harga : 0,
            anggota_1: carwashForm.anggota1,
            anggota_2: carwashForm.anggota2 || null,
            status: paymentStatus === 'Selesai' ? 'Selesai' : 'Pending',
            gaji_anggota: gajiPerAnggota,
            gaji_pencuci: carwashForm.gaji_pencuci,
            shift: cashierShift
          })

        if (cwErr) throw cwErr
      }

      // Berhasil
      setSuccess(true)
      setCart([])
      setHasCarwash(false)
      setCarwashForm(prev => ({
        ...prev,
        platNomor: '',
        model: 'Mobil',
        noTelepon: ''
      }))
      await fetchPendingBills()
      await fetchCashierCash()
      await fetchTodayTransactions()
      
      // Auto close success popup
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message || 'Terjadi kesalahan saat memproses transaksi.')
    } finally {
      setLoading(false)
    }
  }

  // Filter menu
  const filteredMenus = menuItems.filter(item => 
    item.kategori !== 'Carwash' &&
    item.nama_menu.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    <div className="p-3 md:p-4 md:pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto h-[calc(100dvh-4rem)] md:h-[calc(100vh-2rem)] w-full">
      {/* Kolom Kiri & Tengah: Pilihan Item (2/3 lebar di desktop) */}
      <div className="lg:col-span-2 flex flex-col h-full space-y-4 min-w-0">
        {/* Header Tab & Informasi Kasir */}
        <div className="glass-panel p-4 md:p-5 rounded-xl flex flex-col gap-5 shrink-0 min-w-0">
          
          {/* Bagian Atas: Navigasi Tabs */}
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap md:flex-wrap md:whitespace-normal scrollbar-none w-full pb-1 shrink-0">
            <button
              onClick={() => setActiveTab('cafe')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shrink-0 ${
                activeTab === 'cafe' 
                  ? 'bg-brand-emerald text-slate-950 shadow-md shadow-brand-emerald/10' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coffee size={16} />
              Menu Cafe
            </button>
            <button
              onClick={() => setActiveTab('carwash')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shrink-0 ${
                activeTab === 'carwash' 
                  ? 'bg-brand-blue text-slate-950 shadow-md shadow-brand-blue/10' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Car size={16} />
              Cuci Mobil (Carwash)
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shrink-0 ${
                activeTab === 'pending' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingCart size={16} />
              Tagihan Pending ({pendingBills.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shrink-0 ${
                activeTab === 'history' 
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/10' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <History size={16} />
              Daftar Transaksi ({todayTransactions.length})
            </button>
            <button
              onClick={handleTutupKasir}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/50 shrink-0`}
            >
              Tutup Kasir (End of Day)
            </button>
          </div>

          {/* Bagian Tengah: Dropdown Kasir dll */}
          <div className="flex gap-3 text-xs overflow-x-auto scrollbar-none w-full pb-1 shrink-0">
            <div className="flex flex-col shrink-0">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Kasir aktif</span>
              <select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                disabled={profile?.role === 'Kasir'}
                className="bg-slate-800 text-slate-300 font-bold border border-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:border-brand-emerald disabled:opacity-85"
              >
                {cashiers.map(c => (
                  <option key={c.nama || c.id} value={c.nama}>{c.nama}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Shift Aktif</span>
              <span className="bg-slate-800 text-brand-emerald font-bold border border-slate-700 py-1.5 px-3 rounded-lg text-center font-mono">
                {getShiftForCashier(selectedCashier)}
              </span>
            </div>
            {paymentStatus === 'Selesai' && (
              <div className="flex flex-col shrink-0">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Metode</span>
                <select
                  value={selectedPayment}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                  className="bg-slate-800 text-slate-300 font-bold border border-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:border-brand-emerald"
                >
                  {paymentMethods.map(p => (
                    <option key={p.nama || p.id} value={p.nama}>{p.nama}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col shrink-0">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Status</span>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="bg-slate-800 text-slate-300 font-bold border border-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:border-brand-emerald"
              >
                <option value="Selesai">Selesai</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Bagian Bawah: Informasi Uang Kasir (Auto-wrap) */}
          <div className="flex flex-wrap gap-4 md:gap-6 items-center bg-slate-900/50 border border-slate-850 p-4 rounded-xl w-full">
            
            <div className="flex items-center gap-3 text-purple-400 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-slate-800 pb-3 sm:pb-0 sm:pr-6">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Wallet size={18} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Laci Kasir (Cash)</span>
                <span className="font-black text-white text-base leading-none">{formatRupiah(todayStartingCapital + cashierCash.todayIn - cashierCash.todayOut)}</span>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-w-[100px]">
              <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Modal Awal</span>
              <span className="text-slate-300 font-bold">{formatRupiah(todayStartingCapital)}</span>
            </div>

            <div className="flex flex-col flex-1 min-w-[100px]">
              <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Masuk Cash</span>
              <span className="text-brand-emerald font-bold">+{formatRupiah(cashierCash.todayIn)}</span>
            </div>

            <div className="flex flex-col flex-1 min-w-[100px]">
              <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Keluar Cash</span>
              <span className="text-rose-400 font-bold">-{formatRupiah(cashierCash.todayOut)}</span>
            </div>

            <div className="flex flex-col flex-1 min-w-[100px]">
              <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total QRIS</span>
              <span className="text-cyan-400 font-black">{formatRupiah(cashierCash.todayQRIS)}</span>
            </div>
            
          </div>
        </div>

        {/* Tab 1: Menu Cafe */}
        {activeTab === 'cafe' && (
          <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 overflow-hidden">
            {/* Search Bar */}
            <div className="relative mb-4 shrink-0 min-w-0">
              <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Cari makanan, minuman, atau paket bundling..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-brand-emerald/60 text-sm"
              />
            </div>

            {/* Grid Item Menu (Scrollable) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1 content-start">
              {filteredMenus.map((menu, idx) => (
                <button
                  key={menu.nama_menu}
                  onClick={() => addToCart({ nama_menu: menu.nama_menu, harga: menu.harga })}
                  className="glass-card hover:border-brand-emerald/40 p-0 rounded-2xl flex flex-col justify-between text-left transition-all duration-300 active:scale-95 group overflow-hidden animate-pop-in hover:-translate-y-1 hover:shadow-[0_8px_20px_-10px_rgba(16,185,129,0.5)]"
                  style={{ animationDelay: `${(idx % 15) * 50}ms` }}
                >
                  {/* Menu Image Area */}
                  <div className="w-full h-28 relative overflow-hidden bg-slate-800">
                    <img 
                      src={getMenuPhoto(menu.nama_menu)} 
                      alt={menu.nama_menu}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
                    <div className="absolute inset-0 hidden items-center justify-center text-slate-600 bg-slate-800/50 backdrop-blur-sm">
                      <Coffee size={24} />
                    </div>
                    <span className={`absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase backdrop-blur-md ${
                      menu.is_bundling 
                        ? 'bg-rose-500/80 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]' 
                        : 'bg-brand-emerald/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    }`}>
                      {menu.is_bundling ? 'Bundling' : menu.kategori}
                    </span>
                  </div>

                  {/* Menu Details */}
                  <div className="p-3 flex-1 flex flex-col justify-between bg-slate-900/60 backdrop-blur-xl relative w-full">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-emerald/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <h4 className="font-bold text-sm text-slate-100 group-hover:text-brand-emerald transition-colors line-clamp-2 drop-shadow-md">
                      {menu.nama_menu}
                    </h4>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]">{formatRupiah(menu.harga)}</span>
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm group-hover:bg-brand-emerald group-hover:text-slate-950 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.6)] transition-all duration-300">
                        <Plus size={14} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Cuci Mobil (Carwash) */}
        {activeTab === 'carwash' && (
          <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Layanan Cuci Mobil</h3>
                <p className="text-xs text-slate-500 mt-0.5">Lengkapi form transaksi cucian mobil pelanggan</p>
              </div>
              <button
                type="button"
                onClick={() => setHasCarwash(!hasCarwash)}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors border ${
                  hasCarwash 
                    ? 'bg-brand-blue text-slate-950 border-brand-blue' 
                    : 'bg-transparent text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {hasCarwash ? '✓ Aktif dalam Transaksi' : '+ Tambah ke Transaksi'}
              </button>
            </div>

            {hasCarwash && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plat Nomor */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Plat Nomor Kendaraan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: AD 1234 AB"
                    value={carwashForm.platNomor}
                    onChange={(e) => setCarwashForm(prev => ({ ...prev, platNomor: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue text-sm uppercase font-mono tracking-widest font-bold"
                  />
                </div>

                {/* Paket Cuci */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Pilihan Paket Layanan
                  </label>
                  <select
                    value={carwashForm.paket}
                    onChange={(e) => setCarwashForm(prev => ({ ...prev, paket: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-brand-blue text-sm"
                  >
                    {paketOptions.map(p => (
                      <option key={p.nama} value={p.nama}>{p.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Merk/Model Mobil */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Merk / Model Mobil
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Avanza, Fortuner, Civic"
                    value={carwashForm.model}
                    onChange={(e) => setCarwashForm(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue text-sm"
                  />
                </div>

                {/* No Telepon Customer */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    No Telepon Customer (CRM WhatsApp)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={carwashForm.noTelepon}
                    onChange={(e) => setCarwashForm(prev => ({ ...prev, noTelepon: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-brand-blue text-sm"
                  />
                </div>

                {/* Ukuran Kendaraan */}
                <div className="flex flex-col col-span-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Ukuran Kendaraan
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {ukuranOptions.map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setCarwashForm(prev => ({ ...prev, ukuran: u }))}
                        className={`py-2 rounded-lg font-bold text-xs transition-all ${
                          carwashForm.ukuran === u 
                            ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40' 
                            : 'bg-slate-900 text-slate-400 border border-slate-800/80'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Harga Custom (Hanya tampil jika Ukuran = Custom) */}
                {carwashForm.ukuran === 'Custom' && (
                  <div className="flex flex-col col-span-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Harga Custom (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="Masukkan harga custom..."
                      value={carwashForm.customHarga}
                      onChange={(e) => setCarwashForm(prev => ({ ...prev, customHarga: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-brand-blue text-sm font-bold text-brand-blue"
                    />
                  </div>
                )}

                {/* Variant Cuci */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Variant Cuci
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {variantOptions.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCarwashForm(prev => ({ ...prev, variant: v }))}
                        className={`py-2 rounded-lg font-bold text-xs transition-all ${
                          carwashForm.variant === v 
                            ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40' 
                            : 'bg-slate-900 text-slate-400 border border-slate-800/80'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Anggota 1 */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Anggota Pencuci 1
                  </label>
                  <select
                    value={carwashForm.anggota1}
                    onChange={(e) => setCarwashForm(prev => ({ ...prev, anggota1: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-brand-blue text-sm"
                  >
                    {anggotaOptions.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Anggota 2 */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Anggota Pencuci 2 (Opsional)
                  </label>
                  <select
                    value={carwashForm.anggota2}
                    onChange={(e) => setCarwashForm(prev => ({ ...prev, anggota2: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-brand-blue text-sm"
                  >
                    <option value="">Tidak ada</option>
                    {anggotaOptions.filter(a => a !== carwashForm.anggota1).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Kehadiran */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Kehadiran Pelanggan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {kehadiranOptions.map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setCarwashForm(prev => ({ ...prev, kehadiran: k }))}
                        className={`py-2 rounded-lg font-bold text-xs transition-all ${
                          carwashForm.kehadiran === k 
                            ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40' 
                            : 'bg-slate-900 text-slate-400 border border-slate-800/80'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total Tarif Carwash */}
                <div className="flex flex-col justify-end p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Estimasi Tarif Cuci</span>
                  <span className="text-2xl font-black text-brand-blue mt-1">{formatRupiah(carwashForm.harga)}</span>
                </div>
              </div>
            )}

            {!hasCarwash && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl text-slate-600">
                <Car size={36} className="mb-2" />
                <p className="text-sm font-medium">Layanan cuci mobil belum ditambahkan.</p>
                <button
                  type="button"
                  onClick={() => setHasCarwash(true)}
                  className="mt-3 px-4 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-colors"
                >
                  + Aktifkan Carwash
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tagihan Pending */}
        {activeTab === 'pending' && (
          <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 overflow-y-auto space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Daftar Tagihan Pending (Bon)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daftar struk transaksi yang belum dilunasi oleh pelanggan</p>
            </div>

            {pendingBills.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-600">
                <CheckCircle size={36} className="mb-2 text-brand-emerald/60" />
                <p className="text-sm font-semibold">Semua tagihan bersih!</p>
                <p className="text-xs text-slate-700 mt-0.5">Tidak ada bill gantung yang pending.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBills.map(bill => {
                  const dateStr = parseDateSafe(bill.created_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })
                  
                  return (
                    <div key={bill.id} className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-700/60 transition-all flex flex-col justify-between md:flex-row md:items-center gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-black text-brand-blue uppercase">
                            #{bill.id.substring(0, 8)}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">
                            Kasir: {bill.kasir}
                          </span>
                          <span className="text-[10px] text-slate-500">{dateStr}</span>
                        </div>
                        
                        {/* Bill Items Detail */}
                        <div className="text-xs text-slate-400 space-y-0.5 pt-1.5 border-t border-slate-800/50 mt-1">
                          {bill.cafe?.map((item, idx) => (
                            <span key={idx} className="block text-[11px]">
                              ☕ {item.nama_menu} x{item.jumlah} ({formatRupiah(item.harga_satuan * item.jumlah)})
                            </span>
                          ))}
                          {bill.carwash?.map((item, idx) => (
                            <span key={idx} className="block text-[11px]">
                              🧼 Carwash: {item.paket} ({item.plat_nomor || 'PLAT KOSONG'}) - ({formatRupiah(item.harga)})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right Action / Settle */}
                      <div className="flex flex-col items-end gap-2 shrink-0 self-start md:self-center">
                        <span className="text-sm font-black text-brand-emerald">{formatRupiah(bill.total_harga)}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSettlingBill(bill)
                              setSettlePaymentMethod(paymentMethods[0]?.nama || 'CASH')
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                          >
                            <Check size={12} />
                            Lunasi
                          </button>
                          <button
                            onClick={() => handleCancelBill(bill.id)}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 font-bold rounded-lg text-xs transition-colors"
                          >
                            Batalkan
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Riwayat/Daftar Transaksi Hari Ini */}
        {activeTab === 'history' && (
          <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 overflow-y-auto space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Daftar Transaksi Hari Ini</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daftar seluruh transaksi (Pending & Selesai) yang tercatat hari ini</p>
            </div>

            {todayTransactions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-600">
                <History size={36} className="mb-2 text-slate-700" />
                <p className="text-sm font-semibold">Belum ada transaksi hari ini</p>
                <p className="text-xs text-slate-700 mt-0.5">Selesaikan pesanan untuk memunculkan riwayat.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayTransactions.map(tx => {
                  const isSelesai = tx.status_bayar === 'Selesai'
                  const isCash = tx.metode_bayar === 'CASH'
                  return (
                    <div key={tx.id} className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-750 transition-all flex flex-col justify-between md:flex-row md:items-center gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-400 uppercase">
                            #{tx.id.substring(0, 8)}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">
                            {tx.kasir}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            ⏱️ {tx.jam || '00:00'}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                            isSelesai 
                              ? 'bg-brand-emerald/15 text-brand-emerald' 
                              : tx.status_bayar === 'Batal'
                                ? 'bg-rose-500/15 text-rose-450 border border-rose-500/15'
                                : 'bg-amber-500/15 text-amber-500'
                          }`}>
                            {tx.status_bayar}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isCash 
                              ? 'bg-purple-500/15 text-purple-400' 
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {tx.metode_bayar}
                          </span>
                        </div>
                        
                        {/* Transaction Detail Items */}
                        <div className="text-xs text-slate-400 space-y-0.5 pt-1.5 border-t border-slate-800/50 mt-1">
                          {tx.cafe?.map((item, idx) => (
                            <span key={idx} className="block text-[11px]">
                              ☕ {item.nama_menu} x{item.jumlah} ({formatRupiah(item.harga_satuan * item.jumlah)})
                            </span>
                          ))}
                          {tx.carwash?.map((item, idx) => (
                            <span key={idx} className="block text-[11px]">
                              🧼 Carwash: {item.paket} ({item.plat_nomor || 'PLAT KOSONG'}) - ({formatRupiah(item.harga)})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0 self-start md:self-center">
                        <span className="text-sm font-black text-white">{formatRupiah(tx.total_harga)}</span>
                        {!isSelesai && tx.status_bayar === 'Pending' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setSettlingBill(tx)
                                setSettlePaymentMethod(paymentMethods[0]?.nama || 'CASH')
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] transition-colors flex items-center gap-1"
                            >
                              <Check size={10} />
                              Lunasi
                            </button>
                            <button
                              onClick={() => handleCancelBill(tx.id)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 font-bold rounded text-[10px] transition-colors"
                            >
                              Batalkan
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kolom Kanan: Rincian Belanja & Checkout (1/3 lebar di desktop, tersembunyi di mobile) */}
      <div className="hidden lg:flex glass-panel p-6 rounded-xl flex-col justify-between h-fit overflow-hidden border border-slate-800/80 min-w-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4 shrink-0">
            <ShoppingCart className="text-brand-emerald" size={20} />
            <h3 className="font-bold text-lg text-white">Struk Belanja</h3>
          </div>

          {/* Alert Popups */}
          {success && (
            <div className="mb-4 p-4 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald text-xs flex items-center gap-3 shrink-0">
              <CheckCircle size={16} />
              <span>Transaksi berhasil disimpan!</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 shrink-0">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* List Cart Items (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {cart.length === 0 && !hasCarwash && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-12">
                <ShoppingCart size={32} className="mb-2" />
                <p>Belum ada produk terpilih.</p>
              </div>
            )}

            {/* List Item Cafe */}
            {cart.map((item) => (
              <div key={item.nama_menu} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="overflow-hidden mr-2">
                  <h5 className="font-bold text-xs text-white truncate">{item.nama_menu}</h5>
                  <span className="text-[10px] text-slate-500">{formatRupiah(item.harga)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateQty(item.nama_menu, -1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-xs font-bold text-white w-4 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.nama_menu, 1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.nama_menu)}
                    className="text-rose-400 hover:text-rose-500 p-1 ml-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {/* Item Carwash */}
            {hasCarwash && (
              <div className="p-3 rounded-lg bg-brand-blue/5 border border-brand-blue/20 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded-full font-bold uppercase">Carwash</span>
                    <h5 className="font-bold text-xs text-white mt-1.5">{carwashForm.paket}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {carwashForm.platNomor || '(PLAT KOSONG)'} • {carwashForm.ukuran} • {carwashForm.variant}
                    </p>
                  </div>
                  <button
                    onClick={() => setHasCarwash(false)}
                    className="text-rose-400 hover:text-rose-500 p-1 shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="mt-3 flex justify-between items-center border-t border-slate-800/40 pt-2 text-[10px] text-slate-500">
                  <span>Pencuci: {carwashForm.anggota1} {carwashForm.anggota2 && `+ ${carwashForm.anggota2}`}</span>
                  <span className="font-bold text-brand-blue">{formatRupiah(carwashForm.harga)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ringkasan & Checkout Button */}
        <div className="border-t border-slate-800 pt-4 mt-4 shrink-0 space-y-4">
          <div className="space-y-1.5 text-xs text-slate-400">
            {cart.length > 0 && (
              <div className="flex justify-between">
                <span>Total Cafe</span>
                <span>{formatRupiah(cafeTotal)}</span>
              </div>
            )}
            {hasCarwash && (
              <div className="flex justify-between">
                <span>Total Carwash</span>
                <span>{formatRupiah(carwashTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800/50">
              <span>Total Bayar</span>
              <span className="text-brand-emerald">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || (cart.length === 0 && !hasCarwash)}
            className="w-full py-3 bg-brand-emerald hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 animate-pulse-glow"
          >
            {loading ? 'Memproses Transaksi...' : `Simpan & Cetak (${paymentStatus})`}
          </button>
        </div>
      </div>

      {/* Floating Cart Bar for Mobile */}
      {(cart.length > 0 || hasCarwash) && !showMobileCart ? (
        <div className="lg:hidden fixed bottom-18 left-4 right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-brand-emerald/30 p-3.5 rounded-2xl flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_15px_rgba(16,185,129,0.15)] animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-emerald/10 flex items-center justify-center text-brand-emerald relative">
              <ShoppingCart size={18} />
              <span className="absolute -top-1.5 -right-1.5 bg-brand-emerald text-slate-950 text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((sum, item) => sum + item.qty, 0) + (hasCarwash ? 1 : 0)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Total Tagihan</span>
              <span className="text-sm font-black text-brand-emerald">{formatRupiah(grandTotal)}</span>
            </div>
          </div>
          <button
            onClick={() => setShowMobileCart(true)}
            className="px-4 py-2 bg-brand-emerald hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all active:scale-95 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse-glow"
          >
            Selesaikan <ChevronRight size={14} />
          </button>
        </div>
      ) : null}

      {/* Mobile Cart Overlay/Drawer */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col justify-end animate-fade-in">
          {/* Backdrop click area to close */}
          <div className="absolute inset-0" onClick={() => setShowMobileCart(false)}></div>
          
          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col p-6 animate-slide-up shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            {/* Header of Mobile Cart */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-brand-emerald" size={20} />
                <h3 className="font-bold text-lg text-white">Struk Belanja ({cart.reduce((sum, item) => sum + item.qty, 0) + (hasCarwash ? 1 : 0)} item)</h3>
              </div>
              <button 
                onClick={() => setShowMobileCart(false)}
                className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
            
            {/* Alert Popups in Mobile Cart */}
            {success && (
              <div className="mb-4 p-4 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald text-xs flex items-center gap-3 shrink-0">
                <CheckCircle size={16} />
                <span>Transaksi berhasil disimpan!</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 shrink-0">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* List Cart Items (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
              {cart.map((item) => (
                <div key={item.nama_menu} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950 border border-slate-850">
                  <div className="overflow-hidden mr-2">
                    <h5 className="font-bold text-xs text-white truncate">{item.nama_menu}</h5>
                    <span className="text-[10px] text-slate-500">{formatRupiah(item.harga)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQty(item.nama_menu, -1)}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-xs font-bold text-white w-4 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.nama_menu, 1)}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      <Plus size={10} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.nama_menu)}
                      className="text-rose-400 hover:text-rose-500 p-1 ml-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {hasCarwash && (
                <div className="p-3 rounded-lg bg-brand-blue/5 border border-brand-blue/20 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded-full font-bold uppercase">Carwash</span>
                      <h5 className="font-bold text-xs text-white mt-1.5">{carwashForm.paket}</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {carwashForm.platNomor || '(PLAT KOSONG)'} • {carwashForm.ukuran} • {carwashForm.variant}
                      </p>
                    </div>
                    <button
                      onClick={() => setHasCarwash(false)}
                      className="text-rose-400 hover:text-rose-500 p-1 shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="mt-3 flex justify-between items-center border-t border-slate-800/40 pt-2 text-[10px] text-slate-500">
                    <span>Pencuci: {carwashForm.anggota1} {carwashForm.anggota2 && `+ ${carwashForm.anggota2}`}</span>
                    <span className="font-bold text-brand-blue">{formatRupiah(carwashForm.harga)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ringkasan & Checkout Button */}
            <div className="border-t border-slate-800 pt-4 shrink-0 space-y-4">
              <div className="space-y-1.5 text-xs text-slate-400">
                {cart.length > 0 && (
                  <div className="flex justify-between">
                    <span>Total Cafe</span>
                    <span>{formatRupiah(cafeTotal)}</span>
                  </div>
                )}
                {hasCarwash && (
                  <div className="flex justify-between">
                    <span>Total Carwash</span>
                    <span>{formatRupiah(carwashTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800/50">
                  <span>Total Bayar</span>
                  <span className="text-brand-emerald">{formatRupiah(grandTotal)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  handleCheckout();
                  setShowMobileCart(false);
                }}
                disabled={loading || (cart.length === 0 && !hasCarwash)}
                className="w-full py-3 bg-brand-emerald hover:bg-emerald-450 active:bg-emerald-600 text-slate-950 font-extrabold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 animate-pulse-glow"
              >
                {loading ? 'Memproses Transaksi...' : `Simpan & Cetak (${paymentStatus})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Selesaikan Pembayaran Pending */}
      {settlingBill && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border border-slate-700 shadow-[0_0_40px_rgba(16,185,129,0.15)] animate-pop-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-white">
                Pelunasan Tagihan #{settlingBill.id.substring(0, 8)}
              </h3>
              <button 
                onClick={() => setSettlingBill(null)} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettleBill} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Tagihan:</span>
                  <span className="font-extrabold text-brand-emerald text-sm">{formatRupiah(settlingBill.total_harga)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kasir Pembuka:</span>
                  <span className="text-slate-200 font-bold">{settlingBill.kasir}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Metode Pembayaran Pelunasan
                </label>
                <select
                  value={settlePaymentMethod}
                  onChange={(e) => setSettlePaymentMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-lg py-2 px-3 text-white text-sm"
                  required
                >
                  {paymentMethods.map(p => (
                    <option key={p.nama || p.id} value={p.nama}>{p.nama}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setSettlingBill(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-emerald hover:bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Konfirmasi Lunas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Input Modal Hari Ini */}
      {showModalModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border border-slate-800 animate-pop-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-brand-emerald to-brand-blue flex items-center justify-center font-bold text-lg text-slate-900 shadow-md mb-3">
                JB
              </div>
              <h3 className="text-lg font-bold text-white">Masukkan Modal Hari Ini</h3>
              <p className="text-slate-400 text-xs mt-1">Sistem mendeteksi modal awal untuk hari ini belum dimasukkan.</p>
            </div>

            <form onSubmit={handleSaveStartingCapital} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nominal Modal Awal (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 100000"
                  value={startingCapitalInput}
                  onChange={(e) => setStartingCapitalInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm text-center font-bold text-brand-emerald focus:outline-none focus:border-brand-emerald placeholder-slate-700"
                  required
                  min="0"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-emerald hover:bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-brand-emerald/10 transition-all text-sm disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Konfirmasi & Mulai Shift'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CafePOS
