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

    if (!plan) {
      setLoading(false)
      return
    }

    const { data: meals } = await supabase
      .from('plan_meals')
      .select('id, recipe_id, servings, recipes(servings_base)')
      .eq('plan_id', plan.id)
      .order('day_of_week')

    if (!meals || meals.length === 0) {
      setLoading(false)
      return
    }

    const mealIds = meals.filter((m) => m.recipe_id).map((m) => m.id)
    const { data: riData } = await supabase
      .from('recipe_ingredients')
      .select('plan_meals!inner(id), amount, unit, ingredients(name)')
      .in('plan_meals.id', mealIds)

    const agg = {}
    if (riData) {
      riData.forEach((ri) => {
        if (!ri.plan_meals) return
        const meal = meals.find((m) => m.id === ri.plan_meals.id)
        if (!meal || !meal.recipes) return
        const scale = meal.servings / (meal.recipes.servings_base || 1)
        const name = ri.ingredients?.name || 'Unknown'
        const key = `${name}|||${ri.unit}`
        if (!agg[key]) agg[key] = { name, unit: ri.unit, amount: 0 }
        agg[key].amount += ri.amount * scale
      })
    }

    setIngredients(Object.values(agg))
    setLoading(false)
  }

  return (
    <AuthGuard>
      <Layout>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping List</h1>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : ingredients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No meal plan for this week. Generate a plan first from the Dashboard or Plan page.
          </div>
        ) : (
          <GroceryList ingredients={ingredients} onClose={() => {}} />
        )}
      </Layout>
    </AuthGuard>
  )
}
