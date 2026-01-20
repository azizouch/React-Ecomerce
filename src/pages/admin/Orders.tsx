import { useState, useEffect } from 'react';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import AdminNav from '../../components/AdminNav';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface OrderWithItems extends Order {
  order_items?: OrderItem[];
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export default function Orders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [profiles, setProfiles] = useState<{[key: string]: {email: string, full_name: string | null}}>({});
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch orders with order items and products
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(*))
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch all profiles for mapping
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap: {[key: string]: {email: string, full_name: string | null}} = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.id] = {
          email: profile.email,
          full_name: profile.full_name
        };
      });

      setProfiles(profilesMap);

      // Combine orders with profile information
      const ordersWithProfiles = ordersData?.map(order => ({
        ...order,
        profiles: profilesMap[order.user_id] || { email: 'Unknown', full_name: null }
      })) || [];

      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNav currentPage="admin-orders" />

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Orders Management</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() =>
                    setExpandedOrder(expandedOrder === order.id ? null : order.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Order ID</p>
                        <p className="font-semibold text-gray-900">
                          #{order.id.slice(0, 8)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        <p className="font-semibold text-gray-900">
                          {order.profiles?.full_name || order.profiles?.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="font-semibold text-blue-600">
                          ${order.total_amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-semibold text-gray-900">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <button className="ml-4 text-gray-400 hover:text-gray-600">
                      {expandedOrder === order.id ? (
                        <ChevronUp className="w-6 h-6" />
                      ) : (
                        <ChevronDown className="w-6 h-6" />
                      )}
                    </button>
                  </div>

                  <div className="mt-4 flex items-center space-x-4">
                    <span className="text-sm text-gray-600">Status:</span>
                    <select
                      value={order.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-3 py-1 rounded-full text-sm font-medium border-0 focus:ring-2 focus:ring-blue-500 ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {expandedOrder === order.id && order.order_items && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
                    <div className="space-y-3">
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-white p-4 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                              {item.products?.image_url && (
                                <img
                                  src={item.products.image_url}
                                  alt={item.products.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.products?.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Quantity: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">
                              ${item.price.toFixed(2)} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
