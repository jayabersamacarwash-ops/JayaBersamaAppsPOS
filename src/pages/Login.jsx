import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAppTheme } from '../context/ThemeContext'
import { KeyRound, Mail, AlertCircle } from 'lucide-react'

const Login = () => {
  const { login } = useAuth()
  const { currentTheme } = useAppTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Email dan password wajib diisi.')
      setLoading(false)
      return
    }

    const res = await login(email, password)
    if (!res.success) {
      setError(res.error || 'Gagal masuk. Periksa kembali email dan password Anda.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-brand-emerald/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-blue/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative z-10">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-brand-emerald/20 shadow-lg shadow-brand-emerald/10 mb-4 bg-slate-900/60 p-1 flex items-center justify-center transition-all duration-500 hover:border-brand-emerald/50">
            <img 
              src={currentTheme.logo} 
              alt="Logo Jaya Bersama" 
              className="w-full h-full object-cover rounded-full scale-105"
            />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">{currentTheme.name}</h2>
          <p className="text-slate-400 text-xs mt-1">Aplikasi Kasir & Manajemen Jaya Bersama</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-username" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Username atau Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3 text-slate-500" size={18} />
              <input
                id="login-username"
                name="username"
                type="text"
                placeholder="Masukkan username atau email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-emerald/60 focus:ring-1 focus:ring-brand-emerald/20 transition-all text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-3 text-slate-500" size={18} />
              <input
                id="login-password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-emerald/60 focus:ring-1 focus:ring-brand-emerald/20 transition-all text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-brand-emerald hover:bg-emerald-500 active:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-brand-emerald/20 transition-all duration-150 flex items-center justify-center text-sm disabled:opacity-50"
          >
            {loading ? 'Menghubungkan...' : 'Masuk ke Aplikasi'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
