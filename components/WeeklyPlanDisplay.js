'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from './AuthProvider'
import GroceryList from './GroceryList'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PROTEIN_STYLES = {
  meat: { bg: 'rgba(239,68,68,0.2)', text: '#FCA5A5', border: 'rgba(239,68,68,0.35)' },
  fish: { bg: 'rgba(59,130,246,0.2)', text: '#93C5FD', border: 'rgba(59,130,246,0.35)' },
  vegetarian: { bg: 'rgba(34,197,94,0.2)', text: '#86EFAC', border: 'rgba(34,197,94,0.35)' },
  vegan: { bg: 'rgba(16,185,129,0.2)', text: '#6EE7B7', border: 'rgba(16,185,129,0.35)' },
  any: { bg: 'rgba(107,114,128,0.12)', text: '#9CA3AF', border: 'rgba(107,114,128,0.2)' },
}

async function fetchPlanData(planId) {
  const { data: meals } = await supabase
    .from('plan_meals')
    .select('*, recipes(id, title, servings_base, protein_type, effort_level)')
    .eq('plan_id', planId)
    .order('day_of_week')
    .order('meal_type')

  if (!meals) return { meals: [], ingMap: {} }

  const recipeIds = [...new Set(meals.filter(m => m.recipe_id).map(m => m.recipe_id))]
  let ingMap = {}
  if (recipeIds.length > 0) {
    const { data: riData } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id, amount, unit, ingredients(name)')
      .in('recipe_id', recipeIds)
    if (riData) {
      riData.forEach(ri => {
        if (!ingMap[ri.recipe_id]) ingMap[ri.recipe_id] = []
        ingMap[ri.recipe_id].push({ name: ri.ingredients?.name || '?', amount: ri.amount, unit: ri.unit })
      })
    }
  }

  return { meals, ingMap }
}

async function fetchAvailableRecipes(householdId, proteinType, excludeIds) {
  let query = supabase.from('recipes').select('id, title, protein_type').eq('household_id', householdId)
  if (proteinType && proteinType !== 'any') query = query.eq('protein_type', proteinType)
  if (excludeIds && excludeIds.length > 0) query = query.not('id', 'in', excludeIds)
  const { data } = await query.order('title').limit(30)
  return data || []
}

export default function WeeklyPlanDisplay({ planId, weekStartDate, onRefresh }) {
  const { household } = useAuth()
  const [meals, setMeals] = useState([])
  const [ingMap, setIngMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [showGrocery, setShowGrocery] = useState(false)
  const [selecting, setSelecting] = useState(null)
  const [available, setAvailable] = useState([])
  const [recipeSearch, setRecipeSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { meals: m, ingMap: im } = await fetchPlanData(planId)
    const sorted = m.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
      return (a.meal_type === 'lunch' ? 0 : 1) - (b.meal_type === 'lunch' ? 0 : 1)
    })
    setMeals(sorted)
    setIngMap(im)
    setLoading(false)
  }

  useEffect(() => { if (planId) loadData() }, [planId])

  const handleSwapRecipe = async (mealId, newRecipeId) => {
    setSelecting(null)
    setAvailable([])
    if (!newRecipeId || newRecipeId === '__cancel__') return

    const { data: updated, error } = await supabase
      .from('plan_meals')
      .update({ recipe_id: newRecipeId })
      .eq('id', mealId)
      .select('*, recipes(id, title, servings_base, protein_type, effort_level)')
      .single()

    if (error || !updated) return

    // Update recipe_ingredients cache for new recipe
    if (!ingMap[newRecipeId]) {
      const { data: ri } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, amount, unit, ingredients(name)')
        .eq('recipe_id', newRecipeId)
      if (ri) {
        setIngMap(prev => ({ ...prev, [newRecipeId]: ri.map(r => ({ name: r.ingredients?.name || '?', amount: r.amount, unit: r.unit })) }))
      }
    }

    setMeals(prev => prev.map(m => m.id === mealId ? { ...updated, recipes: updated.recipes } : m))
    if (onRefresh) onRefresh()
  }

  const handleSelectRecipe = async (meal) => {
    if (!meal.recipes || !household) return
    if (selecting === meal.id) { setSelecting(null); setAvailable([]); setRecipeSearch(''); return }
    setSelecting(meal.id)
    setRecipeSearch('')
    const existingIds = meals.filter(m => m.recipe_id && m.id !== meal.id).map(m => m.recipe_id)
    const matching = await fetchAvailableRecipes(household.id, meal.recipes.protein_type, existingIds)
    const all = meal.recipes.protein_type !== 'any'
      ? await fetchAvailableRecipes(household.id, null, [...existingIds, ...matching.map(r => r.id)])
      : []
    const combined = [...matching.map(r => ({ ...r, group: 'match' })), ...all.map(r => ({ ...r, group: 'other' }))]
    setAvailable(combined)
  }

  if (loading) return <div className="text-center py-10" style={{ color: '#666' }}>Loading plan...</div>
  if (meals.length === 0) return <div className="text-center py-10" style={{ color: '#666' }}>No meals planned.</div>

  const hasLunch = meals.some(m => m.meal_type === 'lunch')
  const mealTypes = hasLunch ? ['lunch', 'dinner'] : ['dinner']
  const days = [...new Set(meals.map(m => m.day_of_week))].sort((a, b) => a - b)

  const grid = {}
  meals.forEach(m => {
    if (!grid[m.day_of_week]) grid[m.day_of_week] = {}
    grid[m.day_of_week][m.meal_type] = m
  })

  const aggregated = {}
  meals.forEach(meal => {
    if (!meal.recipes || !meal.recipe_id) return
    const scale = meal.servings / (meal.recipes.servings_base || 1)
    const ings = ingMap[meal.recipe_id] || []
    ings.forEach(ing => {
      const key = `${ing.name}|||${ing.unit}`
      if (!aggregated[key]) aggregated[key] = { name: ing.name, unit: ing.unit, amount: 0 }
      aggregated[key].amount += ing.amount * scale
    })
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => window.print()} className="btn-secondary text-xs no-print">
          Print / PDF
        </button>
        <button onClick={() => setShowGrocery(!showGrocery)} className="btn-primary no-print">
          {showGrocery ? 'Hide Grocery' : 'Grocery List'}
        </button>
      </div>

      {showGrocery && <GroceryList ingredients={Object.values(aggregated)} onClose={() => setShowGrocery(false)} />}

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: '#666', width: 60 }}></th>
              {days.map(d => (
                <th key={d} className="py-2 px-2 text-center text-xs font-medium" style={{ color: '#666' }}>
                  {DAYS[d] || d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mealTypes.map(mt => (
              <tr key={mt}>
                <td className="py-2 px-3 text-xs font-medium" style={{ color: '#929292' }}>
                  {mt === 'lunch' ? 'Lunch' : 'Dinner'}
                </td>
                {days.map(d => {
                  const meal = grid[d]?.[mt]
                  if (!meal) return (
                    <td key={d} className="py-1 px-2">
                      <div className="h-16 rounded border border-dashed" style={{ borderColor: '#2A2A2A' }}></div>
                    </td>
                  )

                  const ps = meal.recipes ? (PROTEIN_STYLES[meal.recipes.protein_type] || PROTEIN_STYLES.any) : PROTEIN_STYLES.any

                  return (
                    <td key={d} className="py-1 px-2 align-top">
                      <div className="rounded-lg border p-2 min-h-[5rem] cursor-pointer hover:border-[#3A3A3A] transition-colors relative"
                        style={{ background: ps.bg, borderColor: ps.border }}
                        onClick={() => handleSelectRecipe(meal)}>
                        {selecting === meal.id ? (
                          <div className="w-48">
                            <input
                              className="w-full text-xs rounded px-2 py-1 mb-1"
                              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                              placeholder="Search recipes..."
                              value={recipeSearch}
                              onChange={e => setRecipeSearch(e.target.value)}
                              autoFocus
                              onBlur={() => setTimeout(() => { setSelecting(null); setAvailable([]); setRecipeSearch('') }, 200)}
                            />
                            <div className="max-h-48 overflow-y-auto rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                              {(() => {
                                const filtered = available.filter(r => r.title.toLowerCase().includes(recipeSearch.toLowerCase()))
                                const matching = filtered.filter(r => r.group === 'match')
                                const others = filtered.filter(r => r.group === 'other')
                                const current = { id: meal.recipe_id, title: meal.recipes?.title || 'Current', group: 'current' }
                                return (
                                  <>
                                    <div
                                      className="px-2 py-1.5 text-xs cursor-pointer hover:bg-[var(--bg-hover)]"
                                      style={{ color: 'var(--text-tertiary)' }}
                                      onMouseDown={() => handleSwapRecipe(meal.id, meal.recipe_id)}
                                    >
                                      Keep: {current.title}
                                    </div>
                                    {matching.length > 0 && <div className="px-2 py-0.5 text-[10px] font-medium" style={{ color: 'var(--accent)' }}>Matching type</div>}
                                    {matching.map(r => (
                                      <div key={r.id}
                                        className="px-2 py-1.5 text-xs cursor-pointer hover:bg-[var(--bg-hover)]"
                                        style={{ color: 'var(--text-primary)' }}
                                        onMouseDown={() => handleSwapRecipe(meal.id, r.id)}
                                      >{r.title}</div>
                                    ))}
                                    {others.length > 0 && <div className="px-2 py-0.5 text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Other</div>}
                                    {others.map(r => (
                                      <div key={r.id}
                                        className="px-2 py-1.5 text-xs cursor-pointer hover:bg-[var(--bg-hover)]"
                                        style={{ color: 'var(--text-secondary)' }}
                                        onMouseDown={() => handleSwapRecipe(meal.id, r.id)}
                                      >{r.title}</div>
                                    ))}
                                    {filtered.length === 0 && <div className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>No matches</div>}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-medium block truncate" style={{ color: '#fff' }}>
                              {meal.recipes ? meal.recipes.title : 'No recipe'}
                            </span>
                            {meal.recipes && (
                              <span className="text-[10px] mt-1 block" style={{ color: ps.text }}>
                                {meal.recipes.protein_type} · {meal.recipes.effort_level || '?'}
                              </span>
                            )}
                            <span className="text-[10px] block" style={{ color: '#666' }}>
                              ×{meal.servings}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t" style={{ borderColor: '#2A2A2A' }}>
        {Object.entries(PROTEIN_STYLES).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: val.bg, border: `1px solid ${val.border}` }}></span>
            <span className="text-xs" style={{ color: val.text }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
