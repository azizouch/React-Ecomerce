import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Settings } from 'lucide-react';
import SoftCard from '../../components/ui/SoftCard';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export default function VendorSettings() {
  const { t } = useLanguage();
  const [storeName, setStoreName] = useState('My Vendor Store');
  const [contactEmail, setContactEmail] = useState('vendor@example.com');

  useEffect(() => {
    // Load vendor store settings
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Vendor Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Update your store information and profile.</p>
        </div>
      </div>

      <SoftCard className="p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Store Name</label>
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Email</label>
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <Button onClick={() => {}} className="mt-4">Save Settings</Button>
        </div>
      </SoftCard>
    </div>
  );
}
