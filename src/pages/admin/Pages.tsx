import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/card';
// SoftCard unused here
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
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

  
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <TableHead className="text-sm">Title</TableHead>
                <TableHead className="text-sm">Status</TableHead>
                <TableHead className="text-sm">SEO</TableHead>
                <TableHead className="text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((pg) => (
                <TableRow key={pg.id} className="border-b border-gray-100 dark:border-gray-700">
                  <TableCell className="text-sm">{pg.title}</TableCell>
                  <TableCell className="text-sm">{pg.status}</TableCell>
                  <TableCell className="text-sm">-</TableCell>
                  <TableCell className="text-sm">-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    
    </div>
  );
}
