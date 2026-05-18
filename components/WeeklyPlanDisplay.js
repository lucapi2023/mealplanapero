'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import GroceryList from './GroceryList'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const PROTEIN_STYLES = {
  meat: { bg: 'rgba(239,68,68,0.15)', color: '#FCA5A5' },
  fish: { bg: 'rgba(59,130,246,0.15)', color: '#93C5FD' },
  vegetarian: { bg: 'rgba(34,197,94,0.15)', color: '#86EFAC' },
  vegan: { bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7' },
  any: { bg: 'rgba(107,114,128,0.15)', color: '#9CA3AF' },
}

async function fetchMealsWithIngredients(planId) {
  const { data: meals } = await supabase
    .from('plan_meals')
    .select('*, recipes(id, title, servings_base, protein_type, effort_level)')
    .eq('plan_id', planId)
    .order('day_of_week')
    .order('meal_type')
  if (!meals) return []

  const mealIds = meals.filter(m => m.recipe_id).map(m => m.id)
  if (mealIds.length === 0) return meals.map(m => ({ ...m, ingredients: [] }))

  const { data: riData } = await supabase
    .from('recipe_ingredients')
    .select('plan_meals!inner(id), ingredient_id, amount, unit, ingredients(name)')
    .in('plan_meals.id', mealIds)

  const mealIngredientsMap = {}
  if (riData) {
    for (const ri of riData) {
      const mid = ri.plan_meals?.id
      if (!mid) continue
      if (!mealIngredientsMap[mid]) mealIngredientsMap[mid] = []
      mealIngredientsMap[mid].push({ name: ri.ingredients?.name || 'Unknown', amount: ri.amount, unit: ri.unit })
    }
  }

  return meals.map(m => ({ ...m, ingredients: mealIngredientsMap[m.id] || [] }))
}

export default function WeeklyPlanDisplay({ planId, weekStartDate, onRefresh }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [swappingId, setSwappingId] = useState(null)
  const [showGrocery, setShowGrocery] = useState(false)

  const loadMeals = async () => {
    setLoading(true)
    const data = await fetchMealsWithIngredients(planId)
    setMeals(data)
    setLoading(false)
  }

  useEffect(() => { if (planId) loadMeals() }, [planId])

  const handleSwap = async (mealId) => {
    setSwappingId(mealId)
    try {
      const meal = meals.find(m => m.id === mealId)
      if (!meal || !meal.recipes) return
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/swap-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId, mealId, proteinType: meal.recipes.protein_type }),
      })
      if (res.ok) { await loadMeals(); if (onRefresh) onRefresh() }
    } catch (err) { console.error('Swap failed:', err) }
    finally { setSwappingId(null) }
  }

  const getScaledIngredients = (meal) => {
    if (!meal.recipes) return []
    const scale = meal.servings / (meal.recipes.servings_base || 1)
    return meal.ingredients.map(ing => ({ ...ing, amount: Math.round(ing.amount * scale * 100) / 100 }))
  }

  if (loading) return <div className="text-center py-8" style={{ color: '#666' }}>Loading plan...</div>
  if (meals.length === 0) return <div className="text-center py-8" style={{ color: '#666' }}>No meals planned for this week.</div>

  const aggregatedIngredients = {}
  meals.forEach(meal => {
    if (!meal.recipes) return
    const scale = meal.servings / (meal.recipes.servings_base || 1)
    meal.ingredients.forEach(ing => {
      const key = `${ing.name}|||${ing.unit}`
      if (!aggregatedIngredients[key]) aggregatedIngredients[key] = { name: ing.name, unit: ing.unit, amount: 0 }
      aggregatedIngredients[key].amount += ing.amount * scale
    })
  })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowGrocery(!showGrocery)} className="btn-primary">
          {showGrocery ? 'Hide Grocery List' : 'Grocery List'}
        </button>
      </div>

      {showGrocery && <GroceryList ingredients={Object.values(aggregatedIngredients)} onClose={() => setShowGrocery(false)} />}

      <div className="space-y-3">
        {meals.map(meal => {
          const dayName = DAY_NAMES[meal.day_of_week] || 'Day'
          const scaled = getScaledIngredients(meal)
          const ps = meal.recipes ? (PROTEIN_STYLES[meal.recipes.protein_type] || PROTEIN_STYLES.any) : PROTEIN_STYLES.any

          return (
            <div key={meal.id} className="rounded-lg border p-4" style={{ background: '#141414', borderColor: '#2A2A2A' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold" style={{ color: '#fff' }}>{dayName}</span>
                  {meal.meal_type === 'lunch' && (
                    <span className="text-xs ml-2 px-1.5 py-0.5 rounded" style={{ background: 'rgba(62,207,142,0.15)', color: '#6EE7B7' }}>Lunch</span>
                  )}
                  <span className="text-xs ml-2" style={{ color: '#666' }}>{meal.meal_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  {meal.recipes && (
                    <span className="badge" style={{ background: ps.bg, color: ps.color }}>
                      {meal.recipes.protein_type}
                    </span>
                  )}
                  <button onClick={() => handleSwap(meal.id)} disabled={swappingId === meal.id}
                    className="text-xs font-medium hover:underline disabled:opacity-50"
                    style={{ color: '#3ECF8E' }}>
                    {swappingId === meal.id ? 'Swapping...' : 'Swap'}
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-medium mb-1" style={{ color: '#fff' }}>
                {meal.recipes ? meal.recipes.title : 'No recipe assigned'}
              </h3>
              {meal.recipes && (
                <div className="text-xs mb-2" style={{ color: '#666' }}>
                  Serves {meal.servings} &middot; Scale x{Math.round(meal.servings / meal.recipes.servings_base * 10) / 10}
                  {meal.recipes.effort_level && <span> &middot; {meal.recipes.effort_level} effort</span>}
                </div>
              )}
              {scaled.length > 0 && (
                <div className="text-xs flex flex-wrap gap-x-3 gap-y-1" style={{ color: '#929292' }}>
                  {scaled.map((ing, i) => (
                    <span key={i}>{ing.amount} {ing.unit} {ing.name}{i < scaled.length - 1 ? ',' : ''}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
