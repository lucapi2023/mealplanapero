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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    const {
      meals_per_week,
      meat_days,
      fish_days,
      vegetarian_days,
      vegan_days,
      servings_default,
    } = pref

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
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate)
      .maybeSingle()

    if (existingPlan) {
      return Response.json(
        { error: 'A plan already exists for this week. Delete it first or swap individual meals.' },
        { status: 409 }
      )
    }

    const types = []
    for (let i = 0; i < meat_days; i++) types.push('meat')
    for (let i = 0; i < fish_days; i++) types.push('fish')
    for (let i = 0; i < vegetarian_days; i++) types.push('vegetarian')
    for (let i = 0; i < vegan_days; i++) types.push('vegan')
    const remaining = Math.max(0, meals_per_week - types.length)
    for (let i = 0; i < remaining; i++) types.push('any')
    shuffleArray(types)

    const days = [0, 1, 2, 3, 4, 5, 6]
    const selectedDays = chooseRandomDays(days, meals_per_week)

    const usedRecipeIds = new Set()
    const planMeals = []

    for (let i = 0; i < selectedDays.length; i++) {
      const dayIndex = selectedDays[i]
      const protein = types[i]
      const date = new Date(weekStartDate + 'T00:00:00')
      date.setDate(date.getDate() + dayIndex)

      let query = supabase
        .from('recipes')
        .select('id, title, servings_base')
        .eq('user_id', user.id)
        .eq('protein_type', protein)
        .eq('is_core', true)

      if (usedRecipeIds.size > 0) {
        query = query.not('id', 'in', Array.from(usedRecipeIds))
      }

      let { data: recipes } = await query.limit(20)

      if (!recipes || recipes.length === 0) {
        let fallbackQuery = supabase
          .from('recipes')
          .select('id, title, servings_base')
          .eq('user_id', user.id)
          .eq('protein_type', protein)

        if (usedRecipeIds.size > 0) {
          fallbackQuery = fallbackQuery.not('id', 'in', Array.from(usedRecipeIds))
        }
        const { data: fallbackRecipes } = await fallbackQuery.limit(20)

        if (fallbackRecipes && fallbackRecipes.length > 0) {
          recipes = fallbackRecipes
        } else if (protein !== 'any') {
          let anyQuery = supabase
            .from('recipes')
            .select('id, title, servings_base')
            .eq('user_id', user.id)

          if (usedRecipeIds.size > 0) {
            anyQuery = anyQuery.not('id', 'in', Array.from(usedRecipeIds))
          }
          const { data: anyRecipes } = await anyQuery.limit(20)
          if (anyRecipes && anyRecipes.length > 0) {
            recipes = anyRecipes
          }
        }
      }

      if (!recipes || recipes.length === 0) {
        return Response.json(
          { error: `Not enough recipes to fill ${protein} slot on day ${dayIndex}. Add more recipes.` },
          { status: 400 }
        )
      }

      const chosenRecipe = recipes[Math.floor(Math.random() * recipes.length)]
      usedRecipeIds.add(chosenRecipe.id)

      planMeals.push({
        day_of_week: dayIndex,
        meal_date: date.toISOString().slice(0, 10),
        recipe_id: chosenRecipe.id,
        servings: servings_default,
        is_locked: false,
      })
    }

    const { data: plan, error: planError } = await supabase
      .from('weekly_plans')
      .insert({
        user_id: user.id,
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
