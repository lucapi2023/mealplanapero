'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

export default function Navbar() {
  const { user, signOut, household } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const links = [
    { href: '/', label: 'Dashboard', icon: '◷' },
    { href: '/recipes', label: 'Recipes', icon: '📋' },
    { href: '/plan', label: 'Meal Plan', icon: '📅' },
    { href: '/shopping', label: 'Shopping List', icon: '🛒' },
    { href: '/inventory', label: 'Inventory', icon: '📦' },
    { href: '/settings', label: 'Settings', icon: '⚙' },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-56 flex flex-col border-r" style={{ background: '#0B0D0E', borderColor: '#2A2A2A' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#2A2A2A' }}>
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold" style={{ background: '#3ECF8E', color: '#000' }}>
            M
          </span>
          <span className="font-bold text-base" style={{ color: '#fff' }}>MealPlan</span>
        </Link>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? ''
                  : 'hover:bg-[#1A1A1A]'
              }`}
              style={{
                color: isActive ? '#fff' : '#929292',
                background: isActive ? '#1A1A1A' : 'transparent',
              }}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: '#2A2A2A' }}>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[#1A1A1A] transition-colors"
          style={{ color: '#929292' }}
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
