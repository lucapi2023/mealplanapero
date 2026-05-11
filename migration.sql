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

-- Add meals_per_day to preferences
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS meals_per_day integer NOT NULL DEFAULT 1;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS plan_days integer NOT NULL DEFAULT 7;

-- Enable RLS on new tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER functions (avoid RLS recursion)
-- ============================================

CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_household_owner(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members 
    WHERE user_id = auth.uid() AND household_id = hh_id AND role = 'owner'
  )
$$;

CREATE OR REPLACE FUNCTION household_has_members(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.household_members WHERE household_id = hh_id)
$$;

-- ============================================
-- RLS Policies
-- ============================================

-- Households: allow authenticated users to insert (for first household creation)
CREATE POLICY "members can read" ON households FOR SELECT
  USING (id IN (SELECT get_my_household_ids()));

CREATE POLICY "authenticated can insert" ON households FOR INSERT
  WITH CHECK (true);

CREATE POLICY "owner can update" ON households FOR UPDATE
  USING (is_household_owner(id));

-- Household members: allow insert for first member or by owner
CREATE POLICY "members can read" ON household_members FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "insert first member or owner" ON household_members FOR INSERT
  WITH CHECK (
    is_household_owner(household_id)
    OR NOT household_has_members(household_id)
  );

CREATE POLICY "owner can delete" ON household_members FOR DELETE
  USING (is_household_owner(household_id));

-- Invites: members can read, invited user sees own, owner manages
CREATE POLICY "members can read invites" ON invites FOR SELECT
  USING (
    household_id IN (SELECT get_my_household_ids())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "owner can insert invites" ON invites FOR INSERT
  WITH CHECK (is_household_owner(household_id));

CREATE POLICY "owner can delete invites" ON invites FOR DELETE
  USING (is_household_owner(household_id));

CREATE POLICY "invited user can accept" ON invites FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Ingredients
DROP POLICY IF EXISTS "owner access" ON ingredients;
CREATE POLICY "household access" ON ingredients FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- Recipes
DROP POLICY IF EXISTS "owner access" ON recipes;
CREATE POLICY "household access" ON recipes FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- Recipe ingredients
DROP POLICY IF EXISTS "owner access" ON recipe_ingredients;
CREATE POLICY "household access" ON recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())));

-- Recipe tags
DROP POLICY IF EXISTS "owner access" ON recipe_tags;
CREATE POLICY "household access" ON recipe_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())));

-- Weekly plans
DROP POLICY IF EXISTS "owner access" ON weekly_plans;
CREATE POLICY "household access" ON weekly_plans FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- Plan meals
DROP POLICY IF EXISTS "owner access" ON plan_meals;
CREATE POLICY "household access" ON plan_meals FOR ALL
  USING (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.household_id IN (SELECT get_my_household_ids())));

-- Inventory
DROP POLICY IF EXISTS "owner access" ON inventory;
CREATE POLICY "household access" ON inventory FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- Preferences: allow by user_id (for initial setup) or household access
DROP POLICY IF EXISTS "owner access" ON preferences;
CREATE POLICY "household access" ON preferences FOR ALL
  USING (
    user_id = auth.uid()
    OR household_id IN (SELECT get_my_household_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR household_id IN (SELECT get_my_household_ids())
  );
