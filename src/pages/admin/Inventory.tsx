import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Box, AlertTriangle, RefreshCw } from 'lucide-react';

const mockStock = [
  { id: 'p1', name: 'Wireless Headphones', stock: 12, low: false },
  { id: 'p2', name: 'USB-C Cable', stock: 2, low: true },
];

export default function AdminInventory() {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>(mockStock);

  useEffect(() => {
    const load = async () => {
      try {
        // Try to read stock from products table if available
        const { data, error } = await supabase
          .from('products')
          .select('id, name, stock')
          .order('name', { ascending: true })
          .limit(200);
        if (!error && data) {
          setItems(data as any[]);
          return;
        }
      } catch (e) {
        console.error('Error loading product stock', e);
      }
      // fallback: use mock
      setItems(mockStock);
    };
    load();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Box className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('inventory') || 'Inventory / Stock'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {}}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh') || 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input placeholder={t('searchStock') || 'Search products...'} />
          <div />
          <div />
          <div />
        </div>
      </div>

        <div className="overflow-x-auto">
          <Table className="bg-transparent min-w-full">
            <TableHeader>
              <TableRow className="border-b border-gray-200 text-neutral-900 dark:border-gray-600" style={{ backgroundColor: 'hsl(210, 40%, 96.1%)' }}>
                <TableHead className="text-sm">Product</TableHead>
                <TableHead className="text-sm">Stock</TableHead>
                <TableHead className="text-sm">Status</TableHead>
                <TableHead className="text-sm">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id} className="border-b border-gray-100 dark:border-gray-700">
                  <TableCell className="text-sm">{it.name}</TableCell>
                  <TableCell className="text-sm">{it.stock}</TableCell>
                  <TableCell className="text-sm">{it.low ? <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" />Low</span> : 'OK'}</TableCell>
                  <TableCell className="text-sm">-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

    </div>
  );
}
