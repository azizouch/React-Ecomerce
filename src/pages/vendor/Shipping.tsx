import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
// SoftCard removed; not needed in this file
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Truck, RefreshCw, Plus, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '../../components/ui/dialog';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { useToast } from '../../hooks/use-toast';

const mockZones = [
  { id: 'zone_1', name: 'Europe', methods: ['Standard', 'Express'], price: '5.00 - 20.00', eta: '2-7 days', enabled: true },
];

export default function VendorShipping() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [zones, setZones] = useState<any[]>(mockZones);

  // Dialog / form state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [methodsText, setMethodsText] = useState('');
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('');
  const [enabled, setEnabled] = useState(true);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);

  const loadZones = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) setZones(data as any[]);
      else if (error) console.error('Load zones error', error);
    } catch (e) {
      console.error('Error loading shipping zones', e);
    } finally {
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  // opening the dialog is handled by the DialogTrigger; no separate handler needed

  const handleEdit = (z: any) => {
    setEditingZone(z);
    setName(z.name || '');
    setMethodsText((z.methods || []).join(', '));
    setPrice(z.price || '');
    setEta(z.eta || '');
    setEnabled(Boolean(z.enabled));
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required' });
      return;
    }
    const methods = methodsText.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = { name, methods, price, eta, enabled } as any;
    try {
      if (editingZone) {
        const { error } = await supabase
          .from('shipping_zones')
          .update(payload)
          .eq('id', editingZone.id);
        if (error) throw error;
        toast({ title: 'Updated zone' });
        setZones((prev) => prev.map((p) => (p.id === editingZone.id ? { ...p, ...payload } : p)));
      } else {
        const id = `zone_${Date.now()}`;
        const { error } = await supabase.from('shipping_zones').insert([{ id, ...payload }]);
        if (error) throw error;
        toast({ title: 'Created zone' });
        setZones((prev) => [...prev, { id, ...payload }]);
      }
      setOpenDialog(false);
    } catch (e) {
      console.error('Save zone error', e);
      toast({ title: 'Error saving zone' });
    }
  };

  const handleConfirmDelete = (id: string) => {
    setTargetDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!targetDeleteId) return;
    try {
      const { error } = await supabase.from('shipping_zones').delete().eq('id', targetDeleteId);
      if (error) throw error;
      setZones((prev) => prev.filter((p) => p.id !== targetDeleteId));
      toast({ title: 'Deleted zone' });
    } catch (e) {
      console.error('Delete zone error', e);
      toast({ title: 'Error deleting zone' });
    } finally {
      setDeleteOpen(false);
      setTargetDeleteId(null);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Truck className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          {t('shipping') || 'Shipping'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadZones}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh') || 'Refresh'}
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center">
                <Plus className="mr-2 h-4 w-4" /> New Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingZone ? 'Edit Zone' : 'New Zone'}</DialogTitle>
                <DialogDescription>{editingZone ? 'Update the shipping zone' : 'Create a new shipping zone'}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 mt-2">
                <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Zone name" />
                <Input value={methodsText} onChange={(e: any) => setMethodsText(e.target.value)} placeholder="Methods (comma separated)" />
                <Input value={price} onChange={(e: any) => setPrice(e.target.value)} placeholder="Price range (e.g. 5.00-20.00)" />
                <Input value={eta} onChange={(e: any) => setEta(e.target.value)} placeholder="ETA (e.g. 2-7 days)" />
                <div className="flex items-center gap-3">
                  <input id="enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  <label htmlFor="enabled">Enabled</label>
                </div>
              </div>
              <DialogFooter>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancel</Button>
                  <Button onClick={handleSave}>{editingZone ? 'Save' : 'Create'}</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input placeholder={t('searchZones') || 'Search zones...'} />
          <div />
          <div />
          <div />
        </div>
      </div>

        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <TableHead className="text-sm">Zone</TableHead>
                <TableHead className="text-sm">Methods</TableHead>
                <TableHead className="text-sm">Price Range</TableHead>
                <TableHead className="text-sm">ETA</TableHead>
                <TableHead className="text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((z) => (
                <TableRow key={z.id} className="border-b border-gray-100 dark:border-gray-700">
                  <TableCell className="text-sm">{z.name}</TableCell>
                  <TableCell className="text-sm">{(z.methods || []).join(', ')}</TableCell>
                  <TableCell className="text-sm">{z.price}</TableCell>
                  <TableCell className="text-sm">{z.eta || '—'}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(z)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(z.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete shipping zone"
        description="This will permanently delete the shipping zone. Are you sure?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
