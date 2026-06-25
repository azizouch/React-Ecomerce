 
 
 const handleAddUser = async () => {
    // Basic validation
    if (!newUser.nom || !newUser.prenom || !newUser.email || !newUser.password) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email.trim())) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir une adresse email valide',
        variant: 'destructive',
      });
      return;
    }

    // Password validation
    if (newUser.password.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
        variant: 'destructive',
      });
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      });
      return;
    }

    // Additional validation for Livreur role
    if (newUser.role === 'Livreur') {
      if (!newUser.zone || !newUser.vehicule) {
        toast({
          title: 'Erreur',
          description: 'Veuillez remplir la zone et le véhicule pour les livreurs',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      // Normalize email before sending
      const normalizedEmail = newUser.email.toLowerCase().trim();

      const userData = {
        nom: newUser.nom.trim(),
        prenom: newUser.prenom.trim(),
        email: normalizedEmail,
        telephone: newUser.telephone.trim(),
        role: newUser.role,
        statut: newUser.statut,
        adresse: newUser.adresse.trim(),
        ville: newUser.ville.trim(),
        zone: newUser.role === 'Livreur' ? newUser.zone.trim() : undefined,
        vehicule: newUser.role === 'Livreur' ? newUser.vehicule.trim() : undefined,
        password: newUser.password,
      };

      // Additional email validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new Error(`Format d'email invalide: ${normalizedEmail}`);
      }

      // Use the admin create function (doesn't affect current session)
      const { data, error, authCreated } = await auth.createUserWithAuthAdmin(userData);

      if (error) {
        throw error;
      }

      // Success message
      const message = authCreated
        ? 'L\'utilisateur a été créé avec succès avec des identifiants de connexion.'
        : 'L\'utilisateur a été créé avec succès. Note: Les identifiants de connexion devront être configurés manuellement.';

      toast({
        title: 'Succès',
        description: message,
      });

      // Reset form and refresh list
      await fetchUsers();
      setShowAddModal(false);
      setNewUser({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        role: 'Gestionnaire',
        statut: 'Actif',
        adresse: '',
        ville: '',
        zone: '',
        vehicule: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d\'ajouter l\'utilisateur',
        variant: 'destructive',
      });
    }
  };
 const handleEditUser = async (user: User) => {
    try {
      // Fetch full user details including email
      const { data: fullUser, error } = await api.getUserById(user.id);

      if (error || !fullUser) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données de l\'utilisateur',
          variant: 'destructive',
        });
        return;
      }

      setEditingUser(fullUser);
      setNewUser({
        nom: fullUser.nom,
        prenom: fullUser.prenom,
        email: fullUser.email || '', // Use email from getUserById
        telephone: fullUser.telephone,
        role: fullUser.role,
        statut: fullUser.statut,
        adresse: fullUser.adresse,
        ville: fullUser.ville,
        zone: fullUser.zone || '',
        vehicule: fullUser.vehicule || '',
        password: '',
        confirmPassword: '',
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données de l\'utilisateur',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !newUser.nom || !newUser.prenom || !newUser.email) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    // Validate password if provided
    if (newUser.password && newUser.password.trim() !== '') {
      if (newUser.password.length < 6) {
        toast({
          title: 'Erreur',
          description: 'Le mot de passe doit contenir au moins 6 caractères',
          variant: 'destructive',
        });
        return;
      }

      if (newUser.password !== newUser.confirmPassword) {
        toast({
          title: 'Erreur',
          description: 'Les mots de passe ne correspondent pas',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      // Prepare update data for profile (excluding email/password - handled separately)
      const profileUpdates = {
        nom: newUser.nom,
        prenom: newUser.prenom,
        telephone: newUser.telephone || null,
        role: newUser.role,
        statut: newUser.statut,
        adresse: newUser.adresse || null,
        ville: newUser.ville || null,
        zone: newUser.role === 'Livreur' ? (newUser.zone || null) : null,
        vehicule: newUser.role === 'Livreur' ? (newUser.vehicule || null) : null,
      };

      // Use admin RPC to bypass RLS
      const { error: updateError } = await api.updateUserByIdAdmin(editingUser.id, profileUpdates);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Handle email update separately
      let hasWarnings = false;
      let emailUpdated = false;
      let passwordUpdated = false;

      if (newUser.email !== editingUser.email && editingUser.id) {
        // Need to get auth_id for email update - fetch full user details
        const { data: fullUser } = await api.getUserById(editingUser.id);
        if (fullUser?.auth_id) {
          const { data: emailData, error: emailError } = await api.updateUserEmail(fullUser.auth_id, newUser.email);
          if (emailError) {
            hasWarnings = true;
            toast({
              title: 'Attention',
              description: emailError.message || 'Impossible de mettre à jour l\'email.',
              variant: 'destructive',
            });
          } else if (emailData) {
            emailUpdated = true;
            // Refresh user data in auth context to update email in header
            await refreshUser();
          }
        }
      }

      // Handle password update separately
      if (newUser.password && newUser.password.trim() !== '') {
        const { data: fullUser } = await api.getUserById(editingUser.id);
        if (fullUser?.auth_id) {
          const { data: passwordData, error: passwordError } = await api.updateUserPassword(fullUser.auth_id, newUser.password);
          if (passwordError) {
            hasWarnings = true;
            toast({
              title: 'Attention',
              description: passwordError.message || 'Impossible de mettre à jour le mot de passe.',
              variant: 'destructive',
            });
          } else if (passwordData) {
            passwordUpdated = true;
          }
        }
      }

      if (!hasWarnings) {
        let successMessage = 'Utilisateur modifié avec succès';
        if (emailUpdated && passwordUpdated) {
          successMessage += '. Email et mot de passe mis à jour.';
        } else if (emailUpdated) {
          successMessage += '. Email mis à jour.';
        } else if (passwordUpdated) {
          successMessage += '. Mot de passe mis à jour.';
        }

        toast({
          title: 'Succès',
          description: successMessage,
        });
      }

      // Reset form and refresh list
      await fetchUsers();
      setShowEditModal(false);
      setEditingUser(null);
      setNewUser({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        role: 'Gestionnaire',
        statut: 'Actif',
        adresse: '',
        ville: '',
        zone: '',
        vehicule: '',
        password: '',
        confirmPassword: '',
      });

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de modifier l\'utilisateur',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Use the same delete function as livreurs
      const { data, error } = await api.deleteUser(userToDelete.id);

      if (error) {
        toast({
          title: 'Erreur',
          description: error.message || 'Impossible de supprimer l\'utilisateur',
          variant: 'destructive',
        });
        return;
      }

      // Provide feedback based on auth deletion status (same as livreurs)
      let description = 'Utilisateur supprimé avec succès';

      if (data?.authDeletionStatus === 'auth_success') {
        description = 'Utilisateur et compte d\'authentification supprimés avec succès';
      } else if (data?.authDeletionStatus === 'auth_failed') {
        description = 'Utilisateur supprimé, mais le compte d\'authentification n\'a pas pu être supprimé. Veuillez contacter l\'administrateur.';
      } else if (data?.authDeletionStatus === 'no_auth') {
        description = 'Utilisateur supprimé avec succès (aucun compte d\'authentification associé)';
      }

      toast({
        title: 'Succès',
        description,
      });

      // Reset and refresh
      await fetchUsers();
      setShowDeleteModal(false);
      setUserToDelete(null);

    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression',
        variant: 'destructive',
      });
    }
  };


  // Auth helpers
export const auth = {

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signUp: async (email: string, password: string, userData: { nom: string; prenom: string; role: string }) => {
    try {
      // Validate email format before sending to Supabase
      const normalizedEmail = email.toLowerCase().trim();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailRegex.test(normalizedEmail)) {
        throw new Error(`Format d'email invalide: ${normalizedEmail}`);
      }

      // Validate password strength
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      // First, try to create the auth user
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          // Don't set emailRedirectTo to undefined, just omit it
          data: {
            nom: userData.nom,
            prenom: userData.prenom,
            role: userData.role
          }
        }
      })

      // If there's an auth error, try to handle it gracefully
      if (error) {
        console.error('Auth signup error:', error);

        // Handle specific error types - but don't throw, return the error instead
        // This allows the calling code to handle fallback gracefully
        if (error.message.includes('invalid') || error.message.includes('Invalid')) {
          return { data: null, error: new Error(`Email invalide: ${error.message}`) };
        }

        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          return { data: null, error: new Error(`Un compte avec cet email existe déjà: ${normalizedEmail}`) };
        }

        if (error.message.includes('Password')) {
          return { data: null, error: new Error(`Erreur de mot de passe: ${error.message}`) };
        }

        // For any other auth error, return it instead of throwing
        return { data: null, error: new Error(`Erreur d'authentification: ${error.message}`) };
      }

      if (data.user) {
        // Create user profile in our utilisateurs table
        const { error: profileError } = await supabase
          .from('utilisateurs')
          .insert({
            auth_id: data.user.id,
            nom: userData.nom,
            prenom: userData.prenom,
            // Note: email is stored in auth.users table, not in utilisateurs table
            role: userData.role,
            statut: 'Actif',
            date_creation: new Date().toISOString(),
          })

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return { data, error: profileError }
        }
      }

      return { data, error }
    } catch (err: any) {
      console.error('SignUp function error:', err);
      // Return the error instead of throwing it to allow fallback handling
      return { data: null, error: err }
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut({ global: false })

      // Clear any stored auth data from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        localStorage.removeItem('sb-' + supabaseUrl.split('//')[1].split('.')[0] + '-auth-token')
      }

      return { error }
    } catch (error: any) {
      return { error }
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      // Handle specific auth errors gracefully
      if (error) {
        // These errors are expected when no session exists
        if (error.message.includes('Auth session missing') ||
            error.message.includes('Invalid Refresh Token') ||
            error.message.includes('Refresh Token Not Found')) {
          return { user: null, error: null } // Treat as no user logged in
        }
        return { user, error }
      }

      return { user, error }
    } catch (error: any) {
      return { user: null, error: null }
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Password reset functionality
  resetPassword: async (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { data: exists, error: existsError } = await supabase.rpc('check_auth_user_email_exists', {
        user_email: normalizedEmail,
      });

      if (existsError) {
        return { data: null, error: existsError };
      }

      if (!exists) {
        return { data: null, error: new Error('Aucun compte trouvé avec cette adresse email') };
      }
    } catch (error: any) {
      return { data: null, error };
    }

    // Use environment variable for production, fallback to current origin
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${baseUrl}/reset-password`,
    });
    return { data, error };
  },

  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  },

  // Upload profile image
  uploadProfileImage: async (file: File, userId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        if (error.message.includes('Bucket not found')) {
          throw new Error('Le bucket de stockage n\'existe pas. Veuillez contacter l\'administrateur.');
        }
        if (error.message.includes('The resource already exists')) {
          throw new Error('Un fichier avec ce nom existe déjà. Veuillez réessayer.');
        }
        throw new Error(`Erreur lors de l'upload: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      return { data: { path: filePath, url: publicUrl }, error: null };
    } catch (error: any) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erreur inconnue lors de l\'upload')
      };
    }
  },

  // Delete profile image
  deleteProfileImage: async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('profile-images')
        .remove([filePath]);

      return { error };
    } catch (error) {
      return { error };
    }
  },


  // Check if auth user exists using database function
  checkAuthUserExists: async (authId: string) => {
    try {
      const { data, error } = await supabase.rpc('check_auth_user_exists', {
        user_id: authId
      });

      if (error) {
        console.error('Error checking auth user:', error);
        return { exists: false, error };
      }

      return { exists: data === true, error: null };
    } catch (error) {
      console.error('Failed to check auth user existence:', error);
      return { exists: false, error: error as any };
    }
  },

  // Delete auth user using database function
  deleteAuthUser: async (authId: string) => {
    try {
      // First check if the auth user exists
      const { exists, error: checkError } = await auth.checkAuthUserExists(authId);

      if (checkError) {
        return { data: null, error: checkError };
      }

      if (!exists) {
        // Auth user doesn't exist, consider it already deleted
        return { data: { success: true, message: 'Auth user already deleted' }, error: null };
      }

      // Use the database function to delete auth user
      const { data, error } = await supabase.rpc('delete_auth_user', {
        user_id: authId
      });

      if (error) {
        console.error('Database function error:', error);
        return { data: null, error: {
          message: `Failed to delete auth user: ${error.message}`,
          code: 'DB_FUNCTION_ERROR'
        }};
      }

      // Check the result from the database function
      if (data === 'success' || data?.includes('success')) {
        return { data: { success: true, message: data }, error: null };
      } else {
        return { data: null, error: {
          message: `Auth user deletion failed: ${data}`,
          code: 'AUTH_DELETE_FAILED'
        }};
      }
    } catch (error) {
      console.error('Failed to call delete_auth_user function:', error);
      return { data: null, error: {
        message: 'Failed to call auth deletion function',
        code: 'FUNCTION_CALL_FAILED'
      }};
    }
  },

  // 1. CREATE: User + Auth
  createUserWithAuth: async (userData: {
    nom: string;
    prenom: string;
    email: string;
    password: string;
    role: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
    vehicule?: string;
    zone?: string;
    statut: string;
  }) => {
    try {
      const normalizedEmail = userData.email.toLowerCase().trim();

      // Create auth user directly - let Supabase handle duplicate detection

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: userData.password
      });

      if (authError || !authData.user) {
        if (authError?.message.includes('already registered')) {
          return {
            data: null,
            error: new Error(`Un utilisateur avec l'email "${normalizedEmail}" existe déjà.`),
            authCreated: false
          };
        }
        throw authError;
      }

      // Create profile
      const { data, error } = await supabase
        .from('utilisateurs')
        .insert({
          auth_id: authData.user.id,
          nom: userData.nom,
          prenom: userData.prenom,
          role: userData.role,
          statut: userData.statut,
          telephone: userData.telephone || null,
          adresse: userData.adresse || null,
          ville: userData.ville || null,
          vehicule: userData.vehicule || null,
          zone: userData.zone || null,
          date_creation: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null, authCreated: true };

    } catch (err: any) {
      return { data: null, error: err, authCreated: false };
    }
  },

  // 2. UPDATE: User + Auth
  updateUserWithAuth: async (userId: string, updates: {
    nom?: string;
    prenom?: string;
    email?: string;
    password?: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
    vehicule?: string;
    zone?: string;
    statut?: string;
  }) => {
    try {
      // Get user to find auth_id
      const { data: user } = await api.getUserById(userId);
      if (!user) throw new Error('Utilisateur non trouvé');

      // Update profile
      const profileUpdates = { ...updates };
      delete profileUpdates.email;
      delete profileUpdates.password;

      const { data, error } = await api.updateUserById(userId, profileUpdates);
      if (error) throw error;

      // Update email if provided
      if (updates.email && user.auth_id) {
        await api.updateUserEmail(user.auth_id, updates.email);
      }

      // Update password if provided
      if (updates.password && user.auth_id) {
        await api.updateUserPassword(user.auth_id, updates.password);
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  // 3. DELETE: User + Auth
  deleteUserWithAuth: async (userId: string) => {
    try {
      // Get user to find auth_id
      const { data: user } = await api.getUserById(userId);
      if (!user) throw new Error('Utilisateur non trouvé');

      // Delete auth user if exists
      if (user.auth_id) {
        try {
          // Try multiple approaches to delete auth user

          // Method 1: Try RPC function
          const { error: rpcError } = await supabase.rpc('delete_auth_user', {
            user_id: user.auth_id
          });

          if (rpcError) {
            console.warn('RPC delete_auth_user failed:', rpcError);

            // Method 2: Try simple RPC function
            const { error: simpleRpcError } = await supabase.rpc('delete_auth_user_simple', {
              auth_user_id: user.auth_id
            });

            if (simpleRpcError) {
              console.warn('Simple RPC delete failed:', simpleRpcError);

              // Method 3: Try admin delete (might not work due to permissions)
              try {
                const { error: adminError } = await supabase.auth.admin.deleteUser(user.auth_id);
                if (adminError) {
                  console.warn('Admin delete failed:', adminError);
                }
              } catch (adminErr) {
                console.warn('Admin delete not available:', adminErr);
              }
            }
          }
        } catch (deleteError) {
          console.warn('Auth user deletion failed:', deleteError);
          // Continue with profile deletion even if auth deletion fails
        }
      }

      // Delete profile
      const { error } = await supabase
        .from('utilisateurs')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  // ADMIN VERSION: Create user without affecting current session
  createUserWithAuthAdmin: async (userData: {
    nom: string;
    prenom: string;
    email: string;
    password: string;
    role: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
    vehicule?: string;
    zone?: string;
    statut: string;
  }) => {
    try {
      const normalizedEmail = userData.email.toLowerCase().trim();

      // Try to create auth user via RPC function first (cleanest approach)
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_auth_user_admin', {
          user_email: normalizedEmail,
          user_password: userData.password,
          user_metadata: {
            nom: userData.nom,
            prenom: userData.prenom,
            role: userData.role
          }
        });

        if (!rpcError && rpcResult?.id) {
          // RPC success - create profile
          const { data, error } = await supabase
            .from('utilisateurs')
            .insert({
              auth_id: rpcResult.id,
              nom: userData.nom,
              prenom: userData.prenom,
              role: userData.role,
              statut: userData.statut,
              telephone: userData.telephone || null,
              adresse: userData.adresse || null,
              ville: userData.ville || null,
              vehicule: userData.vehicule || null,
              zone: userData.zone || null,
              date_creation: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;
          return { data, error: null, authCreated: true };
        }
      } catch (rpcError) {
        console.warn('RPC function failed, using fallback method');
      }

      // Fallback: Use separate client (current working method)
      const { createClient } = await import('@supabase/supabase-js');
      const adminClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            storage: undefined,
          },
        }
      );

      const { data: authData, error: authError } = await adminClient.auth.signUp({
        email: normalizedEmail,
        password: userData.password
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return {
            data: null,
            error: new Error(`Un utilisateur avec l'email "${normalizedEmail}" existe déjà.`),
            authCreated: false
          };
        }
        throw authError;
      }

      await adminClient.auth.signOut();

      const { data, error } = await supabase
        .from('utilisateurs')
        .insert({
          auth_id: authData.user?.id,
          nom: userData.nom,
          prenom: userData.prenom,
          role: userData.role,
          statut: userData.statut,
          telephone: userData.telephone || null,
          adresse: userData.adresse || null,
          ville: userData.ville || null,
          vehicule: userData.vehicule || null,
          zone: userData.zone || null,
          date_creation: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null, authCreated: true };

    } catch (err: any) {
      return { data: null, error: err, authCreated: false };
    }
  }
}