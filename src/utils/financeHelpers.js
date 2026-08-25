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
    jenis: 'Pemasukan',
    kategori: form.kategori,
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
