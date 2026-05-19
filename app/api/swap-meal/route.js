const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oghvlybiodahacdlcxyg.supabase.co'
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__4hZvrkyxAJ2-bVqw6nVWQ_nT5izI1R'

function headers(token) {
  return {
    'Content-Type': 'application/json',
    'apikey': KEY,
    'Authorization': `Bearer ${token}`,
  }
}

async function fetchRows(token, table, query) {
  const qs = new URLSearchParams(query).toString()
  const res = await fetch(`${BASE}/rest/v1/${table}?${qs}`, { headers: headers(token) })
  if (!res.ok) return []
  return res.json()
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return Response.json({ error: 'Missing auth' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const userId = payload.sub
    if (!userId) return Response.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    const { planId, mealId, proteinType } = body

    // Get preferences for householdId
    const res = await fetch(`${BASE}/rest/v1/preferences?select=household_id&user_id=eq.${userId}`, {
      headers: { ...headers(token), 'Accept': 'application/vnd.pgrst.object+json' },
    })
    if (!res.ok) return Response.json({ error: 'No household found' }, { status: 400 })
    const pref = await res.json()
    const householdId = pref?.household_id
    if (!householdId) return Response.json({ error: 'No household found' }, { status: 400 })

    // Get existing meal IDs to exclude
    const existingMeals = await fetchRows(token, 'plan_meals', { select: 'id,recipe_id', plan_id: `eq.${planId}` })
    const usedIds = new Set()
    if (existingMeals) {
      existingMeals.forEach(m => { if (m.id !== mealId && m.recipe_id) usedIds.add(m.recipe_id) })
    }

    // Query alternative recipes
    let qParams = { select: 'id,title,servings_base', household_id: `eq.${householdId}`, limit: '50' }
    if (proteinType && proteinType !== 'any') qParams.protein_type = `eq.${proteinType}`
    if (usedIds.size > 0) qParams.id = `not.in.(${Array.from(usedIds).join(',')})`

    let recipes = await fetchRows(token, 'recipes', qParams)

    if (!recipes || recipes.length === 0) {
      return Response.json({ error: 'No alternative recipes available' }, { status: 400 })
    }

    const chosen = recipes[Math.floor(Math.random() * recipes.length)]

    // Update plan_meals
    await fetch(`${BASE}/rest/v1/plan_meals?id=eq.${mealId}`, {
      method: 'PATCH',
      headers: { ...headers(token), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ recipe_id: chosen.id }),
    })

    return Response.json({ success: true, newRecipeId: chosen.id, title: chosen.title })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
