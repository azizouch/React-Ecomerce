import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton pattern to prevent multiple client instances
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

function getSupabaseAdminClient(): SupabaseClient | null {
  if (!supabaseAdminInstance && supabaseServiceRoleKey) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'supabase-admin-auth'
      }
    });
  }
  return supabaseAdminInstance;
}

export const supabase = getSupabaseClient();

// Export as lazy getter to prevent multiple client instances
export { getSupabaseAdminClient as supabaseAdmin };

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

// Minimal catalog helpers used by admin pages
export const catalog = {
  async getCategories() {
    const { data, error } = await supabase.from<Category>('categories').select('*').order('name');
    return { data, error };
  },

  async getProducts({ page = 1, limit = 10, search, categoryId }: { page?: number; limit?: number; search?: string; categoryId?: string | null }) {
    const offset = (page - 1) * limit;
    let query: any = supabase.from<Product>('products').select('*', { count: 'exact' });

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return { data, error, count };
  },

  async deleteProduct(id: string) {
    const { data, error } = await supabase.from('products').delete().eq('id', id);
    return { data, error };
  }
  ,
  async getProductById(id: string | undefined) {
    if (!id) return { data: null, error: null };
    const { data, error } = await supabase
      .from<Product>('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error };

    // load colors with images and sizes
    const { data: colorsData, error: colorsError } = await supabase
      .from<ProductColor>('product_colors')
      .select('*')
      .eq('product_id', id);

    const colorForms: ProductColor[] = [];
    if (colorsData) {
      for (const c of colorsData) {
        const { data: imagesData } = await supabase
          .from<ProductColorImage>('product_color_images')
          .select('*')
          .eq('color_id', c.id)
          .order('sort_order');

        const { data: sizesData } = await supabase
          .from<ProductColorSize>('product_color_sizes')
          .select('*')
          .eq('color_id', c.id);

        colorForms.push({ ...c, images: imagesData || [], sizes: sizesData || [] });
      }
    }

    return { data: { ...data, colors: colorForms } as any, error: null };
  }
};
