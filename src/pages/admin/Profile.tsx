import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import AdminNav from '../../components/AdminNav';
import AdminFooter from '../../components/AdminFooter';
import SoftCard from '../../components/ui/SoftCard';
import { User, Mail, Calendar, Shield, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    setError(null);
    setSuccess(null);

    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return;
    }

    try {
      setIsSaving(true);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Refresh profile context
      await refreshProfile?.();

      setSuccess('Profile updated successfully!');
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      email: profile?.email || '',
    });
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNav currentPage="admin-profile" />

        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Admin Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your profile information and account settings.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <SoftCard className="lg:col-span-2 dark:bg-slate-800">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100">{profile?.full_name || 'Not set'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Address
                </label>
                <p className="text-gray-900 dark:text-gray-100">{profile?.email || 'N/A'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
              </div>

              {/* Account Type */}
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="w-4 h-4 mr-2" />
                  Account Type
                </label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                    Administrator
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Full system access</p>
                </div>
              </div>

              {/* Joined Date */}
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  Member Since
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>

              {/* Last Sign In */}
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  Last Sign In
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {profile?.last_sign_in_at
                    ? new Date(profile.last_sign_in_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex space-x-4 border-t border-gray-200 dark:border-slate-700 pt-6">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center space-x-2 px-6 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition font-medium"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </SoftCard>

          {/* Quick Info Card */}
          <SoftCard className="dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Info</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Status</p>
                <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mt-1">Active</p>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Role</p>
                <p className="text-sm text-emerald-900 dark:text-emerald-200 font-medium mt-1">System Administrator</p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase">Permissions</p>
                <p className="text-sm text-purple-900 dark:text-purple-200 font-medium mt-1">Full Access</p>
              </div>
            </div>
          </SoftCard>
        </div>
      </div>
      <AdminFooter />
    </div>
  );
}
