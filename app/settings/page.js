'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'

export default function SettingsPage() {
  const { user, household, members, invites, inviteMember, cancelInvite } = useAuth()
  const [pref, setPref] = useState({
    meals_per_day: 1, plan_days: 7, meals_per_week: 7,
    meat_days: 2, fish_days: 1, vegetarian_days: 2, vegan_days: 0,
    servings_default: 2,
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
        meals_per_week: data.meals_per_week ?? 7,
        meat_days: data.meat_days ?? 2,
        fish_days: data.fish_days ?? 1,
        vegetarian_days: data.vegetarian_days ?? 2,
        vegan_days: data.vegan_days ?? 0,
        servings_default: data.servings_default ?? 2,
      })
      setLoading(false)
    })
  }, [user])

  const handleChange = (field) => (e) => setPref(p => ({ ...p, [field]: parseInt(e.target.value) || 0 }))

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

  const totalDays = pref.meat_days + pref.fish_days + pref.vegetarian_days + pref.vegan_days
  const totalMeals = pref.meals_per_day * pref.plan_days

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
            </div>

            {/* Meal Preferences */}
            <div className="card space-y-4">
              <h2 className="text-base font-semibold" style={{ color: '#fff' }}>Meal Preferences</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Meals per day</label>
                  <input type="number" value={pref.meals_per_day} onChange={handleChange('meals_per_day')} min="1" max="3" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Days to plan</label>
                  <input type="number" value={pref.plan_days} onChange={handleChange('plan_days')} min="1" max="7" className="input-field" />
                </div>
              </div>
              <p className="text-xs" style={{ color: '#666' }}>Total meals: {totalMeals} ({pref.meals_per_day}/day x {pref.plan_days} days)</p>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Meals per week</label>
                <input type="number" value={pref.meals_per_week} onChange={handleChange('meals_per_week')} min="1" max="21" className="input-field" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Meat days</label><input type="number" value={pref.meat_days} onChange={handleChange('meat_days')} min="0" className="input-field" /></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Fish days</label><input type="number" value={pref.fish_days} onChange={handleChange('fish_days')} min="0" className="input-field" /></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Vegetarian days</label><input type="number" value={pref.vegetarian_days} onChange={handleChange('vegetarian_days')} min="0" className="input-field" /></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: '#929292' }}>Vegan days</label><input type="number" value={pref.vegan_days} onChange={handleChange('vegan_days')} min="0" className="input-field" /></div>
              </div>

              <p className="text-xs" style={{ color: totalDays > pref.meals_per_week ? '#FCA5A5' : '#666' }}>
                Assigned: {totalDays}/{pref.meals_per_week}
                {totalDays < pref.meals_per_week && ` (${pref.meals_per_week - totalDays} any type)`}
                {totalDays > pref.meals_per_week && ' Warning: sum exceeds meals per week!'}
              </p>

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
