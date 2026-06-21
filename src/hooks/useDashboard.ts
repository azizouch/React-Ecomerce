import { useQuery } from '@tanstack/react-query';
import { supabase, Order, Profile } from '../lib/supabase';

type Stats = {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalCategories: number;
  lowStockProducts: number;
  pendingOrders: number;
  totalVendors: number;
  activeVendors: number;
  trialVendors: number;
  expiredVendors: number;
};

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboardData'],
    // Avoid retries to surface errors quickly and return safe defaults on failure
    retry: false,
    onError: (err) => console.error('useDashboard error:', err),
    queryFn: async () => {
      try {
      // run counts in parallel
      const countsPromises = [
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock', 5),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ];

      const [prodCountRes, orderCountRes, custCountRes, catCountRes, lowStockRes, pendingOrdersRes] = await Promise.all(countsPromises);

      // Helper to surface Supabase errors with context
      const ensureNoError = (res: any, name: string) => {
        if (res && res.error) {
          console.error(`useDashboard: ${name} failed`, {
            message: res.error.message,
            details: res.error.details,
            hint: res.error.hint,
            status: res.error.status,
          });
          throw res.error;
        }
      };

      ensureNoError(prodCountRes, 'prodCountRes');
      ensureNoError(orderCountRes, 'orderCountRes');
      ensureNoError(custCountRes, 'custCountRes');
      ensureNoError(catCountRes, 'catCountRes');
      ensureNoError(lowStockRes, 'lowStockRes');
      ensureNoError(pendingOrdersRes, 'pendingOrdersRes');

      const now = new Date();
      const pastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);

      // Recent orders (profiles relation isn't directly available via PostgREST here)
      // so fetch recent orders and then batch-load profiles by user_id.
      const recentOrdersP = supabase
        .from<Order>('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // completed orders for revenue
      const completedOrdersP = supabase
        .from<Order>('orders')
        .select('total_amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', pastYear.toISOString());

      // vendor growth
      const vendorsDataP = supabase
        .from<Profile>('profiles')
        .select('id, created_at')
        .eq('role', 'vendor')
        .gte('created_at', pastYear.toISOString());

      // orders and products per month
      const ordersAllP = supabase.from('orders').select('id, created_at').gte('created_at', pastYear.toISOString());
      const productsAllP = supabase.from('products').select('id, created_at').gte('created_at', pastYear.toISOString());

      // top products by order_items
      const orderItemsP = supabase.from('order_items').select('product_id, quantity, products(id, name)');

      const [recentOrdersRes, completedOrdersRes, vendorsDataRes, ordersAllRes, productsAllRes, orderItemsRes] = await Promise.all([
        recentOrdersP,
        completedOrdersP,
        vendorsDataP,
        ordersAllP,
        productsAllP,
        orderItemsP,
      ]);

      ensureNoError(recentOrdersRes, 'recentOrdersRes');
      ensureNoError(completedOrdersRes, 'completedOrdersRes');
      ensureNoError(vendorsDataRes, 'vendorsDataRes');
      ensureNoError(ordersAllRes, 'ordersAllRes');
      ensureNoError(productsAllRes, 'productsAllRes');
      ensureNoError(orderItemsRes, 'orderItemsRes');

      // Attach profiles for recent orders by batching profile fetch
      let recentOrdersWithProfiles: any[] = [];
      try {
        const userIds = Array.from(new Set((recentOrdersRes.data || []).map((o: any) => o.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          if (profilesError) throw profilesError;
          const profilesMap: Record<string, any> = {};
          (profilesData || []).forEach((p: any) => { profilesMap[p.id] = p; });
          recentOrdersWithProfiles = (recentOrdersRes.data || []).map((o: any) => ({ ...o, profiles: profilesMap[o.user_id] }));
        } else {
          recentOrdersWithProfiles = recentOrdersRes.data || [];
        }
      } catch (err) {
        console.error('useDashboard: failed to fetch profiles for recent orders', err);
        recentOrdersWithProfiles = recentOrdersRes.data || [];
      }

      // compute revenue and monthly map
      let totalRevenue = 0;
      const monthlyMap: Record<string, number> = {};
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];

      (completedOrdersRes.data || []).forEach((o: any) => {
        totalRevenue += Number(o.total_amount) || 0;
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + Number(o.total_amount || 0);
      });

      const months: Array<{ date: string; amount: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        months.push({ date: monthNames[d.getMonth()], amount: Math.round((monthlyMap[key] || 0) / 1) });
      }

      // vendor series
      const vendorMap: Record<string, number> = {};
      (vendorsDataRes.data || []).forEach((v: any) => {
        const d = new Date(v.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        vendorMap[key] = (vendorMap[key] || 0) + 1;
      });
      const vendorSeries: Array<{ month: string; vendors: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        vendorSeries.push({ month: monthNames[d.getMonth()], vendors: vendorMap[key] || 0 });
      }

      const ordersMap: Record<string, number> = {};
      const productsMap: Record<string, number> = {};
      (ordersAllRes.data || []).forEach((o: any) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        ordersMap[key] = (ordersMap[key] || 0) + 1;
      });
      (productsAllRes.data || []).forEach((p: any) => {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        productsMap[key] = (productsMap[key] || 0) + 1;
      });
      const ordersProductsSeries: Array<{ month: string; orders: number; products: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        ordersProductsSeries.push({ month: monthNames[d.getMonth()], orders: ordersMap[key] || 0, products: productsMap[key] || 0 });
      }

      const productMap: Record<string, { name: string; qty: number }> = {};
      (orderItemsRes.data || []).forEach((it: any) => {
        const pid = it.product_id;
        const name = it.products?.name || 'Unknown';
        const qty = Number(it.quantity) || 0;
        if (!productMap[pid]) productMap[pid] = { name, qty };
        else productMap[pid].qty += qty;
      });

      const productSalesArr = Object.values(productMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)
        .map(p => ({ name: p.name, percentage: 0 }));
      const topQty = productSalesArr.length > 0 ? Math.max(...Object.values(productMap).map(p => p.qty)) : 0;
      productSalesArr.forEach((p, idx) => {
        const qty = Object.values(productMap)[idx]?.qty || 0;
        p.percentage = topQty > 0 ? Math.round((qty / topQty) * 100) : 0;
      });

      const delivered = (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered')).count || 0;
      const returned = (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'returned')).count || 0;
      const onDelivery = (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'on_delivery')).count || 0;
      const cancelled = (await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled')).count || 0;

      const stats: Stats = {
        totalProducts: prodCountRes.count || 0,
        totalOrders: orderCountRes.count || 0,
        totalRevenue: Math.round(totalRevenue),
        totalCustomers: custCountRes.count || 0,
        totalCategories: catCountRes.count || 0,
        lowStockProducts: lowStockRes.count || 0,
        pendingOrders: pendingOrdersRes.count || 0,
        totalVendors: (await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'vendor')).count || 0,
        activeVendors: (await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'vendor').or('phone.not.is.null,address.not.is.null,city.not.is.null')).count || 0,
        trialVendors: 0,
        expiredVendors: 0,
      };

      const shipmentStatus = [
        { status: 'Delivered', count: Number(delivered), color: '#10b981' },
        { status: 'Returned', count: Number(returned), color: '#ef4444' },
        { status: 'On Delivery', count: Number(onDelivery), color: '#3b82f6' },
        { status: 'Cancelled', count: Number(cancelled), color: '#f59e0b' },
      ];

      return {
        stats,
        vendorGrowthData: vendorSeries,
        ordersVsProductsData: ordersProductsSeries,
        recentOrders: recentOrdersWithProfiles || recentOrdersRes.data || [],
        monthlyRevenue: months,
        productSales: productSalesArr,
        shipmentStatus,
      };
    } catch (error) {
      console.error('useDashboard: failed to load dashboard data', error);
      // Return safe defaults so UI renders immediately while we investigate
      const safeStats: Stats = {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        totalCategories: 0,
        lowStockProducts: 0,
        pendingOrders: 0,
        totalVendors: 0,
        activeVendors: 0,
        trialVendors: 0,
        expiredVendors: 0,
      };

      return {
        stats: safeStats,
        vendorGrowthData: [],
        ordersVsProductsData: [],
        recentOrders: [],
        monthlyRevenue: [],
        productSales: [],
        shipmentStatus: [],
      };
    }
    },
    staleTime: 1000 * 60 * 2,
    cacheTime: 1000 * 60 * 10,
  });
}
