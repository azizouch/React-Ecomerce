import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import { supabase, Profile } from '../../../lib/supabase';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Mail, Phone, MapPin, Calendar, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export function Profile() {
  const { profile: authProfile } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(authProfile || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
  });

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
      setFormData({
        first_name: authProfile.first_name || '',
        last_name: authProfile.last_name || '',
        phone: authProfile.phone || '',
        address: authProfile.address || '',
        city: authProfile.city || '',
      });
    }
  }, [authProfile]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
      });

      setIsEditing(false);
      toast.success(t('updateSuccess'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
      });
    }
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U';
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '';
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.full_name || profile.email;
  const roleDisplay = profile.role === 'customer' ? t('user') : profile.role;

  const getRoleBadgeClassName = () => {
    if (profile.role === 'admin') {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('myProfile')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                {t('cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? t('saving') : t('save')}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('modify')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Profile Card - Left Column */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src=""
                  alt={fullName}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl">{fullName}</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge className={getRoleBadgeClassName()}>
                {roleDisplay}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">{profile.email}</span>
            </div>
            {formData.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">{formData.phone}</span>
              </div>
            )}
            {formData.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">{formData.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {t('memberSince')} {memberSince}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information - Right Column */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('personalInformation')}</CardTitle>
            <CardDescription>
              {t('updatePersonalInfo')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {/* Row 1: First Name and Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1 md:space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('firstName')}</label>
                {isEditing ? (
                  <Input
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder={t('firstName')}
                  />
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                    {formData.first_name || t('notProvided')}
                  </p>
                )}
              </div>

              <div className="space-y-1 md:space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('lastName')}</label>
                {isEditing ? (
                  <Input
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder={t('lastName')}
                  />
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                    {formData.last_name || t('notProvided')}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Email and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1 md:space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('email')}</label>
                <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                  {profile.email}
                </p>
              </div>

              <div className="space-y-1 md:space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('phone')}</label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+212 6XX-XXXXXX"
                  />
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                    {formData.phone || t('notProvided')}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Address */}
            <div className="space-y-1 md:space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('address')}</label>
              {isEditing ? (
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder={t('address')}
                />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                  {formData.address || t('notProvided')}
                </p>
              )}
            </div>

            {/* Row 4: City */}
            <div className="space-y-1 md:space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('city')}</label>
              {isEditing ? (
                <Input
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder={t('city')}
                />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
                  {formData.city || t('notProvided')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
