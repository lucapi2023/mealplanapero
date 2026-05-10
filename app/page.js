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
  const { user } = useAuth()
  const [preferences, setPreferences] = useState(null)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const initDashboard = async () => {
    setLoading(true)
    setError('')

    const { data: pref } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!pref) {
      const { data: newPref, error: prefError } = await supabase
        .from('preferences')
        .insert({
          user_id: user.id,
          meals_per_week: 7,
          meat_days: 2,
          fish_days: 1,
          vegetarian_days: 2,
          vegan_days: 0,
          servings_default: 2,
        })
        .select()
        .single()
      if (prefError) {
        setError('Failed to create preferences: ' + prefError.message)
        setLoading(false)
        return
      }
      setPreferences(newPref)
    } else {
      setPreferences(pref)
    }

    const weekStart = getWeekMonday()
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart)
      .single()

    setCurrentPlan(plan)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    initDashboard()
  }, [user])

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
      setCurrentPlan(data.plan || { id: data.plan?.id, week_start_date: weekStart })
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <Layout>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-white border rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">This Week&apos;s Plan</h2>
          {currentPlan ? (
            <WeeklyPlanDisplay
              planId={currentPlan.id}
              weekStartDate={currentPlan.week_start_date}
              onRefresh={initDashboard}
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">No meal plan for this week yet.</p>
              <button
                onClick={generatePlan}
                disabled={generating}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate This Week\'s Plan'}
              </button>
            </div>
          )}
        </div>

        {preferences && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Preferences</h3>
            <div className="text-xs text-gray-500 grid grid-cols-2 gap-1">
              <span>Meat: {preferences.meat_days} days</span>
              <span>Fish: {preferences.fish_days} days</span>
              <span>Vegetarian: {preferences.vegetarian_days} days</span>
              <span>Vegan: {preferences.vegan_days} days</span>
              <span>Default servings: {preferences.servings_default}</span>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
