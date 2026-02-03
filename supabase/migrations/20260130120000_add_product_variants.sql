/*
  # Add Product Variants (Size and Multiple Images with Colors)

  1. New Tables
    - `product_images`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `image_url` (text)
      - `color` (text) - e.g., "Red", "Blue", "Black"
      - `sort_order` (integer) - for ordering images
      - `created_at` (timestamp)

  2. Alterations
    - Add `size` column to `products` table (text - e.g., "S,M,L,XL" or "One Size")

  3. Security
    - Enable RLS on product_images
    - Public read, admin write
*/

-- Add size column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS size text DEFAULT 'One Size';

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  color text DEFAULT 'Default',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are viewable by everyone"
  ON product_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert product images"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update product images"
  ON product_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete product images"
  ON product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images(product_id);
CREATE INDEX IF NOT EXISTS product_images_sort_order_idx ON product_images(sort_order);

-- Create product_colors table
CREATE TABLE IF NOT EXISTS product_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  hex_code text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product colors are viewable by everyone"
  ON product_colors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert product colors"
  ON product_colors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update product colors"
  ON product_colors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete product colors"
  ON product_colors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS product_colors_product_id_idx ON product_colors(product_id);

-- Create product_color_images table
CREATE TABLE IF NOT EXISTS product_color_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  color_id uuid REFERENCES product_colors(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_color_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product color images are viewable by everyone"
  ON product_color_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert product color images"
  ON product_color_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update product color images"
  ON product_color_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete product color images"
  ON product_color_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS product_color_images_color_id_idx ON product_color_images(color_id);

-- Create product_color_sizes table (size + stock per color)
CREATE TABLE IF NOT EXISTS product_color_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  color_id uuid REFERENCES product_colors(id) ON DELETE CASCADE NOT NULL,
  size text NOT NULL,
  stock integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_color_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product color sizes are viewable by everyone"
  ON product_color_sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert product color sizes"
  ON product_color_sizes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update product color sizes"
  ON product_color_sizes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete product color sizes"
  ON product_color_sizes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS product_color_sizes_color_id_idx ON product_color_sizes(color_id);
