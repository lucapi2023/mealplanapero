'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import WeeklyPlanDisplay from '@/components/WeeklyPlanDisplay'

function getWeekMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

export default function Home() {
  const { user, household, authError } = useAuth()
  const [preferences, setPreferences] = useState(null)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const initDashboard = async () => {
    if (!household) return
    setLoading(true)
    setError('')

    const { data: pref } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    setPreferences(pref)

    const weekStart = getWeekMonday()
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('household_id', household.id)
      .eq('week_start_date', weekStart)
      .maybeSingle()

    setCurrentPlan(plan)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    if (authError) { setLoading(false); setError(authError); return }
    if (!household) { setLoading(false); return }
    initDashboard()
  }, [user, household, authError])

  // ... rest stays same

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#3ECF8E' }}></div>
            <p className="text-sm" style={{ color: '#666' }}>{authError || 'Setting up your household...'}</p>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  if (!household && !loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="text-center py-20">
            <p className="text-sm mb-4" style={{ color: '#FCA5A5' }}>Failed to set up household. Please refresh the page.</p>
            <button onClick={() => window.location.reload()} className="btn-primary">Refresh</button>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  const generatePlan = async () => {
    setGenerating(true)
    setError('')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const weekStart = getWeekMonday()
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekStartDate: weekStart }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate plan')
        return
      }
      setCurrentPlan(data.plan ? { id: data.plan.id, week_start_date: weekStart } : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#3ECF8E' }}></div>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <Layout>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>Dashboard</h1>
        <p className="text-sm mb-8" style={{ color: '#666' }}>Your weekly meal plan at a glance</p>

        {error && (
          <div className="rounded-md px-4 py-3 text-sm mb-6" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}>
            {error}
          </div>
        )}

        <div className="card mb-8">
          <h2 className="text-base font-semibold mb-4" style={{ color: '#fff' }}>This Week&apos;s Plan</h2>
          {currentPlan ? (
            <WeeklyPlanDisplay
              planId={currentPlan.id}
              weekStartDate={currentPlan.week_start_date}
              onRefresh={initDashboard}
            />
          ) : (
            <div className="text-center py-10">
              <p className="text-sm mb-4" style={{ color: '#666' }}>No meal plan for this week yet.</p>
              <button
                onClick={generatePlan}
                disabled={generating}
                className="btn-primary px-8 py-3 text-base"
              >
                {generating ? 'Generating...' : "Generate This Week's Plan"}
              </button>
            </div>
          )}
        </div>

        {preferences && (
          <div className="card">
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#fff' }}>Your Preferences</h3>
            <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: '#929292' }}>
              <span>{preferences.meals_per_day || 1} meal{preferences.meals_per_day > 1 ? 's' : ''}/day</span>
              <span>{preferences.plan_days || 7} days/week</span>
              <span>Meat: {preferences.meat_days}</span>
              <span>Fish: {preferences.fish_days}</span>
              <span>Vegetarian: {preferences.vegetarian_days}</span>
              <span>Vegan: {preferences.vegan_days}</span>
              <span>Serves: {preferences.servings_default}</span>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
