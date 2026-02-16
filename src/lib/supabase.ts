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
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  is_admin: boolean;
  role: 'customer' | 'gestionnaire' | 'admin' | 'moderator';
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

// ============================================================================
// CUSTOMER HELPERS - for customer pages (Home, Shop, ProductDetail, Cart, etc)
// ============================================================================
export const customerCatalog = {
  // Get all categories for customer pages
  async getCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    return { data, error };
  },

  // Get all categories (alternative call)
  async loadCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error loading categories:', error);
      return { data: null, error };
    }
  },

  // Get all products with pagination and filters
  async getProducts({ page = 1, limit = 10, search, categoryId }: { page?: number; limit?: number; search?: string; categoryId?: string | null }) {
    const offset = (page - 1) * limit;
    let query: any = supabase.from('products').select('*', { count: 'exact' });

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

  // Load products with advanced filtering (Search page)
  async loadProductsAdvanced({ 
    currentPage, 
    ITEMS_PER_PAGE, 
    selectedCategory, 
    searchQuery, 
    priceRange, 
    selectedSizes, 
    selectedColors, 
    sortBy 
  }: any) {
    try {
      const { getPaginationParams } = await import('../lib/pagination');
      const { offset, limit } = getPaginationParams(currentPage, ITEMS_PER_PAGE);

      let query: any = supabase
        .from('products')
        .select('*', { count: 'exact' });

      // Filter by category
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      // Filter by price range
      query = query
        .gte('price', priceRange[0])
        .lte('price', priceRange[1]);

      // Filter by search query
      if (searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      // If colors or sizes are selected, we need to filter differently
      if (selectedColors.length > 0 || selectedSizes.length > 0) {
        const { data: allProducts, error: productsError } = await query.order('name');
        if (productsError) throw productsError;

        let filteredProducts = allProducts || [];
        if (selectedColors.length > 0 || selectedSizes.length > 0) {
          const productIds = await customerCatalog.getProductIdsBySizesAndColors(selectedSizes, selectedColors);
          filteredProducts = filteredProducts.filter((p: Product) => productIds.has(p.id));
        }

        // Apply sorting
        const sortedProducts = customerCatalog.applySorting(filteredProducts, sortBy);
        
        // Apply pagination
        const paginatedProducts = sortedProducts.slice(offset, offset + limit);

        return { data: paginatedProducts, error: null, count: sortedProducts.length };
      } else {
        // Apply sorting
        switch (sortBy) {
          case 'price-low':
            query = query.order('price', { ascending: true });
            break;
          case 'price-high':
            query = query.order('price', { ascending: false });
            break;
          case 'name':
          default:
            query = query.order('name', { ascending: true });
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        return { data, error: null, count };
      }
    } catch (error) {
      console.error('Error loading products:', error);
      return { data: null, error, count: 0 };
    }
  },

  // Get available sizes and colors
  async loadAvailableSizesAndColors() {
    try {
      // Load available sizes
      const { data: sizesData, error: sizesError } = await supabase
        .from('product_color_sizes')
        .select('size')
        .neq('size', null);

      if (sizesError) throw sizesError;
      const uniqueSizes = [...new Set((sizesData || []).map(s => s.size))].sort();

      // Load available colors
      const { data: colorsData, error: colorsError } = await supabase
        .from('product_colors')
        .select('id, name, hex_code')
        .neq('hex_code', null);

      if (colorsError) throw colorsError;
      const uniqueColors = [...new Set((colorsData || []).map(c => JSON.stringify({ id: c.id, name: c.name, hex: c.hex_code })))].map(c => JSON.parse(c));

      return { sizes: uniqueSizes, colors: uniqueColors, error: null };
    } catch (error) {
      console.error('Error loading sizes and colors:', error);
      return { sizes: [], colors: [], error };
    }
  },

  // Get product IDs by sizes and colors
  async getProductIdsBySizesAndColors(selectedSizes: string[], selectedColors: string[]): Promise<Set<string>> {
    const productIds = new Set<string>();

    try {
      // Get product IDs that have the selected sizes
      if (selectedSizes.length > 0) {
        const { data: sizeResults } = await supabase
          .from('product_color_sizes')
          .select('product_colors!inner(product_id)')
          .in('size', selectedSizes);

        sizeResults?.forEach(result => {
          if (result.product_colors && typeof result.product_colors === 'object') {
            const pc = result.product_colors as any;
            if (pc.product_id) productIds.add(pc.product_id);
          }
        });
      }

      // Get product IDs that have the selected colors
      if (selectedColors.length > 0) {
        const { data: colorResults } = await supabase
          .from('product_colors')
          .select('product_id')
          .in('id', selectedColors);

        colorResults?.forEach(result => {
          if (result.product_id) productIds.add(result.product_id);
        });
      }
    } catch (error) {
      console.error('Error filtering by sizes and colors:', error);
    }

    return productIds;
  },

  // Apply sorting to products
  applySorting(products: Product[], sortBy: string) {
    switch (sortBy) {
      case 'price-low':
        return [...products].sort((a, b) => a.price - b.price);
      case 'price-high':
        return [...products].sort((a, b) => b.price - a.price);
      case 'name':
      default:
        return [...products].sort((a, b) => a.name.localeCompare(b.name));
    }
  },

  // Get single product with all details (colors, sizes, images)
  async getProductById(id: string | undefined) {
    if (!id) return { data: null, error: null };
    const { data, error } = await supabase
      .from('products')
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
  },

  // Get product colors for cart modal
  async getProductColors(productId: string) {
    const { data, error } = await supabase
      .from('product_colors')
      .select('*')
      .eq('product_id', productId)
      .order('id');
    return { data, error };
  },

  // Get available sizes for filtering
  async getAvailableSizes() {
    const { data, error } = await supabase
      .from('product_color_sizes')
      .select('size')
      .neq('size', null);
    return { data, error };
  },

  // Get available colors for filtering
  async getAvailableColors() {
    const { data, error } = await supabase
      .from('product_colors')
      .select('id, name, hex_code')
      .neq('hex_code', null);
    return { data, error };
  },

  // Load home page data
  async loadHomeData() {
    try {
      const [{ data: productsData, error: productsError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
        this.getProducts({ page: 1, limit: 1000 }),
        this.getCategories(),
      ]);

      if (productsError) throw productsError;
      if (categoriesError) throw categoriesError;

      return { 
        products: productsData || [], 
        categories: categoriesData || [],
        error: null 
      };
    } catch (error) {
      console.error('Error loading home data:', error);
      return { products: [], categories: [], error };
    }
  },

  // ========== CART FUNCTIONS ==========
  // Create order from cart
  async createOrder(userId: string, totalAmount: number, status: string = 'completed') {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        status: status,
      })
      .select()
      .single();

    return { data, error };
  },

  // Create order items
  async createOrderItems(orderItems: Array<{ order_id: string; product_id: string; quantity: number; price: number }>) {
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItems);

    return { data, error };
  },

  // Get orders for customer
  async getCustomerOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Get order details with items
  async getOrderDetails(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('id', orderId)
      .single();

    return { data, error };
  },
};

// For backward compatibility
export const catalog = customerCatalog;

// ============================================================================
// ADMIN HELPERS - for admin pages (Dashboard, Products, Categories, etc)
// ============================================================================
export const adminCatalog = {
  // ========== CATEGORIES ==========
  // Get all categories with pagination
  async getCategories({ page = 1, limit = 12, search = '' } = {}) {
    const offset = (page - 1) * limit;
    let query: any = supabase.from('categories').select('*', { count: 'exact' });

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query.order('name').range(offset, offset + limit - 1);
    return { data, error, count };
  },

  // Create new category
  async createCategory(name: string, description: string = '') {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, description }])
      .select()
      .single();

    return { data, error };
  },

  // Update category
  async updateCategory(id: string, name: string, description: string = '') {
    const { data, error } = await supabase
      .from('categories')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Delete category
  async deleteCategory(id: string) {
    const { data, error } = await supabase.from('categories').delete().eq('id', id);
    return { data, error };
  },

  // ========== PRODUCTS ==========
  // Get all products with pagination and filters
  async getProducts({ page = 1, limit = 10, search = '', categoryId = null } = {}) {
    const offset = (page - 1) * limit;
    let query: any = supabase.from('products').select('*', { count: 'exact' });

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    if (search.trim()) {
      const q = search.trim();
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return { data, error, count };
  },

  // Create new product
  async createProduct(productData: {
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    category_id?: string;
    stock?: number;
  }) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    return { data, error };
  },

  // Update product
  async updateProduct(id: string, productData: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Delete product
  async deleteProduct(id: string) {
    const { data, error } = await supabase.from('products').delete().eq('id', id);
    return { data, error };
  },

  // Get single product with all details (colors, sizes, images)
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
  },

  // ========== ORDERS ==========
  // Get all orders with pagination
  async getOrders({ page = 1, limit = 10, status = '' } = {}) {
    const offset = (page - 1) * limit;
    let query: any = supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_user_id_fkey (full_name, email)
      `, { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return { data, error, count };
  },

  // Get order details with items
  async getOrderDetails(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        ),
        profiles!orders_user_id_fkey (full_name, email)
      `)
      .eq('id', orderId)
      .single();

    return { data, error };
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    return { data, error };
  },

  // ========== INVENTORY ==========
  // Get inventory summary
  async getInventorySummary() {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, stock, price, category_id')
      .order('stock', { ascending: true });

    return { data, error };
  },

  // Update product stock
  async updateProductStock(productId: string, quantity: number) {
    const { data, error } = await supabase
      .from('products')
      .update({ stock: quantity })
      .eq('id', productId)
      .select()
      .single();

    return { data, error };
  },

  // ========== ANALYTICS / REPORTS ==========
  // Get dashboard statistics
  async getDashboardStats() {
    try {
      // Total orders
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Total revenue
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount');

      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // Total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      return {
        data: {
          totalOrders: totalOrders || 0,
          totalRevenue,
          totalProducts: totalProducts || 0,
          totalUsers: totalUsers || 0,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return { data: null, error };
    }
  },

  // Get recent orders
  async getRecentOrders(limit: number = 5) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_user_id_fkey (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  },

  // Get revenue by period
  async getRevenueByPeriod(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    return { data, error };
  },

  // ========== DISCOUNTS ==========
  // Get all discounts (assumes discount table exists)
  async getDiscounts({ page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from('discounts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error, count };
  },

  // Create discount
  async createDiscount(discountData: any) {
    const { data, error } = await supabase
      .from('discounts')
      .insert([discountData])
      .select()
      .single();

    return { data, error };
  },

  // Update discount
  async updateDiscount(id: string, discountData: any) {
    const { data, error } = await supabase
      .from('discounts')
      .update(discountData)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Delete discount
  async deleteDiscount(id: string) {
    const { data, error } = await supabase.from('discounts').delete().eq('id', id);
    return { data, error };
  },

  // ========== CHAT FUNCTIONS ==========
  // Get all conversations for admin with unread count
  async getConversations({ page = 1, limit = 10, status = 'all' } = {}) {
    const offset = (page - 1) * limit;
    let query: any = supabase
      .from('conversations')
      .select('*', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return { data: null, error, count: 0 };

    // Fetch customer profiles and assigned admin profiles for each conversation
    let conversationsWithProfiles = [];
    if (data) {
      for (const conv of data) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', conv.customer_id)
          .single();

        // Fetch assigned_admin profile if present
        let assignedAdminData = null;
        if (conv.assigned_admin_id) {
          const { data: adminData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', conv.assigned_admin_id)
            .single();
          assignedAdminData = adminData;
        }

        conversationsWithProfiles.push({
          ...conv,
          profiles: profileData,
          assigned_admin: assignedAdminData,
        });
      }
    }

    // Ensure unread_count reflects actual unseen messages in case messages were inserted
    // directly without updating the conversations.unread_count column.
    if (conversationsWithProfiles.length > 0) {
      for (const conv of conversationsWithProfiles) {
        try {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .is('is_seen', false);

          // supabase returns count as number | null
          // fallback to existing conv.unread_count if unavailable
          conv.unread_count = (count as number) || conv.unread_count || 0;
        } catch (e) {
          // ignore per-conversation errors and keep existing unread_count
          console.error('Error computing unread count for conversation', conv.id, e);
        }
      }
    }

    return { data: conversationsWithProfiles, error: null, count };
  },

  // Get unread conversations count
  async getUnreadConversationsCount() {
    const { count, error } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gt('unread_count', 0);

    return { count: count || 0, error };
  },

  // Get single conversation with messages
  async getConversation(conversationId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        customer_id,
        order_id,
        admin_id,
        assigned_admin_id,
        status,
        last_message,
        last_message_at,
        unread_count,
        created_at,
        updated_at
      `)
      .eq('id', conversationId)
      .single();

    if (error) return { data: null, error };

    // Get related data separately
    let conversationData: any = data;

    // Fetch customer profile
    const { data: customerData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', data?.customer_id)
      .single();

    // Fetch assigned admin profile
    let assignedAdminData = null;
    if (data?.assigned_admin_id) {
      const { data: admin } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', data.assigned_admin_id)
        .single();
      assignedAdminData = admin;
    }

    // Fetch related order
    let orderData = null;
    if (data?.order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('id', data.order_id)
        .single();
      orderData = order;
    }

    // Fetch messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    conversationData = {
      ...conversationData,
      profiles: customerData,
      assigned_admin: assignedAdminData,
      order: orderData,
      messages: messagesData || [],
    };

    return { data: conversationData, error: null };
  },

  // Create new conversation
  async createConversation(customerId: string, orderId?: string) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        customer_id: customerId,
        order_id: orderId || null,
        status: 'open',
      })
      .select()
      .single();

    return { data, error };
  },

  // Send message in conversation
  async sendMessage(conversationId: string, senderId: string, senderType: 'admin' | 'customer', message: string, attachmentUrl?: string) {
    try {
      // Insert message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          sender_type: senderType,
          message,
          attachment_url: attachmentUrl || null,
          is_seen: false,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Get current unread count
      const { data: convData } = await supabase
        .from('conversations')
        .select('unread_count')
        .eq('id', conversationId)
        .single();

      const currentUnreadCount = convData?.unread_count || 0;

      // Update conversation last message and increment unread count
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
          unread_count: currentUnreadCount + 1,
        })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      return { data: messageData, error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }
  },

  // Mark conversation as read. If userId is provided, mark messages not sent by that user as seen.
  async markConversationAsRead(conversationId: string, userId?: string) {
    try {
      // If userId is provided, mark messages in this conversation as seen for messages not sent by this user
      if (userId) {
        const { error: msgErr } = await supabase
          .from('messages')
          .update({ is_seen: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId);

        if (msgErr) throw msgErr;
      } else {
        // Fallback: mark all messages as seen
        const { error: msgErr } = await supabase
          .from('messages')
          .update({ is_seen: true })
          .eq('conversation_id', conversationId);

        if (msgErr) throw msgErr;
      }

      // Reset conversation-level unread counter
      const { data, error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      return { data, error };
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return { data: null, error };
    }
  },

  // Update conversation status
  async updateConversationStatus(conversationId: string, status: 'open' | 'pending' | 'resolved' | 'archived') {
    const { data, error } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', conversationId)
      .select()
      .single();

    return { data, error };
  },

  // Assign conversation to admin (legacy, use updateConversationAssignment for new code)
  async assignConversation(conversationId: string, adminId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .update({ assigned_admin_id: adminId })
      .eq('id', conversationId)
      .select()
      .single();

    return { data, error };
  },

  // Delete conversation
  async deleteConversation(conversationId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    return { data, error };
  },

  // Mark message as seen
  async markMessageAsSeen(messageId: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_seen: true })
      .eq('id', messageId);

    return { data, error };
  },

  // Get canned responses
  async getCannedResponses() {
    const { data, error } = await supabase
      .from('canned_responses')
      .select('*')
      .order('category');

    return { data, error };
  },

  // Create canned response
  async createCannedResponse(title: string, content: string, category: string = 'general', adminId: string) {
    const { data, error } = await supabase
      .from('canned_responses')
      .insert({
        admin_id: adminId,
        title,
        content,
        category,
      })
      .select()
      .single();

    return { data, error };
  },

  // Delete canned response
  async deleteCannedResponse(id: string) {
    const { data, error } = await supabase
      .from('canned_responses')
      .delete()
      .eq('id', id);

    return { data, error };
  },

  // Get list of admins and gestionnaires for chat modal (excluding current user)
  async getCustomersList(searchQuery?: string) {
    let query: any = supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('role', ['admin', 'gestionnaire'])
      .order('full_name');

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query.limit(20);
    return { data, error };
  },

  // Get list of admins for assignment dropdown
  async getAdminsList() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .order('full_name');

    return { data, error };
  },

  // Get orders by customer for "Start new conversation" modal
  async getOrdersByCustomer(customerId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    return { data, error };
  },

  // Create conversation with optional first message (for start new conversation)
  async createConversationWithMessage(
    customerId: string,
    adminId: string,
    orderId?: string,
    firstMessage?: string
  ) {
    try {
      // Create conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          customer_id: customerId,
          order_id: orderId || null,
          assigned_admin_id: adminId,
          admin_id: adminId,
          status: 'open',
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send first message if provided
      if (firstMessage && convData) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: convData.id,
            sender_id: adminId,
            sender_type: 'admin',
            message: firstMessage,
            is_seen: true,
          });

        if (msgError) throw msgError;

        // Update conversation last message
        await supabase
          .from('conversations')
          .update({
            last_message: firstMessage,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', convData.id);
      }

      return { data: convData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Reopen resolved conversation
  async reopenConversation(conversationId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .update({ status: 'open' })
      .eq('id', conversationId)
      .select()
      .single();

    return { data, error };
  },

  // Update conversation assignment
  async updateConversationAssignment(conversationId: string, adminId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .update({ assigned_admin_id: adminId })
      .eq('id', conversationId)
      .select()
      .single();

    return { data, error };
  },

  // Get real-time subscriptions helper (for setting up real-time listeners)
  subscribeToConversationMessages(conversationId: string, callback: (message: any) => void) {
    const channel = supabase.channel(`messages:${conversationId}`);

    // Listen for INSERT
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => callback(payload.new)
    );

    // Listen for UPDATE (e.g., is_seen changes)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => callback(payload.new)
    );

    const subscription = channel.subscribe();
    return subscription;
  },

  // Subscribe to all messages to stay updated on unread count
  subscribeToAllConversationMessages(callback: () => void) {
    const channel = supabase.channel('all_messages');

    // INSERT
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => callback()
    );

    // UPDATE (e.g., marking messages seen) - refresh counts
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages' },
      () => callback()
    );

    // Also listen for conversation updates so clients refresh when unread_count changes
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversations' },
      () => callback()
    );

    const subscription = channel.subscribe();
    return subscription;
  },

  // ========== TICKET SYSTEM FUNCTIONS ==========
  
  // Get all ticket categories
  async getTicketCategories() {
    const { data, error } = await supabase
      .from('ticket_categories')
      .select('*')
      .order('name');
    return { data, error };
  },

  // Create a new ticket (customer)
  async createTicket(customerId: string, subject: string, categoryId: string, description: string, orderId?: string) {
    try {
      // Get priority from category auto-mapping
      let priority = 'medium';
      const { data: category } = await supabase
        .from('ticket_categories')
        .select('name')
        .eq('id', categoryId)
        .single();

      if (category) {
        if (category.name === 'Refund' || category.name === 'Payment Issue') priority = 'high';
        if (category.name === 'Payment Issue') priority = 'urgent';
        if (category.name === 'Product Question') priority = 'low';
      }

      // Calculate due_at based on priority
      const now = new Date();
      let dueHours = 48;
      if (priority === 'urgent') dueHours = 4;
      else if (priority === 'high') dueHours = 12;
      else if (priority === 'medium') dueHours = 24;

      const due_at = new Date(now.getTime() + dueHours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          customer_id: customerId,
          order_id: orderId || null,
          subject,
          category_id: categoryId,
          priority,
          status: 'open',
          description,
          due_at,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get customer's tickets
  async getCustomerTickets(customerId: string, page = 1, limit = 10, status?: string) {
    const offset = (page - 1) * limit;
    let query: any = supabase
      .from('tickets')
      .select('*, category:category_id(name), assigned_admin:assigned_admin_id(full_name, email)', { count: 'exact' })
      .eq('customer_id', customerId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error, count };
  },

  // Get all tickets (admin)
  async getAdminTickets(page = 1, limit = 10, status?: string, categoryId?: string, priority?: string, assigned?: string) {
    const offset = (page - 1) * limit;
    let query: any = supabase
      .from('tickets')
      .select('*, customer:customer_id(full_name, email), category:category_id(name), assigned_admin:assigned_admin_id(full_name, email)', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    if (assigned === 'unassigned') {
      query = query.is('assigned_admin_id', null);
    } else if (assigned && assigned !== 'all') {
      query = query.eq('assigned_admin_id', assigned);
    }

    const { data, error, count } = await query
      .order('due_at', { ascending: true })
      .order('priority', { ascending: true })
      .range(offset, offset + limit - 1);

    return { data, error, count };
  },

  // Get single ticket with messages
  async getTicket(ticketId: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, category:category_id(name), customer:customer_id(full_name, email, phone), assigned_admin:assigned_admin_id(full_name, email), order:order_id(id, total_amount, status)')
      .eq('id', ticketId)
      .single();

    if (error) return { data: null, error };

    // Get messages
    const { data: messages } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    return { data: { ...data, messages: messages || [] }, error: null };
  },

  // Add message to ticket
  async addTicketMessage(ticketId: string, senderId: string, senderType: 'admin' | 'customer', message: string, attachmentUrl?: string) {
    try {
      const { data: messageData, error: msgError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: senderId,
          sender_type: senderType,
          message,
          attachment_url: attachmentUrl || null,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Update ticket updated_at
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      // If customer replied, set status to pending
      if (senderType === 'customer') {
        await supabase
          .from('tickets')
          .update({ status: 'pending' })
          .eq('id', ticketId);
      }

      return { data: messageData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update ticket status
  async updateTicketStatus(ticketId: string, status: 'open' | 'pending' | 'resolved' | 'closed') {
    try {
      const updates: any = { status };

      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      } else if (status === 'closed') {
        updates.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Assign ticket to admin
  async assignTicket(ticketId: string, adminId: string) {
    const { data, error } = await supabase
      .from('tickets')
      .update({ assigned_admin_id: adminId })
      .eq('id', ticketId)
      .select()
      .single();

    return { data, error };
  },

  // Update ticket priority
  async updateTicketPriority(ticketId: string, priority: 'urgent' | 'high' | 'medium' | 'low') {
    const { data, error } = await supabase
      .from('tickets')
      .update({ priority })
      .eq('id', ticketId)
      .select()
      .single();

    return { data, error };
  },

  // Reopen closed ticket
  async reopenTicket(ticketId: string) {
    const { data, error } = await supabase
      .from('tickets')
      .update({ status: 'open', closed_at: null })
      .eq('id', ticketId)
      .select()
      .single();

    return { data, error };
  },

  // Get tickets statistics for admin dashboard
  async getTicketsStats() {
    try {
      const now = new Date();

      // Total tickets
      const { count: totalTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      // Open tickets
      const { count: openTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Urgent tickets
      const { count: urgentTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'urgent')
        .in('status', ['open', 'pending']);

      // Overdue tickets (past due_at date)
      const { count: overdueTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .lt('due_at', now.toISOString())
        .in('status', ['open', 'pending']);

      return {
        data: {
          total: totalTickets || 0,
          open: openTickets || 0,
          urgent: urgentTickets || 0,
          overdue: overdueTickets || 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Real-time subscription for ticket messages
  subscribeToTicketMessages(ticketId: string, callback: (message: any) => void) {
    const subscription = supabase
      .channel(`ticket_messages:${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => callback(payload.new)
      )
      .subscribe();

    return subscription;
  },
};
