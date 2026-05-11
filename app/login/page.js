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
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0D0E' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-flex w-12 h-12 rounded-xl items-center justify-center text-xl font-bold mb-4" style={{ background: '#3ECF8E', color: '#000' }}>
            M
          </span>
          <h1 className="text-xl font-bold" style={{ color: '#fff' }}>MealPlan</h1>
          <p className="text-sm mt-1" style={{ color: '#666' }}>
            {isSignUp ? 'Create your household account' : 'Sign in to your household'}
          </p>
        </div>

        <div className="rounded-lg p-6 border" style={{ background: '#141414', borderColor: '#2A2A2A' }}>
          {error && (
            <div className="rounded-md px-4 py-3 text-sm mb-4" style={{
              background: error.includes('Check your email') ? 'rgba(62,207,142,0.1)' : 'rgba(239,68,68,0.1)',
              color: error.includes('Check your email') ? '#6EE7B7' : '#FCA5A5',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="home@example.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-xs font-medium transition-colors hover:underline"
              style={{ color: '#929292' }}
            >
              {isSignUp ? 'Already have an account? Sign in' : 'New household? Create account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
