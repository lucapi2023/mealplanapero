-- Add meal_schedule column to preferences
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS meal_schedule jsonb DEFAULT '{}';

-- Add meal_type column to plan_meals (lunch/dinner)
ALTER TABLE plan_meals ADD COLUMN IF NOT EXISTS meal_type text DEFAULT 'dinner';

-- Update unique constraint on plan_meals to include meal_type
-- Drop old constraint and create new one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_meals_plan_id_meal_date_key') THEN
    ALTER TABLE plan_meals DROP CONSTRAINT plan_meals_plan_id_meal_date_key;
  END IF;
END $$;

-- Only add if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_meals_plan_id_meal_date_meal_type_key') THEN
    ALTER TABLE plan_meals ADD CONSTRAINT plan_meals_plan_id_meal_date_meal_type_key UNIQUE (plan_id, meal_date, meal_type);
  END IF;
END $$;
