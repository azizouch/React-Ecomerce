import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/card';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import { BarChart2, Download, RefreshCw } from 'lucide-react';

export default function AdminReports() {
  const { t } = useLanguage();
  const [range] = useState({ from: '', to: '' });

  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // simple revenue summary
        const { data, error } = await supabase
          .from('orders')
          .select('total_amount')
          .limit(1000);
        if (!error && data) {
          const total = (data as any[]).reduce((acc, o) => acc + (o.total_amount || 0), 0);
          setSummary({ total });
        }
      } catch (e) {
        console.error('Error loading reports', e);
      }
    };
    load();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <BarChart2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('reports') || 'Reports & Analytics'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />{t('refresh') || 'Refresh'}</Button>
          <Button variant="ghost" size="sm"><Download className="mr-2 h-4 w-4" />{t('export') || 'Export'}</Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="text-sm text-gray-700 dark:text-gray-300">From</label>
          <input type="date" className="mt-1 block w-full rounded-md border px-3 py-2" />
        </div>
        <div className="col-span-1">
          <label className="text-sm text-gray-700 dark:text-gray-300">To</label>
          <input type="date" className="mt-1 block w-full rounded-md border px-3 py-2" />
        </div>
        <div className="col-span-1 flex items-end">
          <Button size="sm" variant="default">{t('apply') || 'Apply'}</Button>
        </div>
      </div>

      <SoftCard>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-2">Sales reports</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Placeholder for sales, revenue, product performance and customer growth charts and tables.</p>
        </div>
      </SoftCard>
    </div>
  );
}
