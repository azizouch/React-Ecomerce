import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import { supabase } from '../../lib/supabase';
import { calculateTotalPages, getPaginationParams } from '../../lib/pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../components/ui/select';
import { Plus, Eye, Edit, Phone, MapPin, UserCheck, Users, AlertTriangle, Search, Filter } from 'lucide-react';

interface VendorProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  created_at: string;
}

const emptyForm = {
  email: '',
  password: '',
  confirmPassword: '',
  full_name: '',
  phone: '',
  address: '',
  city: '',
};

export default function AdminVendors() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => ({ ...emptyForm }));
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'incomplete' | 'pendingApproval'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filteredCount, setFilteredCount] = useState(0);
  const [vendorCounts, setVendorCounts] = useState({ total: 0, active: 0, pendingApproval: 0, suspended: 0 });

  useEffect(() => {
    fetchVendors();
  }, [currentPage, itemsPerPage, debouncedSearchQuery, statusFilter]);

  useEffect(() => {
    fetchVendorStats();
  }, []);

  const fetchVendorStats = async () => {
    try {
      const totalRes = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'vendor');

      const activeRes = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'vendor')
        .or('phone.not.is.null,address.not.is.null,city.not.is.null');

      const pendingRes = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'vendor')
        .is('full_name', null);

      if (totalRes.error) throw totalRes.error;
      if (activeRes.error) throw activeRes.error;
      if (pendingRes.error) throw pendingRes.error;

      setVendorCounts({
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        pendingApproval: pendingRes.count || 0,
        suspended: 0,
      });
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { offset, limit } = getPaginationParams(currentPage, itemsPerPage);
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, phone, address, city, role, created_at', { count: 'exact' })
        .eq('role', 'vendor');

      if (debouncedSearchQuery.trim()) {
        query = query.or(`email.ilike.%${debouncedSearchQuery}%,full_name.ilike.%${debouncedSearchQuery}%`);
      }

      if (statusFilter === 'active') {
        query = query.or('phone.not.is.null,address.not.is.null,city.not.is.null');
      } else if (statusFilter === 'incomplete') {
        query = query.is('phone', null).is('address', null).is('city', null);
      } else if (statusFilter === 'pendingApproval') {
        query = query.is('full_name', null);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      setVendors(data || []);
      setFilteredCount(count || 0);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
      setFilteredCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!formData.email || !formData.password || !formData.full_name) {
      setErrorMessage('Email, full name, and password are required.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Unable to create vendor account.');
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        role: 'vendor',
      });

      if (profileError) throw profileError;

      setCreateOpen(false);
      setFormData({ ...emptyForm });
      await fetchVendors();
      fetchVendorStats();
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      setErrorMessage(error?.message || 'Failed to create vendor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">{t(language, 'loading')}</div>;
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Vendors Management</h1>
          <p className="text-xs sm:text-sm text-gray-600">Manage vendor accounts and keep the vendor directory up to date.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create New Vendor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Vendors</p>
              <p className="text-2xl font-bold mt-2">{vendorCounts.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Active Vendors</p>
              <p className="text-2xl font-bold mt-2">{vendorCounts.active}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Pending Approval</p>
              <p className="text-2xl font-bold mt-2">{vendorCounts.pendingApproval}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-purple-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Suspended Vendors</p>
              <p className="text-2xl font-bold mt-2">{vendorCounts.suspended}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500 opacity-80" />
          </div>
        </div>
      </div>
   
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <Input
            className="pl-10"
            placeholder="Search by vendor name or email"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as 'all' | 'active' | 'incomplete' | 'pendingApproval');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-56 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                <SelectItem value="active">Active profiles</SelectItem>
                <SelectItem value="incomplete">Incomplete profiles</SelectItem>
                <SelectItem value="pendingApproval">Pending approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md shadow overflow-x-auto">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-200 dark:bg-gray-800">
                <TableHead>Vendor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => {
                const hasProfile = Boolean(vendor.phone || vendor.address || vendor.city);
                return (
                  <TableRow key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableCell>
                      <div className="font-medium">{vendor.full_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{vendor.role}</div>
                    </TableCell>
                    <TableCell>{vendor.email}</TableCell>
                    <TableCell className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {vendor.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {vendor.phone}</div>}
                      {(vendor.address || vendor.city) && (
                        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {vendor.city ? `${vendor.city}${vendor.address ? ` · ${vendor.address}` : ''}` : vendor.address}</div>
                      )}
                      {!hasProfile && <div>No contact details</div>}
                    </TableCell>
                    <TableCell>{new Date(vendor.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={hasProfile ? 'active' : 'inactive'}
                        label={hasProfile ? 'Active' : 'Incomplete'}
                      />
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/vendors/${vendor.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/vendors/${vendor.id}/edit`);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {vendors.length === 0 && (
            <div className="p-8 text-center text-gray-500">No vendors found</div>
          )}
        </div>

        {calculateTotalPages(filteredCount, itemsPerPage) > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={calculateTotalPages(filteredCount, itemsPerPage)}
            totalItems={filteredCount}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Vendor</DialogTitle>
            <DialogDescription>
              Add a new vendor account and store its profile details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateVendor} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                <Input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/40 p-3 text-sm text-red-700 dark:text-red-200">
                {errorMessage}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Create Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
