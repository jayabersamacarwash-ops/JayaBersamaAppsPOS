export const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const formatRupiah = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

export const parseDateSafe = (dateStr) => {
  if (!dateStr) return new Date()
  if (dateStr instanceof Date) return dateStr

  const str = String(dateStr).trim()
  if (str.includes('T')) {
    const d = new Date(str)
    if (!isNaN(d.getTime())) return d
  }

  const parts = str.split(/[\sT]+/)
  if (parts.length > 0) {
    const d = new Date(parts[0])
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

export const getShiftForCashier = (cashierName) => {
  if (!cashierName) return 'Shift 1'
  const name = cashierName.toUpperCase()
  if (name === 'SYAFA') return 'Shift 2'
  if (name === 'ALEXA') return 'Shift 1'
  if (name === 'VIRA') return 'Shift 1'
  
  const currentHour = new Date().getHours()
  return currentHour < 14 ? 'Shift 1' : 'Shift 2'
}

export const calculateTutupKasirRecap = ({ receipts, expenses, cashierName, todayDate, timestamp }) => {
  let totalCash = 0
  let totalQRIS = 0
  
  if (receipts) {
    receipts.forEach(s => {
      if (s.metode_bayar === 'CASH') {
        totalCash += parseFloat(s.total_tagihan || 0)
      } else if (s.metode_bayar === 'QRIS') {
        totalQRIS += parseFloat(s.total_tagihan || 0)
      } else if (s.metode_bayar === 'SPLIT') {
        totalCash += parseFloat(s.nominal_cash || 0)
        totalQRIS += parseFloat(s.nominal_qris || 0)
      }
    })
  }

  let totalExpense = 0
  if (expenses) {
    totalExpense = expenses.reduce((sum, item) => sum + parseFloat(item.nominal || 0), 0)
  }

  const insertions = []
  
  if (totalCash > 0) {
    insertions.push({
      id_cashflow: generateUUID(),
      tanggal: todayDate,
      jenis: 'Pemasukan',
      kategori: 'Omzet Harian (CASH)',
      pemasukan: totalCash,
      pengeluaran: 0,
      pos: 'SALDO CASH',
      keterangan_transaksi: `Rekap Tutup Kasir (CASH) - Kasir: ${cashierName}`,
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
      keterangan_transaksi: `Rekap Tutup Kasir (QRIS) - Kasir: ${cashierName}`,
      created_at: timestamp
    })
  }

  if (totalExpense > 0) {
    insertions.push({
      id_cashflow: generateUUID(),
      tanggal: todayDate,
      jenis: 'pengeluaran Cafe',
      kategori: 'Operasional',
      pemasukan: 0,
      pengeluaran: totalExpense,
      pos: 'SALDO CASH',
      keterangan_transaksi: `Rekap Pengeluaran Kasir - Kasir: ${cashierName}`,
      created_at: timestamp
    })
  }

  return insertions
}

export const getJobTimestamp = (job) => {
  if (!job) return 0
  if (job.tanggal) {
    const jam = job.jam || '00:00'
    const jamStr = jam.length === 5 ? `${jam}:00` : jam
    const dtStr = String(job.tanggal).includes('T') ? job.tanggal : `${job.tanggal}T${jamStr}`
    const t = new Date(dtStr).getTime()
    if (!isNaN(t)) return t
  }
  if (job.created_at) {
    const t = new Date(job.created_at).getTime()
    if (!isNaN(t)) return t
  }
  return 0
}

export const sortWagesDetails = (list, field = 'tanggal', direction = 'asc') => {
  if (!Array.isArray(list)) return []
  const sorted = [...list]
  sorted.sort((a, b) => {
    let comparison = 0
    switch (field) {
      case 'tanggal': {
        comparison = getJobTimestamp(a) - getJobTimestamp(b)
        break
      }
      case 'platNomor': {
        comparison = (a.platNomor || '').localeCompare(b.platNomor || '')
        break
      }
      case 'paket': {
        comparison = (a.paket || '').localeCompare(b.paket || '')
        break
      }
      case 'variant': {
        const varA = `${a.variant || ''} ${a.ukuran || ''}`
        const varB = `${b.variant || ''} ${b.ukuran || ''}`
        comparison = varA.localeCompare(varB)
        break
      }
      case 'split': {
        comparison = (a.split || '').localeCompare(b.split || '')
        break
      }
      case 'totalHarga': {
        comparison = (parseFloat(a.totalHarga) || 0) - (parseFloat(b.totalHarga) || 0)
        break
      }
      case 'shareWage': {
        comparison = (parseFloat(a.shareWage) || 0) - (parseFloat(b.shareWage) || 0)
        break
      }
      default:
        comparison = 0
    }
    return direction === 'asc' ? comparison : -comparison
  })
  return sorted
}

export const sortWithdrawalsList = (list, field = 'tanggal', direction = 'asc') => {
  if (!Array.isArray(list)) return []
  const sorted = [...list]
  sorted.sort((a, b) => {
    let comparison = 0
    switch (field) {
      case 'tanggal': {
        const timeA = a.tanggal ? new Date(a.tanggal).getTime() : 0
        const timeB = b.tanggal ? new Date(b.tanggal).getTime() : 0
        comparison = timeA - timeB
        break
      }
      case 'keterangan': {
        comparison = (a.keterangan || '').localeCompare(b.keterangan || '')
        break
      }
      case 'pos': {
        comparison = (a.pos || '').localeCompare(b.pos || '')
        break
      }
      case 'nominal': {
        comparison = (parseFloat(a.nominal) || 0) - (parseFloat(b.nominal) || 0)
        break
      }
      default:
        comparison = 0
    }
    return direction === 'asc' ? comparison : -comparison
  })
  return sorted
}

