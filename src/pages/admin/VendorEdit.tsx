import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase, updateUserWithAuthAdmin } from '../../lib/supabase';
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
  password: '',
  confirmPassword: '',
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
        password: '',
        confirmPassword: '',
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
      if (formData.password && formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      if (formData.password && formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const payload = {
        id: vendor.id,
        email: formData.email || undefined,
        password: formData.password || undefined,
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
      };

      const result = await updateUserWithAuthAdmin({
        id: String(payload.id),
        email: payload.email ?? null,
        password: payload.password ?? null,
        full_name: payload.full_name ?? null,
        phone: payload.phone ?? null,
        address: payload.address ?? null,
        city: payload.city ?? null,
      });

      if (result?.profile) {
        setVendor({ ...vendor, ...result.profile });
      }

      await Swal.fire('Success', 'Vendor updated successfully.', 'success');
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">New password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Confirm password</label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                placeholder="Confirm new password"
              />
            </div>
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
