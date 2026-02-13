-- Single migration file to add role-based access control
-- This file updates the existing schema to support roles (admin, gestionnaire, moderator, customer)
-- Run this entire file as one transaction in your Supabase SQL editor

BEGIN;

-- Create user role enum type
CREATE TYPE user_role AS ENUM ('customer', 'gestionnaire', 'admin', 'moderator');

-- Add role column to profiles table with default 'customer'
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

-- Add index on role for better query performance
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- UPDATE ALL RLS POLICIES
-- ============================================

-- Products table policies
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

-- Categories table policies
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

-- Product colors policies
DROP POLICY IF EXISTS "Only admins can insert product colors" ON product_colors;
CREATE POLICY "Only admins can insert product colors"
  ON product_colors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Only admins can update product colors" ON product_colors;
CREATE POLICY "Only admins can update product colors"
  ON product_colors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Only admins can delete product colors" ON product_colors;
CREATE POLICY "Only admins can delete product colors"
  ON product_colors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

-- Product color images policies
DROP POLICY IF EXISTS "Only admins can insert product images" ON product_color_images;
CREATE POLICY "Only admins can insert product images"
  ON product_color_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Only admins can update product images" ON product_color_images;
CREATE POLICY "Only admins can update product images"
  ON product_color_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Only admins can delete product images" ON product_color_images;
CREATE POLICY "Only admins can delete product images"
  ON product_color_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

-- Product color sizes policies
DROP POLICY IF EXISTS "Only admins can insert size variants" ON product_color_sizes;
CREATE POLICY "Only admins can insert size variants"
  ON product_color_sizes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Only admins can update size variants" ON product_color_sizes;
CREATE POLICY "Only admins can update size variants"
  ON product_color_sizes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Only admins can delete size variants" ON product_color_sizes;
CREATE POLICY "Only admins can delete size variants"
  ON product_color_sizes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

-- Orders policies
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire', 'moderator')));

-- ============================================
-- Note: Ticket and chat system policies are handled in their respective migration files
-- This ensures they run after their tables are created
-- ============================================

COMMIT;
