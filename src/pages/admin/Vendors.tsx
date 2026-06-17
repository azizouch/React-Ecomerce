import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { BarChart2, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function AdminVendors() {
  const { language } = useLanguage();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'vendor');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">{t(language, 'loading')}</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vendors Management</h1>
        <p className="text-gray-600">Manage all your vendors and their store statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Vendors</p>
              <p className="text-3xl font-bold mt-2">{vendors.length}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold mt-2">$0.00</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Active Stores</p>
              <p className="text-3xl font-bold mt-2">{vendors.length}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Analytics</p>
              <p className="text-3xl font-bold mt-2">View</p>
            </div>
            <BarChart2 className="w-10 h-10 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Vendor Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Joined</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {vendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="font-medium">{vendor.full_name}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                  {vendor.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                  {new Date(vendor.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button variant="outline" size="sm">View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vendors.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No vendors found
          </div>
        )}
      </div>
    </div>
  );
}
