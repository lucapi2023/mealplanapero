'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import MealScheduleGrid from '@/components/MealScheduleGrid'

export default function SettingsPage() {
  const { user, household, members, invites, inviteMember, cancelInvite } = useAuth()
  const [pref, setPref] = useState({
    meals_per_day: 1, plan_days: 7,
    servings_default: 2, meal_schedule: {},
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('preferences').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setPref({
        meals_per_day: data.meals_per_day ?? 1,
        plan_days: data.plan_days ?? 7,
        servings_default: data.servings_default ?? 2,
        meal_schedule: data.meal_schedule || {},
      })
      setLoading(false)
    })
  }, [user])

  const handleChange = (field) => (e) => setPref(p => ({ ...p, [field]: parseInt(e.target.value) || 0 }))

  const handleScheduleChange = (schedule) => setPref(p => ({ ...p, meal_schedule: schedule }))

  const handleSave = async () => {
    setSaving(true); setMessage('')
    const { error } = await supabase.from('preferences').upsert(
      { user_id: user.id, household_id: household?.id, ...pref, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setMessage(error ? 'Error saving: ' + error.message : 'Preferences saved!')
    if (!error) setTimeout(() => setMessage(''), 3000)
    setSaving(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteMsg('')
    try { await inviteMember(inviteEmail.trim()); setInviteEmail(''); setInviteMsg('Invite sent!') }
    catch (err) { setInviteMsg('Error: ' + err.message) }
    setInviting(false)
  }

  const [dedupMsg, setDedupMsg] = useState('')
  const [deduping, setDeduping] = useState(false)

  const handleDeleteDuplicates = async () => {
    if (!household) return
    if (!confirm('This will delete duplicate recipes (same title). Continue?')) return
    setDeduping(true)
    setDedupMsg('')
    try {
      const { data: recipes, error: fetchErr } = await supabase.from('recipes').select('id, title').eq('household_id', household.id).order('created_at', { ascending: true })
      if (fetchErr) throw fetchErr
      if (!recipes || recipes.length === 0) { setDedupMsg('No recipes found.'); setDeduping(false); return }
      const seen = {}
      const toDelete = []
      recipes.forEach(r => {
        const key = r.title.toLowerCase().trim()
        if (seen[key]) toDelete.push(r.id)
        else seen[key] = true
      })
      if (toDelete.length === 0) { setDedupMsg('No duplicates found.'); setDeduping(false); return }
      const { error } = await supabase.from('recipes').delete().in('id', toDelete)
      if (error) throw error
      setDedupMsg(`Deleted ${toDelete.length} duplicate recipe(s).`)
    } catch (err) {
      setDedupMsg('Error: ' + err.message)
    }
    setDeduping(false)
  }

  return (
    <AuthGuard>
      <Layout>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>Settings</h1>
        <p className="text-sm mb-8" style={{ color: '#666' }}>Household management and meal preferences</p>

        {loading ? (
          <div className="text-center py-10" style={{ color: '#666' }}>Loading...</div>
        ) : (
          <div className="space-y-6 max-w-lg">
            {/* Household */}
            <div className="card space-y-4">
              <h2 className="text-base font-semibold" style={{ color: '#fff' }}>Household</h2>

              {household && (
                <div className="space-y-1 text-sm" style={{ color: '#929292' }}>
                  <p><span className="font-medium" style={{ color: '#666' }}>Name:</span> {household.name}</p>
                  <p>
                    <span className="font-medium" style={{ color: '#666' }}>Household ID:</span>{' '}
                    <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: '#0B0D0E', color: '#3ECF8E' }}>
                      {household.id}
                    </code>
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-xs font-medium mb-2" style={{ color: '#666' }}>Members ({members.length})</h3>
                <div className="space-y-1">
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-2 text-sm" style={{ color: '#929292' }}>
                      <span>{m.user_id === user.id ? '(You)' : m.user_id.slice(0, 8) + '...'}</span>
                      <span className="badge" style={{ background: m.role === 'owner' ? 'rgba(62,207,142,0.15)' : 'rgba(107,114,128,0.15)', color: m.role === 'owner' ? '#6EE7B7' : '#9CA3AF' }}>
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {invites.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium mb-2" style={{ color: '#666' }}>Pending Invites</h3>
                  <div className="space-y-1">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between text-sm" style={{ color: '#929292' }}>
                        <span>{inv.email}</span>
                        <button onClick={() => cancelInvite(inv.id)} className="text-xs hover:underline" style={{ color: '#FCA5A5' }}>Cancel</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-medium mb-2" style={{ color: '#666' }}>Invite by Email</h3>
                <div className="flex gap-2">
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="partner@example.com" className="input-field flex-1" />
                  <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="btn-primary whitespace-nowrap">
                    {inviting ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
                {inviteMsg && <p className="text-xs mt-2" style={{ color: inviteMsg.startsWith('Error') ? '#FCA5A5' : '#6EE7B7' }}>{inviteMsg}</p>}
              </div>

              <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={handleDeleteDuplicates} disabled={deduping} className="btn-danger text-xs">
                  {deduping ? 'Deleting...' : 'Delete Duplicate Recipes'}
                </button>
                {dedupMsg && <p className="text-xs mt-2" style={{ color: dedupMsg.startsWith('Error') ? '#FCA5A5' : '#6EE7B7' }}>{dedupMsg}</p>}
              </div>
            </div>

            {/* Meal Preferences */}
            <div className="card space-y-4">
              <h2 className="text-base font-semibold" style={{ color: '#fff' }}>Meal Preferences</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Meals per day</label>
                  <select value={pref.meals_per_day} onChange={handleChange('meals_per_day')} className="select-field">
                    <option value={1}>Dinner only</option>
                    <option value={2}>Lunch + Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Days to plan</label>
                  <input type="number" value={pref.plan_days} onChange={handleChange('plan_days')} min="1" max="7" className="input-field" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold mb-3" style={{ color: '#929292' }}>Meal Schedule — pick protein type for each slot</h3>
                <div className="rounded-lg border p-4" style={{ background: '#0B0D0E', borderColor: '#2A2A2A' }}>
                  <MealScheduleGrid
                    schedule={pref.meal_schedule}
                    onChange={handleScheduleChange}
                    activeMeals={pref.meals_per_day}
                    planDays={pref.plan_days}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Default servings</label>
                <p className="text-xs mb-1.5" style={{ color: '#666' }}>How many people you cook for</p>
                <input type="number" value={pref.servings_default} onChange={handleChange('servings_default')} min="1" className="input-field" />
              </div>

              {message && (
                <div className="rounded-md px-3 py-2 text-xs" style={{
                  background: message.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(62,207,142,0.1)',
                  color: message.startsWith('Error') ? '#FCA5A5' : '#6EE7B7',
                }}>{message}</div>
              )}

              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
