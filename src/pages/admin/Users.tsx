import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin as getSupabaseAdmin } from '../../lib/supabase';
import { calculateTotalPages, getPaginationParams } from '../../lib/pagination';
import AdminFooter from '../../components/ui/AdminFooter';
import { useLanguage } from '../../contexts/LanguageContext';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import SoftCard from '../../components/ui/SoftCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { Users, Crown, Mail, Calendar, Plus, Edit, Trash2, X, Search, RefreshCw, Filter } from 'lucide-react';
import { Input } from '../../components/ui/input';
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
  is_admin: boolean;
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
    is_admin: false,
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
        query = query.eq('is_admin', true);
      } else if (selectedRole === 'customer') {
        query = query.eq('is_admin', false);
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: formData.email,
            full_name: formData.full_name,
            is_admin: formData.is_admin,
          });

        if (profileError) throw profileError;
      }

      setShowCreateModal(false);
      setFormData({ email: '', password: '', confirmPassword: '', full_name: '', is_admin: false });
      loadUsers();
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'User created successfully!',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error('Error creating user:', error);

      let errorMessage = 'Failed to create user. Please try again.';
      if (error.message) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          errorMessage = 'This email is already registered. Please use a different email address.';
        } else if (error.message.includes('Email address') && error.message.includes('is invalid')) {
          errorMessage = 'This email address appears to be invalid or blocked. Please try a different email address (e.g., test123@gmail.com).';
        } else if (error.message.includes('invalid') || error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address (e.g., user@example.com).';
        } else if (error.message.includes('Password should be at least') || error.message.includes('password')) {
          errorMessage = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('signup is disabled')) {
          errorMessage = 'User registration is currently disabled. Please contact an administrator.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else {
          console.error('Unknown error details:', error.message);
          errorMessage = 'An unexpected error occurred. Please check your input and try again.';
        }
      }

      await Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (formData.password && formData.password !== formData.confirmPassword) {
      await Swal.fire({
        icon: 'error',
        title: 'Validation Error!',
        text: 'Passwords do not match!'
      });
      return;
    }

    try {
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(editingUser.id, {
          password: formData.password,
        });
        if (passwordError) throw passwordError;
      }

      if (formData.email !== editingUser.email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(editingUser.id, {
          email: formData.email,
        });
        if (emailError) throw emailError;
      }

      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', editingUser.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      const updateData = {
        full_name: formData.full_name,
        is_admin: formData.is_admin,
        email: formData.email,
      };

      if (existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id);

        if (profileError) throw profileError;
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: editingUser.id,
            ...updateData,
          });

        if (profileError) throw profileError;
      }

      setShowEditModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', confirmPassword: '', full_name: '', is_admin: false });
      await loadUsers();
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'User updated successfully!',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to update user: ' + (error.message || 'Unknown error')
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

    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      toast({ title: 'Configuration Error', description: 'Admin functionality is not properly configured' });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      return;
    }

    try {
      const { error } = await adminClient.auth.admin.deleteUser(userToDelete);
      if (error) throw error;

      loadUsers();
      toast({ title: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ title: 'Failed to delete user', description: error.message || 'Please try again' });
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
      is_admin: user.is_admin,
    });
    setShowEditModal(true);
  };

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            {t('usersList')}
          </h1>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SoftCard className="p-4 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('totalUsers')}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
          </SoftCard>
          <SoftCard className="p-4 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('adminUsers')}</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mt-1">{users.filter(u => u.is_admin).length}</p>
              </div>
              <Crown className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
          </SoftCard>
          <SoftCard className="p-4 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Customer Users</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">{users.filter(u => !u.is_admin).length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
          </SoftCard>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Filtres</span>
              </div>
            </div>

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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('usersList') || 'List Users'}</h2>
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

            <SoftCard className="p-0 bg-transparent dark:bg-transparent border-0">
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
                        {user.is_admin ? (
                          <StatusBadge status="active" label="Admin" />
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
          </SoftCard>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg dark:shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New User</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                  />
                  <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                    Admin User
                  </label>
                </div>
                <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition font-medium"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg dark:shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password (leave empty to keep current)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                {formData.password && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="edit_is_admin"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                  />
                  <label htmlFor="edit_is_admin" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                    Admin User
                  </label>
                </div>
                <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition font-medium"
                  >
                    Update User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
      <AdminFooter />
    </>
  );
}
