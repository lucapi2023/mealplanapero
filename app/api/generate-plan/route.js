import { createClient } from '@supabase/supabase-js'

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

function chooseRandomDays(allDays, count) {
  const shuffled = [...allDays].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Missing auth' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pref } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (!pref) {
      return Response.json({ error: 'Preferences not set' }, { status: 400 })
    }

    const householdId = pref.household_id
    if (!householdId) {
      return Response.json({ error: 'No household assigned' }, { status: 400 })
    }

    const {
      meals_per_week,
      meat_days,
      fish_days,
      vegetarian_days,
      vegan_days,
      servings_default,
      meals_per_day,
      plan_days,
      meal_schedule,
    } = pref

    const schedule = meal_schedule || {}
    const hasSchedule = Object.keys(schedule).length > 0
    const useSchedule = hasSchedule
    const totalDays = plan_days || 7
    const mealsPerDay = meals_per_day || 1

    let weekStartDate
    try {
      const body = await req.json()
      weekStartDate = body.weekStartDate
    } catch {
      weekStartDate = null
    }

    if (!weekStartDate) {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(today)
      monday.setDate(today.getDate() + diff)
      monday.setHours(0, 0, 0, 0)
      weekStartDate = monday.toISOString().slice(0, 10)
    }

    const { data: existingPlan } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('household_id', householdId)
      .eq('week_start_date', weekStartDate)
      .maybeSingle()

    if (existingPlan) {
      return Response.json(
        { error: 'A plan already exists for this week. Delete it first or swap individual meals.' },
        { status: 409 }
      )
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

        let query = supabase
          .from('recipes')
          .select('id, title, servings_base')
          .eq('household_id', householdId)

        if (protein !== 'any') {
          query = query.eq('protein_type', protein)
        }

        if (usedRecipeIds.size > 0) {
          query = query.not('id', 'in', Array.from(usedRecipeIds))
        }

        let { data: recipes } = await query.limit(50)

        if (!recipes || recipes.length === 0) {
          let fallbackQuery = supabase
            .from('recipes')
            .select('id, title, servings_base')
            .eq('household_id', householdId)

          if (protein !== 'any') {
            fallbackQuery = fallbackQuery.eq('protein_type', protein)
          }

          if (usedRecipeIds.size > 0) {
            fallbackQuery = fallbackQuery.not('id', 'in', Array.from(usedRecipeIds))
          }
          const { data: fallbackRecipes } = await fallbackQuery.limit(50)

          if (fallbackRecipes && fallbackRecipes.length > 0) {
            recipes = fallbackRecipes
          }
        }

        if (!recipes || recipes.length === 0) {
          return Response.json(
            { error: `Not enough recipes for ${protein} on day ${dayIdx}. Add more recipes.` },
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
          servings: servings_default,
          is_locked: false,
        })
      }
    }

    const { data: plan, error: planError } = await supabase
      .from('weekly_plans')
      .insert({
        user_id: user.id,
        household_id: householdId,
        week_start_date: weekStartDate,
      })
      .select()
      .single()

    if (planError) {
      return Response.json({ error: planError.message }, { status: 500 })
    }

    const mealInserts = planMeals.map((m) => ({ ...m, plan_id: plan.id }))
    const { error: mealInsertError } = await supabase
      .from('plan_meals')
      .insert(mealInserts)

    if (mealInsertError) {
      return Response.json({ error: mealInsertError.message }, { status: 500 })
    }

    const { data: fullPlan } = await supabase
      .from('plan_meals')
      .select('*, recipes(title, servings_base)')
      .eq('plan_id', plan.id)
      .order('day_of_week')

    return Response.json({ plan, meals: fullPlan })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
