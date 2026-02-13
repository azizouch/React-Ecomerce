-- Migration: Update product variant policies to use role instead of is_admin

-- Update product_colors policies
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

-- Update product_color_images policies
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

-- Update product_color_sizes policies
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
