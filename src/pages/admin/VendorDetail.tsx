import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, deleteVendorById } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useToast } from '../../hooks/use-toast';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: cachedVendor } = useProfile(id);
  const [stores, setStores] = useState<any[]>([]);
  const [stats, setStats] = useState({ products: 0, orders: 0, categories: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) {
      navigate('/admin/vendors');
      return;
    }
    if (cachedVendor) {
      setVendor(cachedVendor);
      setLoading(false);
    } else {
      loadVendor();
    }
  }, [id, cachedVendor]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, address, city, role, created_at')
        .eq('id', id)
        .single();

      if (error) throw error;
      setVendor(data || null);

      // Fetch stores owned by this vendor
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, phone, city, address, status')
        .eq('owner_id', id);
      if (storesError) throw storesError;
      const storeIds = (storesData || []).map((s: any) => s.id);
      setStores(storesData || []);

      // Stats: products count and orders count (for vendor's stores)
      if (storeIds.length > 0) {
        const [{ count: prodCount }, { count: ordCount }] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }).in('store_id', storeIds),
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('store_id', storeIds),
        ]);

        // categories: fetch product category_ids and dedupe client-side
        const { data: prodCats } = await supabase
          .from('products')
          .select('category_id')
          .in('store_id', storeIds);

        const uniqueCats = new Set((prodCats || []).map((p: any) => p.category_id).filter(Boolean));

        setStats({ products: prodCount || 0, orders: ordCount || 0, categories: uniqueCats.size });
      } else {
        setStats({ products: 0, orders: 0, categories: 0 });
      }
    } catch (err) {
      console.error('Failed to load vendor', err);
      navigate('/admin/vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!vendor) return;
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!vendor) return;
    setIsDeleting(true);

    try {
      const { authDelete, profileError } = await deleteVendorById(vendor.id);
      if (profileError) throw profileError;

      if (!authDelete.success) {
        toast({
          title: 'Vendor deleted',
          description: 'Profile removed but auth cleanup failed. Verify server logs.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Vendor deleted successfully' });
      }

      navigate('/admin/vendors');
    } catch (err: any) {
      console.error('Failed to delete vendor', err);
      toast({
        title: 'Failed to delete vendor',
        description: err?.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!vendor) return <div className="p-6">Vendor not found</div>;

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800" variant="ghost" onClick={() => navigate('/admin/vendors')}>
            <ArrowLeft className="w-4 h-4" />
            Back to Vendors
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-slate-700 flex items-center justify-center text-md font-semibold text-blue-600">{(vendor.full_name?.charAt(0) || '?').toUpperCase()}</div>
            <h1 className="text-xl font-semibold">{vendor.full_name || vendor.email}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/admin/vendors/${vendor.id}/edit`)}>
            <Edit className="w-4 h-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete vendor"
        description="This will permanently delete the vendor and their profile. This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Vendor information</CardTitle>
              <CardDescription>Details and contact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-800 dark:text-gray-200">
                <div>
                  <div className="text-xs text-gray-500">Full Name</div>
                  <div className="mt-1">{vendor.full_name || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="mt-1">{vendor.email || '—'}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="mt-1">{vendor.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">City</div>
                  <div className="mt-1">{vendor.city || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Address</div>
                  <div className="mt-1">{vendor.address || '—'}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Role</div>
                  <div className="mt-1">{vendor.role || 'vendor'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Joined</div>
                  <div className="mt-1">{vendor.created_at ? new Date(vendor.created_at).toLocaleDateString() : '—'}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs text-gray-500">Profile page</div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">Real vendor profile data.</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Associated stores
                <Button variant="ghost" onClick={() => navigate('/admin/stores')}>View all</Button>
                </CardTitle>
              <CardDescription>
                {stores.length === 0 && (
                <div className="text-sm text-gray-500">No associated stores</div>
              )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {stores.map((s) => (
                <div key={s.id} className="bg-gray-50 dark:bg-slate-800 rounded-md p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.city || s.address || '—'}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-xs text-gray-500">Phone</div>
                      <div className="mt-1">{s.phone || '—'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md bg-muted dark:border-slate-800 dark:bg-slate-950 p-4">
                    <h3 className="font-medium">Products</h3>
                    <div className="text-2xl font-bold">{stats.products}</div>
                </div>
                <div className="rounded-md bg-muted dark:border-slate-800 dark:bg-slate-950 p-4">
                  <h3 className="font-medium">Orders</h3>
                  <div className="text-2xl font-bold">{stats.orders}</div>
                </div>
                <div className="rounded-md bg-muted dark:border-slate-800 dark:bg-slate-950 p-4">
                  <h3 className="font-medium">Categories</h3>
                  <div className="text-2xl font-bold">{stats.categories}</div>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
