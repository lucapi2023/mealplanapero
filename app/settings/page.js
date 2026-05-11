'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'

export default function SettingsPage() {
  const { user, household, members, invites, inviteMember, cancelInvite, refreshHousehold } = useAuth()
  const [pref, setPref] = useState({
    meals_per_day: 1,
    plan_days: 7,
    meals_per_week: 7,
    meat_days: 2,
    fish_days: 1,
    vegetarian_days: 2,
    vegan_days: 0,
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
    supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPref({
            meals_per_day: data.meals_per_day ?? 1,
            plan_days: data.plan_days ?? 7,
            meals_per_week: data.meals_per_week ?? 7,
            meat_days: data.meat_days ?? 2,
            fish_days: data.fish_days ?? 1,
            vegetarian_days: data.vegetarian_days ?? 2,
            vegan_days: data.vegan_days ?? 0,
            servings_default: data.servings_default ?? 2,
          })
        }
        setLoading(false)
      })
  }, [user])

  const handleChange = (field) => (e) => {
    const val = parseInt(e.target.value) || 0
    setPref((prev) => ({ ...prev, [field]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('preferences')
      .upsert(
        { user_id: user.id, household_id: household?.id, ...pref, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) {
      setMessage('Error saving: ' + error.message)
    } else {
      setMessage('Preferences saved!')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')
    try {
      await inviteMember(inviteEmail.trim())
      setInviteEmail('')
      setInviteMsg('Invite sent!')
    } catch (err) {
      setInviteMsg('Error: ' + err.message)
    }
    setInviting(false)
  }

  const totalDays = pref.meat_days + pref.fish_days + pref.vegetarian_days + pref.vegan_days
  const totalMeals = pref.meals_per_day * pref.plan_days

  return (
    <AuthGuard>
      <Layout>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : (
          <div className="space-y-6 max-w-lg">
            {/* Household Info */}
            <div className="bg-white border rounded-lg p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Household</h2>
              {household && (
                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>
                    <span className="font-medium">Name:</span> {household.name}
                  </p>
                  <p>
                    <span className="font-medium">Household ID:</span>{' '}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
                      {household.id}
                    </code>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Share this ID with support if troubleshooting.
                  </p>
                </div>
              )}

              {/* Members */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Members ({members.length})
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {members.map((m) => (
                    <li key={m.user_id} className="flex items-center gap-2">
                      <span>{m.user_id === user.id ? '(You)' : ''} {m.user_id.slice(0, 8)}...</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        m.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Invites */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Pending Invites ({invites.length})
                </h3>
                {invites.length === 0 ? (
                  <p className="text-xs text-gray-400">No pending invites.</p>
                ) : (
                  <ul className="text-sm text-gray-600 space-y-1">
                    {invites.map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between">
                        <span>{inv.email}</span>
                        <button
                          onClick={() => cancelInvite(inv.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Invite form */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Invite by Email</h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {inviting ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
                {inviteMsg && (
                  <p className={`text-xs mt-1 ${inviteMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                    {inviteMsg}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  The invited person must sign up with the same email, then they will automatically join your household.
                </p>
              </div>
            </div>

            {/* Meal Preferences */}
            <div className="bg-white border rounded-lg p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Meal Preferences</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meals per day
                  </label>
                  <p className="text-xs text-gray-400 mb-1">Breakfast, lunch, dinner = 3</p>
                  <input
                    type="number"
                    value={pref.meals_per_day}
                    onChange={handleChange('meals_per_day')}
                    min="1"
                    max="3"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days to plan
                  </label>
                  <p className="text-xs text-gray-400 mb-1">How many days per week</p>
                  <input
                    type="number"
                    value={pref.plan_days}
                    onChange={handleChange('plan_days')}
                    min="1"
                    max="7"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Total meals planned: {totalMeals} ({pref.meals_per_day} meals/day x {pref.plan_days} days)
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meals per week
                </label>
                <input
                  type="number"
                  value={pref.meals_per_week}
                  onChange={handleChange('meals_per_week')}
                  min="1"
                  max="21"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meat days
                  </label>
                  <input
                    type="number"
                    value={pref.meat_days}
                    onChange={handleChange('meat_days')}
                    min="0"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fish days
                  </label>
                  <input
                    type="number"
                    value={pref.fish_days}
                    onChange={handleChange('fish_days')}
                    min="0"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vegetarian days
                  </label>
                  <input
                    type="number"
                    value={pref.vegetarian_days}
                    onChange={handleChange('vegetarian_days')}
                    min="0"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vegan days
                  </label>
                  <input
                    type="number"
                    value={pref.vegan_days}
                    onChange={handleChange('vegan_days')}
                    min="0"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Assigned: {totalDays} / {pref.meals_per_week}
                {totalDays < pref.meals_per_week && (
                  <span> ({pref.meals_per_week - totalDays} will be any type)</span>
                )}
                {totalDays > pref.meals_per_week && (
                  <span className="text-red-500"> Warning: sum exceeds meals per week!</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default servings
                </label>
                <p className="text-xs text-gray-400 mb-1">
                  How many people you&apos;re cooking for. Ingredient amounts scale to this.
                </p>
                <input
                  type="number"
                  value={pref.servings_default}
                  onChange={handleChange('servings_default')}
                  min="1"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {message && (
                <div className={`text-sm rounded px-3 py-2 ${
                  message.startsWith('Error')
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
