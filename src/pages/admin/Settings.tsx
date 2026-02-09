import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SoftCard from '../../components/ui/SoftCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Settings as Cog, RefreshCw } from 'lucide-react';

export default function AdminSettings() {
  const { t } = useLanguage();
  const [storeName, setStoreName] = useState('My Store');
  const [settings, setSettings] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
        if (!error && data) {
          setSettings(data);
          if (data.store_name) setStoreName(data.store_name);
        }
      } catch (e) {
        console.error('Error loading settings', e);
      }
    };
    load();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Cog className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('settings') || 'Settings'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {}}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh') || 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SoftCard>
          <h3 className="text-lg font-semibold mb-3">Store Info</h3>
          <div className="space-y-3">
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
        </SoftCard>

        <SoftCard>
          <h3 className="text-lg font-semibold mb-3">Payment / Shipping</h3>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">Configure payment, tax and shipping settings.</div>
          </div>
        </SoftCard>
      </div>
    </div>
  );
}
