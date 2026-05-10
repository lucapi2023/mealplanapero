'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    router.replace('/')
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password)
        if (signUpError) {
          if (signUpError.message?.includes?.('already registered')) {
            setError('This email is already registered. Please sign in instead.')
          } else {
            throw signUpError
          }
        } else {
          setError('Check your email for a confirmation link, or sign in if already confirmed.')
          setIsSignUp(false)
        }
      } else {
        await signIn(email, password)
        router.push('/')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">MealPlan</h1>
        <p className="text-sm text-gray-500 mb-6">
          {isSignUp ? 'Create your shared household account' : 'Sign in to your household account'}
        </p>

        {error && (
          <div className={`border rounded px-4 py-3 text-sm mb-4 ${
            error.includes('Check your email')
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="home@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'New household? Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}
