import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Missing auth' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oghvlybiodahacdlcxyg.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__4hZvrkyxAJ2-bVqw6nVWQ_nT5izI1R',
      {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    )

    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const userId = payload.sub
    if (!userId) {
      return Response.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const { planId, mealId, proteinType } = body

    const { data: pref } = await supabase
      .from('preferences')
      .select('household_id')
      .eq('user_id', userId)
      .maybeSingle()

    const householdId = pref?.household_id
    if (!householdId) {
      return Response.json({ error: 'No household found' }, { status: 400 })
    }

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
      .eq('household_id', householdId)
      .eq('protein_type', proteinType || 'any')

    if (usedIds.size > 0) {
      query = query.not('id', 'in', Array.from(usedIds))
    }

    let { data: recipes } = await query.limit(20)

    if (!recipes || recipes.length === 0) {
      let fallbackQuery = supabase
        .from('recipes')
        .select('id, title, servings_base')
        .eq('household_id', householdId)

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
