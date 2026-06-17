-- Consolidated database restore script for React-Ecomerce Supabase project
-- Run these statements in your Supabase SQL editor or PostgreSQL database.

-- NOTE: This script assumes the auth schema and auth.users table already exist.
-- If you are using Supabase, those are managed by Supabase.

BEGIN;

-- ==========================================================================
-- 1. Core ecommerce schema
-- ==========================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update categories"
  ON categories FOR UPDATE
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

CREATE POLICY "Only admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  image_url text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  stock integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update products"
  ON products FOR UPDATE
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

CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update orders"
  ON orders FOR UPDATE
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

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- ==========================================================================
-- 2. Admin and product variant tables
-- ==========================================================================

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  amount NUMERIC NOT NULL,
  method TEXT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shipping_zones table
CREATE TABLE IF NOT EXISTS shipping_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  methods JSONB,
  price_range TEXT,
  eta TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  delta INTEGER NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  store_name TEXT,
  logo_url TEXT,
  currency TEXT DEFAULT 'USD',
  tax_rate NUMERIC DEFAULT 0,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  admin_name TEXT,
  action TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  rating INTEGER,
  text TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

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

-- Create product_color_sizes table
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

-- ==========================================================================
-- 3. Chat, ticket, and admin enhancements
-- ==========================================================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'customer')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'shipping', 'refund', 'payment', 'product')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_admin_id ON conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canned_responses_admin_id ON canned_responses(admin_id);

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = admin_id);

CREATE POLICY "Admins can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = customer_id OR auth.uid() = admin_id);

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.customer_id = auth.uid() OR conversations.admin_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.customer_id = auth.uid() OR conversations.admin_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view their own canned responses"
  ON canned_responses FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can create canned responses"
  ON canned_responses FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update their own canned responses"
  ON canned_responses FOR UPDATE
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete their own canned responses"
  ON canned_responses FOR DELETE
  USING (auth.uid() = admin_id);

-- Create ticket categories and tickets schema
CREATE TABLE IF NOT EXISTS ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category_id UUID REFERENCES ticket_categories(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'customer')),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_admin_id ON tickets(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_due_at ON tickets(due_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at DESC);

CREATE POLICY "Anyone can view ticket categories"
  ON ticket_categories FOR SELECT
  USING (true);

CREATE POLICY "Customers can view their own tickets"
  ON tickets FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view messages in their tickets"
  ON ticket_messages FOR SELECT
  USING (ticket_id IN (SELECT id FROM tickets WHERE customer_id = auth.uid()));

-- Add assigned_admin_id column to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_admin_id ON conversations(assigned_admin_id);

CREATE POLICY "Admins can view assigned conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = assigned_admin_id);

-- ==========================================================================
-- 4. Role and profile enhancements
-- ==========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('customer', 'gestionnaire', 'admin', 'moderator');
  END IF;
END
$$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'customer';

UPDATE profiles
SET role = CASE 
  WHEN is_admin = true THEN 'admin'::user_role
  ELSE 'customer'::user_role
END
WHERE role IS NULL;

ALTER TABLE profiles
  ALTER COLUMN role SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Ticket policies requiring profiles.role
CREATE POLICY "Admins and gestionnaires can view all tickets"
  ON tickets FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

CREATE POLICY "Admins and gestionnaires can update tickets"
  ON tickets FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

CREATE POLICY "Admins and gestionnaires can view all ticket messages"
  ON ticket_messages FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire')));

CREATE POLICY "Users can create messages in assigned tickets"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND 
    (
      ticket_id IN (SELECT id FROM tickets WHERE customer_id = auth.uid()) OR
      ticket_id IN (SELECT id FROM tickets WHERE assigned_admin_id = auth.uid() OR (assigned_admin_id IS NULL AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire'))))
    )
  );

-- Update product policies to use role
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

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gestionnaire', 'moderator')));

-- Update admin product variant policies to use role
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

DROP POLICY IF EXISTS "Only admins can insert product images" ON product_images;
CREATE POLICY "Only admins can insert product images"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Only admins can update product images" ON product_images;
CREATE POLICY "Only admins can update product images"
  ON product_images FOR UPDATE
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

DROP POLICY IF EXISTS "Only admins can delete product images" ON product_images;
CREATE POLICY "Only admins can delete product images"
  ON product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gestionnaire')
    )
  );

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

-- Add profile fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

UPDATE profiles
SET first_name = split_part(COALESCE(full_name, ''), ' ', 1),
    last_name = split_part(COALESCE(full_name, ''), ' ', 2)
WHERE first_name IS NULL AND full_name IS NOT NULL;

-- ==========================================================================
-- 5. Seed data
-- ==========================================================================

INSERT INTO categories (name, description, created_at)
VALUES
  ('Electronics', 'Electronic devices and gadgets', NOW()),
  ('Clothing', 'Fashion and apparel', NOW()),
  ('Books', 'Books and publications', NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, created_at)
VALUES
  ('Home & Kitchen', 'Home appliances and kitchen essentials', NOW()),
  ('Sports & Outdoors', 'Sports equipment and outdoor gear', NOW()),
  ('Beauty & Personal Care', 'Cosmetics and personal care products', NOW()),
  ('Toys & Games', 'Toys, games, and entertainment', NOW()),
  ('Automotive', 'Car parts and automotive accessories', NOW()),
  ('Health & Household', 'Health products and household items', NOW()),
  ('Books & Media', 'Books, movies, and digital media', NOW()),
  ('Fashion', 'Fashion accessories and jewelry', NOW()),
  ('Electronics Accessories', 'Accessories for electronic devices', NOW()),
  ('Pet Supplies', 'Products for pets', NOW())
ON CONFLICT (name) DO NOTHING;

-- Example product inserts
INSERT INTO products (name, description, price, image_url, category_id, stock, created_at)
SELECT 'Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 199.99,
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', c.id, 50, NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT 'Smart Watch', 'Fitness tracking smartwatch with heart rate monitor', 299.99,
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', c.id, 30, NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT 'Cotton T-Shirt', 'Comfortable cotton t-shirt in various colors', 29.99,
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', c.id, 100, NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT 'Programming Book', 'Comprehensive guide to modern web development', 49.99,
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', c.id, 25, NOW()
FROM categories c WHERE c.name = 'Books'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, price, image_url, category_id, stock, created_at)
SELECT 'Bluetooth Speaker', 'Portable wireless speaker with excellent sound quality', 79.99,
  'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', c.id, 75, NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT 'Gaming Mouse', 'High-precision gaming mouse with RGB lighting', 49.99,
  'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400', c.id, 60, NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT '4K Monitor', '27-inch 4K UHD monitor for professional work', 399.99,
  'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', c.id, 25, NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT 'Wireless Charger', 'Fast wireless charging pad for smartphones', 29.99,
  'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400', c.id, 90, NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT 'Smartphone Case', 'Protective case for iPhone with card holder', 19.99,
  'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400', c.id, 120, NOW()
FROM categories c WHERE c.name = 'Electronics Accessories'
UNION ALL
SELECT 'USB-C Cable', 'Durable USB-C to USB-A charging cable', 12.99,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', c.id, 200, NOW()
FROM categories c WHERE c.name = 'Electronics Accessories'
UNION ALL
SELECT 'Laptop Stand', 'Adjustable aluminum laptop stand for ergonomics', 39.99,
  'https://images.unsplash.com/photo-1587614295999-6c1f4c928040?w=400', c.id, 45, NOW()
FROM categories c WHERE c.name = 'Electronics Accessories'
UNION ALL
SELECT 'Wireless Earbuds', 'True wireless earbuds with active noise cancellation', 149.99,
  'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', c.id, 80, NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT 'Jeans', 'Classic blue denim jeans for men', 59.99,
  'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', c.id, 85, NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT 'Summer Dress', 'Light and airy summer dress in floral print', 45.99,
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', c.id, 70, NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT 'Running Shoes', 'Comfortable running shoes with cushioning', 89.99,
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', c.id, 55, NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT 'Winter Jacket', 'Warm insulated winter jacket', 129.99,
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', c.id, 40, NOW()
FROM categories c WHERE c.name = 'Clothing'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, price, image_url, category_id, stock, created_at)
SELECT 'Gold Necklace', 'Elegant gold necklace with pendant', 199.99,
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400', c.id, 30, NOW()
FROM categories c WHERE c.name = 'Fashion'
UNION ALL
SELECT 'Leather Wallet', 'Genuine leather wallet with RFID protection', 39.99,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', c.id, 95, NOW()
FROM categories c WHERE c.name = 'Fashion'
UNION ALL
SELECT 'Sunglasses', 'UV protection sunglasses with polarized lenses', 79.99,
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', c.id, 65, NOW()
FROM categories c WHERE c.name = 'Fashion'
UNION ALL
SELECT 'Cookbook', 'Best-selling cookbook with easy recipes', 24.99,
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400', c.id, 110, NOW()
FROM categories c WHERE c.name = 'Books'
UNION ALL
SELECT 'Mystery Novel', 'Thrilling mystery novel by bestselling author', 16.99,
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', c.id, 140, NOW()
FROM categories c WHERE c.name = 'Books'
UNION ALL
SELECT 'Science Fiction Book', 'Epic space opera science fiction novel', 18.99,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', c.id, 90, NOW()
FROM categories c WHERE c.name = 'Books & Media'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, price, image_url, category_id, stock, created_at)
SELECT 'Coffee Maker', 'Programmable coffee maker with thermal carafe', 89.99,
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', c.id, 50, NOW()
FROM categories c WHERE c.name = 'Home & Kitchen'
UNION ALL
SELECT 'Blender', 'High-speed blender for smoothies and soups', 69.99,
  'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400', c.id, 60, NOW()
FROM categories c WHERE c.name = 'Home & Kitchen'
UNION ALL
SELECT 'Air Fryer', 'Healthy air fryer for oil-free cooking', 119.99,
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', c.id, 35, NOW()
FROM categories c WHERE c.name = 'Home & Kitchen'
UNION ALL
SELECT 'Yoga Mat', 'Non-slip yoga mat for exercise and meditation', 29.99,
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', c.id, 100, NOW()
FROM categories c WHERE c.name = 'Sports & Outdoors'
UNION ALL
SELECT 'Dumbbells Set', 'Adjustable dumbbells for home workouts', 149.99,
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', c.id, 40, NOW()
FROM categories c WHERE c.name = 'Sports & Outdoors'
UNION ALL
SELECT 'Camping Tent', 'Waterproof 4-person camping tent', 199.99,
  'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=400', c.id, 25, NOW()
FROM categories c WHERE c.name = 'Sports & Outdoors'
UNION ALL
SELECT 'Face Moisturizer', 'Hydrating face cream for all skin types', 34.99,
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', c.id, 80, NOW()
FROM categories c WHERE c.name = 'Beauty & Personal Care'
UNION ALL
SELECT 'Lipstick', 'Long-lasting matte lipstick in red shade', 19.99,
  'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400', c.id, 120, NOW()
FROM categories c WHERE c.name = 'Beauty & Personal Care'
UNION ALL
SELECT 'Shampoo', 'Sulfate-free shampoo for damaged hair', 14.99,
  'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400', c.id, 150, NOW()
FROM categories c WHERE c.name = 'Beauty & Personal Care'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, price, image_url, category_id, stock, created_at)
SELECT 'Board Game', 'Strategy board game for 2-4 players', 39.99,
  'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd60?w=400', c.id, 70, NOW()
FROM categories c WHERE c.name = 'Toys & Games'
UNION ALL
SELECT 'LEGO Set', 'Creative building blocks for kids', 49.99,
  'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400', c.id, 55, NOW()
FROM categories c WHERE c.name = 'Toys & Games'
UNION ALL
SELECT 'Puzzle', '1000-piece jigsaw puzzle of famous landmarks', 19.99,
  'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400', c.id, 85, NOW()
FROM categories c WHERE c.name = 'Toys & Games'
UNION ALL
SELECT 'Car Air Freshener', 'Long-lasting car air freshener with fresh scent', 7.99,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', c.id, 200, NOW()
FROM categories c WHERE c.name = 'Automotive'
UNION ALL
SELECT 'Phone Mount', 'Dashboard phone mount for navigation', 24.99,
  'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', c.id, 90, NOW()
FROM categories c WHERE c.name = 'Automotive'
UNION ALL
SELECT 'Tire Pressure Gauge', 'Digital tire pressure gauge for accurate readings', 12.99,
  'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', c.id, 110, NOW()
FROM categories c WHERE c.name = 'Automotive'
UNION ALL
SELECT 'Vitamins', 'Daily multivitamin supplement for adults', 29.99,
  'https://images.unsplash.com/photo-1550572017-edd951aa8ca9?w=400', c.id, 130, NOW()
FROM categories c WHERE c.name = 'Health & Household'
UNION ALL
SELECT 'First Aid Kit', 'Complete first aid kit for home emergencies', 39.99,
  'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400', c.id, 75, NOW()
FROM categories c WHERE c.name = 'Health & Household'
UNION ALL
SELECT 'Laundry Detergent', 'Eco-friendly laundry detergent pods', 16.99,
  'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400', c.id, 160, NOW()
FROM categories c WHERE c.name = 'Health & Household'
UNION ALL
SELECT 'Dog Food', 'Premium dry dog food for all breeds', 49.99,
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400', c.id, 95, NOW()
FROM categories c WHERE c.name = 'Pet Supplies'
UNION ALL
SELECT 'Cat Toy', 'Interactive cat toy with feathers', 9.99,
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400', c.id, 140, NOW()
FROM categories c WHERE c.name = 'Pet Supplies'
UNION ALL
SELECT 'Pet Bed', 'Comfortable orthopedic pet bed', 79.99,
  'https://images.unsplash.com/photo-1544568100-847a948585b9?w=400', c.id, 50, NOW()
FROM categories c WHERE c.name = 'Pet Supplies'
ON CONFLICT DO NOTHING;

-- Admin seed data
INSERT INTO settings (store_name, currency, tax_rate) VALUES ('My Store', 'USD', 0.0) ON CONFLICT DO NOTHING;

INSERT INTO pages (id, slug, title, content, status) VALUES
('p_about', 'about', 'About us', '<p>About content</p>', 'published'),
('p_contact', 'contact', 'Contact', '<p>Contact content</p>', 'published')
ON CONFLICT DO NOTHING;

INSERT INTO coupons (id, code, discount_type, discount_value, usage_limit, expires_at, active) VALUES
('c1', 'WELCOME10', 'percentage', 10, 100, '2026-12-31', true)
ON CONFLICT DO NOTHING;

INSERT INTO shipping_zones (id, name, methods, price_range, eta, enabled) VALUES
('z1', 'Europe', '["Standard","Express"]', '5.00-20.00', '2-7 days', true)
ON CONFLICT DO NOTHING;

-- Default ticket categories
INSERT INTO ticket_categories (name, description) VALUES
  ('Refund', 'Request for refund or money back'),
  ('Shipping', 'Issues related to order delivery'),
  ('Wrong Item', 'Received wrong or damaged item'),
  ('Payment Issue', 'Payment problems or charges'),
  ('Product Question', 'General questions about products'),
  ('Account Issue', 'Account-related problems'),
  ('Other', 'Other issues or inquiries')
ON CONFLICT (name) DO NOTHING;

COMMIT;

