import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SoftCard from '../../components/ui/SoftCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import { Activity, RefreshCw } from 'lucide-react';

const mockLogs = [
  { id: 'l1', admin: 'Admin User', action: 'Updated product SKU', date: '2026-02-08 12:34', ip: '192.168.1.10' },
  { id: 'l2', admin: 'Moderator', action: 'Deleted review r2', date: '2026-02-07 09:10', ip: '192.168.1.11' },
];

export default function AdminActivityLogs() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>(mockLogs);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (!error && data) setLogs(data as any[]);
      } catch (e) {
        console.error('Error loading activity logs', e);
      }
    };
    load();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Activity className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('activityLogs') || 'Activity Logs'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />{t('refresh') || 'Refresh'}</Button>
        </div>
      </div>

      <SoftCard>
        <div className="overflow-x-auto">
          <Table className="bg-transparent min-w-full">
            <TableHeader>
              <TableRow className="border-b border-gray-200 text-neutral-900 dark:border-gray-600" style={{ backgroundColor: 'hsl(210, 40%, 96.1%)' }}>
                <TableHead className="text-sm">Admin</TableHead>
                <TableHead className="text-sm">Action</TableHead>
                <TableHead className="text-sm">Date & Time</TableHead>
                <TableHead className="text-sm">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} className="border-b border-gray-100 dark:border-gray-700">
                  <TableCell className="text-sm">{l.admin}</TableCell>
                  <TableCell className="text-sm">{l.action}</TableCell>
                  <TableCell className="text-sm">{l.date}</TableCell>
                  <TableCell className="text-sm">{l.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SoftCard>
    </div>
  );
}
