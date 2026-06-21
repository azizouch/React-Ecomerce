import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useProfile(id?: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('profiles').select('id, email, full_name, phone, address, city, role, created_at').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });
}
