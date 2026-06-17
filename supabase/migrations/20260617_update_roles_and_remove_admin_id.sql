-- Migration: Update roles enum and remove is_admin column
BEGIN;

-- Drop all RLS policies that depend on is_admin column
-- Use dynamic SQL to drop all policies from all tables
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, policy_record.tablename);
    END LOOP;
END $$;

-- Now safely remove is_admin column
ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;

-- Drop default constraint before enum type change
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Convert column to text (don't drop the old enum yet)
ALTER TABLE profiles ALTER COLUMN role TYPE text;

-- Update existing role values: gestionnaire → vendor, moderator → admin
UPDATE profiles SET role = 'vendor' WHERE role = 'gestionnaire';
UPDATE profiles SET role = 'admin' WHERE role = 'moderator';

-- Drop old enum type
DROP TYPE IF EXISTS user_role;

-- Create new enum type
CREATE TYPE user_role AS ENUM ('customer','vendor','admin');

-- Convert column back to new enum type
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;

-- Re-add the default
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'customer'::user_role;

-- Recreate all RLS policies with the new role-based system
-- Policies for products table
CREATE POLICY "Only admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

-- Policies for categories table
CREATE POLICY "Only admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

-- Policies for orders table
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

-- Policies for order_items table
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')))));

-- Policies for product_color_images table
CREATE POLICY "Only admins can insert product color images"
  ON product_color_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can update product color images"
  ON product_color_images FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can delete product color images"
  ON product_color_images FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

-- Policies for product_color_sizes table
CREATE POLICY "Only admins can insert product color sizes"
  ON product_color_sizes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can update product color sizes"
  ON product_color_sizes FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

CREATE POLICY "Only admins can delete product color sizes"
  ON product_color_sizes FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'vendor')));

COMMIT;
