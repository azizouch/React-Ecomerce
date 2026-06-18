CREATE TABLE IF NOT EXISTS "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "logo_url" TEXT NULL,
    "banner_url" TEXT NULL,
    "phone" VARCHAR(50) NULL,
    "email" VARCHAR(255) NULL,
    "address" TEXT NULL,
    "city" VARCHAR(100) NULL,
    "status" INTEGER NULL DEFAULT 1,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("owner_id"),
    UNIQUE ("slug"),
    FOREIGN KEY ("owner_id") REFERENCES "profiles"("id")
);

CREATE TABLE IF NOT EXISTS "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "image_url" TEXT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "category_id" UUID NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "price" DECIMAL(12, 2) NOT NULL,
    "stock" INTEGER NULL,
    "sku" VARCHAR(100) NULL,
    "is_active" BOOLEAN NULL DEFAULT TRUE,
    "is_featured" BOOLEAN NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("slug"),
    FOREIGN KEY ("store_id") REFERENCES "stores"("id"),
    FOREIGN KEY ("category_id") REFERENCES "categories"("id")
);

CREATE TABLE IF NOT EXISTS "product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
);

CREATE TABLE IF NOT EXISTS "customer_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" VARCHAR(100) NULL,
    "city" VARCHAR(100) NULL,
    "address" TEXT NOT NULL,
    "is_default" BOOLEAN NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
);

CREATE TABLE IF NOT EXISTS "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "subtotal" DECIMAL(12, 2) NOT NULL,
    "shipping_fee" DECIMAL(12, 2) NULL,
    "total" DECIMAL(12, 2) NOT NULL,
    "status" INTEGER NULL DEFAULT 0,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(50) NOT NULL,
    "city" VARCHAR(100) NULL,
    "address" TEXT NULL,
    "notes" TEXT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("order_number"),
    FOREIGN KEY ("customer_id") REFERENCES "profiles"("id"),
    FOREIGN KEY ("store_id") REFERENCES "stores"("id")
);

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12, 2) NOT NULL,
    "total_price" DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("order_id") REFERENCES "orders"("id"),
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
);

CREATE TABLE IF NOT EXISTS "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "rating" INTEGER NULL,
    "comment" TEXT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("product_id") REFERENCES "products"("id"),
    FOREIGN KEY ("customer_id") REFERENCES "profiles"("id")
);

CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "price" DECIMAL(12, 2) NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "product_limit" INTEGER NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "store_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" INTEGER NULL DEFAULT 0,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("store_id") REFERENCES "stores"("id"),
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
);

CREATE TABLE IF NOT EXISTS "wishlists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("user_id", "product_id"),
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id"),
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
);

CREATE TABLE IF NOT EXISTS "product_categories" (
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    PRIMARY KEY ("product_id", "category_id"),
    FOREIGN KEY ("product_id") REFERENCES "products"("id"),
    FOREIGN KEY ("category_id") REFERENCES "categories"("id")
);
