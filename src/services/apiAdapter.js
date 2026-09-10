// API Adapter: Menjembatani request frontend ke Supabase atau Cloudflare Worker API
// Otomatis mendeteksi domain Cloudflare Pages atau variabel VITE_BACKEND_PROVIDER

import { supabase } from '../supabaseClient'

export const BACKEND_PROVIDER = import.meta.env.VITE_BACKEND_PROVIDER || 'supabase'
export const isCloudflare =
  BACKEND_PROVIDER === 'cloudflare' ||
  (typeof window !== 'undefined' &&
    (window.location.hostname.includes('pages.dev') ||
      window.location.hostname.includes('workers.dev')))

// Helper fetch API Cloudflare Worker
export async function fetchCF(endpoint, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('jb_cf_auth_token') : null
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`/api/${endpoint.replace(/^\//, '')}`, {
    ...options,
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server Cloudflare API.')
  }
  return data
}

export const api = {
  isCloudflare,

  // 1. AUTENTIKASI
  auth: {
    async login(emailOrUsername, password) {
      if (isCloudflare) {
        const data = await fetchCF('auth/login', {
          method: 'POST',
          body: JSON.stringify({ emailOrUsername, password }),
        })
        if (data.token) {
          localStorage.setItem('jb_cf_auth_token', data.token)
        }
        return { success: true, user: data.user, profile: data.profile }
      } else {
        const email = emailOrUsername.includes('@')
          ? emailOrUsername.trim()
          : `${emailOrUsername.trim().toLowerCase()}@jb.local`
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return { success: true, user: data.user }
      }
    },

    async logout() {
      if (isCloudflare) {
        localStorage.removeItem('jb_cf_auth_token')
        return { success: true }
      } else {
        return await supabase.auth.signOut()
      }
    },

    async getMe() {
      if (isCloudflare) {
        return await fetchCF('auth/me')
      }
      return null
    },

    async getProfile(userId) {
      if (isCloudflare) {
        const data = await fetchCF('auth/me')
        return data.profile
      } else {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (error) throw error
        return data
      }
    },

    async registerKasir(emailOrUsername, password, nama, role = 'Kasir') {
      if (isCloudflare) {
        return await fetchCF('auth/register-kasir', {
          method: 'POST',
          body: JSON.stringify({ emailOrUsername, password, nama, role }),
        })
      }
      return null
    },
  },

  // 2. MASTER DATA
  master: {
    async getKasir() {
      if (isCloudflare) return await fetchCF('master/kasir')
      const { data, error } = await supabase.from('kasir').select('*').order('nama', { ascending: true })
      if (error) throw error
      return data
    },

    async getMetodeBayar() {
      if (isCloudflare) return await fetchCF('master/metode-bayar')
      const { data, error } = await supabase.from('metode_bayar').select('*').order('nama', { ascending: true })
      if (error) throw error
      return data
    },

    async getStokBarang() {
      if (isCloudflare) return await fetchCF('master/stok-barang')
      const { data, error } = await supabase.from('stok_barang').select('*').order('nama_produk', { ascending: true })
      if (error) throw error
      return data
    },

    async getDaftarMenu() {
      if (isCloudflare) return await fetchCF('master/daftar-menu')
      const { data, error } = await supabase.from('daftar_harga_menu').select('*').order('daftar_menu', { ascending: true })
      if (error) throw error
      return data
    },

    async getResep() {
      if (isCloudflare) return await fetchCF('master/resep')
      const { data, error } = await supabase.from('resep').select('*').order('nama_menu', { ascending: true })
      if (error) throw error
      return data
    },

    async getKaryawanCuci() {
      if (isCloudflare) return await fetchCF('master/karyawan-cuci')
      const { data, error } = await supabase.from('karyawan_cuci').select('*').order('nama', { ascending: true })
      if (error) throw error
      return data
    },
  },

  // 3. TRANSAKSI
  transaksi: {
    async createStruk(payload) {
      if (isCloudflare) {
        return await fetchCF('transaksi/struk', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      } else {
        const { data, error } = await supabase.from('struk').insert(payload).select()
        if (error) throw error
        return data
      }
    },

    async getCarwashQueue(tanggal) {
      if (isCloudflare) {
        return await fetchCF(`carwash?tanggal=${tanggal || ''}`)
      } else {
        let query = supabase.from('carwash').select('*').order('created_at', { ascending: false })
        if (tanggal) query = query.eq('tanggal', tanggal)
        const { data, error } = await query
        if (error) throw error
        return data
      }
    },
  },
}

export default api
