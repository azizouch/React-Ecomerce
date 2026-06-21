import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
// language context not required in this page
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Search, Eye, Users, ShoppingCart, Activity, Plus, Store, MapPin, UploadCloud, ImagePlus } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../components/ui/select';
import Pagination from '../../components/ui/Pagination';

type StoreRow = {
  id: string;
  store_name: string | null;
  owner_id: string;
  vendor_name: string | null;
  vendor_email: string | null;
  products_count: number;
  orders_count: number;
  status: string;
  created_at: string;
};

export default function AdminStores() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [vendors, setVendors] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([]);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createForm, setCreateForm] = useState({
    name: '',
    owner_id: '',
    slug: '',
    description: '',
    logo_url: '',
    banner_url: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    status: 1,
  });
  const [activeTab, setActiveTab] = useState<'info' | 'contact'>('info');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStores();
    loadVendors();
  }, []);

  // Ensure vendors are fresh when opening the create modal
  useEffect(() => {
    if (createOpen) loadVendors();
  }, [createOpen]);
  
  // When vendors load, if there's at least one and no owner selected, preselect the first
  useEffect(() => {
    if (createOpen && vendors.length > 0 && !createForm.owner_id) {
      setCreateForm((f) => ({ ...f, owner_id: vendors[0].id }));
    }
  }, [vendors, createOpen]);

  const loadStores = async () => {
    try {
      setLoading(true);

      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, owner_id, name, slug, description, logo_url, banner_url, phone, email, address, city, status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (storesError) throw storesError;
      if (!storesData) {
        setStores([]);
        return;
      }

      const ownerIds = [...new Set(storesData.map((store) => store.owner_id))];
      const { data: ownersData, error: ownersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      if (ownersError) throw ownersError;

      const ownerMap = (ownersData || []).reduce((map: Record<string, { full_name: string | null; email: string | null }>, owner: any) => {
        map[owner.id] = { full_name: owner.full_name, email: owner.email };
        return map;
      }, {});

      const storesWithCounts = await Promise.all(
        (storesData || []).map(async (store) => {
          const [{ count: productCount }, { count: orderCount }] = await Promise.all([
            supabase
              .from('products')
              .select('id', { count: 'exact', head: true })
              .eq('store_id', store.id),
            supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('store_id', store.id),
          ]);

          return {
            id: store.id,
            owner_id: store.owner_id,
            store_name: store.name,
            slug: store.slug,
            description: store.description,
            logo_url: store.logo_url,
            banner_url: store.banner_url,
            phone: store.phone,
            email: store.email,
            address: store.address,
            city: store.city,
            vendor_name: ownerMap[store.owner_id]?.full_name || 'Vendor',
            vendor_email: ownerMap[store.owner_id]?.email || 'Unknown',
            products_count: productCount || 0,
            orders_count: orderCount || 0,
            status: store.status === 1 ? 'active' : 'inactive',
            created_at: store.created_at,
            updated_at: store.updated_at,
          };
        })
      );

      setStores(storesWithCounts);
    } catch (error) {
      console.error('Error loading stores:', error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'vendor').order('full_name', { ascending: true });
      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error('Failed to load vendors', err);
      setVendors([]);
    }
  };

  const handleLogoFileChange = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setCreateForm({ ...createForm, logo_url: result });
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFileChange = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBannerPreview(result);
      setCreateForm({ ...createForm, banner_url: result });
    };
    reader.readAsDataURL(file);
  };

  const filteredStores = stores.filter((store) => {
    const matchesText = (
      store.store_name?.toLowerCase().includes(filter.toLowerCase()) ||
      store.vendor_name?.toLowerCase().includes(filter.toLowerCase()) ||
      store.vendor_email?.toLowerCase().includes(filter.toLowerCase())
    );

    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'active' ? store.status === 'active' : store.status === 'inactive';

    return matchesText && matchesStatus;
  });

  const totalItems = filteredStores.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const displayedStores = filteredStores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, owner_id, slug, description, phone, email, address, city } = createForm;
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = 'Store name is required';
    if (!owner_id) newErrors.owner_id = 'Vendor owner is required';
    if (!slug) newErrors.slug = 'Slug is required';
    if (!description) newErrors.description = 'Description is required';
    if (!phone) newErrors.phone = 'Phone is required';
    if (!email) newErrors.email = 'Email is required';
    if (!address) newErrors.address = 'Address is required';
    if (!city) newErrors.city = 'City is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.address || newErrors.city) setActiveTab('contact');
      else setActiveTab('info');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: createForm.name,
        owner_id: createForm.owner_id,
        slug: createForm.slug || undefined,
        description: createForm.description || null,
        logo_url: createForm.logo_url || null,
        banner_url: createForm.banner_url || null,
        phone: createForm.phone || null,
        email: createForm.email || null,
        address: createForm.address || null,
        city: createForm.city || null,
        status: createForm.status ?? 1,
      };

      const { error } = await supabase.from('stores').insert(payload);
      if (error) throw error;
      setLogoPreview('');
      setBannerPreview('');
      setCreateOpen(false);
      setCreateForm({
        name: '',
        owner_id: '',
        slug: '',
        description: '',
        logo_url: '',
        banner_url: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        status: 1,
      });
      setErrors({});
      await loadStores();
      await loadVendors();
    } catch (err) {
      console.error('Failed to create store', err);
      setErrors({ form: 'Failed to create store' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Stores</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">View all vendor stores and their sales performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* <Button variant="outline" size="sm" onClick={loadStores}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button> */}
          <Button onClick={() => setCreateOpen(true)} className="ml-2">
            <Plus className="mr-2 h-4 w-4" />
            Create New Store
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Stores</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stores.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stores.reduce((sum, item) => sum + item.products_count, 0)}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stores.reduce((sum, item) => sum + item.orders_count, 0)}</p>
            </div>
            <Activity className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Stores</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stores.filter((store) => store.status === 'active').length}</p>
            </div>
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search stores or vendors"
            className="pl-10"
          />
        </div>
        <div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1); }}>
            <SelectTrigger className="w-40 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stores</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md shadow overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-gray-200 dark:bg-gray-800">
              <TableHead>Store</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">Loading stores...</TableCell>
              </TableRow>
            ) : filteredStores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">No stores found.</TableCell>
              </TableRow>
            ) : (
              displayedStores.map((store) => (
                <TableRow key={store.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-white">{store.store_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{store.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-white">{store.vendor_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{store.vendor_email}</div>
                  </TableCell>
                  <TableCell>{store.products_count}</TableCell>
                  <TableCell>{store.orders_count}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${store.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300'}`}>
                      {store.status}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(store.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="md:max-w-2xl lg:max-w-4xl xl:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Create New Store</DialogTitle>
            <DialogDescription>Add a store and assign a vendor owner.</DialogDescription>
          </DialogHeader>

          <div className="border-b border-gray-200 dark:border-gray-700 px-2 shrink-0">
            <nav className="flex gap-2" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`text-sm sm:text-md inline-flex items-center gap-1 sm:gap-2 sm:px-4 py-2 sm:py-3 border-b-2 transition flex-1 ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                <Store className="h-4 w-4" />
                Store Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`text-sm sm:text-md inline-flex items-center gap-1 sm:gap-2 sm:px-4 py-2 sm:py-3 border-b-2 transition flex-1 ${activeTab === 'contact' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                <MapPin className="h-4 w-4" />
                Contact & Address
              </button>
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar min-h-0">
            <form id="create-store-form" onSubmit={handleCreateStore} className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0">
            {activeTab === 'info' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Store name *</label>
                  <Input value={createForm.name} onChange={(e) => { setCreateForm({ ...createForm, name: e.target.value }); setErrors({ ...errors, name: '' }); }} placeholder="Store name" className={errors.name ? 'border-red-500' : ''} />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Slug *</label>
                  <Input value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} placeholder="store-slug" />
                </div>

                <div className="space-y-2 xl:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Description *</label>
                  <Textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Write a short description about the store" className="min-h-[100px]" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Vendor owner *</label>
                  <Select value={createForm.owner_id} onValueChange={(v) => { setCreateForm({ ...createForm, owner_id: v }); setErrors({ ...errors, owner_id: '' }); }}>
                    <SelectTrigger className={`w-full ${errors.owner_id ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder={vendors.length ? 'Select vendor' : 'No vendors available'} />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No vendors found</div>
                      ) : (
                        vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.owner_id && <p className="text-xs text-red-600 mt-1">{errors.owner_id}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Phone *</label>
                  <Input value={createForm.phone} onChange={(e) => { setCreateForm({ ...createForm, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }} placeholder="Phone number" className={errors.phone ? 'border-red-500' : ''} />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>

                <div className="space-y-2 xl:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email *</label>
                  <Input type="email" value={createForm.email} onChange={(e) => { setCreateForm({ ...createForm, email: e.target.value }); setErrors({ ...errors, email: '' }); }} placeholder="Store email" className={errors.email ? 'border-red-500' : ''} />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Store logo</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="group cursor-pointer rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-5 flex flex-col items-center justify-center text-center transition hover:border-blue-500 hover:text-blue-600">
                        <UploadCloud className="h-5 w-5 mb-2 text-blue-600" />
                        <span className="text-sm font-medium">Upload logo</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG or SVG</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoFileChange(e.target.files?.[0])}
                        />
                      </label>

                      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden h-40 flex items-center justify-center">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                            <ImagePlus className="mx-auto mb-2 h-5 w-5" />
                            Logo preview
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Store banner</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="group cursor-pointer rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-5 flex flex-col items-center justify-center text-center transition hover:border-blue-500 hover:text-blue-600">
                        <UploadCloud className="h-5 w-5 mb-2 text-blue-600" />
                        <span className="text-sm font-medium">Upload banner</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG or SVG</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleBannerFileChange(e.target.files?.[0])}
                        />
                      </label>

                      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden h-40 flex items-center justify-center">
                        {bannerPreview ? (
                          <img src={bannerPreview} alt="Banner preview" className="max-h-full max-w-full object-cover" />
                        ) : (
                          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                            <ImagePlus className="mx-auto mb-2 h-5 w-5" />
                            Banner preview
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Address *</label>
                  <Input value={createForm.address} onChange={(e) => { setCreateForm({ ...createForm, address: e.target.value }); setErrors({ ...errors, address: '' }); }} placeholder="Street address" className={errors.address ? 'border-red-500' : ''} />
                  {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">City *</label>
                  <Input value={createForm.city} onChange={(e) => { setCreateForm({ ...createForm, city: e.target.value }); setErrors({ ...errors, city: '' }); }} placeholder="City" className={errors.city ? 'border-red-500' : ''} />
                  {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                </div>

                <div className="space-y-2 xl:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Status *</label>
                  <Select value={String(createForm.status)} onValueChange={(v) => setCreateForm({ ...createForm, status: Number(v) })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Active</SelectItem>
                      <SelectItem value="0">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* <div className="xl:col-span-2 flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCreateOpen(false)} type="button">Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Store'}</Button>
            </div> */}
          </form>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              type="button"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Store'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
