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

  const loadPlan = async (weekStart) => {
    if (!household) return
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
    loadPlan(getWeekMonday())
  }, [user, household])

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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#3ECF8E' }}></div>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Meal Plan</h1>
            <p className="text-sm mt-1" style={{ color: '#666' }}>Weekly meal schedule</p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="btn-primary"
          >
            {generating ? 'Generating...' : currentPlan ? 'Regenerate Week' : 'Generate Plan'}
          </button>
        </div>

        {error && (
          <div className="rounded-md px-4 py-3 text-sm mb-6" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}>
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
          <div className="text-center py-16">
            <p className="text-sm mb-4" style={{ color: '#666' }}>No meal plan generated yet.</p>
            <button onClick={generatePlan} disabled={generating} className="btn-primary px-8 py-3 text-base">
              {generating ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
