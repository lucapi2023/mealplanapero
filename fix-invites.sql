-- Fix invites: recreate the owner-check function and invites policies
-- Run this in Supabase SQL Editor

-- Ensure is_household_owner function works
CREATE OR REPLACE FUNCTION is_household_owner(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members 
    WHERE user_id = auth.uid() AND household_id = hh_id AND role = 'owner'
  )
$$;

-- Drop and recreate invites policies
DROP POLICY IF EXISTS "inv_select" ON invites;
DROP POLICY IF EXISTS "inv_insert" ON invites;
DROP POLICY IF EXISTS "inv_delete" ON invites;
DROP POLICY IF EXISTS "inv_update" ON invites;
DROP POLICY IF EXISTS "members can read invites" ON invites;
DROP POLICY IF EXISTS "owner can insert invites" ON invites;
DROP POLICY IF EXISTS "owner can delete invites" ON invites;
DROP POLICY IF EXISTS "invited user can accept" ON invites;

CREATE POLICY "invites_select" ON invites FOR SELECT USING (
  household_id IN (SELECT get_my_household_ids())
  OR email = auth.jwt() ->> 'email'
);

CREATE POLICY "invites_insert" ON invites FOR INSERT WITH CHECK (
  is_household_owner(household_id)
);

CREATE POLICY "invites_delete" ON invites FOR DELETE USING (
  is_household_owner(household_id)
);

CREATE POLICY "invites_update" ON invites FOR UPDATE USING (
  email = auth.jwt() ->> 'email'
);

-- Verify the current user's household role (replace with your email)
SELECT u.email, hm.household_id, hm.role
FROM auth.users u
LEFT JOIN household_members hm ON hm.user_id = u.id
WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid());
