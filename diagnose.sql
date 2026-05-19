-- Run this in Supabase SQL Editor to diagnose the plan_meals RLS issue
SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'plan_meals';

-- Then add a permissive allow-all policy to unblock everything
CREATE POLICY "allow_all_plan_meals" ON plan_meals FOR ALL USING (true) WITH CHECK (true);

-- Verify
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'plan_meals';
