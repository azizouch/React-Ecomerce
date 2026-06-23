import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { CreditCard, RefreshCw, Download } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const mockTransactions = [
  { id: 'tx_1', date: '2026-02-01', amount: 129.99, method: 'Stripe', status: 'paid' },
  { id: 'tx_2', date: '2026-02-02', amount: 49.5, method: 'PayPal', status: 'failed' },
];

export default function AdminPayments() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<any[]>(mockTransactions);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('id, amount, method, status, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) setTransactions(data as any[]);
      } catch (e) {
        console.error('Error loading payments', e);
      }
    };
    load();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <CreditCard className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('payments') || 'Payments'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { /* refresh transactions */ }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh') || 'Refresh'}
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="mr-2 h-4 w-4" />
            {t('export') || 'Export'}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input placeholder={t('searchTransactions') || 'Search transactions...'} />
          <div />
          <div />
          <div />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="bg-transparent min-w-full">
          <TableHeader>
            <TableRow className="border-b border-gray-200 text-neutral-900 dark:border-gray-600" style={{ backgroundColor: 'hsl(210, 40%, 96.1%)' }}>
              <TableHead className="text-sm">ID</TableHead>
              <TableHead className="text-sm">Date</TableHead>
              <TableHead className="text-sm">Amount</TableHead>
              <TableHead className="text-sm">Method</TableHead>
              <TableHead className="text-sm">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="border-b border-gray-100 dark:border-gray-700">
                <TableCell className="text-sm">{tx.id}</TableCell>
                <TableCell className="text-sm">{tx.date}</TableCell>
                <TableCell className="text-sm">${tx.amount.toFixed(2)}</TableCell>
                <TableCell className="text-sm">{tx.method}</TableCell>
                <TableCell className="text-sm">{tx.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
