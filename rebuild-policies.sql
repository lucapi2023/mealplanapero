-- ============================================
-- COMPLETE POLICY REBUILD - Run this in Supabase SQL Editor
-- Drops ALL existing policies and recreates them cleanly
-- ============================================

-- 1. Drop ALL possible policies on every table
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 2. Ensure the SECURITY DEFINER helper functions exist (no search_path restriction!)
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_household_owner(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM household_members WHERE user_id = auth.uid() AND household_id = hh_id AND role = 'owner')
$$;

CREATE OR REPLACE FUNCTION household_has_members(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM household_members WHERE household_id = hh_id)
$$;

-- 3. The main setup function (called via supabase.rpc)
CREATE OR REPLACE FUNCTION setup_household()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hh_id uuid;
BEGIN
  -- Already a member? Just fix preferences and return
  SELECT household_id INTO hh_id FROM household_members WHERE user_id = auth.uid() LIMIT 1;
  IF hh_id IS NOT NULL THEN
    INSERT INTO preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
    VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2)
    ON CONFLICT (user_id) DO UPDATE SET household_id = EXCLUDED.household_id;
    RETURN hh_id;
  END IF;

  -- Fresh start: create household, membership, preferences
  INSERT INTO households (name) VALUES ('My Household') RETURNING id INTO hh_id;
  INSERT INTO household_members (household_id, user_id, role) VALUES (hh_id, auth.uid(), 'owner');
  INSERT INTO preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
  VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2)
  ON CONFLICT (user_id) DO UPDATE SET household_id = EXCLUDED.household_id;
  RETURN hh_id;
END;
$$;

-- 4. Recreate ALL RLS policies
-- households
CREATE POLICY "households_select" ON households FOR SELECT USING (id IN (SELECT get_my_household_ids()));
CREATE POLICY "households_insert" ON households FOR INSERT WITH CHECK (true);
CREATE POLICY "households_update" ON households FOR UPDATE USING (is_household_owner(id));

-- household_members
CREATE POLICY "hm_select" ON household_members FOR SELECT USING (household_id IN (SELECT get_my_household_ids()));
CREATE POLICY "hm_insert" ON household_members FOR INSERT WITH CHECK (
  is_household_owner(household_id)
  OR NOT household_has_members(household_id)
  OR EXISTS (SELECT 1 FROM invites WHERE household_id = household_members.household_id AND email = auth.jwt() ->> 'email' AND status = 'pending')
);
CREATE POLICY "hm_delete" ON household_members FOR DELETE USING (is_household_owner(household_id));

-- invites
CREATE POLICY "inv_select" ON invites FOR SELECT USING (
  household_id IN (SELECT get_my_household_ids())
  OR email = auth.jwt() ->> 'email'
);
CREATE POLICY "inv_insert" ON invites FOR INSERT WITH CHECK (is_household_owner(household_id));
CREATE POLICY "inv_delete" ON invites FOR DELETE USING (is_household_owner(household_id));
CREATE POLICY "inv_update" ON invites FOR UPDATE USING (email = auth.jwt() ->> 'email');

-- ingredients
CREATE POLICY "ing_access" ON ingredients FOR ALL USING (household_id IN (SELECT get_my_household_ids())) WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- recipes
CREATE POLICY "rec_access" ON recipes FOR ALL USING (household_id IN (SELECT get_my_household_ids())) WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- recipe_ingredients
CREATE POLICY "ri_access" ON recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())));

-- recipe_tags
CREATE POLICY "rt_access" ON recipe_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.household_id IN (SELECT get_my_household_ids())));

-- weekly_plans
CREATE POLICY "wp_access" ON weekly_plans FOR ALL USING (household_id IN (SELECT get_my_household_ids())) WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- plan_meals
CREATE POLICY "pm_access" ON plan_meals FOR ALL
  USING (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.household_id IN (SELECT get_my_household_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = plan_meals.plan_id AND weekly_plans.household_id IN (SELECT get_my_household_ids())));

-- inventory
CREATE POLICY "inv_access" ON inventory FOR ALL USING (household_id IN (SELECT get_my_household_ids())) WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- preferences
CREATE POLICY "pref_access" ON preferences FOR ALL
  USING (user_id = auth.uid() OR household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (user_id = auth.uid() OR household_id IN (SELECT get_my_household_ids()));

-- 5. Clean up orphaned data
DELETE FROM households h WHERE NOT EXISTS (SELECT 1 FROM household_members WHERE household_id = h.id);
DELETE FROM preferences p WHERE p.household_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM households h WHERE h.id = p.household_id);

-- 6. Verify policies were created successfully
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;
