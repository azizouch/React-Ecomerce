-- Seed example users for testing
-- IMPORTANT: Replace the UUIDs below with the actual user IDs from your Supabase Auth users
-- You can find the user IDs in Supabase Dashboard → Authentication → Users

-- Example Admin User Profile
-- Replace 'YOUR_ADMIN_USER_ID_HERE' with the actual UUID from auth.users for admin@example.com
INSERT INTO profiles (id, email, full_name, is_admin, created_at)
VALUES (
  'cae20ee3-15c0-493e-92ba-b93b382aad34', -- Get this from Supabase Auth → Users for admin@example.com
  'admin@example.com',
  'Admin User',
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Example Normal User Profile
-- Replace 'YOUR_NORMAL_USER_ID_HERE' with the actual UUID from auth.users for user@example.com
INSERT INTO profiles (id, email, full_name, is_admin, created_at)
VALUES (
  'cae20ee3-15c0-493e-92ba-b93b382aad34', -- Get this from Supabase Auth → Users for user@example.com
  'user@example.com',
  'Normal User',
  false,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Example Categories
INSERT INTO categories (name, description, created_at)
VALUES
  ('Electronics', 'Electronic devices and gadgets', NOW()),
  ('Clothing', 'Fashion and apparel', NOW()),
  ('Books', 'Books and publications', NOW())
ON CONFLICT (name) DO NOTHING;

-- Example Products
INSERT INTO products (name, description, price, image_url, category_id, stock, created_at)
SELECT
  'Wireless Headphones',
  'High-quality wireless headphones with noise cancellation',
  199.99,
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  c.id,
  50,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  'Smart Watch',
  'Fitness tracking smartwatch with heart rate monitor',
  299.99,
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
  c.id,
  30,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  'Cotton T-Shirt',
  'Comfortable cotton t-shirt in various colors',
  29.99,
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
  c.id,
  100,
  NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT
  'Programming Book',
  'Comprehensive guide to modern web development',
  49.99,
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
  c.id,
  25,
  NOW()
FROM categories c WHERE c.name = 'Books'
ON CONFLICT DO NOTHING;
