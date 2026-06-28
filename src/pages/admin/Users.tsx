import { useState, useEffect } from 'react';
import { deleteAuthUserById, supabase, updateUserWithAuthAdmin } from '../../lib/supabase';
import { calculateTotalPages, getPaginationParams } from '../../lib/pagination';
import { useLanguage } from '../../contexts/LanguageContext';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Users, Crown, Mail, Calendar, Plus, Edit, Trash2, X, Search, RefreshCw } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import Swal from 'sweetalert2';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const DEFAULT_ITEMS_PER_PAGE = 10;

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'customer' | 'vendor' | 'admin';
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminUsers() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    address: '',
    city: '',
    role: 'customer' as 'customer' | 'vendor' | 'admin',
  });

  useEffect(() => {
    loadUsers();
  }, [currentPage, itemsPerPage, searchQuery, selectedRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { offset, limit } = getPaginationParams(currentPage, itemsPerPage);

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (selectedRole === 'admin') {
        query = query.eq('role', 'admin');
      } else if (selectedRole === 'vendor') {
        query = query.eq('role', 'vendor');
      } else if (selectedRole === 'customer') {
        query = query.eq('role', 'customer');
      }

      if (searchQuery.trim()) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      setUsers(data || []);
      setTotalUsers(count || 0);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      await Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Passwords do not match!",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-vendor", {
        body: {
          action: "create",
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          role: formData.role,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      await Swal.fire({
        icon: "success",
        title: t("success"),
        text: t("userCreatedSuccess"),
        timer: 2000,
        showConfirmButton: false,
      });

      setShowCreateModal(false);

      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        phone: "",
        address: "",
        city: "",
        role: "customer",
      });

      await loadUsers();
    } catch (err: any) {
      console.error(err);

      const message = err?.message ?? "";

      let errorMessage = t("registrationFailed");

      if (
        message.includes("already registered") ||
        message.includes("already exists") ||
        message.includes("duplicate")
      ) {
        errorMessage = t("emailAlreadyRegistered");
      } else if (
        message.includes("Invalid email") ||
        message.includes("Email address")
      ) {
        errorMessage = t("invalidEmailFormat");
      } else if (
        message.includes("Password") ||
        message.includes("password")
      ) {
        errorMessage = t("passwordMinRequired");
      } else if (message.includes("signup is disabled")) {
        errorMessage = t("signupDisabled");
      } else if (message.includes("rate limit")) {
        errorMessage = t("tooManyRequests");
      } else if (message.length > 0) {
        errorMessage = message;
      }

      await Swal.fire({
        icon: "error",
        title: t("registrationFailed"),
        text: errorMessage,
      });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    if (
      formData.password &&
      formData.password !== formData.confirmPassword
    ) {
      await Swal.fire({
        icon: "error",
        title: "Validation Error!",
        text: "Passwords do not match!",
      });
      return;
    }

    try {
      await updateUserWithAuthAdmin({
        id: editingUser.id,
        email: formData.email,
        password: formData.password || undefined,
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        role: formData.role,
      });

      setShowEditModal(false);
      setEditingUser(null);

      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        phone: "",
        address: "",
        city: "",
        role: "customer",
      });

      await loadUsers();

      await Swal.fire({
        icon: "success",
        title: "Success!",
        text: "User updated successfully!",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error("Error updating user:", error);

      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to update user.",
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);

    try {
      await deleteAuthUserById(userToDelete);

      await loadUsers();

      toast({
        title: 'Succès',
        description: 'Client supprimé avec succès',
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);

      toast({
        title: "Failed to delete user",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      confirmPassword: '',
      full_name: user.full_name || '',
      phone: (user as any).phone || '',
      address: (user as any).address || '',
      city: (user as any).city || '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  return (
    <>
      <div className="p-5 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              {t('usersList')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">View all users and their details.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={() => loadUsers()} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 w-full sm:w-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualiser
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 rounded-md px-3 bg-neutral-900 text-white dark:bg-blue-600 dark:text-slate-950 w-full sm:w-auto dark:hover:bg-blue-500 hover:bg-neutral-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('addUser')}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Card className="p-4 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('totalUsers')}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('adminUsers')}</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mt-1">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <Crown className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('vendorUsers')}</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">{users.filter(u => u.role === 'vendor').length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('customerUsers')}</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">{users.filter(u => u.role === 'customer').length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6">
          <div className="space-y-4">
            {/* <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Filtres</span>
              </div>
            </div> */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <Input
                  placeholder={t('rechercher')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedRole} onValueChange={(value) => {
                setSelectedRole(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
              <div />
              <div />
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <SkeletonLoader count={6} height="h-16" className="space-y-3" />
        ) : (
          <div className="space-y-3">
            <div className="space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">List {t('usersList') || 'List Users'}</h2>
                <div className="flex justify-between items-center sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Afficher</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="dark:placeholder:text-gray-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 flex items-center justify-between rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-16 h-8 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-500 dark:text-gray-400">entrées</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total: {totalUsers}</span>
                </div>
              </div>
            </div>

            <Card className="p-0 border-0">
            <div className="overflow-x-auto">
              <Table className="bg-transparent min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-600" style={{ backgroundColor: 'hsl(210, 40%, 96.1%)' }}>
                    <TableHead className="text-sm">User</TableHead>
                    <TableHead className="text-sm">Role</TableHead>
                    <TableHead className="text-sm">Joined</TableHead>
                    <TableHead className="text-sm">Last Active</TableHead>
                    <TableHead className="text-sm text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 border-l-0 border-r-0 border-t-0 bg-transparent dark:bg-transparent transition"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm">
                              {(user.full_name?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.full_name || 'No name'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                              <Mail className="h-3 w-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <StatusBadge status="active" label="Admin" />
                        ) : user.role === 'vendor' ? (
                          <StatusBadge status="active" label="Vendor" />
                        ) : (
                          <StatusBadge status="inactive" label="Customer" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                            : '—'
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition font-medium text-sm"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition font-medium text-sm"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No users found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {searchQuery ? 'Try adjusting your search terms.' : 'No users have registered yet.'}
                  </p>
                </div>
              )}

              {/* Pagination Controls */}
              {calculateTotalPages(totalUsers, itemsPerPage) > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={calculateTotalPages(totalUsers, itemsPerPage)}
                  totalItems={totalUsers}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
                />
              )}
            </div>
          </Card>
          </div>
        )}

        {/* Create User Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user with profile information and assign a role.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUser} className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>

              {/* Phone and City */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="user@example.com"
                />
              </div>

              {/* Password and Confirm Password */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password *</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Enter password (min 6 characters)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password *</label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Confirm password"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role *</label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'customer' | 'vendor' | 'admin' })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={showEditModal && Boolean(editingUser)} onOpenChange={(open) => { if (!open) setShowEditModal(false); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user details and role.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditUser} className="space-y-4 mt-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>

              {/* Phone and City */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Password and Confirm Password */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password (leave empty to keep current)</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={6}
                    placeholder="Leave empty if no change"
                  />
                </div>
                {formData.password && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      minLength={6}
                    />
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'customer' | 'vendor' | 'admin' })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete User"
          description="Are you sure you want to delete this user? This action cannot be undone."
          confirmText={isDeleting ? 'Deleting...' : 'Delete'}
          cancelText="Cancel"
          onConfirm={confirmDeleteUser}
          variant="destructive"
        />
        </div>
    </>
  );
}
