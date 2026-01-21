-- Seed additional categories
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

-- Seed additional products
INSERT INTO products (name, description, price, image_url, category_id, stock, created_at)
SELECT
  'Bluetooth Speaker',
  'Portable wireless speaker with excellent sound quality',
  79.99,
  'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
  c.id,
  75,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  'Gaming Mouse',
  'High-precision gaming mouse with RGB lighting',
  49.99,
  'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400',
  c.id,
  60,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  '4K Monitor',
  '27-inch 4K UHD monitor for professional work',
  399.99,
  'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
  c.id,
  25,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  'Wireless Charger',
  'Fast wireless charging pad for smartphones',
  29.99,
  'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
  c.id,
  90,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  'Smartphone Case',
  'Protective case for iPhone with card holder',
  19.99,
  'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400',
  c.id,
  120,
  NOW()
FROM categories c WHERE c.name = 'Electronics Accessories'
UNION ALL
SELECT
  'USB-C Cable',
  'Durable USB-C to USB-A charging cable',
  12.99,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  c.id,
  200,
  NOW()
FROM categories c WHERE c.name = 'Electronics Accessories'
UNION ALL
SELECT
  'Laptop Stand',
  'Adjustable aluminum laptop stand for ergonomics',
  39.99,
  'https://images.unsplash.com/photo-1587614295999-6c1f4c928040?w=400',
  c.id,
  45,
  NOW()
FROM categories c WHERE c.name = 'Electronics Accessories'
UNION ALL
SELECT
  'Wireless Earbuds',
  'True wireless earbuds with active noise cancellation',
  149.99,
  'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
  c.id,
  80,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  'Jeans',
  'Classic blue denim jeans for men',
  59.99,
  'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
  c.id,
  85,
  NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT
  'Summer Dress',
  'Light and airy summer dress in floral print',
  45.99,
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
  c.id,
  70,
  NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT
  'Running Shoes',
  'Comfortable running shoes with cushioning',
  89.99,
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
  c.id,
  55,
  NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT
  'Winter Jacket',
  'Warm insulated winter jacket',
  129.99,
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
  c.id,
  40,
  NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT
  'Gold Necklace',
  'Elegant gold necklace with pendant',
  199.99,
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
  c.id,
  30,
  NOW()
FROM categories c WHERE c.name = 'Fashion'
UNION ALL
SELECT
  'Leather Wallet',
  'Genuine leather wallet with RFID protection',
  39.99,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  c.id,
  95,
  NOW()
FROM categories c WHERE c.name = 'Fashion'
UNION ALL
SELECT
  'Sunglasses',
  'UV protection sunglasses with polarized lenses',
  79.99,
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
  c.id,
  65,
  NOW()
FROM categories c WHERE c.name = 'Fashion'
UNION ALL
SELECT
  'Cookbook',
  'Best-selling cookbook with easy recipes',
  24.99,
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
  c.id,
  110,
  NOW()
FROM categories c WHERE c.name = 'Books'
UNION ALL
SELECT
  'Mystery Novel',
  'Thrilling mystery novel by bestselling author',
  16.99,
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
  c.id,
  140,
  NOW()
FROM categories c WHERE c.name = 'Books'
UNION ALL
SELECT
  'Science Fiction Book',
  'Epic space opera science fiction novel',
  18.99,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  c.id,
  90,
  NOW()
FROM categories c WHERE c.name = 'Books & Media'
UNION ALL
SELECT
  'Coffee Maker',
  'Programmable coffee maker with thermal carafe',
  89.99,
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
  c.id,
  50,
  NOW()
FROM categories c WHERE c.name = 'Home & Kitchen'
UNION ALL
SELECT
  'Blender',
  'High-speed blender for smoothies and soups',
  69.99,
  'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400',
  c.id,
  60,
  NOW()
FROM categories c WHERE c.name = 'Home & Kitchen'
UNION ALL
SELECT
  'Air Fryer',
  'Healthy air fryer for oil-free cooking',
  119.99,
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  c.id,
  35,
  NOW()
FROM categories c WHERE c.name = 'Home & Kitchen'
UNION ALL
SELECT
  'Yoga Mat',
  'Non-slip yoga mat for exercise and meditation',
  29.99,
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
  c.id,
  100,
  NOW()
FROM categories c WHERE c.name = 'Sports & Outdoors'
UNION ALL
SELECT
  'Dumbbells Set',
  'Adjustable dumbbells for home workouts',
  149.99,
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  c.id,
  40,
  NOW()
FROM categories c WHERE c.name = 'Sports & Outdoors'
UNION ALL
SELECT
  'Camping Tent',
  'Waterproof 4-person camping tent',
  199.99,
  'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=400',
  c.id,
  25,
  NOW()
FROM categories c WHERE c.name = 'Sports & Outdoors'
UNION ALL
SELECT
  'Face Moisturizer',
  'Hydrating face cream for all skin types',
  34.99,
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
  c.id,
  80,
  NOW()
FROM categories c WHERE c.name = 'Beauty & Personal Care'
UNION ALL
SELECT
  'Lipstick',
  'Long-lasting matte lipstick in red shade',
  19.99,
  'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
  c.id,
  120,
  NOW()
FROM categories c WHERE c.name = 'Beauty & Personal Care'
UNION ALL
SELECT
  'Shampoo',
  'Sulfate-free shampoo for damaged hair',
  14.99,
  'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400',
  c.id,
  150,
  NOW()
FROM categories c WHERE c.name = 'Beauty & Personal Care'
UNION ALL
SELECT
  'Board Game',
  'Strategy board game for 2-4 players',
  39.99,
  'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd60?w=400',
  c.id,
  70,
  NOW()
FROM categories c WHERE c.name = 'Toys & Games'
UNION ALL
SELECT
  'LEGO Set',
  'Creative building blocks for kids',
  49.99,
  'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
  c.id,
  55,
  NOW()
FROM categories c WHERE c.name = 'Toys & Games'
UNION ALL
SELECT
  'Puzzle',
  '1000-piece jigsaw puzzle of famous landmarks',
  19.99,
  'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400',
  c.id,
  85,
  NOW()
FROM categories c WHERE c.name = 'Toys & Games'
UNION ALL
SELECT
  'Car Air Freshener',
  'Long-lasting car air freshener with fresh scent',
  7.99,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  c.id,
  200,
  NOW()
FROM categories c WHERE c.name = 'Automotive'
UNION ALL
SELECT
  'Phone Mount',
  'Dashboard phone mount for navigation',
  24.99,
  'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
  c.id,
  90,
  NOW()
FROM categories c WHERE c.name = 'Automotive'
UNION ALL
SELECT
  'Tire Pressure Gauge',
  'Digital tire pressure gauge for accurate readings',
  12.99,
  'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
  c.id,
  110,
  NOW()
FROM categories c WHERE c.name = 'Automotive'
UNION ALL
SELECT
  'Vitamins',
  'Daily multivitamin supplement for adults',
  29.99,
  'https://images.unsplash.com/photo-1550572017-edd951aa8ca9?w=400',
  c.id,
  130,
  NOW()
FROM categories c WHERE c.name = 'Health & Household'
UNION ALL
SELECT
  'First Aid Kit',
  'Complete first aid kit for home emergencies',
  39.99,
  'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
  c.id,
  75,
  NOW()
FROM categories c WHERE c.name = 'Health & Household'
UNION ALL
SELECT
  'Laundry Detergent',
  'Eco-friendly laundry detergent pods',
  16.99,
  'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400',
  c.id,
  160,
  NOW()
FROM categories c WHERE c.name = 'Health & Household'
UNION ALL
SELECT
  'Dog Food',
  'Premium dry dog food for all breeds',
  49.99,
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400',
  c.id,
  95,
  NOW()
FROM categories c WHERE c.name = 'Pet Supplies'
UNION ALL
SELECT
  'Cat Toy',
  'Interactive cat toy with feathers',
  9.99,
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
  c.id,
  140,
  NOW()
FROM categories c WHERE c.name = 'Pet Supplies'
UNION ALL
SELECT
  'Pet Bed',
  'Comfortable orthopedic pet bed',
  79.99,
  'https://images.unsplash.com/photo-1544568100-847a948585b9?w=400',
  c.id,
  50,
  NOW()
FROM categories c WHERE c.name = 'Pet Supplies'
UNION ALL
SELECT
  'Action Camera',
  '4K action camera for adventure sports',
  249.99,
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
  c.id,
  30,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  'Tablet',
  '10-inch tablet with high-resolution display',
  299.99,
  'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
  c.id,
  45,
  NOW()
FROM categories c WHERE c.name = 'Electronics'
UNION ALL
SELECT
  'Hoodie',
  'Comfortable cotton hoodie with kangaroo pocket',
  49.99,
  'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
  c.id,
  80,
  NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT
  'Sneakers',
  'Stylish sneakers for casual wear',
  79.99,
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
  c.id,
  65,
  NOW()
FROM categories c WHERE c.name = 'Clothing'
UNION ALL
SELECT
  'Backpack',
  'Durable waterproof backpack for travel',
  69.99,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  c.id,
  55,
  NOW()
FROM categories c WHERE c.name = 'Fashion'
UNION ALL
SELECT
  'Watch',
  'Classic analog watch with leather strap',
  149.99,
  'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400',
  c.id,
  40,
  NOW()
FROM categories c WHERE c.name = 'Fashion'
UNION ALL
SELECT
  'Biography Book',
  'Inspiring biography of a famous entrepreneur',
  22.99,
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
  c.id,
  75,
  NOW()
FROM categories c WHERE c.name = 'Books'
UNION ALL
SELECT
  'Cookware Set',
  'Non-stick cookware set with 10 pieces',
  99.99,
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  c.id,
  35,
  NOW()
FROM categories c WHERE c.name = 'Home & Kitchen'
UNION ALL
SELECT
  'Treadmill',
  'Electric treadmill for home workouts',
  799.99,
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  c.id,
  15,
  NOW()
FROM categories c WHERE c.name = 'Sports & Outdoors'
UNION ALL
SELECT
  'Skincare Set',
  'Complete skincare routine set',
  89.99,
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
  c.id,
  60,
  NOW()
FROM categories c WHERE c.name = 'Beauty & Personal Care'
UNION ALL
SELECT
  'Drone',
  'Beginner-friendly drone with camera',
  199.99,
  'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=400',
  c.id,
  25,
  NOW()
FROM categories c WHERE c.name = 'Toys & Games'
UNION ALL
SELECT
  'Car Vacuum',
  'Portable car vacuum cleaner',
  34.99,
  'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
  c.id,
  70,
  NOW()
FROM categories c WHERE c.name = 'Automotive'
UNION ALL
SELECT
  'Protein Powder',
  'Whey protein powder for muscle building',
  39.99,
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  c.id,
  85,
  NOW()
FROM categories c WHERE c.name = 'Health & Household'
UNION ALL
SELECT
  'Aquarium',
  '20-gallon freshwater aquarium kit',
  149.99,
  'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
  c.id,
  20,
  NOW()
FROM categories c WHERE c.name = 'Pet Supplies'
ON CONFLICT DO NOTHING;
