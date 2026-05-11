-- ============================================
-- Migration: Household system + Schema updates
-- Run this in Supabase SQL Editor
-- ============================================

-- Households
CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Household',
  created_at timestamptz DEFAULT now()
);

-- Household members
CREATE TABLE IF NOT EXISTS household_members (
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

-- Invites
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now()
);

-- Add household_id to existing tables
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES households(id);
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES households(id);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES households(id);
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES households(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES households(id);

-- Add meals_per_day to preferences (breakfast, lunch, dinner)
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS meals_per_day integer NOT NULL DEFAULT 1;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS plan_days integer NOT NULL DEFAULT 7;

-- Enable RLS on new tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- RLS: Households - members can read their own household
CREATE POLICY "members can read" ON households FOR SELECT
  USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "owner can update" ON households FOR UPDATE
  USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner'));

-- RLS: Household members - members can read, owner can manage
CREATE POLICY "members can read" ON household_members FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "owner can insert" ON household_members FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "owner can delete" ON household_members FOR DELETE
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner'));

-- RLS: Invites - members can read, owner can insert
CREATE POLICY "members can read invites" ON invites FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "owner can insert invites" ON invites FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Updated RLS policies for data tables (household-based access)

-- ingredients: household members can access
DROP POLICY IF EXISTS "owner access" ON ingredients;
CREATE POLICY "household access" ON ingredients FOR ALL
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- recipes: household members can access
DROP POLICY IF EXISTS "owner access" ON recipes;
CREATE POLICY "household access" ON recipes FOR ALL
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- recipe_ingredients: indirect household check
DROP POLICY IF EXISTS "owner access" ON recipe_ingredients;
CREATE POLICY "household access" ON recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())));

-- recipe_tags: indirect household check
DROP POLICY IF EXISTS "owner access" ON recipe_tags;
CREATE POLICY "household access" ON recipe_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())));

-- weekly_plans: household access
DROP POLICY IF EXISTS "owner access" ON weekly_plans;
CREATE POLICY "household access" ON weekly_plans FOR ALL
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- plan_meals: indirect household check
DROP POLICY IF EXISTS "owner access" ON plan_meals;
CREATE POLICY "household access" ON plan_meals FOR ALL
  USING (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())));

-- inventory: household access
DROP POLICY IF EXISTS "owner access" ON inventory;
CREATE POLICY "household access" ON inventory FOR ALL
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- preferences: household access (keep user-specific)
DROP POLICY IF EXISTS "owner access" ON preferences;
CREATE POLICY "household access" ON preferences FOR ALL
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
