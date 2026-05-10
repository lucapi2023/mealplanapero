'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'

export default function SettingsPage() {
  const { user } = useAuth()
  const [pref, setPref] = useState({
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
            meals_per_week: data.meals_per_week,
            meat_days: data.meat_days,
            fish_days: data.fish_days,
            vegetarian_days: data.vegetarian_days,
            vegan_days: data.vegan_days,
            servings_default: data.servings_default,
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
        { user_id: user.id, ...pref, updated_at: new Date().toISOString() },
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

  const totalDays =
    pref.meat_days + pref.fish_days + pref.vegetarian_days + pref.vegan_days

  return (
    <AuthGuard>
      <Layout>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : (
          <div className="bg-white border rounded-lg p-6 max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meals per week
              </label>
              <input
                type="number"
                value={pref.meals_per_week}
                onChange={handleChange('meals_per_week')}
                min="1"
                max="14"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default servings
              </label>
              <input
                type="number"
                value={pref.servings_default}
                onChange={handleChange('servings_default')}
                min="1"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-gray-500">
              Assigned: {totalDays} / {pref.meals_per_week} meals
              {totalDays < pref.meals_per_week && (
                <span> ({pref.meals_per_week - totalDays} will be &lsquo;any&rsquo; type)</span>
              )}
              {totalDays > pref.meals_per_week && (
                <span className="text-red-500">
                  {' '}Warning: sum exceeds meals per week!
                </span>
              )}
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
        )}
      </Layout>
    </AuthGuard>
  )
}
