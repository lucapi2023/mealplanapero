-- ============================================
-- FIX: Infinite recursion + new user onboarding
-- Run this in Supabase SQL Editor
-- ============================================

-- SECURITY DEFINER functions (bypass RLS to avoid recursion)
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_household_owner(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members 
    WHERE user_id = auth.uid() AND household_id = hh_id AND role = 'owner'
  )
$$;

CREATE OR REPLACE FUNCTION household_has_members(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM household_members WHERE household_id = hh_id)
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "members can read" ON households;
DROP POLICY IF EXISTS "owner can update" ON households;
DROP POLICY IF EXISTS "members can read" ON household_members;
DROP POLICY IF EXISTS "owner can insert" ON household_members;
DROP POLICY IF EXISTS "owner can delete" ON household_members;
DROP POLICY IF EXISTS "members can read invites" ON invites;
DROP POLICY IF EXISTS "owner can insert invites" ON invites;
DROP POLICY IF EXISTS "household access" ON ingredients;
DROP POLICY IF EXISTS "household access" ON recipes;
DROP POLICY IF EXISTS "household access" ON recipe_ingredients;
DROP POLICY IF EXISTS "household access" ON recipe_tags;
DROP POLICY IF EXISTS "household access" ON weekly_plans;
DROP POLICY IF EXISTS "household access" ON plan_meals;
DROP POLICY IF EXISTS "household access" ON inventory;
DROP POLICY IF EXISTS "household access" ON preferences;
DROP POLICY IF EXISTS "owner access" ON ingredients;
DROP POLICY IF EXISTS "owner access" ON recipes;
DROP POLICY IF EXISTS "owner access" ON recipe_ingredients;
DROP POLICY IF EXISTS "owner access" ON recipe_tags;
DROP POLICY IF EXISTS "owner access" ON weekly_plans;
DROP POLICY IF EXISTS "owner access" ON plan_meals;
DROP POLICY IF EXISTS "owner access" ON inventory;
DROP POLICY IF EXISTS "owner access" ON preferences;

-- ============================================
-- Recreate ALL policies
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

-- Invites: members can read, invited user can see own, owner can manage
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
CREATE POLICY "household access" ON ingredients FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- Recipes
CREATE POLICY "household access" ON recipes FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- Recipe ingredients
CREATE POLICY "household access" ON recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())));

-- Recipe tags
CREATE POLICY "household access" ON recipe_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())));

-- Weekly plans
CREATE POLICY "household access" ON weekly_plans FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- Plan meals
CREATE POLICY "household access" ON plan_meals FOR ALL
  USING (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.household_id IN (SELECT get_my_household_ids())));

-- Inventory
CREATE POLICY "household access" ON inventory FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- Preferences: also allow access by user_id (for initial setup before household exists)
CREATE POLICY "household access" ON preferences FOR ALL
  USING (
    user_id = auth.uid()
    OR household_id IN (SELECT get_my_household_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR household_id IN (SELECT get_my_household_ids())
  );
