'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from './AuthProvider'
import GroceryList from './GroceryList'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

async function fetchMealsWithIngredients(planId) {
  const { data: meals } = await supabase
    .from('plan_meals')
    .select('*, recipes(id, title, servings_base, protein_type, effort_level)')
    .eq('plan_id', planId)
    .order('day_of_week')

  if (!meals) return []

  const mealIds = meals.filter((m) => m.recipe_id).map((m) => m.id)
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
      mealIngredientsMap[mid].push({
        name: ri.ingredients?.name || 'Unknown',
        amount: ri.amount,
        unit: ri.unit,
      })
    }
  }

  return meals.map((m) => ({
    ...m,
    ingredients: mealIngredientsMap[m.id] || [],
  }))
}

export default function WeeklyPlanDisplay({ planId, weekStartDate, onRefresh }) {
  const { user } = useAuth()
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

  useEffect(() => {
    if (planId) loadMeals()
  }, [planId])

  const handleSwap = async (mealId) => {
    setSwappingId(mealId)
    try {
      const meal = meals.find((m) => m.id === mealId)
      if (!meal || !meal.recipes) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/swap-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId,
          mealId,
          proteinType: meal.recipes.protein_type,
        }),
      })
      if (res.ok) {
        await loadMeals()
        if (onRefresh) onRefresh()
      }
    } catch (err) {
      console.error('Swap failed:', err)
    } finally {
      setSwappingId(null)
    }
  }

  const getScaledIngredients = (meal) => {
    if (!meal.recipes) return []
    const scale = meal.servings / (meal.recipes.servings_base || 1)
    return meal.ingredients.map((ing) => ({
      ...ing,
      amount: Math.round((ing.amount * scale) * 100) / 100,
    }))
  }

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading plan...</div>
  }

  if (meals.length === 0) {
    return <div className="text-center text-gray-500 py-8">No meals planned for this week.</div>
  }

  const aggregatedIngredients = {}
  meals.forEach((meal) => {
    if (!meal.recipes) return
    const scale = meal.servings / (meal.recipes.servings_base || 1)
    meal.ingredients.forEach((ing) => {
      const key = `${ing.name}|||${ing.unit}`
      if (!aggregatedIngredients[key]) {
        aggregatedIngredients[key] = { name: ing.name, unit: ing.unit, amount: 0 }
      }
      aggregatedIngredients[key].amount += ing.amount * scale
    })
  })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowGrocery(!showGrocery)}
          className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {showGrocery ? 'Hide Grocery List' : 'Grocery List'}
        </button>
      </div>

      {showGrocery && (
        <GroceryList
          ingredients={Object.values(aggregatedIngredients)}
          onClose={() => setShowGrocery(false)}
        />
      )}

      <div className="space-y-3">
        {meals.map((meal) => {
          const dayName = DAY_NAMES[meal.day_of_week] || 'Day'
          const scaled = getScaledIngredients(meal)

          return (
            <div
              key={meal.id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-gray-800">
                    {dayName}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {meal.meal_date}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {meal.recipes && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      meal.recipes.protein_type === 'meat' ? 'bg-red-100 text-red-700' :
                      meal.recipes.protein_type === 'fish' ? 'bg-blue-100 text-blue-700' :
                      meal.recipes.protein_type === 'vegetarian' ? 'bg-green-100 text-green-700' :
                      meal.recipes.protein_type === 'vegan' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {meal.recipes.protein_type}
                    </span>
                  )}
                  <button
                    onClick={() => handleSwap(meal.id)}
                    disabled={swappingId === meal.id}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {swappingId === meal.id ? 'Swapping...' : 'Swap'}
                  </button>
                </div>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                {meal.recipes ? meal.recipes.title : 'No recipe assigned'}
              </h3>
              {meal.recipes && (
                <div className="text-xs text-gray-500 mb-2">
                  Serves {meal.servings} · Scale: ×
                  {Math.round((meal.servings / meal.recipes.servings_base) * 10) / 10}
                  {meal.recipes.effort_level && (
                    <span className="ml-3">
                      Effort: {meal.recipes.effort_level}
                    </span>
                  )}
                </div>
              )}
              {scaled.length > 0 && (
                <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                  {scaled.map((ing, i) => (
                    <span key={i}>
                      {ing.amount} {ing.unit} {ing.name}
                      {i < scaled.length - 1 ? ',' : ''}
                    </span>
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
