import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SoftCard from '../../components/ui/SoftCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import { FileText, Plus, RefreshCw } from 'lucide-react';

const mockPages = [
  { id: 'p_about', title: 'About us', status: 'published' },
  { id: 'p_privacy', title: 'Privacy policy', status: 'published' },
];

export default function AdminPages() {
  const { t } = useLanguage();
  const [pages, setPages] = useState<any[]>(mockPages);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('*')
          .order('title', { ascending: true });
        if (!error && data) setPages(data as any[]);
      } catch (e) {
        console.error('Error loading pages', e);
      }
    };
    load();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('pages') || 'Pages / CMS'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm"><Plus className="mr-2 h-4 w-4" />{t('createPage') || 'Create Page'}</Button>
          <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />{t('refresh') || 'Refresh'}</Button>
        </div>
      </div>

      <SoftCard className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <th className="px-6 py-3 text-left text-sm font-semibold dark:text-gray-200">Title</th>
                <th className="px-6 py-3 text-left text-sm font-semibold dark:text-gray-200">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold dark:text-gray-200">SEO</th>
                <th className="px-6 py-3 text-left text-sm font-semibold dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((pg) => (
                <tr key={pg.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-6 py-3 text-sm">{pg.title}</td>
                  <td className="px-6 py-3 text-sm">{pg.status}</td>
                  <td className="px-6 py-3 text-sm">-</td>
                  <td className="px-6 py-3 text-sm">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SoftCard>
    </div>
  );
}
