import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import AdminNav from '../../components/AdminNav';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import SoftCard from '../../components/ui/SoftCard';
import StatusBadge from '../../components/ui/StatusBadge';
import AdminFooter from '../../components/AdminFooter';
import Pagination from '../../components/ui/Pagination';
import { Users, Crown, Mail, Calendar, Plus, Edit, Trash2, X, Search } from 'lucide-react';
import Swal from 'sweetalert2';

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    is_admin: false,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
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

  const handleDeleteUser = async (userId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You are about to delete this user. This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete user',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    if (!supabaseAdmin) {
      await Swal.fire({
        icon: 'error',
        title: 'Configuration Error',
        text: 'Admin functionality is not properly configured. Please contact a system administrator.',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      loadUsers();
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'User has been deleted successfully.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);

      let errorMessage = 'Failed to delete user. Please try again.';
      if (error.message) {
        if (error.message.includes('User not allowed') || error.message.includes('not allowed')) {
          errorMessage = 'You do not have permission to delete users. Please contact a system administrator.';
        } else if (error.message.includes('not found')) {
          errorMessage = 'User not found. They may have already been deleted.';
        } else if (error.message.includes('cannot delete yourself')) {
          errorMessage = 'You cannot delete your own account.';
        } else {
          errorMessage = error.message;
        }
      }

      await Swal.fire({
        icon: 'error',
        title: 'Deletion Failed',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      is_admin: user.is_admin,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', confirmPassword: '', full_name: '', is_admin: false });
    setEditingUser(null);
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || 
      (selectedRole === 'admin' && user.is_admin) || 
      (selectedRole === 'customer' && !user.is_admin);
    return matchesSearch && matchesRole;
  });

  // Paginate filtered users
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole]);

  const adminCount = users.filter(user => user.is_admin).length;
  const totalUsers = users.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNav currentPage="admin-users" />

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">Users</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage user accounts and permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SoftCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{totalUsers}</p>
              </div>
              <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
          </SoftCard>
          <SoftCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Admin Users</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mt-1">{adminCount}</p>
              </div>
              <Crown className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
          </SoftCard>
        </div>

        <SoftCard>
          {/* Filters Bar - Like the image layout */}
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
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              </div>
              {/* Role Filter */}
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm appearance-none cursor-pointer pr-8 bg-no-repeat bg-right bg-contain min-w-[180px]"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/csvg%3e")`
                }}
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">Admin</option>
                <option value="customer">Client</option>
              </select>
            </div>

            {/* Right: Items Per Page and Total */}
            <div className="flex gap-2 items-center text-sm whitespace-nowrap">
              <span className="text-gray-600 dark:text-gray-400">Afficher</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none cursor-pointer pr-6 bg-no-repeat bg-right bg-contain"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/csvg%3e")`
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-gray-600 dark:text-gray-400">entrées</span>
              <span className="text-gray-600 dark:text-gray-400 font-medium">Total: {filteredUsers.length}</span>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader count={5} height="h-16" />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">No users found</h3>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? 'Try adjusting your search terms.' : 'No users have registered yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-blue-50 dark:hover:bg-slate-700 transition ${
                        index !== filteredUsers.length - 1 ? 'border-b border-gray-100 dark:border-slate-700' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
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
                      </td>
                      <td className="px-6 py-4">
                        {user.is_admin ? (
                          <StatusBadge status="active" label="Admin" />
                        ) : (
                          <StatusBadge status="inactive" label="Customer" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                            : '—'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-700 transition font-medium text-sm"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700 transition font-medium text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </SoftCard>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900">
                    Admin User
                  </label>
                </div>
                <div className="flex space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition font-medium"
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
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password (leave empty to keep current)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                {formData.password && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="edit_is_admin"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="edit_is_admin" className="ml-2 block text-sm text-gray-900">
                    Admin User
                  </label>
                </div>
                <div className="flex space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Update User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <AdminFooter />
    </div>
  );
}
