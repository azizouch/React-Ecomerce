import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import { Star, RefreshCw, Trash2 } from 'lucide-react';

const mockReviews = [
  { id: 'r1', product: 'Wireless Headphones', rating: 5, text: 'Excellent!', status: 'approved' },
  { id: 'r2', product: 'USB-C Cable', rating: 2, text: 'Poor build quality', status: 'pending' },
];

export default function AdminReviews() {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<any[]>(mockReviews);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, product_id, product_name:product(name), rating, text, status, created_at')
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data) setReviews(data as any[]);
      } catch (e) {
        console.error('Error loading reviews', e);
      }
    };
    load();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Star className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('reviews') || 'Reviews & Ratings'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {}}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh') || 'Refresh'}
          </Button>
        </div>
      </div>

        <div className="overflow-x-auto">
          <Table className="bg-transparent min-w-full">
            <TableHeader>
              <TableRow className="border-b border-gray-200 text-neutral-900 dark:border-gray-600" style={{ backgroundColor: 'hsl(210, 40%, 96.1%)' }}>
                <TableHead className="text-sm">Product</TableHead>
                <TableHead className="text-sm">Rating</TableHead>
                <TableHead className="text-sm">Review</TableHead>
                <TableHead className="text-sm">Status</TableHead>
                <TableHead className="text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((r) => (
                <TableRow key={r.id} className="border-b border-gray-100 dark:border-gray-700">
                  <TableCell className="text-sm">{r.product}</TableCell>
                  <TableCell className="text-sm">{r.rating} / 5</TableCell>
                  <TableCell className="text-sm">{r.text}</TableCell>
                  <TableCell className="text-sm">{r.status}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}
