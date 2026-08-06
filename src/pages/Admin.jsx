import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { 
  Settings, 
  UserPlus, 
  Utensils, 
  Package, 
  CreditCard, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  AlertCircle,
  CheckCircle,
  Eye,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react'
import InteractiveCalendar from '../components/InteractiveCalendar'

const Admin = () => {
  const { registerKasir } = useAuth()
  const [activeTab, setActiveTab] = useState('menu') // 'menu', 'ingredients', 'cashier-pay', 'staff'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Database Data
  const [cashiers, setCashiers] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [stokBahan, setStokBahan] = useState([])
  const [resepList, setResepList] = useState([])

  const [balances, setBalances] = useState({ cash: 0, rekY: 0, rekN: 0 })
  const [targetBalances, setTargetBalances] = useState({ cash: '', rekY: '', rekN: '' })

  // State Laporan Gaji Cuci
  const [wagesStartDate, setWagesStartDate] = useState(() => {
    const d = new Date()
    if (d.getDate() >= 16) {
      d.setDate(16)
    } else {
      d.setMonth(d.getMonth() - 1)
      d.setDate(16)
    }
    return d.toLocaleDateString('en-CA') // Format YYYY-MM-DD waktu lokal
  })
  const [wagesEndDate, setWagesEndDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA') // Format YYYY-MM-DD waktu lokal
  })
  const [carwashWagesList, setCarwashWagesList] = useState([])
  const [selectedWageWorker, setSelectedWageWorker] = useState(null)
  const [showWagesCalendar, setShowWagesCalendar] = useState(false)
  
  // State Karyawan Cuci
  const [karyawanCuciList, setKaryawanCuciList] = useState([])
  const [newKaryawanCuci, setNewKaryawanCuci] = useState('')
  const [selectedJobForCrosscheck, setSelectedJobForCrosscheck] = useState(null)

  // State Form Kasir
  const [newCashier, setNewCashier] = useState('')
  
  // State Form Metode Pembayaran
  const [newPayment, setNewPayment] = useState('')

  // State Form Registrasi Staff
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    nama: '',
    role: 'Kasir'
  })

  // State Form Menu & Resep
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [isEditingMenu, setIsEditingMenu] = useState(false)
  const [menuForm, setMenuForm] = useState({
    nama_menu: '',
    harga: 0,
    kategori: 'Cafe',
    deskripsi: '',
    is_bundling: false,
    is_active: true
  })
  const [menuRecipe, setMenuRecipe] = useState([]) // list of { nama_bahan, jumlah_dibutuhkan, satuan }

  // State Form Bahan Baku Baru
  const [showIngredientModal, setShowIngredientModal] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState(null) // for editing existing ingredients
  const [ingredientForm, setIngredientForm] = useState({
    id_bahan_baku: '',
    nama_bahan: '',
    stok: 0,
    satuan: 'Gram/Ml',
    harga_satuan: 0
  })
  
  // State Opname / Kebocoran
  const [opnameIngredient, setOpnameIngredient] = useState(null)
  const [stokFisik, setStokFisik] = useState('')

  const loadAdminData = async () => {
    setLoading(true)
    try {
      // Fetch Kasir
      const { data: kc } = await supabase.from('kasir').select('*').order('created_at', { ascending: true })
      // Fetch Metode Bayar
      const { data: pm } = await supabase.from('metode_bayar').select('*').order('created_at', { ascending: true })
      // Fetch Menu
      const { data: mn } = await supabase.from('daftar_harga_menu').select('*').order('daftar_menu', { ascending: true })
      // Fetch Bahan Baku
      const { data: sb } = await supabase.from('stok_barang').select('*').order('nama_produk', { ascending: true })
      // Fetch Resep
      const { data: rs } = await supabase.from('resep').select('*')

      const realCashiers = kc || []
      const realPayments = pm || []
      const realMenus = (mn || []).map(item => ({
        ...item,
        nama_menu: item.daftar_menu
      }))
      const realStok = (sb || []).map(item => ({
        ...item,
        nama_bahan: item.nama_produk,
        harga_satuan: parseFloat(item.harga_satuan || 0)
      }))
      const realResep = (rs || []).map(item => ({
        ...item,
        jumlah_dibutuhkan: item.jumlah
      }))

      // Fetch POS Balances
      const { data: bal } = await supabase.from('pos_balances').select('*')
      let cashVal = 0, rekYVal = 0, rekNVal = 0
      if (bal) {
        bal.forEach(item => {
          const val = parseFloat(item.balance) || 0
          if (item.pos === 'SALDO CASH') cashVal = val
          else if (item.pos === 'SALDO REKENING Y') rekYVal = val
          else if (item.pos === 'SALDO REKENING N') rekNVal = val
        })
      }
      setBalances({ cash: cashVal, rekY: rekYVal, rekN: rekNVal })

      // Fetch Karyawan Cuci
      let realKaryawan = []
      try {
        const { data: kc_cuci } = await supabase.from('karyawan_cuci').select('*').order('nama', { ascending: true })
        realKaryawan = kc_cuci || []
      } catch (e) {
        console.warn('karyawan_cuci read error:', e)
      }

      setCashiers(realCashiers)
      setPaymentMethods(realPayments)
      setMenuItems(realMenus)
      setStokBahan(realStok)
      setResepList(realResep)
      setKaryawanCuciList(realKaryawan)

    } catch (err) {
      console.error('Error loading admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const fetchCarwashWages = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('carwash')
        .select(`
          id_transaksi,
          kehadiran,
          variant,
          ukuran,
          paket,
          anggota_1,
          anggota_2,
          plat,
          harga,
          harga_cuci,
          harga_paket,
          harga_custom,
          gaji_pencuci,
          status,
          created_at,
          tanggal
        `)
        .neq('status', 'Batal')
        .gte('tanggal', wagesStartDate)
        .lte('tanggal', wagesEndDate)
      
      if (err) throw err
      
      setCarwashWagesList(data || [])
    } catch (err) {
      console.error('Error fetching carwash wages:', err)
      setError('Gagal memuat data upah carwash.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'wages') {
      fetchCarwashWages()
    }
  }, [activeTab, wagesStartDate, wagesEndDate])

  const getWagesSummary = () => {
    const summary = {}
    const activeWorkers = karyawanCuciList.length > 0 
      ? karyawanCuciList.map(k => k.nama.toUpperCase().trim()) 
      : ['ANGGA', 'FERRY', 'RAHMAN', 'FAISAL', 'BAGUS', 'VICKY', 'NOPAL', 'EZA']
    
    activeWorkers.forEach(w => {
      summary[w] = { name: w, totalCars: 0, totalWage: 0, details: [] }
    })

    carwashWagesList.forEach(item => {
      let hargaCuci = parseFloat(item.harga_cuci) || 0
      let hargaPaket = parseFloat(item.harga_paket) || 0
      
      // Fallback untuk data lama/impor yang tidak terpecah harga cuci & paketan-nya
      if (hargaCuci === 0 && hargaPaket === 0) {
        if (!item.paket || item.paket.trim() === "") {
          hargaCuci = parseFloat(item.harga) || 0
        } else {
          const size = item.ukuran || 'Large'
          const variant = item.variant || 'Regular'
          
          const basicWashPrices = {
            Small: { Regular: 50000, 'Body only': 35000 },
            Medium: { Regular: 55000, 'Body only': 40000 },
            Large: { Regular: 60000, 'Body only': 45000 },
            'Extra Large': { Regular: 80000, 'Body only': 80000 },
            Custom: { Regular: 80000, 'Body only': 80000 }
          }
          
          const basicSize = basicWashPrices[size] ? size : 'Large'
          const basicVar = variant === 'Body only' ? 'Body only' : 'Regular'
          hargaCuci = basicWashPrices[basicSize][basicVar]
          hargaPaket = Math.max(0, (parseFloat(item.harga) || 0) - hargaCuci)
        }
      }
      
      const w1 = item.anggota_1 ? item.anggota_1.trim().toUpperCase() : ''
      const w2 = item.anggota_2 ? item.anggota_2.trim().toUpperCase() : ''
      
      // Split jika anggota_2 diisi nama yang berbeda dengan anggota_1
      const isSplit = w2 !== '' && w2 !== w1
      
      // Hitung gaji cuci per orang (1/3 harga cuci, lalu dibagi 2 jika split, dibulatkan ke kelipatan 1000 ke bawah)
      const washWagePerPerson = isSplit 
        ? Math.floor((hargaCuci / 3 / 2) / 1000) * 1000 
        : Math.floor((hargaCuci / 3) / 1000) * 1000
      
      // Hitung gaji paket per orang (1/2 harga paket, lalu dibagi 2 jika split, dibulatkan ke kelipatan 1000 ke bawah)
      const packageWagePerPerson = hargaPaket > 0 
        ? (isSplit 
            ? Math.floor((hargaPaket / 2 / 2) / 1000) * 1000 
            : Math.floor((hargaPaket / 2) / 1000) * 1000)
        : 0
      
      const share = washWagePerPerson + packageWagePerPerson

      if (w1) {
        if (!summary[w1]) {
          summary[w1] = { name: w1, totalCars: 0, totalWage: 0, details: [] }
        }
        summary[w1].totalCars += 1
        summary[w1].totalWage += share
        summary[w1].details.push({
          id: item.id_transaksi,
          tanggal: item.created_at,
          platNomor: item.plat,
          paket: item.paket,
          variant: item.variant,
          ukuran: item.ukuran,
          totalHarga: item.harga,
          shareWage: share,
          split: isSplit ? 'Split 50%' : 'Solo 100%',
          rawItem: item
        })
      }

      if (isSplit && w2) {
        if (!summary[w2]) {
          summary[w2] = { name: w2, totalCars: 0, totalWage: 0, details: [] }
        }
        summary[w2].totalCars += 1
        summary[w2].totalWage += share
        summary[w2].details.push({
          id: item.id_transaksi,
          tanggal: item.created_at,
          platNomor: item.plat,
          paket: item.paket,
          variant: item.variant,
          ukuran: item.ukuran,
          totalHarga: item.harga,
          shareWage: share,
          split: isSplit ? 'Split 50%' : 'Solo 100%',
          rawItem: item
        })
      }
    })

    return Object.values(summary).sort((a, b) => b.totalWage - a.totalWage)
  }

  const wagesSummary = getWagesSummary()
  const selectedWorkerDetails = selectedWageWorker ? wagesSummary.find(w => w.name === selectedWageWorker) : null

  // 1. Kasir & Metode Bayar Handlers
  const handleAddCashier = async (e) => {
    e.preventDefault()
    if (!newCashier) return
    try {
      const { error } = await supabase.from('kasir').insert({ nama: newCashier.toUpperCase() })
      if (error) throw error
      setNewCashier('')
      setSuccess('Kasir berhasil ditambahkan!')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Gagal menambahkan kasir.')
    }
  }

  const toggleCashierActive = async (nama, currentVal) => {
    try {
      const { error } = await supabase.from('kasir').update({ is_active: !currentVal }).eq('nama', nama)
      if (error) throw error
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Gagal mengupdate kasir.')
    }
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()
    if (!newPayment) return
    try {
      const { error } = await supabase.from('metode_bayar').insert({ nama: newPayment.toUpperCase() })
      if (error) throw error
      setNewPayment('')
      setSuccess('Metode Pembayaran berhasil ditambahkan!')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Gagal menambahkan metode pembayaran.')
    }
  }

  const togglePaymentActive = async (nama, currentVal) => {
    try {
      const { error } = await supabase.from('metode_bayar').update({ is_active: !currentVal }).eq('nama', nama)
      if (error) throw error
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Gagal mengupdate metode pembayaran.')
    }
  }

  // 2. Bahan Baku Handlers
  const handleSaveIngredient = async (e) => {
    e.preventDefault()
    if (!ingredientForm.id_bahan_baku) return setError('ID bahan wajib diisi.')
    if (!ingredientForm.nama_bahan) return setError('Nama bahan wajib diisi.')
    
    try {
      const { error } = await supabase.from('stok_barang').insert({
        id_bahan_baku: ingredientForm.id_bahan_baku.trim().toUpperCase(),
        nama_produk: ingredientForm.nama_bahan.trim(),
        stok: parseFloat(ingredientForm.stok) || 0,
        satuan: ingredientForm.satuan,
        harga_satuan: parseFloat(ingredientForm.harga_satuan) || 0
      })
      if (error) throw error
      setSuccess('Bahan Baku Baru berhasil ditambahkan!')
      setIngredientForm({ id_bahan_baku: '', nama_bahan: '', stok: 0, satuan: 'Gram/Ml', harga_satuan: 0 })
      setShowIngredientModal(false)
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Gagal menambahkan bahan baku.')
    }
  }

  const handleUpdateIngredient = async (e) => {
    e.preventDefault()
    if (!editingIngredient) return
    try {
      const { error } = await supabase.from('stok_barang').update({
        nama_produk: editingIngredient.nama_produk.trim(),
        stok: parseFloat(editingIngredient.stok) || 0,
        satuan: editingIngredient.satuan,
        harga_satuan: parseFloat(editingIngredient.harga_satuan) || 0
      }).eq('id_bahan_baku', editingIngredient.id_bahan_baku)

      if (error) throw error
      setSuccess('Bahan Baku berhasil diperbarui!')
      setEditingIngredient(null)
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Gagal memperbarui bahan baku.')
    }
  }

  const handleDeleteIngredient = async (id) => {
    if (!window.confirm('Yakin ingin menghapus bahan baku ini?')) return
    try {
      const { error } = await supabase.from('stok_barang').delete().eq('id_bahan_baku', id)
      if (error) throw error
      alert('Berhasil dihapus.')
      loadAdminData()
    } catch (err) {
      console.error(err)
      alert('Gagal hapus: ' + err.message)
    }
  }

  const handleSimpanOpname = async (e) => {
    e.preventDefault()
    if (!opnameIngredient) return
    const fisik = parseFloat(stokFisik)
    if (isNaN(fisik)) return alert('Masukkan angka stok fisik yang valid')
    
    // In a full implementation, you would save this to a ledger or history.
    // For now, we update the main stock to match the physical stock to correct the leakage.
    try {
      const { error } = await supabase.from('stok_barang').update({
        stok: fisik,
        updated_at: new Date().toISOString()
      }).eq('id_bahan_baku', opnameIngredient.id_bahan_baku)
      if (error) throw error
      
      alert('Stok fisik berhasil disimpan dan diupdate di sistem.')
      setOpnameIngredient(null)
      setStokFisik('')
      loadAdminData()
    } catch (err) {
      console.error(err)
      alert('Gagal update opname: ' + err.message)
    }
  }

  // 3. Registrasi Staff Baru Handler
  const handleRegisterStaff = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!staffForm.email || !staffForm.password || !staffForm.nama) {
      return setError('Semua form wajib diisi.')
    }

    try {
      const res = await registerKasir(staffForm.email, staffForm.password, staffForm.nama, staffForm.role)
      if (!res.success) throw new Error(res.error)

      // Auto-insert nama kasir ke tabel kasir agar bisa digunakan di transaksi struk
      if (staffForm.role === 'Kasir') {
        const { error: kasirErr } = await supabase
          .from('kasir')
          .insert({ nama: staffForm.nama.trim().toUpperCase(), is_active: true })
        if (kasirErr) {
          console.warn('Gagal otomatis menambahkan ke tabel kasir:', kasirErr)
        }
      }

      setSuccess(`Staf baru ${staffForm.nama} (${staffForm.role}) berhasil didaftarkan!`)
      setStaffForm({ email: '', password: '', nama: '', role: 'Kasir' })
    } catch (err) {
      setError(err.message || 'Gagal mendaftarkan staff.')
    }
  }

  // 4. Menu & Resep Handlers
  const handleAddRecipeRow = () => {
    const defaultBahan = stokBahan[0]?.nama_bahan || ''
    const defaultSatuan = stokBahan[0]?.satuan || 'Gram'
    setMenuRecipe(prev => [...prev, { nama_bahan: defaultBahan, jumlah_dibutuhkan: 1, satuan: defaultSatuan }])
  }

  const removeRecipeRow = (index) => {
    setMenuRecipe(prev => prev.filter((_, i) => i !== index))
  }

  const updateRecipeRow = (index, field, value) => {
    setMenuRecipe(prev => 
      prev.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value }
          if (field === 'nama_bahan') {
            const match = stokBahan.find(b => b.nama_bahan === value)
            if (match) updated.satuan = match.satuan
          }
          return updated
        }
        return item
      })
    )
  }

  const openAddMenuModal = () => {
    setIsEditingMenu(false)
    setMenuForm({
      nama_menu: '',
      harga: 0,
      kategori: 'Cafe',
      deskripsi: '',
      is_bundling: false,
      is_active: true
    })
    setMenuRecipe([])
    setShowMenuModal(true)
  }

  const openEditMenuModal = (menu) => {
    setIsEditingMenu(true)
    setMenuForm({
      id_menu: menu.id_menu,
      nama_menu: menu.nama_menu,
      harga: parseFloat(menu.harga),
      kategori: menu.kategori,
      deskripsi: menu.deskripsi || '',
      is_bundling: menu.is_bundling,
      is_active: menu.is_active
    })
    
    // Cari resep yang terkait
    const recipeRows = resepList
      .filter(r => r.nama_menu === menu.nama_menu)
      .map(r => ({
        nama_bahan: r.nama_bahan,
        jumlah_dibutuhkan: parseFloat(r.jumlah_dibutuhkan),
        satuan: r.satuan
      }))

    setMenuRecipe(recipeRows)
    setShowMenuModal(true)
  }

  const handleSaveMenu = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!menuForm.nama_menu) return setError('Nama menu wajib diisi.')
    if (parseFloat(menuForm.harga) < 0) return setError('Harga menu tidak boleh negatif.')

    try {
      // 1. Simpan Menu (Insert / Update)
      if (isEditingMenu) {
        // Update menu properties
        const { error: menuErr } = await supabase
          .from('daftar_harga_menu')
          .update({
            daftar_menu: menuForm.nama_menu.trim(),
            harga: parseFloat(menuForm.harga),
            kategori: menuForm.kategori,
            deskripsi: menuForm.deskripsi,
            is_bundling: menuForm.is_bundling,
            is_active: menuForm.is_active
          })
          .eq('id_menu', menuForm.id_menu)

        if (menuErr) throw menuErr

        // Delete existing recipe rows to rewrite them
        await supabase
          .from('resep')
          .delete()
          .eq('nama_menu', menuForm.nama_menu)
      } else {
        // Insert new menu
        const { error: menuErr } = await supabase
          .from('daftar_harga_menu')
          .insert({
            id_menu: menuForm.nama_menu.trim(),
            daftar_menu: menuForm.nama_menu.trim(),
            harga: parseFloat(menuForm.harga),
            kategori: menuForm.kategori,
            deskripsi: menuForm.deskripsi,
            is_bundling: menuForm.is_bundling,
            is_active: menuForm.is_active
          })

        if (menuErr) throw menuErr
      }

      // 2. Simpan Resep (jika ada)
      if (menuRecipe.length > 0) {
        const resolvedMenuId = menuForm.id_menu || menuForm.nama_menu.trim();
        const insertRecipes = menuRecipe.map(r => {
          const matchedBahan = stokBahan.find(b => b.nama_bahan === r.nama_bahan);
          const resolvedBahanId = matchedBahan ? matchedBahan.id_bahan_baku : r.nama_bahan;
          return {
            id_menu: resolvedMenuId,
            nama_menu: menuForm.nama_menu,
            id_bahan_baku: resolvedBahanId,
            nama_bahan: r.nama_bahan,
            jumlah: parseFloat(r.jumlah_dibutuhkan),
            satuan: r.satuan
          };
        })

        const { error: rErr } = await supabase
          .from('resep')
          .insert(insertRecipes)

        if (rErr) throw rErr
      }

      setSuccess('Menu & Resep berhasil disimpan!')
      setShowMenuModal(false)
      await loadAdminData()
    } catch (err) {
      console.error('Save menu error:', err)
      setError(err.message || 'Gagal menyimpan menu.')
    }
  }

  const handleDeleteMenu = async (menuName) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus menu "${menuName}"? Tindakan ini akan menghapus data resep yang melekat.`)) return
    try {
      const { error } = await supabase
        .from('daftar_harga_menu')
        .delete()
        .eq('daftar_menu', menuName)

      if (error) throw error
      setSuccess('Menu berhasil dihapus!')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Gagal menghapus menu.')
    }
  }

  const handleCalibrateBalances = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const inserts = []
      const todayDate = new Date().toLocaleDateString('en-CA')
      const currentTime = new Date().toTimeString().split(' ')[0]
      const currentTimestamp = `${todayDate}T${currentTime}`

      // 1. Check Cash
      if (targetBalances.cash !== '') {
        const target = parseFloat(targetBalances.cash)
        if (!isNaN(target)) {
          const diff = target - balances.cash
          if (diff !== 0) {
            inserts.push({
              id_cashflow: self.crypto.randomUUID(),
              tanggal: currentTimestamp,
              jenis: diff > 0 ? 'Pemasukan' : 'Pengeluaran',
              pos: 'SALDO CASH',
              pemasukan: diff > 0 ? Math.abs(diff) : 0,
              pengeluaran: diff < 0 ? Math.abs(diff) : 0,
              keterangan_transaksi: 'Kalibrasi Saldo Kas (Penyesuaian Manual Admin)'
            })
          }
        }
      }

      // 2. Check Rekening Y
      if (targetBalances.rekY !== '') {
        const target = parseFloat(targetBalances.rekY)
        if (!isNaN(target)) {
          const diff = target - balances.rekY
          if (diff !== 0) {
            inserts.push({
              id_cashflow: self.crypto.randomUUID(),
              tanggal: currentTimestamp,
              jenis: diff > 0 ? 'Pemasukan' : 'Pengeluaran',
              pos: 'SALDO REKENING Y',
              pemasukan: diff > 0 ? Math.abs(diff) : 0,
              pengeluaran: diff < 0 ? Math.abs(diff) : 0,
              keterangan_transaksi: 'Kalibrasi Saldo Rekening Y (Penyesuaian Manual Admin)'
            })
          }
        }
      }

      // 3. Check Rekening N
      if (targetBalances.rekN !== '') {
        const target = parseFloat(targetBalances.rekN)
        if (!isNaN(target)) {
          const diff = target - balances.rekN
          if (diff !== 0) {
            inserts.push({
              id_cashflow: self.crypto.randomUUID(),
              tanggal: currentTimestamp,
              jenis: diff > 0 ? 'Pemasukan' : 'Pengeluaran',
              pos: 'SALDO REKENING N',
              pemasukan: diff > 0 ? Math.abs(diff) : 0,
              pengeluaran: diff < 0 ? Math.abs(diff) : 0,
              keterangan_transaksi: 'Kalibrasi Saldo Rekening N (Penyesuaian Manual Admin)'
            })
          }
        }
      }

      if (inserts.length === 0) {
        setLoading(false)
        return setError('Tidak ada perubahan saldo yang dimasukkan.')
      }

      const { error: insertErr } = await supabase
        .from('cashflow')
        .insert(inserts)

      if (insertErr) throw insertErr

      setSuccess('Kalibrasi saldo berhasil dilakukan!')
      setTargetBalances({ cash: '', rekY: '', rekN: '' })
      await loadAdminData()
    } catch (err) {
      console.error('Error calibrating balances:', err)
      setError(err.message || 'Gagal melakukan kalibrasi saldo.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddKaryawanCuci = async (e) => {
    e.preventDefault()
    if (!newKaryawanCuci.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { error: err } = await supabase
        .from('karyawan_cuci')
        .insert({ nama: newKaryawanCuci.trim().toUpperCase() })

      if (err) throw err
      
      setSuccess(`Karyawan "${newKaryawanCuci.trim().toUpperCase()}" berhasil ditambahkan!`)
      setNewKaryawanCuci('')
      await loadAdminData()
    } catch (err) {
      console.error('Error adding karyawan cuci:', err)
      setError(err.message || 'Gagal menambahkan karyawan cuci.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKaryawanCuci = async (id, name) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus karyawan "${name}"?`)) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { error: err } = await supabase
        .from('karyawan_cuci')
        .delete()
        .eq('id', id)

      if (err) throw err

      setSuccess(`Karyawan "${name}" berhasil dihapus!`)
      await loadAdminData()
    } catch (err) {
      console.error('Error deleting karyawan cuci:', err)
      setError(err.message || 'Gagal menghapus karyawan cuci.')
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val)
  }

  return (
    <div className="p-6 pb-24 md:pb-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent flex items-center gap-3">
          <Settings size={32} className="text-brand-blue" />
          Kelola Admin
        </h1>
        <p className="text-slate-400 text-sm mt-1">Konfigurasi menu cafe, stok bahan baku, kasir/metode bayar, & hak akses staf</p>
      </div>

      {/* Popups Alert */}
      {success && (
        <div className="p-4 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald text-sm flex items-center gap-3">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="glass-panel p-2 rounded-xl flex flex-wrap gap-2 border border-slate-800/80 shrink-0">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'menu' ? 'bg-brand-blue text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Utensils size={14} />
          Menu & Resep
        </button>
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'ingredients' ? 'bg-brand-blue text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package size={14} />
          Stok Bahan Baku
        </button>
        <button
          onClick={() => setActiveTab('cashier-pay')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'cashier-pay' ? 'bg-brand-blue text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard size={14} />
          Kasir & Metode Bayar
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'staff' ? 'bg-brand-blue text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus size={14} />
          Daftar Staf Baru
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'calibration' ? 'bg-brand-blue text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings size={14} />
          Kalibrasi Saldo
        </button>
        <button
          onClick={() => {
            setActiveTab('wages')
            setSelectedWageWorker(null)
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'wages' ? 'bg-brand-blue text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign size={14} />
          Laporan Gaji Cuci
        </button>
        <button
          onClick={() => setActiveTab('crew')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'crew' ? 'bg-brand-blue text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users size={14} />
          Karyawan Cuci
        </button>
      </div>

      {/* CONTENT TAB 1: Menu & Resep */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Daftar Menu Cafe & Bundling</h3>
            <button
              onClick={openAddMenuModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-emerald hover:bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs"
            >
              <Plus size={14} />
              Tambah Menu Baru
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">Nama Menu</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Harga</th>
                    <th className="p-4">Bahan Baku Resep</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {menuItems.map((item) => {
                    const menuRecipes = resepList.filter(r => r.nama_menu === item.nama_menu)
                    return (
                      <tr key={item.nama_menu} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-white">{item.nama_menu}</td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            item.is_bundling ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.is_bundling ? 'Promo/Bundling' : item.kategori}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-brand-emerald">{formatRupiah(item.harga)}</td>
                        <td className="p-4 text-xs text-slate-400 max-w-xs truncate">
                          {menuRecipes.length > 0 ? (
                            menuRecipes.map((r, i) => (
                              <span key={i} className="block">
                                • {r.nama_bahan} ({r.jumlah_dibutuhkan} {r.satuan})
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 font-medium italic">Tidak ada bahan baku</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                            item.is_active ? 'bg-brand-emerald/15 text-brand-emerald' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {item.is_active ? 'AKTIF' : 'NONAKTIF'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditMenuModal(item)}
                              className="p-1.5 bg-slate-850 hover:bg-slate-800 text-brand-blue rounded-lg transition-colors"
                              title="Edit Menu & Resep"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMenu(item.nama_menu)}
                              className="p-1.5 bg-slate-850 hover:bg-slate-800 text-brand-rose rounded-lg transition-colors"
                              title="Hapus Menu"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT TAB 2: Stok Bahan Baku */}
      {activeTab === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Kelola Master Bahan Baku</h3>
            <button
              onClick={() => setShowIngredientModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-emerald hover:bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs"
            >
              <Plus size={14} />
              Tambah Bahan Baru
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold text-xs uppercase tracking-wider bg-slate-900/55">
                    <th className="p-4">ID Bahan</th>
                    <th className="p-4">Nama Bahan</th>
                    <th className="p-4 text-center">Satuan</th>
                    <th className="p-4 text-right">Harga Satuan (Rp)</th>
                    <th className="p-4 text-center">Stok Saat Ini</th>
                    <th className="p-4">Update Terakhir</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {stokBahan.map((item) => (
                    <tr key={item.id_bahan_baku} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-brand-blue">{item.id_bahan_baku}</td>
                      <td className="p-4 font-bold text-white">{item.nama_bahan}</td>
                      <td className="p-4 text-xs font-mono text-slate-400 text-center">{item.satuan}</td>
                      <td className="p-4 font-mono text-right text-brand-emerald font-bold">
                        {formatRupiah(item.harga_satuan || 0)}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-200 text-center">
                        {parseFloat(item.stok).toFixed(2)}
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(item.updated_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setOpnameIngredient(item)
                              setStokFisik('')
                            }}
                            className="p-1 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500 text-amber-500 rounded transition-all active:scale-95"
                            title="Opname / Cek Kebocoran"
                          >
                            <span className="text-[10px] px-1 font-bold">OPNAME</span>
                          </button>
                          <button
                            onClick={() => setEditingIngredient({ ...item, nama_produk: item.nama_bahan })}
                            className="p-1 bg-brand-emerald/10 border border-brand-emerald/20 hover:border-brand-emerald text-brand-emerald rounded transition-all active:scale-95"
                            title="Edit Bahan Baku"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteIngredient(item.id_bahan_baku)}
                            className="p-1 bg-rose-500/10 border border-rose-500/25 hover:border-rose-500 text-rose-400 rounded transition-all active:scale-95"
                            title="Hapus Bahan Baku"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT TAB 3: Kasir & Metode Bayar */}
      {activeTab === 'cashier-pay' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kelola Nama Kasir */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-base font-bold text-white">Daftar Pilihan Kasir Aktif</h3>
            
            <form onSubmit={handleAddCashier} className="flex gap-2">
              <input
                type="text"
                placeholder="Tambah nama kasir (misal: RISA)"
                value={newCashier}
                onChange={(e) => setNewCashier(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs uppercase focus:outline-none focus:border-brand-blue"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-brand-blue text-slate-950 font-bold rounded-lg text-xs"
              >
                + Tambah
              </button>
            </form>

            <div className="divide-y divide-slate-800/50 pt-2">
              {cashiers.map(c => (
                <div key={c.nama} className="flex justify-between items-center py-2.5">
                  <span className="text-sm font-bold text-slate-200">{c.nama}</span>
                  <button
                    onClick={() => toggleCashierActive(c.nama, c.is_active)}
                    className={`text-[10px] px-3 py-1 rounded font-bold border transition-colors ${
                      c.is_active 
                        ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20' 
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {c.is_active ? '✓ AKTIF' : 'NONAKTIF'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Kelola Metode Pembayaran */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-base font-bold text-white">Daftar Pilihan Metode Bayar</h3>
            
            <form onSubmit={handleAddPayment} className="flex gap-2">
              <input
                type="text"
                placeholder="Tambah metode bayar (misal: SHOPEEPAY)"
                value={newPayment}
                onChange={(e) => setNewPayment(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs uppercase focus:outline-none focus:border-brand-blue"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-brand-blue text-slate-950 font-bold rounded-lg text-xs"
              >
                + Tambah
              </button>
            </form>

            <div className="divide-y divide-slate-800/50 pt-2">
              {paymentMethods.map(p => (
                <div key={p.nama} className="flex justify-between items-center py-2.5">
                  <span className="text-sm font-bold text-slate-200">{p.nama}</span>
                  <button
                    onClick={() => togglePaymentActive(p.nama, p.is_active)}
                    className={`text-[10px] px-3 py-1 rounded font-bold border transition-colors ${
                      p.is_active 
                        ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20' 
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {p.is_active ? '✓ AKTIF' : 'NONAKTIF'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT TAB 4: Registrasi Staff */}
      {activeTab === 'staff' && (
        <div className="max-w-xl mx-auto glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="text-brand-blue" />
              Daftarkan Staf Baru
            </h3>
            <p className="text-xs text-slate-500 mt-1">Buat kredensial login (Email & Password) untuk kasir baru Anda</p>
          </div>

          <form onSubmit={handleRegisterStaff} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Lengkap Staf
              </label>
              <input
                type="text"
                placeholder="Ketik nama (misal: Alexa Syafa)"
                value={staffForm.nama}
                onChange={(e) => setStaffForm(prev => ({ ...prev, nama: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Username Login
              </label>
              <input
                type="text"
                placeholder="Masukkan username (tanpa spasi)..."
                value={staffForm.email}
                onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                value={staffForm.password}
                onChange={(e) => setStaffForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Peran Hak Akses (Role)
              </label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
              >
                <option value="Kasir">Kasir (Akses Terbatas Transaksi)</option>
                <option value="Owner">Owner (Akses Penuh)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-brand-blue hover:bg-cyan-500 active:bg-cyan-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-brand-blue/20 transition-all text-sm mt-2"
            >
              Registrasikan Akun Staf
            </button>
          </form>
        </div>
      )}

      {/* CONTENT TAB 5: Kalibrasi Saldo */}
      {activeTab === 'calibration' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 max-w-xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="text-brand-blue" size={20} />
              <span>Kalibrasi Saldo Keuangan</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Gunakan form ini untuk menyinkronkan saldo berjalan di aplikasi dengan saldo riil fisik Anda.</p>
          </div>

          <form onSubmit={handleCalibrateBalances} className="space-y-4">
            {/* 1. Saldo Cash */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider">SALDO CASH (Laci Kas)</span>
                <span className="font-bold text-brand-emerald">Berjalan: {formatRupiah(balances.cash)}</span>
              </div>
              <input
                type="number"
                placeholder="Masukkan target saldo baru (misal: 3956500)"
                value={targetBalances.cash}
                onChange={(e) => setTargetBalances(prev => ({ ...prev, cash: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
              />
            </div>

            {/* 2. Saldo Rekening Y */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider">SALDO REKENING Y (BCA Utama)</span>
                <span className="font-bold text-brand-emerald">Berjalan: {formatRupiah(balances.rekY)}</span>
              </div>
              <input
                type="number"
                placeholder="Masukkan target saldo baru (misal: 8087000)"
                value={targetBalances.rekY}
                onChange={(e) => setTargetBalances(prev => ({ ...prev, rekY: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
              />
            </div>

            {/* 3. Saldo Rekening N */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider">SALDO REKENING N (Mandiri Operasional)</span>
                <span className="font-bold text-brand-emerald">Berjalan: {formatRupiah(balances.rekN)}</span>
              </div>
              <input
                type="number"
                placeholder="Masukkan target saldo baru (misal: 124437)"
                value={targetBalances.rekN}
                onChange={(e) => setTargetBalances(prev => ({ ...prev, rekN: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-blue hover:bg-cyan-500 active:bg-cyan-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-brand-blue/20 transition-all text-sm mt-2"
            >
              {loading ? 'Menyimpan Kalibrasi...' : 'Simpan & Sesuaikan Saldo'}
            </button>
          </form>
        </div>
      )}

      {/* CONTENT TAB 6: Laporan Gaji Cuci */}
      {activeTab === 'wages' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="text-brand-blue" size={20} />
                  <span>Laporan Gaji Karyawan Cuci Mobil</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Akumulasi upah karyawan cuci dari transaksi berstatus Selesai</p>
              </div>

              {/* Date Filters with InteractiveCalendar */}
              <div className="relative flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setShowWagesCalendar(!showWagesCalendar)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-white rounded-xl font-bold transition-all text-xs"
                >
                  <Calendar size={14} className="text-brand-blue" />
                  <span>Periode Gaji: {wagesStartDate || 'Mulai'} s/d {wagesEndDate || 'Selesai'}</span>
                </button>

                {showWagesCalendar && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <InteractiveCalendar
                      startDate={wagesStartDate}
                      endDate={wagesEndDate}
                      onChange={(start, end) => {
                        setWagesStartDate(start)
                        setWagesEndDate(end)
                      }}
                      onClose={() => setShowWagesCalendar(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Main Wages Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List Summary Karyawan (2/3 width) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                  <table className="w-full min-w-[500px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-semibold text-[10px] uppercase tracking-wider bg-slate-900/50">
                        <th className="p-4">Nama Pencuci</th>
                        <th className="p-4 text-center">Jumlah Cuci (Mobil)</th>
                        <th className="p-4 text-right">Total Upah (Rp)</th>
                        <th className="p-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {wagesSummary.map((item) => (
                        <tr 
                          key={item.name} 
                          className={`hover:bg-slate-800/10 transition-colors ${
                            selectedWageWorker === item.name ? 'bg-brand-blue/5' : ''
                          }`}
                        >
                          <td className="p-4 font-bold text-white text-sm">{item.name}</td>
                          <td className="p-4 text-center font-bold text-slate-300 text-sm font-mono">{item.totalCars}</td>
                          <td className="p-4 text-right font-black text-brand-emerald text-sm font-mono">{formatRupiah(item.totalWage)}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setSelectedWageWorker(item.name)}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-brand-blue font-bold rounded-lg text-[10px] transition-colors"
                            >
                              Detail Riwayat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sidebar Detail Riwayat Worker (1/3 width) */}
              <div className="glass-panel p-5 rounded-xl border border-slate-850 space-y-4 h-fit max-h-[70vh] flex flex-col justify-between overflow-hidden">
                {!selectedWageWorker ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-600 text-center">
                    <DollarSign size={36} className="mb-2 text-slate-700" />
                    <p className="text-xs font-bold uppercase tracking-wider">Pilih Karyawan</p>
                    <p className="text-[10px] text-slate-700 mt-1 max-w-[200px]">Klik tombol "Detail Riwayat" di sebelah nama pencuci untuk melihat rincian pekerjaan mereka</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 space-y-4">
                    <div className="border-b border-slate-800 pb-3 flex justify-between items-center shrink-0">
                      <div>
                        <h4 className="font-extrabold text-sm text-white">{selectedWageWorker}</h4>
                        <p className="text-[10px] text-slate-500">Rincian upah periode terpilih</p>
                      </div>
                      <button 
                        onClick={() => setSelectedWageWorker(null)}
                        className="text-slate-500 hover:text-slate-300 text-xs font-bold"
                      >
                        Tutup
                      </button>
                    </div>

                    {/* Info Card */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-850 text-xs shrink-0">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-semibold">Total Mobil</span>
                        <span className="text-sm font-bold text-slate-200 font-mono">{selectedWorkerDetails?.totalCars || 0}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-semibold">Total Upah</span>
                        <span className="text-sm font-black text-brand-emerald font-mono">
                          {formatRupiah(selectedWorkerDetails?.totalWage || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Drilldown List */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {selectedWorkerDetails?.details.length === 0 ? (
                        <p className="text-[10px] text-slate-600 text-center py-6">Tidak ada riwayat pekerjaan.</p>
                      ) : (
                        selectedWorkerDetails?.details.map((job) => {
                          const dateObj = new Date(job.tanggal)
                          const timeStr = dateObj.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short'
                          }) + ' - ' + dateObj.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })

                          return (
                            <div 
                              key={job.id} 
                              onClick={() => setSelectedJobForCrosscheck(job)}
                              className="p-3 rounded-lg bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-brand-blue/30 active:scale-[0.98] transition-all cursor-pointer space-y-1.5"
                              title="Klik untuk detail mobil (crosschecking)"
                            >
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="font-bold text-brand-blue uppercase">{job.platNomor || 'PLAT KOSONG'}</span>
                                <span className="text-slate-500">{timeStr}</span>
                              </div>
                              <div className="text-[11px] text-slate-300 font-semibold truncate">
                                {job.paket} ({job.variant} • {job.ukuran})
                              </div>
                              <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-850/50 text-slate-400">
                                <span>Porsi: <span className="font-bold text-slate-300">{job.split}</span></span>
                                <span className="font-extrabold text-brand-emerald">{formatRupiah(job.shareWage)}</span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT TAB 7: Daftar Karyawan Cuci */}
      {activeTab === 'crew' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="text-brand-blue" size={20} />
                <span>Daftar Karyawan Cuci Mobil</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kelola kru cuci mobil yang aktif. Daftar ini digunakan sebagai referensi pencucian di Kasir POS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Tambah Karyawan */}
            <div className="glass-panel p-5 rounded-xl border border-slate-850 h-fit space-y-4">
              <h4 className="font-bold text-sm text-white">Tambah Karyawan Baru</h4>
              <form onSubmit={handleAddKaryawanCuci} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Nama Karyawan (Capital)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: RIO"
                    value={newKaryawanCuci}
                    onChange={(e) => setNewKaryawanCuci(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-brand-blue font-bold uppercase font-sans tracking-wide"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-blue hover:bg-cyan-500 active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md shadow-brand-blue/15"
                >
                  Tambah Karyawan
                </button>
              </form>
            </div>

            {/* List Karyawan */}
            <div className="md:col-span-2 overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
              <table className="w-full min-w-[500px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold text-[10px] uppercase tracking-wider bg-slate-900/50">
                    <th className="p-4">Nama Karyawan</th>
                    <th className="p-4 text-center">Tanggal Terdaftar</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {karyawanCuciList.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-xs text-slate-600 font-medium italic">
                        Belum ada karyawan cuci terdaftar. (Menggunakan fallback statis di Kasir)
                      </td>
                    </tr>
                  ) : (
                    karyawanCuciList.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="p-4 font-bold text-white text-sm">{k.nama}</td>
                        <td className="p-4 text-center text-xs text-slate-400 font-mono">
                          {new Date(k.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteKaryawanCuci(k.id, k.nama)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-rose-500/10 text-brand-rose border border-slate-800 hover:border-brand-rose/20 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                          >
                            Hapus
                          </button>
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

      {/* MODAL: Crosscheck Detail Mobil Cuci */}
      {selectedJobForCrosscheck && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border border-slate-800 space-y-4 animate-pop-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-brand-blue tracking-wider uppercase font-mono">
                  Detail Transaksi Mobil {selectedJobForCrosscheck.platNomor}
                </h3>
                <p className="text-[10px] text-slate-500">Crosscheck data transaksi & pembagian gaji</p>
              </div>
              <button 
                onClick={() => setSelectedJobForCrosscheck(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-850">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">ID Transaksi</span>
                  <span className="font-mono text-[9px] font-bold text-slate-300 select-all">{selectedJobForCrosscheck.id}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-850">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Waktu Input</span>
                  <span className="font-mono text-[9.5px] font-semibold text-slate-300">
                    {new Date(selectedJobForCrosscheck.tanggal).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-850 space-y-2">
                <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-1">Spesifikasi Layanan</h5>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Jenis Paket:</span>
                  <span className="font-bold text-white">{selectedJobForCrosscheck.paket}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Ukuran & Variant:</span>
                  <span className="font-bold text-slate-200">{selectedJobForCrosscheck.ukuran} • {selectedJobForCrosscheck.variant}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-850/50">
                  <span className="text-slate-400 font-medium">Total Harga Jasa:</span>
                  <span className="font-black text-brand-emerald">{formatRupiah(selectedJobForCrosscheck.totalHarga)}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-850 space-y-2">
                <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-1">Rincian Pembagian Gaji</h5>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Kru Pencuci 1:</span>
                  <span className="font-bold text-slate-200">{selectedJobForCrosscheck.rawItem?.anggota_1 || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Kru Pencuci 2:</span>
                  <span className="font-bold text-slate-200">{selectedJobForCrosscheck.rawItem?.anggota_2 || 'Tidak ada (Solo)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Tipe Pengerjaan:</span>
                  <span className="font-bold text-slate-300 font-mono text-[10px]">{selectedJobForCrosscheck.split}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-850/50">
                  <span className="text-slate-400 font-bold">Porsi Gaji Diterima:</span>
                  <span className="font-black text-brand-emerald text-sm">{formatRupiah(selectedJobForCrosscheck.shareWage)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedJobForCrosscheck(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs text-slate-200 transition-colors"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: Tambah/Edit Menu & Resep */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl shadow-2xl border border-slate-800 max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                <h3 className="text-lg font-bold text-white">
                  {isEditingMenu ? 'Edit Menu & Resep' : 'Tambah Menu Baru'}
                </h3>
                <button 
                  onClick={() => setShowMenuModal(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMenu} className="space-y-4 overflow-y-auto max-h-[50vh] pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nama Menu
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: Ice Americano"
                      value={menuForm.nama_menu}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, nama_menu: e.target.value }))}
                      disabled={isEditingMenu}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Harga Jual (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={menuForm.harga}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, harga: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Kategori
                    </label>
                    <select
                      value={menuForm.kategori}
                      onChange={(e) => setMenuForm(prev => ({ ...prev, kategori: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                    >
                      <option value="Cafe">Cafe</option>
                      <option value="Carwash">Carwash</option>
                      <option value="Promo/Bundling">Promo/Bundling</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer">
                      <input
                        type="checkbox"
                        checked={menuForm.is_bundling}
                        onChange={(e) => setMenuForm(prev => ({ ...prev, is_bundling: e.target.checked }))}
                        className="rounded border-slate-800 bg-slate-900 text-brand-emerald focus:ring-brand-emerald"
                      />
                      Paket Bundling
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer">
                      <input
                        type="checkbox"
                        checked={menuForm.is_active}
                        onChange={(e) => setMenuForm(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded border-slate-800 bg-slate-900 text-brand-emerald focus:ring-brand-emerald"
                      />
                      Aktif/Jual
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Deskripsi Menu
                  </label>
                  <textarea
                    placeholder="Tulis detail menu..."
                    value={menuForm.deskripsi}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm h-16 focus:outline-none"
                  />
                </div>

                {/* Resep List */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Resep Bahan Baku Terpakai
                    </span>
                    <button
                      type="button"
                      onClick={handleAddRecipeRow}
                      className="px-3 py-1 bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald font-bold rounded-lg text-xs"
                    >
                      + Tambah Bahan
                    </button>
                  </div>

                  {menuRecipe.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center p-2 rounded-lg bg-slate-900/60 border border-slate-850">
                      <div className="flex-1 min-w-[120px]">
                        <select
                          value={row.nama_bahan}
                          onChange={(e) => updateRecipeRow(idx, 'nama_bahan', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded py-1 px-2 text-white text-xs"
                        >
                          {stokBahan.map(b => (
                            <option key={b.nama_bahan} value={b.nama_bahan}>{b.nama_bahan}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          placeholder="Jumlah"
                          value={row.jumlah_dibutuhkan}
                          onChange={(e) => updateRecipeRow(idx, 'jumlah_dibutuhkan', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded py-1 px-2 text-white text-xs text-center"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-12 font-mono">{row.satuan}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipeRow(idx)}
                        className="text-rose-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setShowMenuModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                onClick={handleSaveMenu}
                className="px-4 py-2 bg-brand-emerald hover:bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm"
              >
                Simpan Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah Bahan Baku Baru */}
      {showIngredientModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-white">Tambah Bahan Baku Baru</h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowIngredientModal(false)
                  setIngredientForm({ id_bahan_baku: '', nama_bahan: '', stok: 0, satuan: 'Gram/Ml', harga_satuan: 0 })
                }} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    ID Bahan Baku
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: BK-01, MB-01"
                    value={ingredientForm.id_bahan_baku}
                    onChange={(e) => setIngredientForm(prev => ({ ...prev, id_bahan_baku: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nama Bahan Baku
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Biji Kopi"
                    value={ingredientForm.nama_bahan}
                    onChange={(e) => setIngredientForm(prev => ({ ...prev, nama_bahan: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Satuan Ukuran
                  </label>
                  <select
                    value={ingredientForm.satuan}
                    onChange={(e) => setIngredientForm(prev => ({ ...prev, satuan: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                  >
                    <option value="Gram">Gram</option>
                    <option value="Ml">Ml</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Btl">Btl</option>
                    <option value="Gram/Ml">Gram/Ml</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={ingredientForm.harga_satuan}
                    onChange={(e) => setIngredientForm(prev => ({ ...prev, harga_satuan: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Stok Awal
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={ingredientForm.stok}
                  onChange={(e) => setIngredientForm(prev => ({ ...prev, stok: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowIngredientModal(false)
                    setIngredientForm({ id_bahan_baku: '', nama_bahan: '', stok: 0, satuan: 'Gram/Ml', harga_satuan: 0 })
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-emerald hover:bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm"
                >
                  Tambah Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2b: Edit Bahan Baku */}
      {editingIngredient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-white">Edit Bahan Baku</h3>
              <button 
                type="button" 
                onClick={() => setEditingIngredient(null)} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateIngredient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    ID Bahan Baku
                  </label>
                  <input
                    type="text"
                    value={editingIngredient.id_bahan_baku}
                    disabled
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm font-mono font-bold opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nama Bahan Baku
                  </label>
                  <input
                    type="text"
                    value={editingIngredient.nama_produk}
                    onChange={(e) => setEditingIngredient(prev => ({ ...prev, nama_produk: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Satuan Ukuran
                  </label>
                  <select
                    value={editingIngredient.satuan}
                    onChange={(e) => setEditingIngredient(prev => ({ ...prev, satuan: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm"
                  >
                    <option value="Gram">Gram</option>
                    <option value="Ml">Ml</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Btl">Btl</option>
                    <option value="Gram/Ml">Gram/Ml</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    value={editingIngredient.harga_satuan}
                    onChange={(e) => setEditingIngredient(prev => ({ ...prev, harga_satuan: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Stok Saat Ini
                </label>
                <input
                  type="number"
                  value={editingIngredient.stok}
                  onChange={(e) => setEditingIngredient(prev => ({ ...prev, stok: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-emerald hover:bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL OPNAME / KEBOCORAN */}
      {opnameIngredient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 z-50">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 relative">
            <h3 className="text-xl font-bold text-white mb-2">Opname & Kebocoran</h3>
            <p className="text-xs text-slate-400 mb-6 border-b border-slate-800 pb-4">
              Hitung selisih stok aplikasi dengan stok fisik gudang.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <span className="text-sm font-semibold text-slate-400">Bahan Baku:</span>
                <span className="text-sm font-bold text-white">{opnameIngredient.nama_bahan}</span>
              </div>
              <div className="flex justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <span className="text-sm font-semibold text-slate-400">Stok Sistem Saat Ini:</span>
                <span className="text-sm font-bold text-brand-blue">{parseFloat(opnameIngredient.stok).toFixed(2)} {opnameIngredient.satuan}</span>
              </div>
            </div>

            <form onSubmit={handleSimpanOpname} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Stok Fisik Gudang ({opnameIngredient.satuan})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={stokFisik}
                  onChange={(e) => setStokFisik(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-brand-emerald transition-colors"
                  placeholder="Masukkan jumlah asli di gudang"
                />
              </div>

              {stokFisik !== '' && !isNaN(parseFloat(stokFisik)) && (
                <div className="p-4 rounded-xl border mt-4 bg-slate-900/50">
                  {(() => {
                    const diff = parseFloat(opnameIngredient.stok) - parseFloat(stokFisik);
                    const isBocor = diff > 0;
                    const isLebih = diff < 0;
                    const nilaiKerugian = Math.abs(diff) * parseFloat(opnameIngredient.harga_satuan || 0);

                    if (diff === 0) {
                      return (
                        <div className="text-brand-emerald text-sm text-center font-bold">
                          Stok Cocok! Tidak ada kebocoran.
                        </div>
                      )
                    }

                    if (isBocor) {
                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between text-rose-400 font-bold text-sm">
                            <span>Selisih Kebocoran:</span>
                            <span>{diff.toFixed(2)} {opnameIngredient.satuan}</span>
                          </div>
                          <div className="flex justify-between text-rose-500 font-black">
                            <span>Estimasi Kerugian:</span>
                            <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(nilaiKerugian)}</span>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-amber-400 font-bold text-sm">
                          <span>Selisih Kelebihan:</span>
                          <span>{Math.abs(diff).toFixed(2)} {opnameIngredient.satuan}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOpnameIngredient(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-emerald text-slate-950 font-bold rounded-xl text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all"
                >
                  Update & Sesuaikan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Admin
