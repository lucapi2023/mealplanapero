-- ============================================
-- One-shot household setup function (bypasses ALL RLS)
-- Run this in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION setup_household()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  hh_id uuid;
  user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  -- 1. Check for pending invite
  SELECT household_id INTO hh_id FROM public.invites
    WHERE email = user_email AND status = 'pending' LIMIT 1;

  IF hh_id IS NOT NULL THEN
    -- Accept invite: join existing household
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (hh_id, auth.uid(), 'member');

    UPDATE public.invites SET status = 'accepted'
    WHERE household_id = hh_id AND email = user_email AND status = 'pending';

    INSERT INTO public.preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
    VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2)
    ON CONFLICT (user_id) DO UPDATE SET household_id = EXCLUDED.household_id;

    RETURN hh_id;
  END IF;

  -- 2. Check if user is already a member of a household
  SELECT household_id INTO hh_id FROM public.household_members WHERE user_id = auth.uid() LIMIT 1;

  IF hh_id IS NOT NULL THEN
    -- Ensure preferences reference this household
    INSERT INTO public.preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
    VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2)
    ON CONFLICT (user_id) DO UPDATE SET household_id = EXCLUDED.household_id;

    RETURN hh_id;
  END IF;

  -- 3. Check if user has preferences pointing to a household
  SELECT household_id INTO hh_id FROM public.preferences WHERE user_id = auth.uid();

  IF hh_id IS NOT NULL THEN
    -- Try to rejoin that household
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (hh_id, auth.uid(), 'member')
    ON CONFLICT (household_id, user_id) DO NOTHING;

    RETURN hh_id;
  END IF;

  -- 4. Fresh start: create a new household
  INSERT INTO public.households (name) VALUES ('My Household') RETURNING id INTO hh_id;

  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (hh_id, auth.uid(), 'owner');

  INSERT INTO public.preferences (user_id, household_id, meals_per_week, meals_per_day, plan_days, meat_days, fish_days, vegetarian_days, vegan_days, servings_default)
  VALUES (auth.uid(), hh_id, 7, 1, 7, 2, 1, 2, 0, 2);

  RETURN hh_id;
END;
$$;
