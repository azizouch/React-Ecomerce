import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Users } from 'lucide-react';
import { Card } from '../../components/ui/card';

export default function VendorCustomers() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([{ id: 'CUST-101', name: 'Amira', email: 'amira@example.com' }]);

  useEffect(() => {
    // Load vendor customer list when ready
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Vendor Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Review customer activity and order history.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {customers.map((customer) => (
          <Card key={customer.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{customer.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
