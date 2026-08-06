import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { createClient } from '@supabase/supabase-js'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  registerKasir: async () => {},
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Dapatkan session aktif saat ini
    const getSession = async () => {
      setLoading(true)
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (session) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.error('Error fetching session:', err)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // 2. Dengarkan perubahan status autentikasi
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fungsi untuk mengambil data profil berdasarkan User ID
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
    }
  }

  // Fungsi Login (Mendukung Username & Email)
  const login = async (usernameOrEmail, password) => {
    setLoading(true)
    try {
      const email = usernameOrEmail.includes('@') ? usernameOrEmail.trim() : `${usernameOrEmail.trim().toLowerCase()}@jb.local`
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setUser(data.user)
      if (data.user) {
        await fetchProfile(data.user.id)
      }
      return { success: true }
    } catch (err) {
      console.error('Login error:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Fungsi Logout
  const logout = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fungsi untuk Owner mendaftarkan Kasir Baru
  // Catatan: Karena pendaftaran di-trigger oleh Owner untuk user lain, 
  // idealnya kita menggunakan API Supabase admin. Namun, untuk aplikasi serverless sederhana,
  // Supabase auth.signUp memungkinkan pembuatan user baru. 
  // Kita dapat membuat akun kasir baru. Agar session Owner tidak tertimpa, kita bisa gunakan
  // API sekunder (seperti service_role) atau Edge Function.
  // Cara termudah tanpa setup server/Edge function tambahan yang kompleks adalah:
  // Kita bisa menggunakan Supabase signUp dengan opsi redirect, tetapi di Supabase JS Client, 
  // signUp otomatis meloginkan user baru jika email verification mati.
  // Untuk menghindari hal ini, kita bisa menggunakan Supabase Edge Function atau mendaftarkan profil
  // langsung jika Owner membuat user, atau mendiktekan workflow pendaftaran.
  // Cara terbaik untuk Owner mendaftarkan kasir adalah memanggil endpoint Supabase Admin API, 
  // tetapi ini memerlukan service_role key yang tidak aman jika diletakkan di client.
  // Solusi aman: Owner mendaftarkan kasir melalui form, yang memanggil Supabase Edge Function,
  // ATAU Owner memasukkan Email & Password kasir ke tabel "antrean_registrasi_staf", 
  // atau kita gunakan endpoint pendaftaran client-side terpisah di mana Owner sementara
  // menggunakan helper client untuk mendaftar tanpa login otomatis (menggunakan instance supabase client baru 
  // yang tidak menyimpan session).
  // Fungsi untuk Owner mendaftarkan Kasir Baru (Mendukung Username & Email)
  const registerKasir = async (usernameOrEmail, password, nama, role = 'Kasir') => {
    try {
      const email = usernameOrEmail.includes('@') ? usernameOrEmail.trim() : `${usernameOrEmail.trim().toLowerCase()}@jb.local`
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
      
      // Buat instance supabase client baru tanpa persistence agar tidak menimpa session Owner yang sedang login
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      })
      
      // Catatan: Pendaftaran staff baru lewat API client biasa:
      const { data, error } = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            nama,
            role,
          }
        }
      })
      if (error) throw error
      
      // Jika berhasil, Supabase auth trigger `trg_on_auth_user_created` otomatis 
      // akan membuat entri di tabel profiles dengan nama dan role tersebut.
      return { success: true, user: data.user }
    } catch (err) {
      console.error('Registration error:', err)
      return { success: false, error: err.message }
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, registerKasir }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
