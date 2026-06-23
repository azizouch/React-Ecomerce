import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/card';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Tag, Plus, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { useToast } from '../../hooks/use-toast';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';

const EMPTY_COUPON = { id: null, code: '', discount_type: 'percentage', discount_value: '', usage_limit: 0, expires_at: '', active: true };

export default function AdminDiscounts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog / form state
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY_COUPON);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      setCoupons(data || []);
    } catch (e) {
      console.error('Error loading coupons', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOpenNew = () => {
    setEditing(null);
    setForm(EMPTY_COUPON);
    setOpenDialog(true);
  };

  const handleEdit = (c: any) => {
    setEditing(c);
    setForm({ ...c });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (!form.code || !form.discount_value) {
        toast({ title: 'Code and value are required' });
        return;
      }

      if (editing) {
        const { error } = await supabase.from('coupons').update(form).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Updated coupon' });
      } else {
        const id = `c_${Date.now()}`;
        const { error } = await supabase.from('coupons').insert([{ id, ...form }]);
        if (error) throw error;
        toast({ title: 'Created coupon' });
      }

      setOpenDialog(false);
      load();
    } catch (e) {
      console.error('Save coupon error', e);
      toast({ title: 'Error saving coupon' });
    }
  };

  const confirmDelete = (id: string) => {
    setTargetDeleteId(id);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!targetDeleteId) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', targetDeleteId);
      if (error) throw error;
      toast({ title: 'Deleted coupon' });
      load();
    } catch (e) {
      console.error('Delete coupon error', e);
      toast({ title: 'Error deleting coupon' });
    } finally {
      setDeleteOpen(false);
      setTargetDeleteId(null);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Tag className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('discounts') || 'Discounts / Coupons'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" /> {t('createCoupon') || 'Create Coupon'}
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> {t('refresh') || 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input placeholder={t('searchCoupons') || 'Search coupons...'} />
          <div />
          <div />
          <div />
        </div>
      </div>

        <div className="overflow-x-auto">
          <Table className="bg-transparent min-w-full">
            <TableHeader>
              <TableRow className="border-b border-gray-200 text-neutral-900 dark:border-gray-600" style={{ backgroundColor: 'hsl(210, 40%, 96.1%)' }}>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id} className="border-b border-gray-100 dark:border-gray-700">
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.discount_type || c.type}</TableCell>
                  <TableCell>{c.discount_value}</TableCell>
                  <TableCell>{c.usage_limit ?? c.limit}</TableCell>
                  <TableCell>{c.expires_at ?? c.expires}</TableCell>
                  <TableCell>{c.active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => confirmDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogTrigger asChild>
          <div />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Coupon' : 'New Coupon'}</DialogTitle>
            <DialogDescription>{editing ? 'Update coupon' : 'Create a new coupon'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <Input value={form.code} onChange={(e: any) => setForm({ ...form, code: e.target.value })} placeholder="Code" />
            <div className="flex gap-2">
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="px-3 py-2 border rounded w-1/2">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
              <Input value={form.discount_value} onChange={(e: any) => setForm({ ...form, discount_value: e.target.value })} placeholder="Value" />
            </div>
            <Input type="number" value={form.usage_limit} onChange={(e: any) => setForm({ ...form, usage_limit: Number(e.target.value) })} placeholder="Usage limit" />
            <Input type="date" value={form.expires_at} onChange={(e: any) => setForm({ ...form, expires_at: e.target.value })} />
            <div className="flex items-center gap-2">
              <input id="active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <label htmlFor="active">Active</label>
            </div>
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Save' : 'Create'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete coupon" description="This will permanently delete the coupon." variant="destructive" onConfirm={doDelete} />
    </div>
  );
}
