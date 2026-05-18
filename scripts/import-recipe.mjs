#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import readline from 'readline'

const SUPABASE_URL = 'https://oghvlybiodahacdlcxyg.supabase.co'
const SUPABASE_KEY = 'sb_publishable__4hZvrkyxAJ2-bVqw6nVWQ_nT5izI1R'

const RECIPES = [
  {
    title: 'Gnocchi alla sorrentina',
    protein_type: 'vegetarian',
    effort_level: 'medium',
    prep_time_min: 30,
    cook_time_min: 40,
    servings_base: 4,
    is_core: true,
    instructions: 'Lessare le patate per 30-40 min. Soffriggere aglio in olio, aggiungere passata, salare, unire basilico e cuocere 30 min. Setacciare farina a fontana, schiacciare le patate calde al centro, unire uovo e sale. Impastare velocemente. Formare bigoli di 2-3 cm, tagliare a gnocchi e rigare. Lessare in acqua salata: scolare appena salgono a galla. Condire a strati in pirofila: sugo, gnocchi, mozzarella a dadini, parmigiano. Gratinare in forno statico a 250°C in modalità grill per 5 minuti. Servire caldi.',
    ingredients: [
      { name: 'Patate rosse', amount: 250, unit: 'g' },
      { name: 'Farina 00', amount: 75, unit: 'g' },
      { name: 'Uova', amount: 0.25, unit: 'piece' },
      { name: 'Sale fino', amount: 1, unit: 'g' },
      { name: 'Semola', amount: 10, unit: 'g' },
      { name: 'Passata di pomodoro', amount: 150, unit: 'g' },
      { name: 'Basilico', amount: 1.5, unit: 'foglie' },
      { name: 'Aglio', amount: 0.25, unit: 'spicchio' },
      { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
      { name: 'Mozzarella', amount: 62.5, unit: 'g' },
      { name: 'Parmigiano Reggiano DOP', amount: 17.5, unit: 'g' },
    ],
  },
]

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer) }))
}

async function main() {
  const email = process.env.MEALPLAN_EMAIL || await prompt('Email: ')
  const password = process.env.MEALPLAN_PASSWORD || await prompt('Password: ')

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  console.log('\nSigning in...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) { console.error('Login failed:', authError.message); process.exit(1) }

  const user = authData.user
  console.log('Authenticated as:', user.email)

  const { data: pref } = await supabase.from('preferences').select('household_id').eq('user_id', user.id).maybeSingle()
  if (!pref?.household_id) { console.error('No household found. Set up household in the app first.'); process.exit(1) }
  const householdId = pref.household_id

  for (const recipe of RECIPES) {
    console.log(`\nInserting: ${recipe.title}...`)

    const { data: newRecipe, error: recErr } = await supabase.from('recipes').insert({
      user_id: user.id,
      household_id: householdId,
      title: recipe.title,
      protein_type: recipe.protein_type,
      effort_level: recipe.effort_level,
      prep_time_min: recipe.prep_time_min,
      cook_time_min: recipe.cook_time_min,
      servings_base: recipe.servings_base,
      is_core: recipe.is_core,
      instructions: recipe.instructions,
    }).select().single()

    if (recErr || !newRecipe) { console.error('  Recipe insert failed:', recErr?.message); continue }
    console.log(`  Recipe created (${newRecipe.id.slice(0, 8)}...)`)

    if (recipe.ingredients.length > 0) {
      const names = recipe.ingredients.map(i => i.name)
      const { data: existing } = await supabase.from('ingredients').select('id, name').in('name', names).eq('household_id', householdId)
      const existingMap = {}
      if (existing) existing.forEach(i => { existingMap[i.name] = i.id })

      const missingNames = names.filter(n => !existingMap[n])
      if (missingNames.length > 0) {
        const inserts = missingNames.map(name => ({ name, user_id: user.id, household_id: householdId }))
        const { data: created } = await supabase.from('ingredients').insert(inserts).select('id, name')
        if (created) created.forEach(i => { existingMap[i.name] = i.id })
        console.log(`  Created ${created?.length || 0} new ingredients`)
      }

      const riRows = recipe.ingredients
        .filter(i => existingMap[i.name])
        .map(i => ({ recipe_id: newRecipe.id, ingredient_id: existingMap[i.name], amount: i.amount, unit: i.unit }))
      if (riRows.length > 0) {
        const { error: riErr } = await supabase.from('recipe_ingredients').insert(riRows)
        if (riErr) console.error('  Ingredients insert failed:', riErr.message)
        else console.log(`  Added ${riRows.length} ingredients`)
      }
    }
  }

  await supabase.auth.signOut()
  console.log('\nDone!')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
