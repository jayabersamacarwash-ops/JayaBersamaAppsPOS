import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CafePOS from './pages/CafePOS'
import CarwashQueue from './pages/CarwashQueue'
import Finance from './pages/Finance'
import Admin from './pages/Admin'

// Komponen Proteksi Rute berdasarkan Login & Peran (Role)
const ProtectedRoute = ({ children, ownerOnly = false }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-brand-emerald border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Memuat Sesi...</p>
      </div>
    )
  }

  // Jika belum login, arahkan ke login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Jika rute hanya untuk Owner dan user adalah Kasir, arahkan ke POS
  if (ownerOnly && profile?.role !== 'Owner') {
    return <Navigate to="/pos" replace />
  }

  return children
}

const AppContent = () => {
  const { user, loading, profile } = useAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-brand-emerald border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Memuat Sesi...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Render Sidebar jika sudah login */}
      {user && <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />}

      {/* Konten Utama Aplikasi */}
      <main className={`flex-1 min-h-screen w-full overflow-x-hidden ${user ? (isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64') : ''} bg-slate-950 relative transition-all duration-300`}>
        {/* Efek Latar Belakang (Decorations) */}
        {user && (
          <>
            <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-brand-emerald/5 blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-brand-blue/5 blur-[120px] pointer-events-none z-0"></div>
          </>
        )}

        <div className="relative z-10">
          <Routes>
            {/* Rute Login */}
            <Route 
              path="/login" 
              element={!user ? <Login /> : <Navigate to={profile?.role === 'Owner' ? '/' : '/pos'} replace />} 
            />

            {/* Rute Dashboard (Owner Only) */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute ownerOnly={true}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Rute POS (Owner & Kasir) */}
            <Route 
              path="/pos" 
              element={
                <ProtectedRoute>
                  <CafePOS />
                </ProtectedRoute>
              } 
            />

            {/* Rute Antrean Carwash (Owner & Kasir) */}
            <Route 
              path="/queue" 
              element={
                <ProtectedRoute>
                  <CarwashQueue />
                </ProtectedRoute>
              } 
            />

            {/* Rute Keuangan (Owner Only) */}
            <Route 
              path="/finance" 
              element={
                <ProtectedRoute ownerOnly={true}>
                  <Finance />
                </ProtectedRoute>
              } 
            />

            {/* Rute Kelola Admin (Owner Only) */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute ownerOnly={true}>
                  <Admin />
                </ProtectedRoute>
              } 
            />

            {/* Rute Catch-All */}
            <Route 
              path="*" 
              element={<Navigate to={user ? (profile?.role === 'Owner' ? '/' : '/pos') : '/login'} replace />} 
            />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
