
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: 'customer' | 'vendor' | 'admin';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  stock: number;
  size: string | null;
  images?: ProductImage[];
  colors?: ProductColor[];
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface ProductColor {
  id: string;
  product_id: string;
  name: string;
  hex_code: string | null;
  created_at: string;
  images?: ProductColorImage[];
  sizes?: ProductColorSize[];
}

export interface ProductColorImage {
  id: string;
  color_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface ProductColorSize {
  id: string;
  color_id: string;
  size: string;
  stock: number;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: number | string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
  products?: Product;
}
