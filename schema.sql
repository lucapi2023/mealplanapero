-- MealPlan Database Schema
-- Run this in Supabase SQL Editor after creating your project.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Household preferences (one row per user)
CREATE TABLE preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  meals_per_week integer NOT NULL DEFAULT 7,
  meat_days integer NOT NULL DEFAULT 2,
  fish_days integer NOT NULL DEFAULT 1,
  vegetarian_days integer NOT NULL DEFAULT 2,
  vegan_days integer NOT NULL DEFAULT 0,
  servings_default integer NOT NULL DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Ingredients master list
CREATE TABLE ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  category text,
  UNIQUE (user_id, name)
);

-- 3. Recipes
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  instructions text NOT NULL,
  prep_time_min integer,
  cook_time_min integer,
  total_time_min integer GENERATED ALWAYS AS (COALESCE(prep_time_min, 0) + COALESCE(cook_time_min, 0)) STORED,
  effort_level text CHECK (effort_level IN ('low','medium','high')),
  protein_type text NOT NULL CHECK (protein_type IN ('meat','fish','vegetarian','vegan','any')),
  servings_base integer NOT NULL DEFAULT 2,
  is_core boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Recipe <-> Ingredients join (per-serving amounts)
CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
  amount numeric NOT NULL,
  unit text NOT NULL
);

-- 5. Tags for recipes
CREATE TABLE recipe_tags (
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  tag text NOT NULL,
  PRIMARY KEY (recipe_id, tag)
);

-- 6. Weekly plans
CREATE TABLE weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  week_start_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

-- 7. Individual planned meals within a week
CREATE TABLE plan_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES weekly_plans(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_date date NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  servings integer NOT NULL DEFAULT 2,
  is_locked boolean DEFAULT false,
  UNIQUE (plan_id, meal_date)
);

-- 8. Pantry / Inventory
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity numeric DEFAULT 0,
  unit text,
  UNIQUE (user_id, ingredient_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "owner access" ON preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner access" ON ingredients FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner access" ON recipes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner access" ON recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "owner access" ON recipe_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "owner access" ON weekly_plans FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner access" ON plan_meals FOR ALL
  USING (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.user_id = auth.uid()));

CREATE POLICY "owner access" ON inventory FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
