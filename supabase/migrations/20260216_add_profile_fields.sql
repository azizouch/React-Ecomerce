/*
  # Add additional profile fields

  1. Changes
    - Add `phone` field to profiles table
    - Add `address` field to profiles table
    - Add `city` field to profiles table
    - Add `first_name` field to profiles table
    - Add `last_name` field to profiles table
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Update full_name to match first_name and last_name for existing records (optional)
UPDATE profiles
SET first_name = split_part(COALESCE(full_name, ''), ' ', 1),
    last_name = split_part(COALESCE(full_name, ''), ' ', 2)
WHERE first_name IS NULL AND full_name IS NOT NULL;
