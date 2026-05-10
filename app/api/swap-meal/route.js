import { createClient } from '@supabase/supabase-js'

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

    const body = await req.json()
    const { planId, mealId, proteinType } = body

    if (!planId || !mealId) {
      return Response.json({ error: 'Missing planId or mealId' }, { status: 400 })
    }

    const { data: existingMeals } = await supabase
      .from('plan_meals')
      .select('id, recipe_id')
      .eq('plan_id', planId)

    const usedIds = new Set()
    if (existingMeals) {
      existingMeals.forEach((m) => {
        if (m.id !== mealId && m.recipe_id) usedIds.add(m.recipe_id)
      })
    }

    let query = supabase
      .from('recipes')
      .select('id, title, servings_base')
      .eq('user_id', user.id)
      .eq('is_core', true)
      .eq('protein_type', proteinType || 'any')

    if (usedIds.size > 0) {
      query = query.not('id', 'in', Array.from(usedIds))
    }

    let { data: recipes } = await query.limit(20)

    if (!recipes || recipes.length === 0) {
      let fallbackQuery = supabase
        .from('recipes')
        .select('id, title, servings_base')
        .eq('user_id', user.id)

      if (usedIds.size > 0) {
        fallbackQuery = fallbackQuery.not('id', 'in', Array.from(usedIds))
      }
      const { data: fallback } = await fallbackQuery.limit(20)
      recipes = fallback
    }

    if (!recipes || recipes.length === 0) {
      return Response.json(
        { error: 'No alternative recipes available' },
        { status: 400 }
      )
    }

    const chosen = recipes[Math.floor(Math.random() * recipes.length)]

    const { error: updateError } = await supabase
      .from('plan_meals')
      .update({ recipe_id: chosen.id })
      .eq('id', mealId)

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    return Response.json({ success: true, newRecipeId: chosen.id, title: chosen.title })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
