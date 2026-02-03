import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role key for admin operations
// export const supabaseAdmin = supabaseServiceRoleKey
//   ? createClient(supabaseUrl, supabaseServiceRoleKey, {
//       auth: {
//         autoRefreshToken: false,
//         persistSession: false,
//         storageKey: 'supabase-admin-auth'
//       }
//     })
//   : null;

// Debug logging
// console.log('🔧 Supabase Configuration:');
// console.log('- URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
// console.log('- Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
// console.log('- Service Role Key:', supabaseServiceRoleKey ? '✅ Set' : '❌ Missing');
// console.log('- Admin Client:', supabaseAdmin ? '✅ Created' : '❌ Failed to create');

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  stock: number;
  size: string | null;
  // Optional relations
  images?: ProductImage[];
  colors?: ProductColor[];
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type ProductColor = {
  id: string;
  product_id: string;
  name: string;
  hex_code: string | null;
  created_at: string;
  images?: ProductColorImage[];
  sizes?: ProductColorSize[];
};

export type ProductColorImage = {
  id: string;
  color_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type ProductColorSize = {
  id: string;
  color_id: string;
  size: string;
  stock: number;
  created_at: string;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products?: Product;
};

export type Order = {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
  products?: Product;
};
