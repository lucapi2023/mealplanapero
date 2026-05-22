'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { useTheme } from './ThemeProvider'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('mealplan-sidebar-collapsed')
    if (saved === '1') setCollapsed(true)
  }, [])

  useEffect(() => {
    if (window.innerWidth < 768) setCollapsed(true)
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('mealplan-sidebar-collapsed', next ? '1' : '0')
  }

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const links = [
    { href: '/', label: 'Dashboard', icon: '◷' },
    { href: '/recipes', label: 'Recipes', icon: '📋' },
    { href: '/plan', label: 'Meal Plan', icon: '📅' },
    { href: '/shopping', label: 'Shopping', icon: '🛒' },
    { href: '/inventory', label: 'Inventory', icon: '📦' },
    { href: '/settings', label: 'Settings', icon: '⚙' },
  ]

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="no-print md:hidden fixed top-3 left-3 z-50 p-2 rounded-md"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text-primary)" strokeWidth="2"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)} style={{ background: 'rgba(0,0,0,0.5)' }} />}

      <aside
        className={`no-print fixed left-0 top-0 h-full flex flex-col border-r z-50 transition-all duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${collapsed ? 'w-16' : 'w-56'}`}
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
      >
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <span className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                M
              </span>
              <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>MealPlan</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" onClick={() => setMobileOpen(false)}>
              <span className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
                M
              </span>
            </Link>
          )}
          <button onClick={toggleCollapse} className="hidden md:block text-sm p-1 rounded hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {links.map(link => {
            const isActive = pathname === link.href
            return (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
                style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', background: isActive ? 'var(--bg-hover)' : 'transparent' }}
                title={collapsed ? link.label : undefined}
              >
                <span className="text-base">{link.icon}</span>
                {!collapsed && link.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
          <button onClick={toggleTheme} className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
            <span className="text-base">{theme === 'dark' ? '☀' : '🌙'}</span>
            {!collapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
          </button>
          <button onClick={handleSignOut} className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
            <span className="text-base">↩</span>
            {!collapsed && 'Log out'}
          </button>
        </div>
      </aside>
    </>
  )
}
