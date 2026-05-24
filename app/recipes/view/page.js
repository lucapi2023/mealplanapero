'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import { Suspense } from 'react'

function ViewRecipeContent() {
  const { household } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const recipeId = searchParams.get('id')

  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!recipeId || !household) return
    loadRecipe()
  }, [recipeId, household])

  const loadRecipe = async () => {
    const { data: r } = await supabase.from('recipes').select('*').eq('id', recipeId).eq('household_id', household.id).single()
    if (!r) { setLoading(false); return }
    setRecipe(r)
    const { data: ri } = await supabase.from('recipe_ingredients').select('amount, unit, ingredients(name)').eq('recipe_id', recipeId)
    if (ri) setIngredients(ri.map(i => ({ name: i.ingredients?.name || '?', amount: i.amount, unit: i.unit })))
    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-10" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
  }

  if (!recipe) {
    return <div className="text-center py-10" style={{ color: 'var(--text-tertiary)' }}>Recipe not found.</div>
  }

  const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0)

  return (
    <div>
      <button onClick={() => router.back()} className="btn-secondary text-xs mb-4">← Back</button>
      <div className="card space-y-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{recipe.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>{recipe.protein_type}</span>
            {recipe.effort_level && <span className="badge" style={{ background: 'rgba(62,207,142,0.15)', color: '#6EE7B7' }}>{recipe.effort_level}</span>}
            {totalTime > 0 && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{totalTime} min</span>}
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Serves {recipe.servings_base}</span>
          </div>
        </div>

        {ingredients.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Ingredients (per {recipe.servings_base} serving{recipe.servings_base > 1 ? 's' : ''})</h3>
            <ul className="space-y-1">
              {ingredients.map((ing, i) => (
                <li key={i} className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>{ing.name}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{ing.amount} {ing.unit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Instructions</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{recipe.instructions}</p>
        </div>

        {recipe.notes && (
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Notes</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{recipe.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ViewRecipePage() {
  return (
    <AuthGuard>
      <Layout>
        <Suspense fallback={<div className="text-center py-10" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>}>
          <ViewRecipeContent />
        </Suspense>
      </Layout>
    </AuthGuard>
  )
}
