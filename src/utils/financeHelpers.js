import { generateUUID } from './helpers'

export const validateExpenseForm = (form, barangMasukList) => {
  const totalVal = parseFloat(form.total_harga)
  if (isNaN(totalVal) || totalVal <= 0) {
    return { isValid: false, error: 'Total harga pengeluaran harus lebih besar dari 0.' }
  }
  if (form.kategori === 'Bahan Baku' && (!barangMasukList || barangMasukList.length === 0)) {
    return { isValid: false, error: 'Daftar barang masuk/restok wajib diisi untuk kategori Bahan Baku.' }
  }
  return { isValid: true }
}

export const formatExpensePayload = ({
  form,
  barangMasukList,
  stokBahan,
  newCfId,
  todayDate,
  timestamp
}) => {
  const totalVal = parseFloat(form.total_harga)
  const isBahanBaku = form.kategori === 'Bahan Baku' && barangMasukList && barangMasukList.length > 0

  const cashflow = {
    id_cashflow: newCfId,
    id_sumber: null,
    tanggal: todayDate,
    keterangan_transaksi: form.keterangan,
    jenis: form.jenis,
    kategori: form.kategori,
    pemasukan: 0,
    pengeluaran: totalVal,
    pos: form.pos,
    apakah_stok: isBahanBaku ? 'Ya' : 'Tidak',
    qty: isBahanBaku ? barangMasukList.reduce((sum, item) => sum + parseFloat(item.jumlah || 0), 0) : 0,
    created_at: timestamp
  }

  const details = isBahanBaku
    ? barangMasukList.map(item => {
        const matchingBahan = stokBahan.find(b => b.nama_bahan === item.id_bahan_baku)
        return {
          id_masuk: generateUUID(),
          id_pengeluaran: null,
          id_cashflow: newCfId,
          id_bahan_baku: item.id_bahan_baku,
          tanggal: todayDate,
          nama_produk: matchingBahan ? (matchingBahan.nama_produk || matchingBahan.nama_bahan) : item.id_bahan_baku,
          jumlah_masuk: parseFloat(item.jumlah),
          harga_satuan: parseFloat(item.harga_satuan)
        }
      })
    : []

  return { cashflow, details }
}

export const validateIncomeForm = (form) => {
  const nominalVal = parseFloat(form.nominal)
  if (!form.keterangan || !form.keterangan.trim()) {
    return { isValid: false, error: 'Keterangan pemasukan wajib diisi.' }
  }
  if (isNaN(nominalVal) || nominalVal <= 0) {
    return { isValid: false, error: 'Nominal pemasukan harus lebih besar dari 0.' }
  }
  return { isValid: true }
}

export const formatIncomePayload = ({ form, newCfId, todayDate, timestamp }) => {
  const nominalVal = parseFloat(form.nominal)
  return {
    id_cashflow: newCfId,
    id_sumber: null,
    tanggal: todayDate,
    keterangan_transaksi: form.keterangan,
    jenis: form.jenis || 'Pemasukan',
    kategori: form.kategori || 'Pemasukan Lain-lain',
    pemasukan: nominalVal,
    pengeluaran: 0,
    pos: form.pos,
    created_at: timestamp
  }
}

export const validatePosExpenseForm = (form) => {
  const nominalVal = parseFloat(form.nominal)
  if (['Casbon', 'Ambil Uang Paketan'].includes(form.kategori) && (!form.karyawan || !form.karyawan.trim())) {
    return { isValid: false, error: 'Pilih karyawan penerima terlebih dahulu.' }
  }
  if (!form.keterangan || !form.keterangan.trim()) {
    return { isValid: false, error: 'Keterangan pengeluaran wajib diisi.' }
  }
  if (isNaN(nominalVal) || nominalVal <= 0) {
    return { isValid: false, error: 'Nominal pengeluaran harus lebih besar dari 0.' }
  }
  return { isValid: true }
}

export const formatPosExpensePayload = ({ form, todayDate, currentTime, newExpId }) => {
  const nominalVal = parseFloat(form.nominal)
  const isCasbon = form.kategori === 'Casbon'
  const isPaketan = form.kategori === 'Ambil Uang Paketan'
  const isEmployeeRelated = isCasbon || isPaketan
  
  return {
    id_pengeluaran: newExpId,
    tanggal: todayDate,
    jam: currentTime,
    jenis: isCasbon ? 'Casbon' : (isPaketan ? 'Ambil Uang Paketan' : `pengeluaran ${form.unit}`),
    kategori: isEmployeeRelated ? `${form.kategori} - ${form.karyawan}` : form.kategori,
    nominal: nominalVal,
    nama_pengeluaran: isEmployeeRelated ? `${form.kategori} ${form.karyawan} (${form.keterangan || 'Tanpa catatan'})` : form.keterangan,
    apakah_stok: 'Tidak',
    id_bahan_baku: '',
    qty: 0
  }
}

export const validateEditCashflowForm = (form) => {
  const pemasukanVal = parseFloat(form.pemasukan || 0)
  const pengeluaranVal = parseFloat(form.pengeluaran || 0)
  if (!form.keterangan_transaksi || !form.keterangan_transaksi.trim()) {
    return { isValid: false, error: 'Keterangan transaksi wajib diisi.' }
  }
  if (pemasukanVal <= 0 && pengeluaranVal <= 0) {
    return { isValid: false, error: 'Nominal pemasukan atau pengeluaran harus lebih besar dari 0.' }
  }
  return { isValid: true }
}

export const generateCSVString = (headers, rows) => {
  const escapeCell = (cell) => {
    if (cell === null || cell === undefined) return '""'
    const str = String(cell).replace(/"/g, '""')
    return `"${str}"`
  }

  const headerLine = headers.map(h => escapeCell(h.label)).join(',')
  const rowLines = rows.map(row => {
    return headers.map(h => {
      const val = typeof h.accessor === 'function' ? h.accessor(row) : row[h.key]
      return escapeCell(val)
    }).join(',')
  })

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n')
}

export const downloadCSV = (csvContent, fileName) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const isPindahSaldo = (item) => {
  if (!item) return false
  const j = String(item.jenis || '').toLowerCase().trim()
  const k = String(item.kategori || '').toLowerCase().trim()
  const ket = String(item.keterangan_transaksi || item.keterangan || item.nama_pengeluaran || '').toLowerCase().trim()
  return j.includes('pindah') || k.includes('pindah') || ket.includes('pindah saldo') || ket.includes('transfer saldo') || ket.includes('mutasi saldo')
}

