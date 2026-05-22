function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oghvlybiodahacdlcxyg.supabase.co'
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__4hZvrkyxAJ2-bVqw6nVWQ_nT5izI1R'

function headers(token) {
  return {
    'Content-Type': 'application/json',
    'apikey': KEY,
    'Authorization': `Bearer ${token}`,
  }
}

async function fetchRow(token, table, query) {
  const qs = new URLSearchParams(query).toString()
  const res = await fetch(`${BASE}/rest/v1/${table}?${qs}`, {
    headers: { ...headers(token), 'Accept': 'application/vnd.pgrst.object+json' },
  })
  if (!res.ok) return null
  return res.json()
}

async function fetchRows(token, table, query) {
  const qs = new URLSearchParams(query).toString()
  const res = await fetch(`${BASE}/rest/v1/${table}?${qs}`, {
    headers: headers(token),
  })
  if (!res.ok) return []
  return res.json()
}

async function insertRow(token, table, body) {
  const res = await fetch(`${BASE}/rest/v1/${table}?select=*`, {
    method: 'POST',
    headers: { ...headers(token), 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  return res.json()
}

async function upsertRow(token, table, body, onConflict) {
  const qs = `on_conflict=${onConflict}`
  const res = await fetch(`${BASE}/rest/v1/${table}?${qs}&select=*`, {
    method: 'POST',
    headers: { ...headers(token), 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return res.json().catch(() => null)
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

    // Get preferences
    const pref = await fetchRow(token, 'preferences', { select: '*', user_id: `eq.${userId}` })
    if (!pref) return Response.json({ error: 'Preferences not set' }, { status: 400 })

    const householdId = pref.household_id
    if (!householdId) return Response.json({ error: 'No household assigned' }, { status: 400 })

    const {
      meals_per_week, meat_days, fish_days, vegetarian_days, vegan_days,
      servings_default, meals_per_day, plan_days, meal_schedule,
    } = pref

    const schedule = meal_schedule || {}
    const useSchedule = Object.keys(schedule).length > 0
    const totalDays = plan_days || 7
    const mealsPerDay = meals_per_day || 1

    let weekStartDate
    try { const body = await req.json(); weekStartDate = body.weekStartDate } catch { weekStartDate = null }
    if (!weekStartDate) {
      const today = new Date()
      const diff = today.getDay() === 0 ? -6 : 1 - today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() + diff)
      monday.setHours(0, 0, 0, 0)
      weekStartDate = monday.toISOString().slice(0, 10)
    }

    // Check existing plan
    const existingPlan = await fetchRow(token, 'weekly_plans', {
      select: 'id', household_id: `eq.${householdId}`, week_start_date: `eq.${weekStartDate}`,
    })
    if (existingPlan) {
      return Response.json({ error: 'A plan already exists for this week.' }, { status: 409 })
    }

    const planMeals = []
    const usedRecipeIds = new Set()
    const mealTypes = mealsPerDay >= 2 ? ['lunch', 'dinner'] : ['dinner']

    for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
      for (const mealType of mealTypes) {
        let protein = 'any'
        if (useSchedule && schedule[dayIdx] && schedule[dayIdx][mealType]) {
          protein = schedule[dayIdx][mealType]
        } else {
          const fallbackTypes = []
          for (let i = 0; i < (meat_days || 0); i++) fallbackTypes.push('meat')
          for (let i = 0; i < (fish_days || 0); i++) fallbackTypes.push('fish')
          for (let i = 0; i < (vegetarian_days || 0); i++) fallbackTypes.push('vegetarian')
          for (let i = 0; i < (vegan_days || 0); i++) fallbackTypes.push('vegan')
          const remaining = Math.max(0, (totalDays * mealTypes.length) - fallbackTypes.length)
          for (let i = 0; i < remaining; i++) fallbackTypes.push('any')
          shuffleArray(fallbackTypes)
          const slotIndex = dayIdx * mealTypes.length + mealTypes.indexOf(mealType)
          protein = slotIndex < fallbackTypes.length ? fallbackTypes[slotIndex] : 'any'
        }

        const date = new Date(weekStartDate + 'T00:00:00')
        date.setDate(date.getDate() + dayIdx)

        // Query recipes via raw fetch
        let qParams = { select: 'id,title,servings_base', household_id: `eq.${householdId}`, limit: '50' }
        if (protein !== 'any') qParams.protein_type = `eq.${protein}`
        if (usedRecipeIds.size > 0) qParams.id = `not.in.(${Array.from(usedRecipeIds).join(',')})`

        let recipes = await fetchRows(token, 'recipes', qParams)

        // Fallback: any type
        if ((!recipes || recipes.length === 0) && protein !== 'any') {
          qParams = { select: 'id,title,servings_base', household_id: `eq.${householdId}`, limit: '50' }
          if (usedRecipeIds.size > 0) qParams.id = `not.in.(${Array.from(usedRecipeIds).join(',')})`
          recipes = await fetchRows(token, 'recipes', qParams)
        }

        if (!recipes || recipes.length === 0) {
          return Response.json(
            { error: `Not enough recipes for ${protein} on day ${dayIdx}.` },
            { status: 400 }
          )
        }

        const chosenRecipe = recipes[Math.floor(Math.random() * recipes.length)]
        usedRecipeIds.add(chosenRecipe.id)

        planMeals.push({
          day_of_week: dayIdx,
          meal_date: date.toISOString().slice(0, 10),
          meal_type: mealType,
          recipe_id: chosenRecipe.id,
          servings: servings_default || 2,
          is_locked: false,
        })
      }
    }

    // Save plan
    const plan = await insertRow(token, 'weekly_plans', {
      user_id: userId,
      household_id: householdId,
      week_start_date: weekStartDate,
    })
    if (!plan) return Response.json({ error: 'Failed to create plan' }, { status: 500 })

    for (const m of planMeals) {
      await insertRow(token, 'plan_meals', { ...m, plan_id: plan.id })
    }

    const fullPlan = await fetchRows(token, 'plan_meals', {
      select: '*,recipes(title,servings_base)',
      plan_id: `eq.${plan.id}`,
      order: 'day_of_week.asc',
    })

    return Response.json({ plan, meals: fullPlan })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
