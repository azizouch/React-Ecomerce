import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type VendorProfile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  created_at: string;
};

export function useVendors({ page, itemsPerPage, search, status }: { page: number; itemsPerPage: number; search: string; status: string }) {
  return useQuery<{ data: VendorProfile[]; count: number }, Error>({
    queryKey: ['vendors', { page, itemsPerPage, search, status }],
    queryFn: async () => {
      const offset = (page - 1) * itemsPerPage;
      const limit = itemsPerPage;

      let query: any = supabase
        .from('profiles')
        .select('id, email, full_name, phone, address, city, role, created_at', { count: 'exact' })
        .eq('role', 'vendor');

      if (search?.trim()) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      if (status === 'active') {
        query = query.or('phone.not.is.null,address.not.is.null,city.not.is.null');
      } else if (status === 'incomplete') {
        query = query.is('phone', null).is('address', null).is('city', null);
      } else if (status === 'pendingApproval') {
        query = query.is('full_name', null);
      }

      const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
    cacheTime: 1000 * 60 * 10,
  });
}

export function useVendorCounts() {
  return useQuery<{ total: number; active: number; pendingApproval: number; suspended: number }, Error>({
    queryKey: ['vendorCounts'],
    queryFn: async () => {
      const [totalRes, activeRes, pendingRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'vendor'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'vendor').or('phone.not.is.null,address.not.is.null,city.not.is.null'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'vendor').is('full_name', null),
      ]);

      if (totalRes.error) throw totalRes.error;
      if (activeRes.error) throw activeRes.error;
      if (pendingRes.error) throw pendingRes.error;

      return {
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        pendingApproval: pendingRes.count || 0,
        suspended: 0,
      };
    },
    staleTime: 1000 * 60 * 2,
    cacheTime: 1000 * 60 * 10,
  });
}
