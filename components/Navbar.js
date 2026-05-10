'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg text-blue-700">
            MealPlan
          </Link>
          <Link href="/recipes" className="text-sm text-gray-600 hover:text-gray-900">
            Recipes
          </Link>
          <Link href="/plan" className="text-sm text-gray-600 hover:text-gray-900">
            Plan
          </Link>
          <Link href="/inventory" className="text-sm text-gray-600 hover:text-gray-900">
            Inventory
          </Link>
          <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
            Settings
          </Link>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
