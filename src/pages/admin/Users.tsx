import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import AdminNav from '../../components/AdminNav';
import { Users, UserCheck, UserX, Crown, Mail, Calendar, Plus, Edit, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';

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

      // Handle specific Supabase auth errors with user-friendly messages
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
          // For unknown errors, provide a generic message but log the details
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

    // Validate password confirmation if password is being changed
    if (formData.password && formData.password !== formData.confirmPassword) {
      await Swal.fire({
        icon: 'error',
        title: 'Validation Error!',
        text: 'Passwords do not match!'
      });
      return;
    }

    try {
      let hasChanges = false;

      // Update password if provided
      if (formData.password) {
        console.log('Updating password for user:', editingUser.id);
        const { error: passwordError } = await supabase.auth.admin.updateUserById(editingUser.id, {
          password: formData.password,
        });
        if (passwordError) {
          console.error('Password update error:', passwordError);
          throw passwordError;
        }
        hasChanges = true;
      }

      // Update email if changed
      if (formData.email !== editingUser.email) {
        console.log('Updating email for user:', editingUser.id, 'from', editingUser.email, 'to', formData.email);
        const { error: emailError } = await supabase.auth.admin.updateUserById(editingUser.id, {
          email: formData.email,
        });
        if (emailError) {
          console.error('Email update error:', emailError);
          throw emailError;
        }
        hasChanges = true;
      }

      // First check if profile exists
      console.log('Checking if profile exists for user:', editingUser.id);
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', editingUser.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking profile:', checkError);
        throw checkError;
      }

      console.log('Existing profile:', existingProfile);

      // Always update profile information (full_name, is_admin)
      console.log('Updating profile for user:', editingUser.id, 'full_name:', formData.full_name, 'is_admin:', formData.is_admin);
      const updateData = {
        full_name: formData.full_name,
        is_admin: formData.is_admin,
        email: formData.email, // Update email in profile too
      };

      console.log('Update data:', updateData);

      let profileResult;
      if (existingProfile) {
        // Update existing profile
        const { error: profileError, data: profileData } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id)
          .select();

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw profileError;
        }
        profileResult = profileData;
      } else {
        // Create new profile if it doesn't exist
        console.log('Profile not found, creating new profile');
        const { error: profileError, data: profileData } = await supabase
          .from('profiles')
          .insert({
            id: editingUser.id,
            ...updateData,
          })
          .select();

        if (profileError) {
          console.error('Profile insert error:', profileError);
          throw profileError;
        }
        profileResult = profileData;
      }

      console.log('Profile operation result:', profileResult);

      setShowEditModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', confirmPassword: '', full_name: '', is_admin: false });
      await loadUsers(); // Wait for reload
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

    // Check if admin client is available
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

      // Handle specific Supabase admin errors
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

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter(user => user.is_admin).length;
  const totalUsers = users.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNav currentPage="admin-users" />

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <div className="flex space-x-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <span className="text-sm text-gray-600">Total Users:</span>
              <span className="ml-2 font-semibold text-gray-900">{totalUsers}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <span className="text-sm text-gray-600">Admins:</span>
              <span className="ml-2 font-semibold text-blue-600">{adminCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search users by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create User
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Sign In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_admin
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.is_admin ? (
                            <>
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            'Customer'
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms.' : 'No users have registered yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center">
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
                <div className="flex space-x-3 pt-4">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (leave empty to keep current)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {formData.password && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center">
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
                <div className="flex space-x-3 pt-4">
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
    </div>
  );
}
