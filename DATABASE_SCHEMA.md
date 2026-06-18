# E-Commerce Database Schema

## Overview
This document describes the complete database structure for the React E-Commerce application.

## Core Tables

### 1. **profiles** (User Profiles)
- `id` (UUID, PK) - References auth.users
- `email` (text) - User email
- `full_name` (text) - User full name
- `first_name` (text, nullable)
- `last_name` (text, nullable)
- `phone` (text, nullable)
- `address` (text, nullable)
- `city` (text, nullable)
- `role` (ENUM: 'customer', 'vendor', 'admin') - Default: 'customer'
- `created_at` (timestamp)

**Purpose:** Store user profile information and role-based access control

---

### 2. **categories** (Product Categories)
- `id` (UUID, PK)
- `name` (text, UNIQUE) - Category name
- `description` (text, nullable)
- `created_at` (timestamp)

**Purpose:** Organize products into categories

---

### 3. **products** (Main Products)
- `id` (UUID, PK)
- `name` (text) - Product name
- `description` (text) - Product description
- `price` (decimal 10,2) - Product price
- `image_url` (text, nullable) - Main product image
- `category_id` (UUID, FK → categories)
- `stock` (integer) - Stock quantity
- `size` (text, default: 'One Size')
- `created_at` (timestamp)

**Purpose:** Store main product information

---

### 4. **product_colors** (Product Color Variants)
- `id` (UUID, PK)
- `product_id` (UUID, FK → products)
- `name` (text) - Color name (e.g., "Red", "Blue")
- `hex_code` (text, nullable) - Hex color code
- `created_at` (timestamp)

**Purpose:** Store color variants for products

---

### 5. **product_color_images** (Images per Color)
- `id` (UUID, PK)
- `color_id` (UUID, FK → product_colors)
- `image_url` (text) - Image URL
- `sort_order` (integer) - Display order
- `created_at` (timestamp)

**Purpose:** Store multiple images per color variant

---

### 6. **product_color_sizes** (Size & Stock per Color)
- `id` (UUID, PK)
- `color_id` (UUID, FK → product_colors)
- `size` (text) - Size (e.g., "S", "M", "L", "XL")
- `stock` (integer) - Stock quantity
- `created_at` (timestamp)

**Purpose:** Track stock for each size-color combination

---

### 7. **product_images** (Additional Product Images)
- `id` (UUID, PK)
- `product_id` (UUID, FK → products)
- `image_url` (text)
- `color` (text, default: 'Default')
- `sort_order` (integer)
- `created_at` (timestamp)

**Purpose:** Store additional images for products

---

### 8. **cart_items** (Shopping Cart)
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `product_id` (UUID, FK → products)
- `quantity` (integer)
- `created_at` (timestamp)

**Purpose:** Store user shopping cart items

---

### 9. **orders** (Customer Orders)
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `total_amount` (decimal 10,2)
- `status` (text) - 'pending', 'processing', 'shipped', 'delivered'
- `created_at` (timestamp)

**Purpose:** Store customer orders

---

### 10. **order_items** (Items in an Order)
- `id` (UUID, PK)
- `order_id` (UUID, FK → orders)
- `product_id` (UUID, FK → products)
- `quantity` (integer)
- `price` (decimal 10,2) - Price at time of purchase
- `created_at` (timestamp)

**Purpose:** Store individual items in an order

---

## Admin/Management Tables

### 11. **payments** (Payment Records)
- `id` (text, PK)
- `order_id` (text, FK)
- `amount` (numeric)
- `method` (text) - Payment method
- `status` (text) - Payment status
- `metadata` (JSONB) - Additional payment data
- `created_at` (timestamp)

---

### 12. **refunds** (Refund Records)
- `id` (text, PK)
- `payment_id` (text, FK → payments)
- `amount` (numeric)
- `reason` (text)
- `created_at` (timestamp)

---

### 13. **coupons** (Discount Coupons)
- `id` (text, PK)
- `code` (text, UNIQUE)
- `discount_type` (text) - 'percentage' or 'fixed'
- `discount_value` (numeric)
- `usage_limit` (integer, nullable)
- `usage_count` (integer, default: 0)
- `expires_at` (timestamp, nullable)
- `active` (boolean, default: true)
- `created_at` (timestamp)

---

### 14. **shipping_zones** (Shipping Regions)
- `id` (text, PK)
- `name` (text)
- `methods` (JSONB) - Shipping methods
- `price_range` (text)
- `eta` (text) - Estimated time of arrival
- `enabled` (boolean, default: true)
- `created_at` (timestamp)

---

### 15. **inventory_transactions** (Stock History)
- `id` (text, PK)
- `product_id` (text)
- `delta` (integer) - Stock change
- `reason` (text)
- `created_by` (text)
- `created_at` (timestamp)

---

### 16. **pages** (CMS Pages)
- `id` (text, PK)
- `slug` (text, UNIQUE) - URL slug
- `title` (text)
- `content` (text)
- `seo_title` (text, nullable)
- `seo_description` (text, nullable)
- `status` (text, default: 'draft')
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

### 17. **settings** (Application Settings)
- `id` (serial, PK)
- `store_name` (text)
- `logo_url` (text)
- `currency` (text, default: 'USD')
- `tax_rate` (numeric, default: 0)
- `maintenance_mode` (boolean, default: false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

### 18. **activity_logs** (Admin Activity Logs)
- `id` (text, PK)
- `admin_name` (text)
- `action` (text)
- `ip_address` (text)
- `metadata` (JSONB)
- `created_at` (timestamp)

---

### 19. **reviews** (Product Reviews)
- `id` (text, PK)
- `product_id` (text)
- `rating` (integer) - 1-5 stars
- `text` (text)
- `status` (text, default: 'pending')
- `created_at` (timestamp)

---

### 20. **ticket_categories** (Support Ticket Categories)
- `id` (UUID, PK)
- `name` (text, UNIQUE)
- `description` (text, nullable)
- `default_admin_id` (UUID, FK → auth.users, nullable)
- `created_at` (timestamp)

---

### 21. **tickets** (Customer Support Tickets)
- `id` (UUID, PK)
- `customer_id` (UUID, FK → auth.users)
- `order_id` (UUID, FK → orders, nullable)
- `subject` (text)
- `category_id` (UUID, FK → ticket_categories, nullable)
- `priority` (text) - 'urgent', 'high', 'medium', 'low'
- `status` (text) - 'open', 'pending', 'resolved', 'closed'
- `assigned_admin_id` (UUID, FK → auth.users, nullable)
- `description` (text)
- `due_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `resolved_at` (timestamp, nullable)
- `closed_at` (timestamp, nullable)

---

### 22. **ticket_messages** (Ticket Messages)
- `id` (UUID, PK)
- `ticket_id` (UUID, FK → tickets)
- `sender_type` (text) - 'admin' or 'customer'
- `sender_id` (UUID, FK → auth.users)
- `message` (text)
- `attachment_url` (text, nullable)
- `created_at` (timestamp)

---

## Summary

**Total Tables:** 22 core tables  
**Features:**
- ✅ Product management with color & size variants
- ✅ Shopping cart & orders
- ✅ Payment & refund tracking
- ✅ Coupon/discount system
- ✅ Shipping management
- ✅ CMS pages & site settings
- ✅ Product reviews & ratings
- ✅ Support ticket system with categorization
- ✅ Admin activity logging
- ✅ Role-based access control (RBAC)
