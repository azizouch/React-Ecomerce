-- Migration: Add missing tables and RLS policies for existing tables
-- This migration adds new tables your React app expects while keeping your existing structure

-- ============================================================================
-- 1. ADD MISSING TABLES
-- ============================================================================

-- Product Colors (for product variants)
CREATE TABLE "product_colors" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "product_id" UUID NOT NULL,
    "color_name" VARCHAR(100) NOT NULL,
    "color_code" VARCHAR(7),
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "product_colors" ADD PRIMARY KEY("id");
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_product_id_foreign" 
    FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

-- Product Color Sizes (variant size options)
CREATE TABLE "product_color_sizes" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "color_id" UUID NOT NULL,
    "size" VARCHAR(50) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "product_color_sizes" ADD PRIMARY KEY("id");
ALTER TABLE "product_color_sizes" ADD CONSTRAINT "product_color_sizes_color_id_foreign" 
    FOREIGN KEY("color_id") REFERENCES "product_colors"("id") ON DELETE CASCADE;

-- Product Color Images (variant images)
CREATE TABLE "product_color_images" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "color_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "product_color_images" ADD PRIMARY KEY("id");
ALTER TABLE "product_color_images" ADD CONSTRAINT "product_color_images_color_id_foreign" 
    FOREIGN KEY("color_id") REFERENCES "product_colors"("id") ON DELETE CASCADE;

-- Cart Items
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "color_id" UUID NULL,
    "size_id" UUID NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "cart_items" ADD PRIMARY KEY("id");
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_foreign" 
    FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_foreign" 
    FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_color_id_foreign" 
    FOREIGN KEY("color_id") REFERENCES "product_colors"("id") ON DELETE SET NULL;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_size_id_foreign" 
    FOREIGN KEY("size_id") REFERENCES "product_color_sizes"("id") ON DELETE SET NULL;

-- Payments
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "order_id" UUID NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "transaction_id" VARCHAR(255) NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "payments" ADD PRIMARY KEY("id");
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_foreign" 
    FOREIGN KEY("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;

-- Refunds
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "order_id" UUID NOT NULL,
    "payment_id" UUID NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "reason" TEXT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "refunds" ADD PRIMARY KEY("id");
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_foreign" 
    FOREIGN KEY("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_foreign" 
    FOREIGN KEY("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL;

-- Coupons
CREATE TABLE "coupons" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "discount_percentage" DECIMAL(5, 2) NULL,
    "discount_amount" DECIMAL(12, 2) NULL,
    "max_uses" INTEGER NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "coupons" ADD PRIMARY KEY("id");

-- Shipping Zones
CREATE TABLE "shipping_zones" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "name" VARCHAR(100) NOT NULL,
    "countries" TEXT NOT NULL,
    "shipping_cost" DECIMAL(12, 2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "shipping_zones" ADD PRIMARY KEY("id");

-- Inventory Transactions
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL DEFAULT UUID(),
    "product_id" UUID NOT NULL,
    "color_size_id" UUID NULL,
    "quantity_change" INTEGER NOT NULL,
    "transaction_type" VARCHAR(50) NOT NULL,
    "reference_id" UUID NULL,
    "notes" TEXT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "inventory_transactions" ADD PRIMARY KEY("id");
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_foreign" 
    FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

-- ============================================================================
-- 2. ENABLE RLS (Row Level Security) ON ALL TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_colors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_color_sizes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_color_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wishlists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shipping_zones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. CREATE RLS POLICIES
-- ============================================================================

-- Users table policies
CREATE POLICY "users_select_own" ON "users" FOR SELECT 
    USING (TRUE);

CREATE POLICY "users_update_own" ON "users" FOR UPDATE 
    USING (auth.uid()::text = id::text);

-- Categories (public read)
CREATE POLICY "categories_select_all" ON "categories" FOR SELECT 
    USING (TRUE);

-- Products (public read for active)
CREATE POLICY "products_select_active" ON "products" FOR SELECT 
    USING (is_active = TRUE);

-- Product Images (public read)
CREATE POLICY "product_images_select_all" ON "product_images" FOR SELECT 
    USING (TRUE);

-- Product Colors (public read)
CREATE POLICY "product_colors_select_all" ON "product_colors" FOR SELECT 
    USING (TRUE);

-- Product Color Sizes (public read)
CREATE POLICY "product_color_sizes_select_all" ON "product_color_sizes" FOR SELECT 
    USING (TRUE);

-- Product Color Images (public read)
CREATE POLICY "product_color_images_select_all" ON "product_color_images" FOR SELECT 
    USING (TRUE);

-- Stores (public read for active)
CREATE POLICY "stores_select_active" ON "stores" FOR SELECT 
    USING (status = 1 OR status::text = 'active');

CREATE POLICY "stores_update_owner" ON "stores" FOR UPDATE 
    USING (auth.uid()::text = owner_id::text);

-- Orders (select own)
CREATE POLICY "orders_select_own" ON "orders" FOR SELECT 
    USING (auth.uid()::text = customer_id::text);

CREATE POLICY "orders_vendor_select" ON "orders" FOR SELECT 
    USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = owner_id::text));

-- Order Items (view with orders)
CREATE POLICY "order_items_select" ON "order_items" FOR SELECT 
    USING (order_id IN (SELECT id FROM orders WHERE auth.uid()::text = customer_id::text));

-- Reviews (public read)
CREATE POLICY "reviews_select_all" ON "reviews" FOR SELECT 
    USING (TRUE);

CREATE POLICY "reviews_insert_auth" ON "reviews" FOR INSERT 
    WITH CHECK (auth.uid()::text = customer_id::text);

-- Cart Items (user own)
CREATE POLICY "cart_items_select_own" ON "cart_items" FOR SELECT 
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "cart_items_insert_own" ON "cart_items" FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "cart_items_update_own" ON "cart_items" FOR UPDATE 
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "cart_items_delete_own" ON "cart_items" FOR DELETE 
    USING (auth.uid()::text = user_id::text);

-- Customer Addresses (user own)
CREATE POLICY "customer_addresses_select_own" ON "customer_addresses" FOR SELECT 
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "customer_addresses_insert_own" ON "customer_addresses" FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "customer_addresses_update_own" ON "customer_addresses" FOR UPDATE 
    USING (auth.uid()::text = user_id::text);

-- Wishlists (user own)
CREATE POLICY "wishlists_select_own" ON "wishlists" FOR SELECT 
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "wishlists_insert_own" ON "wishlists" FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "wishlists_delete_own" ON "wishlists" FOR DELETE 
    USING (auth.uid()::text = user_id::text);

-- Notifications (user own)
CREATE POLICY "notifications_select_own" ON "notifications" FOR SELECT 
    USING (auth.uid()::text = user_id::text);

-- Payments (user own order)
CREATE POLICY "payments_select" ON "payments" FOR SELECT 
    USING (order_id IN (SELECT id FROM orders WHERE auth.uid()::text = customer_id::text));

-- Refunds (user own order)
CREATE POLICY "refunds_select" ON "refunds" FOR SELECT 
    USING (order_id IN (SELECT id FROM orders WHERE auth.uid()::text = customer_id::text));

-- Coupons (public read active)
CREATE POLICY "coupons_select_active" ON "coupons" FOR SELECT 
    USING (is_active = TRUE);

-- Shipping Zones (public read active)
CREATE POLICY "shipping_zones_select_active" ON "shipping_zones" FOR SELECT 
    USING (is_active = TRUE);

-- Inventory Transactions (select own products)
CREATE POLICY "inventory_transactions_select" ON "inventory_transactions" FOR SELECT 
    USING (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = owner_id::text)));

-- Subscription Plans (public read)
CREATE POLICY "subscription_plans_select_all" ON "subscription_plans" FOR SELECT 
    USING (TRUE);

-- Store Subscriptions (vendor view)
CREATE POLICY "store_subscriptions_select" ON "store_subscriptions" FOR SELECT 
    USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = owner_id::text));

-- Product Categories (public read)
CREATE POLICY "product_categories_select_all" ON "product_categories" FOR SELECT 
    USING (TRUE);
