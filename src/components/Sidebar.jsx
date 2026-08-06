import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppTheme, themes } from '../context/ThemeContext'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Car, 
  DollarSign, 
  Settings, 
  LogOut, 
  User,
  Palette,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation()
  const { profile, logout } = useAuth()
  const { activeThemeId, currentTheme, changeTheme } = useAppTheme()
  const [showMobileThemeSelector, setShowMobileThemeSelector] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const isOwner = profile?.role === 'Owner'

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      ownerOnly: true
    },
    {
      name: 'Kasir POS',
      path: '/pos',
      icon: ShoppingCart,
      ownerOnly: false
    },
    {
      name: 'Antrean Carwash',
      path: '/queue',
      icon: Car,
      ownerOnly: false
    },
    {
      name: 'Keuangan',
      path: '/finance',
      icon: DollarSign,
      ownerOnly: true
    },
    {
      name: 'Kelola Admin',
      path: '/admin',
      icon: Settings,
      ownerOnly: true
    }
  ]

  const activeClass = 'bg-brand-emerald/15 text-brand-emerald border-r-4 border-brand-emerald font-bold shadow-[inset_0_2px_20px_rgba(16,185,129,0.15)] animate-pulse-glow'
  const inactiveClass = 'text-slate-400 hover:bg-slate-800/60 hover:text-white hover:-translate-y-0.5'

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 left-0 right-0 h-16 glass-panel border-b border-slate-800/60 flex items-center justify-between px-4 z-30 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0">
            <img 
              src={currentTheme.logo} 
              alt="Logo" 
              className="w-full h-full object-cover scale-110" 
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-xs tracking-wider text-white truncate uppercase">
              JAYA BERSAMA
            </h1>
            <p className="text-[8px] text-brand-blue font-bold uppercase tracking-wider">
              {currentTheme.subText}
            </p>
          </div>
        </div>

        {/* Mobile Header Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setShowMobileThemeSelector(!showMobileThemeSelector)
              if (showMobileNav) setShowMobileNav(false)
            }}
            className={`p-2 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
              showMobileThemeSelector 
                ? 'bg-brand-emerald/20 border-brand-emerald text-brand-emerald shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Pilih Tema"
          >
            <Palette size={16} />
          </button>

          <button 
            onClick={() => {
              setShowMobileNav(!showMobileNav)
              if (showMobileThemeSelector) setShowMobileThemeSelector(false)
            }}
            className={`p-2 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
              showMobileNav 
                ? 'bg-brand-emerald/20 border-brand-emerald text-brand-emerald shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Menu Navigasi"
          >
            {showMobileNav ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown Popover */}
        {showMobileNav && (
          <div className="absolute top-18 right-4 w-56 glass-panel border border-slate-800 rounded-2xl p-2 shadow-2xl z-40 animate-pop-in flex flex-col gap-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-3 py-2 mb-1 border-b border-slate-800">Menu Navigasi</p>
            {menuItems.map((item) => {
              if (item.ownerOnly && !isOwner) return null
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setShowMobileNav(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all active:scale-95 ${
                    isActive 
                      ? 'bg-brand-emerald/15 text-brand-emerald font-bold' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            <div className="h-[1px] w-full bg-slate-800/60 my-1"></div>
            <button
              onClick={() => {
                setShowMobileNav(false)
                logout()
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors w-full text-left"
            >
              <LogOut size={16} />
              <span className="font-medium">Keluar Aplikasi</span>
            </button>
          </div>
        )}

        {/* Mobile Theme Selector Popover */}
        {showMobileThemeSelector && (
          <div className="absolute top-18 right-4 w-64 glass-panel border border-slate-800 rounded-2xl p-4 shadow-2xl z-40 animate-pop-in">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Pilih Logo & Tema</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(themes).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    changeTheme(t.id)
                    setShowMobileThemeSelector(false)
                  }}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all active:scale-95 ${
                    activeThemeId === t.id 
                      ? 'border-brand-emerald shadow-lg' 
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                  title={t.name}
                >
                  <img src={t.logo} alt={t.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 mt-2 font-medium truncate text-center">
              {currentTheme.name}
            </p>
          </div>
        )}
      </header>

      {/* Sidebar untuk Desktop */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} h-screen fixed left-0 top-0 glass-panel border-r border-slate-800 text-white z-30 animate-fade-in transition-all duration-300`}>
        {/* Logo/Header */}
        <div className={`p-4 border-b border-slate-800/60 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3 relative`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0 shadow-inner group">
              <img 
                src={currentTheme.logo} 
                alt="Logo Jaya Bersama" 
                className="w-full h-full object-cover scale-110 transition-all duration-500 group-hover:scale-125 group-hover:rotate-6"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 animate-fade-in">
                <h1 className="font-bold text-[14px] leading-tight tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent truncate uppercase">
                  JAYA BERSAMA
                </h1>
                <p className="text-[9px] text-brand-blue font-bold uppercase tracking-wider mt-0.5">
                  {currentTheme.subText}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all hover:bg-slate-800 ${isCollapsed ? 'absolute -right-3.5 top-5 z-50 shadow-lg' : ''}`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Info Profil */}
        <div className={`p-3 ${isCollapsed ? 'mx-2 justify-center' : 'mx-4'} my-4 rounded-xl glass-card flex items-center gap-3 animate-slide-up delay-100`}>
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 shadow-inner">
            <User size={18} />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden animate-fade-in">
              <h2 className="font-semibold text-xs truncate text-slate-100">{profile?.nama || 'Pengguna'}</h2>
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isOwner ? 'bg-brand-emerald/20 text-brand-emerald shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-brand-blue/20 text-brand-blue shadow-[0_0_8px_rgba(6,182,212,0.2)]'
              }`}>
                {profile?.role || 'Kasir'}
              </span>
            </div>
          )}
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto pt-2">
          {menuItems.map((item, index) => {
            if (item.ownerOnly && !isOwner) return null
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl text-sm transition-all duration-300 animate-slide-up active:scale-95 ${
                  isActive ? activeClass : inactiveClass
                }`}
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
                title={isCollapsed ? item.name : ''}
              >
                <Icon size={18} className={isActive ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" : ""} />
                {!isCollapsed && <span className="animate-fade-in">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Theme/Logo Switcher */}
        {!isCollapsed && (
          <div className="p-4 mx-4 mb-4 rounded-xl border border-slate-800/40 bg-slate-900/40 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} className="text-brand-emerald" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Desain Logo & Tema</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(themes).map((t) => (
                <button
                  key={t.id}
                  onClick={() => changeTheme(t.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all active:scale-95 group ${
                    activeThemeId === t.id 
                      ? 'border-brand-emerald shadow-lg shadow-brand-emerald/25 scale-105' 
                      : 'border-slate-800 opacity-55 hover:opacity-100 hover:border-slate-700'
                  }`}
                  title={t.name}
                >
                  <img src={t.logo} alt={t.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold uppercase">Pilih</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-500 mt-2 text-center font-medium truncate">
              {currentTheme.name}
            </p>
          </div>
        )}

        {/* Tombol Logout */}
        <div className="p-4 border-t border-slate-800/60">
          <button
            onClick={logout}
            className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} w-full py-3 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors`}
            title={isCollapsed ? 'Keluar Aplikasi' : ''}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="animate-fade-in">Keluar Aplikasi</span>}
          </button>
        </div>
      </aside>

    </>
  )
}

export default Sidebar
