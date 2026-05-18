-- STEP 1: Check what stale data exists for your user
-- Run this first, replace 'YOUR_EMAIL' with your login email
SELECT p.user_id, p.household_id, hm.role
FROM preferences p
LEFT JOIN household_members hm ON hm.user_id = p.user_id
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');

-- STEP 2: Drop and recreate the setup function (no search_path = '')
CREATE OR REPLACE FUNCTION setup_household()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hh_id uuid;
BEGIN
  -- Already a member? Just return existing household
  SELECT household_id INTO hh_id FROM household_members WHERE user_id = auth.uid() LIMIT 1;
  IF hh_id IS NOT NULL THEN
    INSERT INTO preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
    VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2)
    ON CONFLICT (user_id) DO UPDATE SET household_id = EXCLUDED.household_id;
    RETURN hh_id;
  END IF;

  -- Fresh start: create household + membership + preferences
  INSERT INTO households (name) VALUES ('My Household') RETURNING id INTO hh_id;
  INSERT INTO household_members (household_id, user_id, role) VALUES (hh_id, auth.uid(), 'owner');
  INSERT INTO preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
  VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2);
  RETURN hh_id;
END;
$$;

-- STEP 3: Clean up any orphaned households with no members
DELETE FROM households h
WHERE NOT EXISTS (SELECT 1 FROM household_members WHERE household_id = h.id);

-- STEP 4: Delete stale preferences that point to non-existent households
DELETE FROM preferences p
WHERE p.household_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM households h WHERE h.id = p.household_id);
