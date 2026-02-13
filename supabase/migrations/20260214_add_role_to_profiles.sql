-- Migration: Add role-based access control to profiles table

-- Create user role enum type
CREATE TYPE user_role AS ENUM ('customer', 'gestionnaire', 'admin', 'moderator');

-- Add role column to profiles table
ALTER TABLE profiles
  ADD COLUMN role user_role DEFAULT 'customer';

-- Update existing data: migrate is_admin to role
UPDATE profiles
SET role = CASE 
  WHEN is_admin = true THEN 'admin'::user_role
  ELSE 'customer'::user_role
END;

-- Make role NOT NULL after migration
ALTER TABLE profiles
  ALTER COLUMN role SET NOT NULL;

-- Optional: Keep is_admin for backwards compatibility, or drop it later
-- For now, we'll keep it and just use role for new features
-- To remove is_admin later, run: ALTER TABLE profiles DROP COLUMN is_admin;

-- Add index on role for better query performance
CREATE INDEX idx_profiles_role ON profiles(role);

-- Update RLS policies for products to use role instead of is_admin
DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

-- Update RLS policies for categories to use role instead of is_admin
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

-- Update RLS policies for order management
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire', 'moderator')));

-- Update RLS policies for color management
DROP POLICY IF EXISTS "Admins can insert product colors" ON product_colors;
CREATE POLICY "Admins can insert product colors"
  ON product_colors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

DROP POLICY IF EXISTS "Admins can update product colors" ON product_colors;
CREATE POLICY "Admins can update product colors"
  ON product_colors FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

DROP POLICY IF EXISTS "Admins can delete product colors" ON product_colors;
CREATE POLICY "Admins can delete product colors"
  ON product_colors FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));
