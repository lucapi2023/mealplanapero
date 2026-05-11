'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from './AuthProvider'
import IngredientRow from './IngredientRow'

const PROTEIN_TYPES = ['meat', 'fish', 'vegetarian', 'vegan', 'any']
const EFFORT_LEVELS = ['low', 'medium', 'high']

export default function RecipeForm() {
  const { user, household } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    effort: 'medium',
    proteinType: 'any',
    servingsBase: 2,
    isCore: true,
    tags: '',
  })
  const [ingredients, setIngredients] = useState([{ name: '', amount: 0, unit: '' }])

  useEffect(() => {
    if (!editId || !user || !household) return
    async function loadRecipe() {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', editId)
        .eq('household_id', household.id)
        .single()
      if (!recipe) return

      setForm({
        title: recipe.title || '',
        instructions: recipe.instructions || '',
        prepTime: recipe.prep_time_min || '',
        cookTime: recipe.cook_time_min || '',
        effort: recipe.effort_level || 'medium',
        proteinType: recipe.protein_type || 'any',
        servingsBase: recipe.servings_base || 2,
        isCore: recipe.is_core ?? true,
        tags: '',
      })

      const { data: ri } = await supabase
        .from('recipe_ingredients')
        .select('ingredients(name), amount, unit')
        .eq('recipe_id', editId)

      if (ri && ri.length > 0) {
        setIngredients(
          ri.map((r) => ({
            name: r.ingredients?.name || '',
            amount: r.amount,
            unit: r.unit,
          }))
        )
      }

      const { data: tags } = await supabase
        .from('recipe_tags')
        .select('tag')
        .eq('recipe_id', editId)
      if (tags && tags.length > 0) {
        setForm((f) => ({ ...f, tags: tags.map((t) => t.tag).join(', ') }))
      }
    }
    loadRecipe()
  }, [editId, user])

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  const handleIngredientChange = (index, field, value) => {
    setIngredients((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', amount: 0, unit: '' }])
  }

  const removeIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const recipePayload = {
        user_id: user.id,
        household_id: household.id,
        title: form.title,
        instructions: form.instructions,
        prep_time_min: form.prepTime ? parseInt(form.prepTime) : null,
        cook_time_min: form.cookTime ? parseInt(form.cookTime) : null,
        effort_level: form.effort,
        protein_type: form.proteinType,
        servings_base: parseInt(form.servingsBase) || 2,
        is_core: form.isCore,
      }

      let recipeId = editId

      if (editId) {
        const { error: updateError } = await supabase
          .from('recipes')
          .update(recipePayload)
          .eq('id', editId)
        if (updateError) throw updateError
      } else {
        const { data: newRecipe, error: insertError } = await supabase
          .from('recipes')
          .insert(recipePayload)
          .select()
          .single()
        if (insertError) throw insertError
        recipeId = newRecipe.id
      }

      const validIngredients = ingredients.filter((i) => i.name.trim() && i.unit)
      if (validIngredients.length > 0) {
        const names = validIngredients.map((i) => i.name.trim())

        const { data: existing } = await supabase
          .from('ingredients')
          .select('id, name')
          .in('name', names)
          .eq('household_id', household.id)

        const existingMap = {}
        if (existing) existing.forEach((i) => { existingMap[i.name] = i.id })

        const missingNames = names.filter((n) => !existingMap[n])
        if (missingNames.length > 0) {
          const inserts = missingNames.map((name) => ({ name, user_id: user.id, household_id: household.id }))
          const { data: created } = await supabase
            .from('ingredients')
            .insert(inserts)
            .select('id, name')
          if (created) created.forEach((i) => { existingMap[i.name] = i.id })
        }

        if (editId) {
          await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
          await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId)
        }

        const riRows = validIngredients.map((ing) => ({
          recipe_id: recipeId,
          ingredient_id: existingMap[ing.name.trim()],
          amount: ing.amount,
          unit: ing.unit,
        }))
        const { error: riError } = await supabase.from('recipe_ingredients').insert(riRows)
        if (riError) throw riError
      }

      const tagNames = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
      if (tagNames.length > 0) {
        const tagRows = tagNames.map((tag) => ({ recipe_id: recipeId, tag }))
        await supabase.from('recipe_tags').insert(tagRows)
      }

      router.push('/recipes')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={handleChange('title')}
          required
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Protein Type</label>
          <select
            value={form.proteinType}
            onChange={handleChange('proteinType')}
            className="w-full border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PROTEIN_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Effort</label>
          <select
            value={form.effort}
            onChange={handleChange('effort')}
            className="w-full border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {EFFORT_LEVELS.map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prep (min)</label>
          <input
            type="number"
            value={form.prepTime}
            onChange={handleChange('prepTime')}
            min="0"
            className="w-full border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cook (min)</label>
          <input
            type="number"
            value={form.cookTime}
            onChange={handleChange('cookTime')}
            min="0"
            className="w-full border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Servings (base)</label>
          <input
            type="number"
            value={form.servingsBase}
            onChange={handleChange('servingsBase')}
            min="1"
            required
            className="w-24 border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="ml-2 text-xs text-gray-500">
            Ingredient amounts are per this many servings
          </span>
        </div>
        <label className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            checked={form.isCore}
            onChange={handleChange('isCore')}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Core recipe</span>
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Ingredients (per {form.servingsBase} serving{form.servingsBase > 1 ? 's' : ''})</label>
          <button
            type="button"
            onClick={addIngredient}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add ingredient
          </button>
        </div>
        <div className="space-y-1">
          {ingredients.map((ing, i) => (
            <IngredientRow
              key={i}
              ingredient={ing}
              index={i}
              onChange={handleIngredientChange}
              onRemove={removeIngredient}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
        <textarea
          value={form.instructions}
          onChange={handleChange('instructions')}
          required
          rows={5}
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={form.tags}
          onChange={handleChange('tags')}
          placeholder="pasta, quick, comfort"
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : editId ? 'Update Recipe' : 'Save Recipe'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 px-6 py-2 rounded text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
