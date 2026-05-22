'use client'

import { useEffect, useState } from 'react'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const check = () => setCollapsed(window.innerWidth < 768 ? true : localStorage.getItem('mealplan-sidebar-collapsed') === '1')
    check()
    window.addEventListener('resize', check)
    const interval = setInterval(check, 1000)
    return () => { window.removeEventListener('resize', check); clearInterval(interval) }
  }, [])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />
      <main className="flex-1 transition-all duration-200 px-4 md:px-8 py-6 md:py-8 pt-14 md:pt-8"
        style={{ marginLeft: collapsed ? '64px' : '224px' }}>
        {children}
      </main>
    </div>
  )
}
