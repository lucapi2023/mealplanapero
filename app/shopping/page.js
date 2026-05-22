'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import GroceryList from '@/components/GroceryList'

function getWeekMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

export default function ShoppingPage() {
  const { user, household } = useAuth()
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !household) return
    loadShoppingList()
  }, [user, household])

  const loadShoppingList = async () => {
    const weekStart = getWeekMonday()
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('household_id', household.id)
      .eq('week_start_date', weekStart)
      .maybeSingle()

    if (!plan) { setLoading(false); return }

    const { data: meals } = await supabase
      .from('plan_meals')
      .select('id, recipe_id, servings, recipes(servings_base)')
      .eq('plan_id', plan.id)

    if (!meals || meals.length === 0) { setLoading(false); return }

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
          ingMap[ri.recipe_id].push({ name: ri.ingredients?.name || 'Unknown', amount: ri.amount, unit: ri.unit })
        })
      }
    }

    const agg = {}
    meals.forEach(meal => {
      if (!meal.recipe_id || !meal.recipes) return
      const scale = meal.servings / (meal.recipes.servings_base || 1)
      const ings = ingMap[meal.recipe_id] || []
      ings.forEach(ing => {
        const key = `${ing.name}|||${ing.unit}`
        if (!agg[key]) agg[key] = { name: ing.name, unit: ing.unit, amount: 0 }
        agg[key].amount += ing.amount * scale
      })
    })

    setIngredients(Object.values(agg))
    setLoading(false)
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Shopping List</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Aggregated ingredients from your weekly plan</p>
        </div>

        {loading ? (
          <div className="text-center py-10" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : (
          <GroceryList ingredients={ingredients} onClose={() => {}} />
        )}
      </Layout>
    </AuthGuard>
  )
}
