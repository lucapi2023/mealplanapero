'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({})

async function getClient() {
  const { supabase } = await import('@/utils/supabaseClient')
  return supabase
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const supabase = await getClient()
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      return () => subscription.unsubscribe()
    }
    init()
  }, [])

  const signIn = async (email, password) => {
    const supabase = await getClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const supabase = await getClient()
    await supabase.auth.signOut()
  }

  const signUp = async (email, password) => {
    const supabase = await getClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
