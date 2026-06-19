import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';

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

const initialForm = {
  email: '',
  full_name: '',
  phone: '',
  address: '',
  city: '',
};

export default function VendorEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/admin/vendors');
      return;
    }
    loadVendor();
  }, [id]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, address, city, role, created_at')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Vendor not found');
      }

      setVendor(data);
      setFormData({
        email: data.email || '',
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
      });
    } catch (error) {
      console.error('Failed to load vendor:', error);
      navigate('/admin/vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendor) return;

    setSaving(true);
    try {
      let authUpdateError: any = null;

      if (formData.email !== vendor.email) {
        try {
          const { error: authError } = await supabase.auth.admin.updateUserById(vendor.id, {
            email: formData.email,
          });
          if (authError) throw authError;
          console.log('Auth email update succeeded for', vendor.id);
        } catch (err) {
          console.error('Auth update failed:', err);
          authUpdateError = err;
        }
      }

      // Avoid requesting the updated row in the same PATCH request. Some PostgREST setups
      // (RLS or RETURNING disabled) will return 406 Not Acceptable if the server cannot
      // satisfy the requested representation even though the update succeeds. Perform
      // the update without `.select()` and then refetch the row separately.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
        })
        .eq('id', vendor.id);

      if (profileError) throw profileError;

      console.log('Profile update executed (no returned row). Refetching...');

      const { data: refetched, error: refetchError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, address, city, role, created_at')
        .eq('id', vendor.id)
        .maybeSingle();

      if (refetchError) {
        console.error('Refetch after update failed:', refetchError);
        if (authUpdateError) {
          await Swal.fire('Warning', `Auth update may have failed and profile refetch failed: ${refetchError?.message || refetchError}`,'warning');
        } else {
          await Swal.fire('Warning', `Profile updated but could not retrieve the updated row: ${refetchError?.message || refetchError}`,'warning');
        }
      } else {
        console.log('Refetched profile:', refetched);
        setVendor(refetched as any);
        if (authUpdateError) {
          await Swal.fire('Warning', `Profile updated but auth/email update failed: ${authUpdateError?.message || authUpdateError}`,'warning');
        } else {
          await Swal.fire('Success', 'Vendor updated successfully.', 'success');
        }
      }

      // If the refetched profile still doesn't reflect the intended changes,
      // it's likely the update was blocked by RLS/row-level policies (client
      // anon key doesn't have permission to update other users). Offer to
      // perform an admin-backed update via the local admin API if available.
      let finalProfile: any = null;
      try {
        const { data: fp, error: fpErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, phone, address, city, role, created_at')
          .eq('id', vendor.id)
          .maybeSingle();
        if (fpErr) {
          console.error('Final profile refetch error', fpErr);
        } else {
          finalProfile = fp;
        }
      } catch (e) {
        console.error('Unexpected error fetching final profile', e);
      }

      const changed = finalProfile && (
        finalProfile.phone !== vendor.phone || finalProfile.address !== vendor.address || finalProfile.city !== vendor.city
      );

      if (!changed) {
        const doAdmin = await Swal.fire({
          title: 'Client update blocked?',
          text: 'Client-side update may be blocked by DB policies. Try server-admin update?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Try admin update',
        });

        if (doAdmin.isConfirmed) {
          try {
            const resp = await fetch('http://localhost:4002/admin/profile/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: vendor.id, email: formData.email, full_name: formData.full_name, phone: formData.phone, address: formData.address, city: formData.city }),
            });

            const json = await resp.json();
            if (!resp.ok) throw json;
            console.log('Admin update result:', json);
            setVendor(json.profile || finalProfile || vendor);
            await Swal.fire('Success', 'Vendor updated via admin API.', 'success');
          } catch (err: any) {
            console.error('Admin update failed:', err);
            await Swal.fire('Error', `Admin update failed: ${String(err?.message ?? JSON.stringify(err))}`, 'error');
          }
        }
      }

      navigate(`/admin/vendors/${vendor.id}`);
    } catch (error: any) {
      console.error('Failed to update vendor:', error);
      await Swal.fire('Error', error?.message || 'Failed to update vendor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading vendor details...</div>;
  }

  if (!vendor) {
    return <div className="p-6">Vendor not found.</div>;
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Edit Vendor</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Update the vendor profile and contact information.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/admin/vendors/${vendor.id}`)}>
          Back to vendor details
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor profile</CardTitle>
          <CardDescription>Modify email, name, phone, city and address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Full name</label>
                <Input
                  value={formData.full_name}
                  onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                  placeholder="Vendor name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  placeholder="Vendor phone number"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">City</label>
                <Input
                  value={formData.city}
                  onChange={(event) => setFormData({ ...formData, city: event.target.value })}
                  placeholder="City"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Address</label>
              <Input
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="Street address or suite"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => navigate(`/admin/vendors/${vendor.id}`)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
