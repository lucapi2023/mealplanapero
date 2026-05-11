'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'

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

  const handleExportCSV = () => {
    if (recipes.length === 0) return
    const headers = ['Title', 'Protein Type', 'Effort', 'Prep (min)', 'Cook (min)', 'Servings Base', 'Core', 'Instructions', 'Tags']
    const rows = recipes.map((r) => [
      r.title,
      r.protein_type,
      r.effort_level || '',
      r.prep_time_min || '',
      r.cook_time_min || '',
      r.servings_base,
      r.is_core ? 'yes' : 'no',
      `"${(r.instructions || '').replace(/"/g, '""')}"`,
    ])
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
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

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
      const { error } = await supabase.from('recipes').insert(recipePayload)
      if (!error) imported++
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/recipes/new"
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
            >
              + New Recipe
            </Link>
            <button
              onClick={handleExportCSV}
              disabled={recipes.length === 0}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Export CSV
            </button>
            <label className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 cursor-pointer">
              Import CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No recipes yet. Add your first recipe!</p>
            <Link href="/recipes/new" className="text-blue-600 hover:text-blue-800 text-sm">
              Create a recipe
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-gray-900">
                        {recipe.title}
                      </h3>
                      {recipe.is_core && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          core
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className={`px-1.5 py-0.5 rounded ${
                        recipe.protein_type === 'meat' ? 'bg-red-50 text-red-600' :
                        recipe.protein_type === 'fish' ? 'bg-blue-50 text-blue-600' :
                        recipe.protein_type === 'vegetarian' ? 'bg-green-50 text-green-600' :
                        recipe.protein_type === 'vegan' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {recipe.protein_type}
                      </span>
                      {recipe.effort_level && (
                        <span>Effort: {recipe.effort_level}</span>
                      )}
                      {recipe.servings_base && (
                        <span>Base: {recipe.servings_base} serving{recipe.servings_base > 1 ? 's' : ''}</span>
                      )}
                      {recipe.total_time_min && (
                        <span>{recipe.total_time_min} min</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/recipes/new?id=${recipe.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
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
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
