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
    title: '', instructions: '', prepTime: '', cookTime: '',
    effort: 'medium', proteinType: 'any', servingsBase: 2, isCore: true, tags: '',
  })
  const [ingredients, setIngredients] = useState([{ name: '', amount: 0, unit: '' }])

  useEffect(() => {
    if (!editId || !user || !household) return
    async function loadRecipe() {
      const { data: recipe } = await supabase.from('recipes').select('*').eq('id', editId).eq('household_id', household.id).single()
      if (!recipe) return
      setForm({
        title: recipe.title || '', instructions: recipe.instructions || '',
        prepTime: recipe.prep_time_min || '', cookTime: recipe.cook_time_min || '',
        effort: recipe.effort_level || 'medium', proteinType: recipe.protein_type || 'any',
        servingsBase: recipe.servings_base || 2, isCore: recipe.is_core ?? true, tags: '',
      })
      const { data: ri } = await supabase.from('recipe_ingredients').select('ingredients(name), amount, unit').eq('recipe_id', editId)
      if (ri && ri.length > 0) setIngredients(ri.map(r => ({ name: r.ingredients?.name || '', amount: r.amount, unit: r.unit })))
      const { data: tags } = await supabase.from('recipe_tags').select('tag').eq('recipe_id', editId)
      if (tags && tags.length > 0) setForm(f => ({ ...f, tags: tags.map(t => t.tag).join(', ') }))
    }
    loadRecipe()
  }, [editId, user, household])

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  }

  const handleIngredientChange = (index, field, value) => {
    setIngredients(prev => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next })
  }

  const addIngredient = () => setIngredients(prev => [...prev, { name: '', amount: 0, unit: '' }])
  const removeIngredient = (index) => setIngredients(prev => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!household) return
    setSaving(true); setError('')

    try {
      const recipePayload = {
        user_id: user.id, household_id: household.id,
        title: form.title, instructions: form.instructions,
        prep_time_min: form.prepTime ? parseInt(form.prepTime) : null,
        cook_time_min: form.cookTime ? parseInt(form.cookTime) : null,
        effort_level: form.effort, protein_type: form.proteinType,
        servings_base: parseInt(form.servingsBase) || 2, is_core: form.isCore,
      }

      let recipeId = editId
      if (editId) {
        const { error: updateError } = await supabase.from('recipes').update(recipePayload).eq('id', editId)
        if (updateError) throw updateError
      } else {
        const { data: newRecipe, error: insertError } = await supabase.from('recipes').insert(recipePayload).select().single()
        if (insertError) throw insertError
        recipeId = newRecipe.id
      }

      const validIngredients = ingredients.filter(i => i.name.trim() && i.unit)
      if (validIngredients.length > 0) {
        const names = validIngredients.map(i => i.name.trim())
        const { data: existing } = await supabase.from('ingredients').select('id, name').in('name', names).eq('household_id', household.id)
        const existingMap = {}
        if (existing) existing.forEach(i => { existingMap[i.name] = i.id })
        const missingNames = names.filter(n => !existingMap[n])
        if (missingNames.length > 0) {
          const inserts = missingNames.map(name => ({ name, user_id: user.id, household_id: household.id }))
          const { data: created } = await supabase.from('ingredients').insert(inserts).select('id, name')
          if (created) created.forEach(i => { existingMap[i.name] = i.id })
        }
        if (editId) {
          await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
          await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId)
        }
        const riRows = validIngredients.map(ing => ({ recipe_id: recipeId, ingredient_id: existingMap[ing.name.trim()], amount: ing.amount, unit: ing.unit }))
        const { error: riError } = await supabase.from('recipe_ingredients').insert(riRows)
        if (riError) throw riError
      }

      const tagNames = form.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      if (tagNames.length > 0) {
        const tagRows = tagNames.map(tag => ({ recipe_id: recipeId, tag }))
        await supabase.from('recipe_tags').insert(tagRows)
      }

      router.push('/recipes')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const labelStyle = { color: '#929292' }
  const sectionStyle = { color: '#fff' }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <div className="rounded-md px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Title</label>
        <input type="text" value={form.title} onChange={handleChange('title')} required className="input-field" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Protein Type</label>
          <select value={form.proteinType} onChange={handleChange('proteinType')} className="select-field">
            {PROTEIN_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Effort</label>
          <select value={form.effort} onChange={handleChange('effort')} className="select-field">
            {EFFORT_LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Prep (min)</label>
          <input type="number" value={form.prepTime} onChange={handleChange('prepTime')} min="0" className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Cook (min)</label>
          <input type="number" value={form.cookTime} onChange={handleChange('cookTime')} min="0" className="input-field" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Servings (base)</label>
          <input type="number" value={form.servingsBase} onChange={handleChange('servingsBase')} min="1" required className="w-24 input-field" />
          <span className="ml-2 text-xs" style={{ color: '#666' }}>Amounts are per this many servings</span>
        </div>
        <label className="flex items-center gap-2 pt-5 cursor-pointer">
          <input type="checkbox" checked={form.isCore} onChange={handleChange('isCore')} style={{ accentColor: '#3ECF8E' }} />
          <span className="text-xs" style={{ color: '#929292' }}>Core recipe</span>
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={labelStyle}>Ingredients (per {form.servingsBase} serving{form.servingsBase > 1 ? 's' : ''})</label>
          <button type="button" onClick={addIngredient} className="text-xs font-medium hover:underline" style={{ color: '#3ECF8E' }}>
            + Add ingredient
          </button>
        </div>
        <div className="space-y-1">
          {ingredients.map((ing, i) => (
            <IngredientRow key={i} ingredient={ing} index={i} onChange={handleIngredientChange} onRemove={removeIngredient} />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Instructions</label>
        <textarea value={form.instructions} onChange={handleChange('instructions')} required rows={5} className="input-field" />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Tags (comma-separated)</label>
        <input type="text" value={form.tags} onChange={handleChange('tags')} placeholder="pasta, quick, comfort" className="input-field" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : editId ? 'Update Recipe' : 'Save Recipe'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}
