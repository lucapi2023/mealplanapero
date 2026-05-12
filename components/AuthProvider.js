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
  const [authError, setAuthError] = useState(null)
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])

  const ensureHousehold = async (supabase, uid, email) => {
    const { data: pref } = await supabase
      .from('preferences')
      .select('household_id')
      .eq('user_id', uid)
      .maybeSingle()

    if (pref?.household_id) {
      const { data: membership } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('user_id', uid)
        .eq('household_id', pref.household_id)
        .maybeSingle()

      if (membership) return pref.household_id

      const { error: repairErr } = await supabase.from('household_members').insert({
        household_id: pref.household_id, user_id: uid, role: 'member',
      })
      if (!repairErr) return pref.household_id
      console.error('membership repair failed:', repairErr)
    }

    if (email) {
      const { data: pendingInvite } = await supabase
        .from('invites')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle()

      if (pendingInvite) {
        const { error: joinErr } = await supabase.from('household_members').insert({
          household_id: pendingInvite.household_id, user_id: uid, role: 'member',
        })
        if (!joinErr) {
          await supabase.from('invites').update({ status: 'accepted' }).eq('id', pendingInvite.id)
          await supabase.from('preferences').upsert({
            user_id: uid, household_id: pendingInvite.household_id,
            meals_per_week: 7, meals_per_day: 1, plan_days: 7,
            meat_days: 2, fish_days: 1, vegetarian_days: 2, vegan_days: 0, servings_default: 2,
          }, { onConflict: 'user_id' })
          return pendingInvite.household_id
        }
      }
    }

    const { data: hh, error: hhErr } = await supabase
      .from('households')
      .insert({ name: 'My Household' })
      .select()
      .single()

    if (!hh || hhErr) {
      console.error('households insert failed:', hhErr)
      return null
    }

    const { error: memberErr } = await supabase.from('household_members').insert({
      household_id: hh.id, user_id: uid, role: 'owner',
    })
    if (memberErr) {
      console.error('household_members insert failed:', memberErr)
      return null
    }

    const { error: prefErr } = await supabase.from('preferences').upsert({
      user_id: uid, household_id: hh.id,
      meals_per_week: 7, meals_per_day: 1, plan_days: 7,
      meat_days: 2, fish_days: 1, vegetarian_days: 2, vegan_days: 0, servings_default: 2,
    }, { onConflict: 'user_id' })
    if (prefErr) {
      console.error('preferences upsert failed:', prefErr)
    }

    return hh.id
  }

  const loadHouseholdData = async (supabase, hhId) => {
    const [{ data: hh }, { data: mems }, { data: invs }] = await Promise.all([
      supabase.from('households').select('*').eq('id', hhId).single(),
      supabase.from('household_members').select('*').eq('household_id', hhId),
      supabase.from('invites').select('*').eq('household_id', hhId).eq('status', 'pending'),
    ])
    if (hh) setHousehold(hh)
    if (mems) setMembers(mems)
    if (invs) setInvites(invs)
  }

  useEffect(() => {
    const init = async () => {
      const supabaseClient = await getClient()
      const { data: { session } } = await supabaseClient.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        try {
          const hhId = await ensureHousehold(supabaseClient, currentUser.id, currentUser.email)
          if (hhId) {
            await loadHouseholdData(supabaseClient, hhId)
          } else {
            setAuthError('Failed to set up household. Please refresh the page.')
          }
        } catch (err) {
          setAuthError(err.message || 'Household setup failed')
        }
      }
      setLoading(false)

      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        const newUser = session?.user ?? null
        setUser(newUser)
        setAuthError(null)
        if (newUser) {
          try {
            const hhId = await ensureHousehold(supabaseClient, newUser.id, newUser.email)
            if (hhId) await loadHouseholdData(supabaseClient, hhId)
          } catch (err) {
            setAuthError(err.message || 'Household setup failed')
          }
        } else {
          setHousehold(null)
          setMembers([])
          setInvites([])
        }
      })
      return () => subscription.unsubscribe()
    }
    init()
  }, [])

  const signIn = async (email, password) => {
    const supabaseClient = await getClient()
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const supabaseClient = await getClient()
    await supabaseClient.auth.signOut()
  }

  const signUp = async (email, password) => {
    const supabaseClient = await getClient()
    const { data, error } = await supabaseClient.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  const inviteMember = async (email) => {
    if (!household) throw new Error('No household')
    const supabaseClient = await getClient()
    const { data, error } = await supabaseClient
      .from('invites')
      .insert({ household_id: household.id, email, invited_by: user.id })
      .select()
      .single()
    if (error) throw error
    setInvites((prev) => [...prev, data])
    return data
  }

  const cancelInvite = async (inviteId) => {
    const supabaseClient = await getClient()
    await supabaseClient.from('invites').delete().eq('id', inviteId)
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
  }

  const refreshHousehold = async () => {
    if (!household) return
    const supabaseClient = await getClient()
    await loadHouseholdData(supabaseClient, household.id)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, authError, signIn, signOut, signUp,
      household, members, invites,
      inviteMember, cancelInvite, refreshHousehold,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
