-- ============================================
-- COMPREHENSIVE FIX: Trigger + simplified function
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================

-- 1. Database trigger: auto-create household on every new signup
-- This runs with superuser privileges, cannot be blocked by RLS
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hh_id uuid;
  existing_hh uuid;
BEGIN
  -- Check if user already has a household via preferences
  SELECT household_id INTO existing_hh FROM preferences WHERE user_id = NEW.id;
  IF existing_hh IS NOT NULL THEN RETURN NEW; END IF;

  INSERT INTO households (name) VALUES ('My Household') RETURNING id INTO hh_id;
  INSERT INTO household_members (household_id, user_id, role) VALUES (hh_id, NEW.id, 'owner');
  INSERT INTO preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
  VALUES (NEW.id, hh_id, 7, 1, 7, 2, 1, 2, 0, 2);
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();

-- 2. Repair function for existing users (called via supabase.rpc)
CREATE OR REPLACE FUNCTION setup_household()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hh_id uuid;
  user_email text;
BEGIN
  -- Already a member?
  SELECT household_id INTO hh_id FROM household_members WHERE user_id = auth.uid() LIMIT 1;
  IF hh_id IS NOT NULL THEN
    -- Ensure preferences link to this household
    INSERT INTO preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
    VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2)
    ON CONFLICT (user_id) DO UPDATE SET household_id = EXCLUDED.household_id;
    RETURN hh_id;
  END IF;

  -- Check for pending invite
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  SELECT household_id INTO hh_id FROM invites
    WHERE email = user_email AND status = 'pending' LIMIT 1;

  IF hh_id IS NOT NULL THEN
    INSERT INTO household_members (household_id, user_id, role) VALUES (hh_id, auth.uid(), 'member')
    ON CONFLICT DO NOTHING;
    UPDATE invites SET status = 'accepted'
    WHERE household_id = hh_id AND email = user_email AND status = 'pending';
    INSERT INTO preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
    VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2)
    ON CONFLICT (user_id) DO UPDATE SET household_id = EXCLUDED.household_id;
    RETURN hh_id;
  END IF;

  -- Check stale preferences (has household_id but not a member)
  SELECT household_id INTO hh_id FROM preferences WHERE user_id = auth.uid();
  IF hh_id IS NOT NULL THEN
    INSERT INTO household_members (household_id, user_id, role) VALUES (hh_id, auth.uid(), 'member')
    ON CONFLICT DO NOTHING;
    RETURN hh_id;
  END IF;

  -- Fresh start: shouldn't happen if trigger works, but handle anyway
  INSERT INTO households (name) VALUES ('My Household') RETURNING id INTO hh_id;
  INSERT INTO household_members (household_id, user_id, role) VALUES (hh_id, auth.uid(), 'owner');
  INSERT INTO preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
  VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2);
  RETURN hh_id;
END;
$$;
