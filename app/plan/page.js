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

export default function PlanPage() {
  const { user, household } = useAuth()
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [nextWeek, setNextWeek] = useState(false)

  const loadPlan = async (weekStart) => {
    if (!household) return
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('household_id', household.id)
      .eq('week_start_date', weekStart)
      .single()
    setCurrentPlan(plan)
    setLoading(false)
  }

  useEffect(() => {
    if (!user || !household) return
    loadPlan(getWeekMonday())
  }, [user, household])

  const generatePlan = async () => {
    setGenerating(true)
    setError('')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const weekStart = nextWeek
        ? (() => {
            const m = new Date(getWeekMonday())
            m.setDate(m.getDate() + 7)
            return m.toISOString().slice(0, 10)
          })()
        : getWeekMonday()

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

  const handleRegenerate = async () => {
    if (currentPlan) {
      if (!confirm('Delete current plan and generate a new one?')) return
      await supabase.from('weekly_plans').delete().eq('id', currentPlan.id)
      setCurrentPlan(null)
    }
    generatePlan()
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Weekly Meal Plan</h1>
          <div className="flex gap-2">
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="bg-orange-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Regenerate Full Week'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {currentPlan ? (
          <WeeklyPlanDisplay
            planId={currentPlan.id}
            weekStartDate={currentPlan.week_start_date}
            onRefresh={() => loadPlan(currentPlan.week_start_date)}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No meal plan generated yet.</p>
            <button
              onClick={generatePlan}
              disabled={generating}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
