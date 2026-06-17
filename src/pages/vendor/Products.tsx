import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Package } from 'lucide-react';
import SoftCard from '../../components/ui/SoftCard';

export default function VendorProducts() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([{ id: '1', name: 'Product A', status: 'Active' }, { id: '2', name: 'Product B', status: 'Draft' }]);

  useEffect(() => {
    // Load vendor products when ready
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Vendor Products</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your store products here.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <SoftCard key={product.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{product.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status: {product.status}</p>
              </div>
            </div>
          </SoftCard>
        ))}
      </div>
    </div>
  );
}
