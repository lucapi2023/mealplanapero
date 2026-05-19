-- Quick RLS fix for plan_meals and weekly_plans
-- Run this in Supabase SQL Editor

-- Ensure the helper function works (no search_path restriction)
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid()
$$;

-- Drop and recreate plan_meals policy
DROP POLICY IF EXISTS "pm_access" ON plan_meals;
DROP POLICY IF EXISTS "household access" ON plan_meals;
DROP POLICY IF EXISTS "owner access" ON plan_meals;

CREATE POLICY "plan_meals_access" ON plan_meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plans wp
      WHERE wp.id = plan_meals.plan_id
      AND wp.household_id IN (SELECT get_my_household_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_plans wp
      WHERE wp.id = plan_meals.plan_id
      AND wp.household_id IN (SELECT get_my_household_ids())
    )
  );

-- Drop and recreate weekly_plans policy
DROP POLICY IF EXISTS "wp_access" ON weekly_plans;
DROP POLICY IF EXISTS "household access" ON weekly_plans;
DROP POLICY IF EXISTS "owner access" ON weekly_plans;

CREATE POLICY "weekly_plans_access" ON weekly_plans FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()))
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));
