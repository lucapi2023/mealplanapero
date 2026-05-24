'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'

const PROTEIN_COLORS = {
  meat: 'rgba(239,68,68,0.15)',
  fish: 'rgba(59,130,246,0.15)',
  vegetarian: 'rgba(34,197,94,0.15)',
  vegan: 'rgba(16,185,129,0.15)',
  any: 'rgba(107,114,128,0.15)',
}

export default function RecipesPage() {
  const { user, household } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household) return
    supabase
      .from('recipes')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setRecipes(data)
        setLoading(false)
      })
  }, [household])

  const handleDelete = async (id) => {
    if (!confirm('Delete this recipe?')) return
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  const handleExportCSV = async () => {
    if (recipes.length === 0) return

    const recipeIds = recipes.map(r => r.id)
    const { data: allRI } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id, amount, unit, ingredients(name)')
      .in('recipe_id', recipeIds)

    const ingMap = {}
    if (allRI) {
      allRI.forEach(ri => {
        if (!ingMap[ri.recipe_id]) ingMap[ri.recipe_id] = []
        ingMap[ri.recipe_id].push(`${ri.ingredients?.name || '?'}|${ri.amount}|${ri.unit}`)
      })
    }

    const headers = ['Title', 'Protein Type', 'Effort', 'Prep (min)', 'Cook (min)', 'Servings Base', 'Core', 'Instructions', 'Ingredients']
    const rows = recipes.map((r) => {
      const ings = (ingMap[r.id] || []).join(';')
      return [
        r.title,
        r.protein_type,
        r.effort_level || '',
        r.prep_time_min || '',
        r.cook_time_min || '',
        r.servings_base,
        r.is_core ? 'yes' : 'no',
        `"${(r.instructions || '').replace(/"/g, '""')}"`,
        ings,
      ]
    })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mealplan-recipes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files[0]
    if (!file || !household) return
    const text = await file.text()
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return alert('CSV must have a header row and at least one recipe.')
    let imported = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      if (cols.length < 5) continue
      const title = cols[0]?.trim()
      if (!title) continue
      const recipePayload = {
        user_id: user.id,
        household_id: household.id,
        title,
        protein_type: cols[1]?.trim() || 'any',
        effort_level: cols[2]?.trim() || null,
        prep_time_min: parseInt(cols[3]) || null,
        cook_time_min: parseInt(cols[4]) || null,
        servings_base: parseInt(cols[5]) || 2,
        is_core: cols[6]?.trim().toLowerCase() === 'yes',
        instructions: (cols[7] || '').replace(/^"|"$/g, '').replace(/""/g, '"'),
      }
      const { data: newRecipe, error } = await supabase.from('recipes').insert(recipePayload).select().single()
      if (error || !newRecipe) continue

      const ingStr = cols[8] || ''
      const ingParts = ingStr.split(';').filter(p => p.trim())
      if (ingParts.length > 0) {
        const parsed = ingParts.map(p => {
          const [name, amount, unit] = p.split('|')
          return { name: (name || '').trim(), amount: parseFloat(amount) || 0, unit: (unit || '').trim() }
        }).filter(p => p.name && p.unit)

        if (parsed.length > 0) {
          const names = parsed.map(p => p.name)
          const { data: existing } = await supabase.from('ingredients').select('id, name').in('name', names).eq('household_id', household.id)
          const existingMap = {}
          if (existing) existing.forEach(ing => { existingMap[ing.name] = ing.id })
          const missingNames = names.filter(n => !existingMap[n])
          if (missingNames.length > 0) {
            const inserts = missingNames.map(name => ({ name, user_id: user.id, household_id: household.id }))
            const { data: created } = await supabase.from('ingredients').insert(inserts).select('id, name')
            if (created) created.forEach(ing => { existingMap[ing.name] = ing.id })
          }
          const riRows = parsed
            .filter(p => existingMap[p.name])
            .map(p => ({ recipe_id: newRecipe.id, ingredient_id: existingMap[p.name], amount: p.amount, unit: p.unit }))
          if (riRows.length > 0) {
            await supabase.from('recipe_ingredients').insert(riRows)
          }
        }
      }

      imported++
    }
    alert(`Imported ${imported} recipe(s).`)
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
    if (data) setRecipes(data)
    e.target.value = ''
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Recipes</h1>
            <p className="text-sm mt-1" style={{ color: '#666' }}>Manage your recipe collection</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/recipes/new" className="btn-primary">
              + New Recipe
            </Link>
            <button onClick={handleExportCSV} disabled={recipes.length === 0} className="btn-secondary">
              Export CSV
            </button>
            <label className="btn-secondary cursor-pointer">
              Import CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10" style={{ color: '#666' }}>Loading...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm mb-4" style={{ color: '#666' }}>No recipes yet. Add your first recipe!</p>
            <Link href="/recipes/new" className="btn-primary inline-block">
              Create a recipe
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="card hover:border-[#3A3A3A] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate" style={{ color: '#fff' }}>
                        {recipe.title}
                      </h3>
                      {recipe.is_core && (
                        <span className="badge" style={{ background: 'rgba(62,207,142,0.15)', color: '#6EE7B7' }}>
                          core
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs" style={{ color: '#666' }}>
                      <span className="badge" style={{ background: PROTEIN_COLORS[recipe.protein_type] || PROTEIN_COLORS.any, color: recipe.protein_type === 'meat' ? '#FCA5A5' : recipe.protein_type === 'fish' ? '#93C5FD' : recipe.protein_type === 'vegetarian' ? '#86EFAC' : recipe.protein_type === 'vegan' ? '#6EE7B7' : '#9CA3AF' }}>
                        {recipe.protein_type}
                      </span>
                      {recipe.effort_level && <span>{recipe.effort_level}</span>}
                      {recipe.total_time_min && <span>{recipe.total_time_min} min</span>}
                      {recipe.servings_base && <span>serves {recipe.servings_base}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <Link href={`/recipes/new?id=${recipe.id}`} className="text-xs font-medium hover:underline" style={{ color: '#929292' }}>
                      Edit
                    </Link>
                    <Link href={`/recipes/view?id=${recipe.id}`} className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                      View
                    </Link>
                    <button onClick={() => handleDelete(recipe.id)} className="text-xs font-medium hover:underline" style={{ color: '#FCA5A5' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = false
      } else current += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { result.push(current); current = '' }
    else current += ch
  }
  result.push(current)
  return result
}
