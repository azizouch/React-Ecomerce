import { useState, useEffect } from 'react';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import { getPaginationParams, calculateTotalPages } from '../../lib/pagination';
import AdminSidebar from '../../components/AdminSidebar';
import AdminTopbar from '../../components/AdminTopbar';
import { useSidebar } from '../../contexts/SidebarContext';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import SoftCard from '../../components/ui/SoftCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const DEFAULT_ITEMS_PER_PAGE = 10;

interface OrderWithItems extends Order {
  order_items?: OrderItem[];
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export default function Orders() {
  const { isCollapsed } = useSidebar();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [totalOrders, setTotalOrders] = useState(0);

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

  useEffect(() => {
    loadFilteredOrders();
  }, [currentPage, itemsPerPage, searchQuery, selectedStatus]);

  const loadFilteredOrders = () => {
    // Filter orders based on search query and status
    const filteredOrders = orders.filter((order) => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });

    setTotalOrders(filteredOrders.length);
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

  // Filter orders based on search query and status
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Paginate filtered orders
  const totalPages = calculateTotalPages(filteredOrders.length, itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <AdminSidebar />
      <AdminTopbar />
      <div className="pt-16 lg:ml-64">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">Orders</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage customer orders and shipments</p>
          </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Left: Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="processing">Traitement</SelectItem>
                <SelectItem value="shipped">Expédié</SelectItem>
                <SelectItem value="delivered">Livré</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right: Items Per Page and Total */}
          <div className="flex gap-2 items-center text-sm whitespace-nowrap">
            <span className="text-gray-600 dark:text-gray-400">Afficher</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[60px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-gray-600 dark:text-gray-400">entrées</span>
            <span className="text-gray-600 dark:text-gray-400 font-medium">Total: {filteredOrders.length}</span>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader count={5} height="h-20" className="space-y-3" />
        ) : filteredOrders.length === 0 ? (
          <SoftCard>
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {searchQuery || selectedStatus !== 'all' ? 'No orders match your filters' : 'No orders found'}
              </p>
            </div>
          </SoftCard>
        ) : (
          <div className="space-y-3">
            {paginatedOrders.map((order) => (
              <SoftCard key={order.id} hoverable>
                <div
                  className="cursor-pointer py-1"
                  onClick={() =>
                    setExpandedOrder(expandedOrder === order.id ? null : order.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">Order ID</p>
                        <p className="font-semibold text-gray-900 dark:text-white mt-1">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">Customer</p>
                        <p className="font-semibold text-gray-900 dark:text-white mt-1">
                          {order.profiles?.full_name || order.profiles?.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">Total</p>
                        <p className="font-semibold text-blue-600 dark:text-blue-400 mt-1">
                          ${order.total_amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">Date</p>
                        <p className="font-semibold text-gray-900 dark:text-white mt-1 text-sm">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">Status</p>
                        <div className="mt-1">
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    </div>
                    <button className="ml-4 text-gray-400 hover:text-gray-600 transition">
                      {expandedOrder === order.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {expandedOrder !== order.id && (
                    <div className="mt-4 flex items-center space-x-4 pt-4 border-t border-gray-100">
                      <span className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Update Status:</span>
                      <Select
                        value={order.status}
                        onValueChange={(value) => {
                          handleStatusChange(order.id, value);
                        }}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {expandedOrder === order.id && order.order_items && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Order Items</h3>
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Update Status:</span>
                        <select
                          value={order.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(order.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {order.order_items.map((item, index) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 ${
                            index !== order.order_items!.length - 1 ? '' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                              {item.products?.image_url && (
                                <img
                                  src={item.products.image_url}
                                  alt={item.products.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.products?.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              ${item.price.toFixed(2)} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SoftCard>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredOrders.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </div>
        )}
        </div>        </div>      </div>
    </div>
  );
}
