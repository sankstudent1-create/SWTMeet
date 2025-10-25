-- Migration: Add Unique Constraint to Prevent Duplicate Participants
-- Run this in Supabase SQL Editor
-- Date: 2025-10-26

-- Step 1: Clean up any existing duplicate participants
-- Keep only the most recent record for each user in each meeting
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY meeting_id, user_id 
            ORDER BY joined_at DESC
        ) as rn
    FROM public.participants
    WHERE user_id IS NOT NULL 
    AND status IN ('waiting', 'admitted')
)
DELETE FROM public.participants
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Add unique index to prevent future duplicates
-- Only one active participant per user per meeting (not left)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_participant 
ON public.participants(meeting_id, user_id) 
WHERE status IN ('waiting', 'admitted') AND user_id IS NOT NULL;

-- Verify the constraint was created
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'participants' 
AND indexname = 'idx_unique_active_participant';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Unique participant constraint added successfully!';
    RAISE NOTICE '✅ Duplicate participants cleaned up!';
    RAISE NOTICE '✅ Future duplicates will be prevented at database level!';
END $$;
