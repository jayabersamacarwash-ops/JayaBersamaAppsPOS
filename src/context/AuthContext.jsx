import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { api, isCloudflare } from '../services/apiAdapter'
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
    // 1. Inisialisasi Sesi Login
    const initSession = async () => {
      setLoading(true)
      try {
        if (isCloudflare) {
          const token = localStorage.getItem('jb_cf_auth_token')
          if (token) {
            const me = await api.auth.getMe()
            if (me && me.user) {
              setUser(me.user)
              setProfile(me.profile || { id: me.user.id, nama: me.user.nama || me.user.email, role: me.user.role })
            } else {
              localStorage.removeItem('jb_cf_auth_token')
              setUser(null)
              setProfile(null)
            }
          } else {
            setUser(null)
            setProfile(null)
          }
        } else {
          // Supabase Session Flow
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) throw error

          if (session) {
            setUser(session.user)
            await fetchSupabaseProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
        }
      } catch (err) {
        console.error('Error fetching session:', err)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    initSession()

    // 2. Listener Supabase jika tidak di Cloudflare
    if (!isCloudflare) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          setUser(session.user)
          await fetchSupabaseProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  // Fungsi untuk mengambil data profil Supabase
  const fetchSupabaseProfile = async (userId) => {
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

  // Fungsi Login Universal (Mendukung Cloudflare D1 & Supabase)
  const login = async (usernameOrEmail, password) => {
    setLoading(true)
    try {
      const res = await api.auth.login(usernameOrEmail, password)
      if (res.user) {
        setUser(res.user)
        if (res.profile) {
          setProfile(res.profile)
        } else if (!isCloudflare) {
          await fetchSupabaseProfile(res.user.id)
        }
      }
      return { success: true }
    } catch (err) {
      console.error('Login error:', err)
      return { success: false, error: err.message || 'Login gagal. Periksa username dan password.' }
    } finally {
      setLoading(false)
    }
  }

  // Fungsi Logout Universal
  const logout = async () => {
    setLoading(true)
    try {
      await api.auth.logout()
      setUser(null)
      setProfile(null)
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fungsi Pendaftaran Kasir Baru
  const registerKasir = async (usernameOrEmail, password, nama, role = 'Kasir') => {
    try {
      if (isCloudflare) {
        const res = await api.auth.registerKasir(usernameOrEmail, password, nama, role)
        return { success: true, user: res.user }
      } else {
        const email = usernameOrEmail.includes('@')
          ? usernameOrEmail.trim()
          : `${usernameOrEmail.trim().toLowerCase()}@jb.local`
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
        })

        const { data, error } = await tempClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              nama,
              role,
            },
          },
        })
        if (error) throw error
        return { success: true, user: data.user }
      }
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
