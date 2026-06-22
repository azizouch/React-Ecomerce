/*
  SQL Functions to create in Supabase Database:

  1. Get user email by auth ID:
  CREATE OR REPLACE FUNCTION get_user_email_by_auth_id(auth_user_id uuid)
  RETURNS text
  LANGUAGE sql
  SECURITY DEFINER
  AS $$
    SELECT email FROM auth.users WHERE id = auth_user_id;
  $$;

  2. Create auth user (bypasses client-side validation):
  CREATE OR REPLACE FUNCTION create_auth_user_admin(
    user_email text,
    user_password text,
    user_metadata jsonb DEFAULT '{}'::jsonb
  )
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    new_user_id uuid;
    result json;
  BEGIN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();

    -- Insert directly into auth.users table
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      user_email,
      crypt(user_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      user_metadata,
      false,
      'authenticated'
    );

    -- Return the created user info
    result := json_build_object(
      'id', new_user_id,
      'email', user_email,
      'created_at', now()
    );

    RETURN result;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'error', SQLERRM,
        'code', SQLSTATE
      );
  END;
  $$;

  This function allows us to create auth users server-side, bypassing client validation.
*/

import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import { User, Client, Entreprise, Colis, Statut, HistoriqueColis, Notification, Bon, BonHistorique } from '@/types'
import { Toast } from '@radix-ui/react-toast'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

declare global {
  interface Window {
    __supabase?: SupabaseClient;
  }
}

// Singleton pattern to prevent multiple instances and keep the same client during Vite HMR
let supabaseInstance: SupabaseClient | null = null

const getSupabaseClient = (): SupabaseClient => {
  if (typeof window !== 'undefined') {
    if (!window.__supabase) {
      window.__supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          debug: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'logitrack-web'
          }
        }
      })
    }
    return window.__supabase
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        debug: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'logitrack-web'
        }
      }
    })
  }

  // DISABLED: Session monitoring to prevent duplicate auth state change listeners
  // The AuthContext already handles all auth state changes
  /*
  if (typeof window !== 'undefined') {
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed successfully
        console.log('Supabase: Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        // Clear any application-level caches here if needed
        console.log('Supabase: User signed out');
      }
    });
  }
  */

  return supabaseInstance
}

export const supabase: SupabaseClient = getSupabaseClient()

const normalizeStatut = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const isDeliveredStatut = (value?: string) => {
  const statut = normalizeStatut(value)
  return statut === 'livre'
}

const isReturnedStatut = (value?: string) => {
  const statut = normalizeStatut(value)
  return statut === 'retourne' || statut === 'retour'
}

const isDeduitStatut = (value?: string) => {
  const statut = normalizeStatut(value)
  return statut === 'deduit'
}

export interface ApiResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      utilisateurs: {
        Row: User
        Insert: Omit<User, 'id' | 'date_creation'>
        Update: Partial<Omit<User, 'id'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at'>
        Update: Partial<Omit<Client, 'id'>>
      }
      entreprises: {
        Row: Entreprise
        Insert: Omit<Entreprise, 'id' | 'created_at'>
        Update: Partial<Omit<Entreprise, 'id'>>
      }
      colis: {
        Row: Colis
        Insert: Omit<Colis, 'id' | 'date_creation'>
        Update: Partial<Omit<Colis, 'id'>>
      }
      statuts: {
        Row: Statut
        Insert: Omit<Statut, 'id' | 'created_at'>
        Update: Partial<Omit<Statut, 'id'>>
      }
      historique_colis: {
        Row: HistoriqueColis
        Insert: Omit<HistoriqueColis, 'id'>
        Update: Partial<Omit<HistoriqueColis, 'id'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'date_creation'>
        Update: Partial<Omit<Notification, 'id'>>
      }
      bons: {
        Row: Bon
        Insert: Omit<Bon, 'id' | 'date_creation'>
        Update: Partial<Omit<Bon, 'id'>>
      }
    }
  }
}

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

// Data fetching helpers
export const api = {
  // Users
  getUsers: async () => {
    try {
      // Get users from the utilisateurs table
      const { data: users, error: usersError } = await supabase
        .from('utilisateurs')
        .select('*')
        .order('date_creation', { ascending: false });

      if (usersError) {
        return { data: null, error: usersError };
      }

      // Try to add emails for users using the existing RPC function
      const usersWithEmailsAdded = await Promise.all(
        users.map(async (user) => {
          const normalizeTimestamp = (value: any) => {
            if (!value) return null as string | null;
            // If the DB already returned a string, return it as-is so the frontend
            // can decide whether to treat it as local or UTC. Converting here to
            // UTC with toISOString() caused an unwanted -offset shift when the
            // DB stored naive local timestamps.
            if (typeof value === 'string') {
              return value;
            }
            // If we receive a Date-like object, convert to ISO as a fallback
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date.toISOString();
          };

          try {
            const { data: userWithEmail } = await supabase.rpc('get_user_with_email', {
              user_id: user.id
            });
            const email = userWithEmail?.email || '';
            return {
              ...user,
              email,
              derniere_connexion: normalizeTimestamp(user.derniere_connexion),
              nouvelle_connexion: normalizeTimestamp(user.nouvelle_connexion),
            };
          } catch (e) {
            // Ignore individual errors - email will remain empty
            return {
              ...user,
              email: '',
              derniere_connexion: normalizeTimestamp(user.derniere_connexion),
              nouvelle_connexion: normalizeTimestamp(user.nouvelle_connexion),
            };
          }
        })
      );

      return { data: usersWithEmailsAdded, error: null };
    } catch (error) {
      // Fallback: basic query without emails
      const { data, error: basicError } = await supabase
        .from('utilisateurs')
        .select('*')
        .order('date_creation', { ascending: false });

      return { data, error: basicError };
    }
  },

  getUserById: async (id: string) => {
    try {
      // Use the RPC function that joins with auth.users
      const { data: userWithEmail, error: rpcError } = await supabase.rpc('get_user_with_email', {
        user_id: id
      });

      if (!rpcError && userWithEmail) {
        return {
          data: userWithEmail,
          error: null
        };
      }

      // Fallback: basic query without email
      const { data: userData, error: userError } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id', id)
        .single();

      return { data: userData, error: userError };

    } catch (error) {
      console.warn('Error in getUserById:', error);
      // Final fallback to basic query
      const { data, error: basicError } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id', id)
        .single()
      return { data, error: basicError }
    }
  },

  getUserByAuthId: async (authId: string) => {
    try {
      // Ensure there is an authenticated session before making a query
      const { data: authUser, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser?.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Find user by auth_id (correct relationship)
      const { data: userData, error: userError } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (userError) {
        return { data: null, error: userError };
      }

      return { data: userData, error: null };

    } catch (err) {
      return { data: null, error: err as any }
    }
  },

  getUserByEmail: async (email: string) => {
    try {
      // Get the current authenticated user
      const { data: authUser, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser.user) {
        return { data: null, error: authError };
      }

      const authUserId = authUser.user.id;

      // Find user by auth_id (correct relationship)
      const { data: userData, error: userError } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('auth_id', authUserId)
        .single();

      if (!userError && userData) {
        const userWithEmail = {
          ...userData,
          email: email
        };
        return { data: userWithEmail, error: null };
      }

      return { data: null, error: { message: 'User profile not found in database' } };

    } catch (err) {
      return { data: null, error: err as any }
    }
  },

  // Colis with pagination and filtering
  getColis: async (options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    livreurId?: string;
    entrepriseId?: string;
    sortBy?: 'recent' | 'oldest' | 'status';
    dateFilter?: string;
    includeBonColis?: boolean;
    deliveredBeforeToday?: boolean;
    _refresh?: boolean; // Cache-busting parameter
  } = {}): Promise<{
    data: Colis[] | null;
    error: PostgrestError | null;
    count: number | null;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> => {

    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      livreurId = '',
      entrepriseId = '',
      sortBy = 'recent',
      dateFilter = '',
      includeBonColis = false,
      deliveredBeforeToday = false,
      _refresh = false
    } = options;

    const selectFields = [
      '*',
      'client:clients(id, nom, telephone, email, adresse, ville)',
      'entreprise:entreprises(id, nom, telephone, email)',
      'livreur:utilisateurs(id, nom, prenom, telephone)'
    ];

    if (includeBonColis) {
      selectFields.push('bon_colis:bon_colis(bon:bons(type, statut, source_type))');
    }

    let query = supabase
      .from('colis')
      .select(selectFields.join(',\n'), {
        count: 'exact',
        // Force fresh data when refreshing
        ...(typeof window !== 'undefined' && _refresh && {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      });

        // Apply search filter - comprehensive search across multiple fields
      if (search) {
        // First, get client IDs that match the search term
        const { data: matchingClients } = await supabase
          .from('clients')
          .select('id')
          .ilike('nom', `%${search}%`);

        // Get entreprise IDs that match the search term
        const { data: matchingEntreprises } = await supabase
          .from('entreprises')
          .select('id')
          .ilike('nom', `%${search}%`);

        const clientIds = matchingClients?.map(c => c.id) || [];
        const entrepriseIds = matchingEntreprises?.map(e => e.id) || [];

        // Build OR conditions for search
        const searchConditions = [`id.ilike.%${search}%`];

        if (clientIds.length > 0) {
          searchConditions.push(`client_id.in.(${clientIds.join(',')})`);
        }

        if (entrepriseIds.length > 0) {
          searchConditions.push(`entreprise_id.in.(${entrepriseIds.join(',')})`);
        }

        query = query.or(searchConditions.join(','));
      }

      // Apply status filter
      if (status && status !== 'all') {
        query = query.eq('statut', status);
      }

      // Apply date filter
      if (dateFilter && dateFilter !== 'toutes') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        switch (dateFilter) {
          case 'aujourd_hui':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'hier':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7_derniers_jours':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30_derniers_jours':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'ce_mois':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'le_mois_dernier':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
          default:
            startDate = new Date(0); // No filter
        }

        if (startDate) {
          query = query.gte('date_creation', startDate.toISOString());
          if (endDate && dateFilter !== 'aujourd_hui' && dateFilter !== '7_derniers_jours' && dateFilter !== '30_derniers_jours' && dateFilter !== 'ce_mois') {
            query = query.lte('date_creation', endDate.toISOString());
          }
        }
      }

      // Apply livreur filter
      if (livreurId && livreurId !== 'all') {
        if (livreurId === 'unassigned') {
          query = query.is('livreur_id', null);
        } else {
          query = query.eq('livreur_id', livreurId);
        }
      }

      // Apply entreprise filter
      if (entrepriseId && entrepriseId !== 'all') {
        query = query.eq('entreprise_id', entrepriseId);
      }

      // Exclude colis delivered today when requested (manual paiement bon eligibility)
      if (deliveredBeforeToday) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.lt('date_mise_a_jour', today.toISOString());
      }

      // Apply sorting
      switch (sortBy) {
        case 'oldest':
          query = query.order('date_creation', { ascending: true });
          break;
        case 'status':
          query = query.order('statut', { ascending: true }).order('date_creation', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('date_creation', { ascending: false });
          break;
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      return {
        data,
        error,
        count,
        totalPages: count ? Math.ceil(count / limit) : 0,
        currentPage: page,
        hasNextPage: count ? (page * limit) < count : false,
        hasPrevPage: page > 1
      };
  },

  // Original getColis for backward compatibility
  getAllColis: async () => {
    const { data, error } = await supabase
      .from('colis')
      .select(`
        *,
        client:clients!left(*),
        entreprise:entreprises!left(*),
        livreur:utilisateurs!left(*)
      `)
      .order('date_creation', { ascending: false })
    return { data, error }
  },

  getColisById: async (id: string) => {
    const { data, error } = await supabase
      .from('colis')
      .select(`
        *,
        client:clients!left(*),
        entreprise:entreprises!left(*),
        livreur:utilisateurs!left(*)
      `)
      .eq('id', id)
      .single()
    return { data, error }
  },

  getColisByStatus: async (status: string) => {
    const { data, error } = await supabase
      .from('colis')
      .select(`
        *,
        client:clients(*),
        entreprise:entreprises(*),
        livreur:utilisateurs(*)
      `)
      .eq('statut', status)
      .order('date_creation', { ascending: false })
    return { data, error }
  },

  getColisByClientId: async (clientId: string) => {
    const { data, error } = await supabase
      .from('colis')
      .select(`
        *,
        client:clients(*),
        entreprise:entreprises(*),
        livreur:utilisateurs(*)
      `)
      .eq('client_id', clientId)
      .order('date_creation', { ascending: false })
    return { data, error }
  },

  getColisByEntrepriseId: async (entrepriseId: string) => {
    const { data, error } = await supabase
      .from('colis')
      .select(`
        *,
        client:clients(*),
        entreprise:entreprises(*),
        livreur:utilisateurs(*)
      `)
      .eq('entreprise_id', entrepriseId)
      .order('date_creation', { ascending: false })
    return { data, error }
  },

  // Get unassigned colis for adding to bon (not in any bon_colis)
  getUnassignedColis: async (search?: string, limit: number = 20) => {
    try {
      let query = supabase
        .from('colis')
        .select(`
          *,
          client:clients(id, nom, telephone),
          entreprise:entreprises(id, nom)
        `);

      if (search) {
        query = query.or(`id.ilike.%${search}%,client.nom.ilike.%${search}%,entreprise.nom.ilike.%${search}%`);
      }

      // Not assigned to any bon
      const { data: allColis, error: allError } = await query.limit(limit * 2);

      if (allError || !allColis) return { data: [], error: allError };

      // Get all bon_colis to exclude assigned colis
      const { data: bonColis, error: bcError } = await supabase
        .from('bon_colis')
        .select('colis_id');

      if (bcError) console.warn('Could not fetch bon_colis for exclusion:', bcError);

      const assignedColisIds = new Set((bonColis || []).map((bc: any) => bc.colis_id));

      const unassigned = allColis.filter((colis: any) => !assignedColisIds.has(colis.id));

      return { data: unassigned.slice(0, limit), error: null };
    } catch (error) {
      return { data: [], error: error as any };
    }
  },

  // Add colis to bon_colis junction
  addColisToBon: async (bonId: string, colisIds: string[], skipHistory: boolean = false) => {
    try {
      const { data: bon, error: bonError } = await supabase
        .from('bons')
        .select('id, type, statut, source_type, assigned_to, user_id')
        .eq('id', bonId)
        .single();

      if (bonError) {
        console.warn('Could not fetch bon info before adding colis to bon:', bonError);
      }

      const records = colisIds.map(colisId => ({
        bon_id: bonId,
        colis_id: colisId,
        date_assigned: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('bon_colis')
        .insert(records)
        .select();

      let actionUserId: string | null = null;
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData?.user?.id) {
          const { data: currentUser, error: currentUserError } = await supabase
            .from('utilisateurs')
            .select('id')
            .eq('auth_id', authData.user.id)
            .single();

          if (!currentUserError && currentUser?.id) {
            actionUserId = currentUser.id;
          }
        }
      } catch (authUserError) {
        console.warn('Could not resolve current action user for bon history entry:', authUserError);
      }

      if (!error && bon && colisIds.length > 0 && !skipHistory) {
        const bonHistoryPayload = {
          bon_id: bonId,
          type: bon.type,
          utilisateur: actionUserId || undefined,
          statut: bon.statut || 'Mise à jour',
          notes: colisIds.length === 1
            ? `Ajout du colis ${colisIds[0]} au bon ${bonId}`
            : `Ajout de ${colisIds.length} colis au bon ${bonId}`,
          date: new Date().toISOString(),
        };

        const { error: bonHistoryError } = await supabase
          .from('bons_historique')
          .insert([bonHistoryPayload]);

        if (bonHistoryError) {
          console.error('Error creating bon history entry when adding colis to bon:', bonHistoryError);
        }
      }

      if (!error && bon && bon.source_type === 'livreur' && bon.type === 'distribution' && colisIds.length > 0) {
        const livreurId = bon.assigned_to || bon.user_id;
        if (livreurId) {
          const { error: colisUpdateError } = await supabase
            .from('colis')
            .update({
              livreur_id: livreurId,
              statut: 'Mise en distribution',
              date_mise_a_jour: new Date().toISOString(),
            })
            .in('id', colisIds);

          if (colisUpdateError) {
            console.error('Error updating colis when adding to bon:', colisUpdateError);
          }

          let livreurName: string | null = null;

          const { data: user, error: userError } = await supabase
            .from('utilisateurs')
            .select('nom, prenom')
            .eq('id', livreurId)
            .single();

          if (!userError && user) {
            livreurName = [user.nom, user.prenom].filter(Boolean).join(' ');
          }

          const historiqueRecords = colisIds.map((colisId) => ({
            colis_id: colisId,
            date: new Date().toISOString(),
            statut: 'Mise en distribution',
            utilisateur: actionUserId || undefined,
            informations: livreurName
              ? `Ajouter au bon ${bonId} pour livreur ${livreurName}`
              : `Ajouter au bon ${bonId}`,
          }));

          const { error: historiqueError } = await supabase
            .from('historique_colis')
            .insert(historiqueRecords);

          if (historiqueError) {
            console.error('Error creating historique_colis entries when adding colis to bon:', historiqueError);
          }
        }
      }

      return { data, error };
    } catch (error) {
      return { data: null, error: error as any };
    }
  },

  // Remove colis from bon_colis junction
  removeColisFromBon: async (bonId: string, colisId: string) => {
    try {
      const { data, error } = await supabase
        .from('bon_colis')
        .delete()
        .eq('bon_id', bonId)
        .eq('colis_id', colisId)
        .select();

      if (!error && data && data.length > 0) {
        const { data: bon, error: bonError } = await supabase
          .from('bons')
          .select('id, type, statut, assigned_to, user_id')
          .eq('id', bonId)
          .single();

        if (bonError) {
          console.warn('Could not fetch bon info after removing colis from bon:', bonError);
        }

        let actionUserId: string | null = null;
        try {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (!authError && authData?.user?.id) {
            const { data: currentUser, error: currentUserError } = await supabase
              .from('utilisateurs')
              .select('id')
              .eq('auth_id', authData.user.id)
              .single();

            if (!currentUserError && currentUser?.id) {
              actionUserId = currentUser.id;
            }
          }
        } catch (authUserError) {
          console.warn('Could not resolve current action user for bon history entry:', authUserError);
        }

        const livreurId = bon?.assigned_to || bon?.user_id || null;
        let livreurName: string | null = null;

        // Only include livreur name if this is NOT an admin distribution bon
        if (livreurId && bon?.type !== 'distribution') {
          const { data: user, error: userError } = await supabase
            .from('utilisateurs')
            .select('nom, prenom')
            .eq('id', livreurId)
            .single();

          if (!userError && user) {
            livreurName = [user.nom, user.prenom].filter(Boolean).join(' ');
          }
        }

        const { error: colisUpdateError } = await supabase
          .from('colis')
          .update({
            livreur_id: null,
            statut: 'Nouveau Colis',
            date_mise_a_jour: new Date().toISOString(),
          })
          .eq('id', colisId);

        if (colisUpdateError) {
          console.error('Error updating colis after removing from bon:', colisUpdateError);
        }

        const historiqueRecord = {
          colis_id: colisId,
          date: new Date().toISOString(),
          statut: 'Nouveau Colis',
          utilisateur: actionUserId || undefined,
          informations: livreurName
            ? `Retiré du bon ${bonId} du livreur ${livreurName}`
            : `Retiré du bon ${bonId}`,
        };

        const { error: historiqueError } = await supabase
          .from('historique_colis')
          .insert([historiqueRecord]);

        if (historiqueError) {
          console.error('Error creating historique_colis entry after removing colis from bon:', historiqueError);
        }

        if (bon && bon.type) {
          const bonHistoryPayload = {
            bon_id: bonId,
            type: bon.type,
            utilisateur: actionUserId || undefined,
            statut: bon.statut || 'Mise à jour',
            notes: `Retrait du colis ${colisId} du bon ${bonId}`,
            date: new Date().toISOString(),
          };

          const { error: bonHistoryError } = await supabase
            .from('bons_historique')
            .insert([bonHistoryPayload]);

          if (bonHistoryError) {
            console.error('Error creating bon history entry after removing colis from bon:', bonHistoryError);
          }
        }
      }

      return { data, error };
    } catch (error) {
      return { data: null, error: error as any };
    }
  },

  getColisByBonId: async (bonId: string) => {
    try {
      const fetchColisWithRelations = async (colisIds: string[]) => {
        if (!colisIds || colisIds.length === 0) {
          return { data: [], error: null };
        }

        // Fetch all colis in one query with their relationships
        const { data: colisData, error: colisError } = await supabase
          .from('colis')
          .select(`
            *,
            client:clients(*),
            entreprise:entreprises(*),
            livreur:utilisateurs(*),
            bon_colis:bon_colis(bon:bons(type, statut, source_type))
          `)
          .in('id', colisIds);

        if (!colisError) {
          return { data: colisData || [], error: null };
        }

        console.error('Error fetching colis by IDs:', colisError);

        // Fallback: try without relationships
        const { data: simpleColisData, error: simpleError } = await supabase
          .from('colis')
          .select('*')
          .in('id', colisIds);

        if (simpleError) {
          console.error('Fallback also failed:', simpleError);
          return { data: [], error: simpleError };
        }

        // Fetch related data separately for fallback
        if (simpleColisData && simpleColisData.length > 0) {
          const clientIds = [...new Set(simpleColisData.map((c: any) => c.client_id).filter(Boolean))];
          const entrepriseIds = [...new Set(simpleColisData.map((c: any) => c.entreprise_id).filter(Boolean))];
          const livreurIds = [...new Set(simpleColisData.map((c: any) => c.livreur_id).filter(Boolean))];

          const [clientsResult, entreprisesResult, livreursResult] = await Promise.all([
            clientIds.length > 0
              ? supabase.from('clients').select('*').in('id', clientIds)
              : Promise.resolve({ data: [], error: null }),
            entrepriseIds.length > 0
              ? supabase.from('entreprises').select('*').in('id', entrepriseIds)
              : Promise.resolve({ data: [], error: null }),
            livreurIds.length > 0
              ? supabase.from('utilisateurs').select('*').in('id', livreurIds)
              : Promise.resolve({ data: [], error: null })
          ]);

          const clientsMap = (clientsResult.data || []).reduce((acc: any, c: any) => { acc[c.id] = c; return acc; }, {});
          const entreprisesMap = (entreprisesResult.data || []).reduce((acc: any, e: any) => { acc[e.id] = e; return acc; }, {});
          const livreursMap = (livreursResult.data || []).reduce((acc: any, l: any) => { acc[l.id] = l; return acc; }, {});

          const enrichedColis = simpleColisData.map((c: any) => ({
            ...c,
            client: clientsMap[c.client_id] || null,
            entreprise: entreprisesMap[c.entreprise_id] || null,
            livreur: livreursMap[c.livreur_id] || null,
          }));

          return { data: enrichedColis, error: null };
        }

        return { data: simpleColisData || [], error: null };
      };

      // Get the bon_colis relationships
      const { data: bonColisData, error: bonColisError } = await supabase
        .from('bon_colis')
        .select('colis_id')
        .eq('bon_id', bonId);
        

      if (bonColisError) {
        console.error('Error fetching bon_colis:', bonColisError);
      }

      // Extract colis IDs
      const colisIds = (bonColisData || []).map((item: any) => item.colis_id).filter(Boolean);

      // 🔍 TEST ACCESS TO colis TABLE
      const { data: testData, error: testError } = await supabase
        .from('colis')
        .select('*')
        .limit(1);

      // Primary source: bon_colis relation table
      if (colisIds.length > 0) {
        return await fetchColisWithRelations(colisIds);
      }

      // Fallback source: historique_colis entries referencing this bon
      // (covers legacy data and cases where bon_colis linking failed)
      const { data: historiqueData, error: historiqueError } = await supabase
        .from('historique_colis')
        .select('colis_id, informations')
        .or(`informations.ilike.%bon ${bonId}%,informations.ilike.%#${bonId}%`);

      if (historiqueError) {
        console.error('Error fetching historique_colis fallback for bon:', historiqueError);
        return { data: [], error: bonColisError || historiqueError };
      }

      const historiqueColisIds = [...new Set((historiqueData || []).map((item: any) => item.colis_id).filter(Boolean))] as string[];

      if (historiqueColisIds.length > 0) {
        return await fetchColisWithRelations(historiqueColisIds);
      }

      // Nothing found in either source
      return { data: [], error: bonColisError || null };
    } catch (error) {
      console.error('Error in getColisByBonId:', error);
      return { data: [], error: error as any };
    }
  },

  // Clients
  getClients: async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Entreprises
  getEntreprises: async () => {
    const { data, error } = await supabase
      .from('entreprises')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Livreurs for filters
  getLivreurs: async () => {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, telephone, role, vehicule, zone, ville')
      .eq('role', 'Livreur')
      .order('nom', { ascending: true })

    // For now, return without emails until RPC function is created
    // TODO: Uncomment when RPC function is created
    /*
    if (data && !error) {
      const livreursWithEmails = await Promise.all(
        data.map(async (livreur) => {
          if (livreur.auth_id) {
            try {
              const { data: emailData } = await supabase
                .rpc('get_user_email_by_auth_id', { auth_user_id: livreur.auth_id })

              if (emailData) {
                return { ...livreur, email: emailData }
              }
            } catch (rpcError) {
              // RPC not available, continue without email
            }
          }
          return livreur
        })
      )
      return { data: livreursWithEmails as Pick<User, 'id' | 'nom' | 'prenom' | 'statut' | 'email'>[], error }
    }
    */

    return { data: data as any, error }
  },

  // Statuts for filters
  getStatuts: async (type?: string) => {
    let query = supabase
      .from('statuts')
      .select('id, nom, type, couleur, ordre, actif, created_at')
      .eq('actif', true)
      .order('ordre', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    return { data, error }
  },

  // Get all statuts (including inactive ones) for management
  getAllStatuts: async (type?: string) => {
    let query = supabase
      .from('statuts')
      .select('*')
      .order('ordre', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    return { data, error }
  },

  // CRUD operations for Statuts
  createStatut: async (statut: Omit<Statut, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('statuts')
      .insert(statut)
      .select()
      .single()
    return { data, error }
  },

  updateStatut: async (id: string, updates: Partial<Omit<Statut, 'id'>>) => {
    const { data, error } = await supabase
      .from('statuts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  deleteStatut: async (id: string) => {
    const { data, error } = await supabase
      .from('statuts')
      .delete()
      .eq('id', id)
    return { data, error }
  },

  getStatutById: async (id: string) => {
    const { data, error } = await supabase
      .from('statuts')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Get colis counts by status for a specific livreur
  getColisCountsByStatus: async (livreurId: string, statuses: string[]) => {
    const { data, error } = await supabase
      .from('colis')
      .select('statut')
      .eq('livreur_id', livreurId)
      .in('statut', statuses);

    if (error) return { data: null, error };

    const counts: Record<string, number> = {};
    statuses.forEach(status => {
      counts[status] = data?.filter(c => c.statut === status).length || 0;
    });

    return { data: counts, error: null };
  },

  // Dashboard stats
  getDashboardStats: async () => {
    try {
      const [colisResult, livreursResult, clientsResult, entreprisesResult] = await Promise.all([
        supabase.from('colis').select('statut'),
        supabase.from('utilisateurs').select('role, statut').eq('role', 'Livreur'),
        supabase.from('clients').select('id'),
        supabase.from('entreprises').select('id')
      ]);

      const colis = colisResult.data || [];
      const livreurs = livreursResult.data || [];
      const clients = clientsResult.data || [];
      const entreprises = entreprisesResult.data || [];

      // Count colis by status
      const enAttente = colis.filter(c =>
        c.statut === 'Nouveau Colis' ||
        c.statut === 'nouveau colis'
      ).length;

      const livres = colis.filter(c =>
        c.statut === 'Livré' ||
        c.statut === 'livré'
      ).length;

      const retournes = colis.filter(c =>
        c.statut === 'Retourné' ||
        c.statut === 'retourné' ||
        c.statut === 'retour'
      ).length;

      // En traitement = all colis EXCEPT Nouveau Colis, Livrés, and Retournés
      const enTraitement = colis.filter(c => {
        const statut = c.statut?.toLowerCase() || '';
        return !(
          statut === 'nouveau colis' ||
          statut === 'livré' ||
          statut === 'retourné' ||
          statut === 'retour'
        );
      }).length;

      const livreursActifs = livreurs.filter(l =>
        l.statut === 'Actif' ||
        l.statut === 'actif'
      ).length;

      const stats = {
        totalColis: colis.length,
        enAttente,
        enTraitement,
        livres,
        retournes,
        clientsEnregistres: clients.length,
        entreprisesPartenaires: entreprises.length,
        livreursActifs
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Recent colis for dashboard
  getRecentColis: async (limit: number = 5) => {
    const { data, error } = await supabase
      .from('colis')
      .select(`
        *,
        client:clients(nom),
        entreprise:entreprises(nom)
      `)
      .order('date_creation', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  // Global search functionality
  globalSearch: async (query: string, limit: number = 10) => {
    if (!query || query.trim().length < 2) {
      return {
        clients: [],
        colis: [],
        entreprises: [],
        livreurs: [],
        error: null
      };
    }

    const searchTerm = query.trim();

    try {
      // Search clients with OR query
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, nom, email, telephone, adresse')
        .or(`nom.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telephone.ilike.%${searchTerm}%`)
        .limit(limit);

      // Search colis by ID
      const { data: colisByID, error: colisIDError } = await supabase
        .from('colis')
        .select(`
          id,
          statut,
          prix,
          client:clients(nom),
          entreprise:entreprises(nom)
        `)
        .ilike('id', `%${searchTerm}%`)
        .limit(limit);

      const colis = colisByID;

      // Search entreprises with OR query
      const { data: entreprises, error: entreprisesError } = await supabase
        .from('entreprises')
        .select('id, nom, contact, telephone, email, adresse')
        .or(`nom.ilike.%${searchTerm}%,contact.ilike.%${searchTerm}%,telephone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(limit);

      // Search livreurs (delivery drivers) with OR query
      const { data: livreurs, error: livreursError } = await supabase
        .from('utilisateurs')
        .select('id, nom, prenom, telephone, role, statut, date_creation')
        .eq('role', 'Livreur')
        .or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%,telephone.ilike.%${searchTerm}%`)
        .limit(limit);

      return {
        clients: clients || [],
        colis: colis || [],
        entreprises: entreprises || [],
        livreurs: livreurs || [],
        error: clientsError || colisIDError || entreprisesError || livreursError
      };
    } catch (error) {
      return {
        clients: [],
        colis: [],
        entreprises: [],
        livreurs: [],
        error: error as PostgrestError
      };
    }
  },

  // Livreur-specific global search - only shows data related to the livreur
  livreurGlobalSearch: async (query: string, livreurId: string, limit: number = 10) => {
    if (!query || query.trim().length < 2 || !livreurId) {
      return {
        clients: [],
        colis: [],
        entreprises: [],
        livreurs: [],
        error: null
      };
    }

    const searchTerm = query.trim();

    try {
      // First, get all colis assigned to this livreur
      const { data: livreurColis, error: livreurColisError } = await supabase
        .from('colis')
        .select(`
          id,
          statut,
          prix,
          client_id,
          entreprise_id,
          client:clients(id, nom, email, telephone, adresse),
          entreprise:entreprises(id, nom, contact, telephone, email, adresse)
        `)
        .eq('livreur_id', livreurId);

      if (livreurColisError) {
        throw livreurColisError;
      }

      // Extract unique client and entreprise IDs from livreur's colis
      const clientIds = [...new Set(livreurColis?.map(c => c.client_id).filter(Boolean) || [])];
      const entrepriseIds = [...new Set(livreurColis?.map(c => c.entreprise_id).filter(Boolean) || [])];

      // Search colis by ID (only livreur's colis)
      const colisByID = livreurColis?.filter(colis =>
        colis.id.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, limit) || [];

      // Search clients (only clients related to livreur's colis)
      let clients = [];
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, nom, email, telephone, adresse')
          .in('id', clientIds)
          .or(`nom.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telephone.ilike.%${searchTerm}%`)
          .limit(limit);

        if (!clientsError) {
          clients = clientsData || [];
        }
      }

      // Search entreprises (only entreprises related to livreur's colis)
      let entreprises = [];
      if (entrepriseIds.length > 0) {
        const { data: entreprisesData, error: entreprisesError } = await supabase
          .from('entreprises')
          .select('id, nom, contact, telephone, email, adresse')
          .in('id', entrepriseIds)
          .or(`nom.ilike.%${searchTerm}%,contact.ilike.%${searchTerm}%,telephone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(limit);

        if (!entreprisesError) {
          entreprises = entreprisesData || [];
        }
      }

      return {
        clients: clients,
        colis: colisByID,
        entreprises: entreprises,
        livreurs: [], // Livreurs don't need to search for other livreurs
        error: null
      };
    } catch (error) {
      console.error('Livreur global search error:', error);
      return {
        clients: [],
        colis: [],
        entreprises: [],
        livreurs: [],
        error: error
      };
    }
  },

  // CRUD operations for Colis
  createColis: async (colis: (Omit<Colis, 'id'> & { id?: string })) => {
    const { data, error } = await supabase
      .from('colis')
      .insert(colis)
      .select()
      .single()
    return { data, error }
  },

  updateColis: async (id: string, updates: Partial<Omit<Colis, 'id'>>) => {
    const { data, error } = await supabase
      .from('colis')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  updateColisStatus: async (id: string, newStatus: string) => {
    const { data, error } = await supabase
      .from('colis')
      .update({
        statut: newStatus,
        date_mise_a_jour: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  createColisHistoryBulk: async (
    entries: Array<{
      colis_id: string;
      statut: string;
      utilisateur?: string;
      informations?: string;
      date?: string;
    }>
  ) => {
    try {
      if (!entries || entries.length === 0) {
        return { data: [], error: null };
      }

      const payload = entries.map((entry) => ({
        colis_id: entry.colis_id,
        statut: entry.statut,
        utilisateur: entry.utilisateur,
        informations: entry.informations,
        date: entry.date || new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('historique_colis')
        .insert(payload)
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error creating colis history bulk:', error);
      return { data: null, error };
    }
  },

  deleteColis: async (id: string) => {
    try {
      // First, delete all historique_colis entries for this colis
      const { error: historiqueError } = await supabase
        .from('historique_colis')
        .delete()
        .eq('colis_id', id);

      if (historiqueError) {
        return { data: null, error: historiqueError };
      }

      // Then delete the colis
      const { data, error } = await supabase
        .from('colis')
        .delete()
        .eq('id', id);

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  // Get recent activity for dashboard
  getRecentActivity: async (limit: number = 5) => {
    try {
      // Use the same pattern as other working queries
      const { data, error } = await supabase
        .from('colis')
        .select(`
          *,
          client:clients(nom),
          livreur:utilisateurs(nom, prenom)
        `)
        .order('date_mise_a_jour', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('getRecentActivity error:', error);
        return { data: null, error };
      }

      const activities = data?.map(colis => {
        const client = Array.isArray(colis.client) ? colis.client[0] : colis.client;
        const livreur = Array.isArray(colis.livreur) ? colis.livreur[0] : colis.livreur;

        return {
          id: colis.id,
          numero_suivi: colis.id, // Use ID as tracking number
          statut: colis.statut,
          date_mise_a_jour: colis.date_mise_a_jour,
          client_nom: client ? client.nom || 'Client inconnu' : 'Client inconnu',
          livreur_nom: livreur ? `${livreur.prenom || ''} ${livreur.nom || ''}`.trim() : 'Non assigné'
        };
      }) || [];

      return { data: activities, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // CRUD operations for Clients
  createClient: async (client: (Omit<Client, 'created_at' | 'id'> & { id?: string })) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single()
    return { data, error }
  },

  updateClient: async (id: string, updates: Partial<Omit<Client, 'id'>>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  deleteClient: async (id: string) => {
    const { data, error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
    return { data, error }
  },

  getClientById: async (id: string) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // CRUD operations for Entreprises
  createEntreprise: async (entreprise: Omit<Entreprise, 'created_at'>) => {
    const { data, error } = await supabase
      .from('entreprises')
      .insert(entreprise)
      .select()
      .single()
    return { data, error }
  },

  updateEntreprise: async (id: string, updates: Partial<Omit<Entreprise, 'id'>>) => {
    const { data, error } = await supabase
      .from('entreprises')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  deleteEntreprise: async (id: string) => {
    const { data, error } = await supabase
      .from('entreprises')
      .delete()
      .eq('id', id)
    return { data, error }
  },

  getEntrepriseById: async (id: string) => {
    const { data, error } = await supabase
      .from('entreprises')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Company settings (singleton table for app-wide settings)
  getCompanySettings: async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1);
      // Handle empty result or multiple results
      if (error) {
        return { data: null, error };
      }
      if (!data || data.length === 0) {
        return { data: null, error: null };
      }
      // Return the first row if multiple exist
      return { data: data[0], error: null };
    } catch (err) {
      return { data: null, error: err as any };
    }
  },
  
  upsertCompanySettings: async (settings: { nom?: string; adresse?: string; ville?: string; telephone?: string; email?: string }) => {
    try {
      // Check if a settings row exists
      const { data: existing, error: existingError } = await supabase
        .from('company_settings')
        .select('id')
        .maybeSingle();

      if (existingError) {
        return { data: null, error: existingError };
      }

      if (existing && existing.id) {
        const { data, error } = await supabase
          .from('company_settings')
          .update(settings)
          .eq('id', existing.id)
          .select()
          .single();

        return { data, error };
      } else {
        const { data, error } = await supabase
          .from('company_settings')
          .insert(settings)
          .select()
          .single();

        return { data, error };
      }
    } catch (err) {
      return { data: null, error: err as any };
    }
  },

  // CRUD operations for Users/Livreurs
  createUser: async (user: Omit<User, 'id' | 'date_creation'>) => {
    const { data, error } = await supabase
      .from('utilisateurs')
      .insert(user)
      .select()
      .single()
    return { data, error }
  },

  updateUser: async (id: string, updates: Partial<Omit<User, 'id'>>) => {
    const { data, error } = await supabase
      .from('utilisateurs')
      .update(updates)
      .eq('auth_id', id)
      .select()
      .single()
    return { data, error }
  },

  updateUserById: async (id: string, updates: Partial<Omit<User, 'id'>>) => {
    const { data, error } = await supabase
      .from('utilisateurs')
      .update(updates)
      .eq('id', id)  // Use utilisateurs.id instead of auth_id
      .select()
      .single()
    return { data, error }
  },

  // Admin update using RPC function that bypasses RLS
  updateUserByIdAdmin: async (id: string, updates: Partial<Omit<User, 'id'>>) => {
    try {
      // Try RPC function first
      const { data, error } = await supabase.rpc('update_user_admin', {
        p_user_id: id,
        p_updates: updates
      });
      if (error) {
        console.error('RPC error in updateUserByIdAdmin:', {
          error,
          errorMessage: error?.message,
          errorDetails: error?.details,
          errorCode: error?.code,
          id,
          updates
        });
        
        // Fallback: Try direct update (may be blocked by RLS)
        console.warn('RPC failed, attempting direct update as fallback...');
        const { data: directData, error: directError } = await supabase
          .from('utilisateurs')
          .update({
            ...updates,
            date_modification: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();
        
        if (directError) {
          console.error('Direct update also failed:', directError);
          return { data: null, error: directError };
        }
        return { data: directData, error: null };
      }
      return { data, error };
    } catch (error) {
      console.error('Exception in updateUserByIdAdmin:', error);
      return { data: null, error: error as any };
    }
  },

  // Update user profile with image
  updateUserProfile: async (userId: string, profileData: Partial<User>) => {
    const { data, error } = await supabase
      .from('utilisateurs')
      .update({
        ...profileData,
        date_modification: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  },

  updateUserEmail: async (authId: string, newEmail: string) => {
    try {
      // Use the database function to update email in auth.users
      const { data, error } = await supabase.rpc('update_user_email_admin', {
        user_auth_id: authId,
        new_email: newEmail
      });

      if (error) {
        console.warn('Email update failed:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.warn('Failed to call update_user_email_admin:', error);
      return { data: null, error: error as any };
    }
  },

  updateUserPassword: async (authId: string, newPassword: string) => {
    try {
      // Use the database function to update password in auth.users
      const { data, error } = await supabase.rpc('update_user_password_admin', {
        user_auth_id: authId,
        new_password: newPassword
      });

      if (error) {
        console.warn('Password update failed:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.warn('Failed to call update_user_password_admin:', error);
      return { data: null, error: error as any };
    }
  },

  deleteUser: async (id: string) => {
    try {
      // First, get the user to find their auth_id
      const { data: user, error: getUserError } = await supabase
        .from('utilisateurs')
        .select('auth_id, nom, prenom')
        .eq('id', id)
        .single();

      if (getUserError) {
        return { data: null, error: getUserError };
      }

      // Delete from utilisateurs table first
      const { error: deleteProfileError } = await supabase
        .from('utilisateurs')
        .delete()
        .eq('id', id);

      if (deleteProfileError) {
        return { data: null, error: deleteProfileError };
      }

      let authDeletionStatus = 'no_auth'; // User had no auth account

      // If user has auth_id, attempt to delete from auth.users as well
      if (user?.auth_id) {
        const { data: authData, error: deleteAuthError } = await auth.deleteAuthUser(user.auth_id);

        if (deleteAuthError) {
          console.warn('Failed to delete auth user:', deleteAuthError);
          authDeletionStatus = 'auth_failed'; // Auth deletion failed
        } else if (authData?.success) {
          authDeletionStatus = 'auth_success'; // Auth deletion succeeded
        } else {
          authDeletionStatus = 'auth_failed'; // Auth deletion failed
        }
      }

      return {
        data: {
          authDeletionStatus,
          deletedUser: user
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: error as any };
    }
  },

  // Notifications
  getNotifications: async (userId: string, options?: { role?: string }) => {
    const transformNotification = (notification: any) => ({
      id: notification.id,
      utilisateur_id: notification.receiver_id ?? notification.user_id,
      receiver_id: notification.receiver_id ?? notification.user_id,
      titre: notification.title,
      message: notification.message,
      lu: notification.is_read,
      date_creation: notification.created_at,
      type: notification.type,
      sender_id: notification.sender_id,
      sender_name: notification.sender ? `${notification.sender.prenom || ''} ${notification.sender.nom || ''}`.trim() : null
    });

    try {
      // First, fetch notifications rows (try new schema then fallback)
      let notificationsResult;

      const role = options?.role;
      const isAdmin = role === 'Admin' || role === 'admin';
      const isGestionnaire = role === 'Gestionnaire' || role === 'gestionnaire';

      if (isAdmin) {
        // Admins should see notifications they sent or received
        notificationsResult = await supabase
          .from('notifications')
          .select('*')
          .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
          .order('created_at', { ascending: false });
      } else if (isGestionnaire) {
        // Gestionnaire should see notifications FROM livreurs and their own sent/received
        // First fetch livreur ids
        const { data: livreurs, error: livreursError } = await supabase
          .from('utilisateurs')
          .select('id')
          .eq('role', 'Livreur');

        const livreurIds = !livreursError && Array.isArray(livreurs) ? livreurs.map((l: any) => l.id).filter(Boolean) : [];

          if (livreurIds.length > 0) {
            // Previously we included all notifications sent by livreurs here.
            // Now that reclamations from livreurs are created per-recipient,
            // only fetch notifications addressed to this gestionnaire or sent by them.
            notificationsResult = await supabase
              .from('notifications')
              .select('*')
              .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
              .order('created_at', { ascending: false });
          } else {
            // No livreurs found - fallback to own sent/received
            notificationsResult = await supabase
              .from('notifications')
              .select('*')
              .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
              .order('created_at', { ascending: false });
          }
      } else {
        notificationsResult = await supabase
          .from('notifications')
          .select('*')
            .eq('receiver_id', userId)
          .order('created_at', { ascending: false });
      }

      if (notificationsResult.error && (String(notificationsResult.error.message).includes('receiver_id') || String(notificationsResult.error.message).includes('user_id'))) {
        // Fallback to legacy schema where receiver was stored in user_id
        if (isAdmin) {
          notificationsResult = await supabase
            .from('notifications')
            .select('*')
            .or(`user_id.eq.${userId},sender_id.eq.${userId}`)
            .order('created_at', { ascending: false });
        } else if (isGestionnaire) {
          // Recompute livreur ids for fallback
          const { data: livreurs2, error: livreursError2 } = await supabase
            .from('utilisateurs')
            .select('id')
            .eq('role', 'Livreur');

          const livreurIds2 = !livreursError2 && Array.isArray(livreurs2) ? livreurs2.map((l: any) => l.id).filter(Boolean) : [];

          if (livreurIds2.length > 0) {
            const inList2 = livreurIds2.join(',');
            notificationsResult = await supabase
              .from('notifications')
              .select('*')
              .or(`sender_id.in.(${inList2}),user_id.eq.${userId},sender_id.eq.${userId}`)
              .order('created_at', { ascending: false });
          } else {
            notificationsResult = await supabase
              .from('notifications')
              .select('*')
              .or(`user_id.eq.${userId},sender_id.eq.${userId}`)
              .order('created_at', { ascending: false });
          }
        } else {
          notificationsResult = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        }
      }

      if (notificationsResult.error) {
        return { data: null, error: notificationsResult.error };
      }

      const rows = notificationsResult.data || [];

      // Collect sender and receiver IDs and fetch corresponding utilisateurs
      const userIds = Array.from(new Set(rows.flatMap((r: any) => [r.sender_id, r.receiver_id ?? r.user_id]).filter(Boolean)));
      let usersMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('utilisateurs')
          .select('id, nom, prenom, role')
          .in('id', userIds);

        if (!usersError && usersData) {
          usersMap = (usersData as any[]).reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {} as Record<string, any>);
        }
      }

      const formatUserName = (user: any) => user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : null;

      // If the current user is a gestionnaire, keep notifications addressed to them
      // even when the sender is an Admin, but exclude Admin notifications sent to other users.
      let rowsToUse = rows;
      if (isGestionnaire && userIds.length > 0) {
        rowsToUse = rows.filter((r: any) => {
          const receiverId = r.receiver_id ?? r.user_id;
          if (receiverId === userId) {
            return true;
          }

          if (!r.sender_id) {
            return true;
          }

          const sender = usersMap[r.sender_id];
          if (!sender) {
            return true;
          }

          if (sender.role === 'Admin' || sender.role === 'admin') {
            return false;
          }

          return true;
        });
      }

      const transformed = rowsToUse.map((r: any) => {
        const receiverId = r.receiver_id ?? r.user_id;
        return {
          ...transformNotification(r),
          sender_name: r.sender_id
            ? r.sender_id === userId
              ? 'vous'
              : formatUserName(usersMap[r.sender_id])
            : null,
          receiver_name: receiverId
            ? receiverId === userId
              ? 'vous'
              : formatUserName(usersMap[receiverId])
            : null
        };
      });

      return { data: transformed ?? null, error: null };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: null, error };
    }
  },

  createNotification: async (notification: Omit<Notification, 'id' | 'date_creation'>) => {
    try {
      // Ensure sender info exists: resolve from auth session if not provided
      let senderId = notification.sender_id;
      let senderName = notification.sender_name;

      if (!senderId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const authUserId = sessionData?.session?.user?.id;
          if (authUserId) {
            const { data: profile, error: profileError } = await supabase
              .from('utilisateurs')
              .select('id, nom, prenom')
              .eq('auth_id', authUserId)
              .single();

            if (!profileError && profile) {
              senderId = profile.id;
              senderName = `${profile.prenom || ''} ${profile.nom || ''}`.trim() || senderName;
            }
          }
        } catch (e) {
          // ignore resolution errors; proceed with whatever info we have
        }
      }

      const payload: any = {
        sender_id: senderId ?? null,
        receiver_id: notification.receiver_id ?? notification.utilisateur_id,
        title: notification.titre,
        message: notification.message,
        is_read: notification.lu ?? false,
        type: notification.type ?? 'message'
      };

      // Allow self-targeted notifications (sender receiving a copy). Removed previous guard that skipped self-targets,
      // so senders can receive their own messages/reclamations if the UI requests it.

      // Additional handling for reclamation created by a livreur:
      // - Do not create notifications targeting livreurs
      // - Instead, create one notification per Admin and Gestionnaire so reads are per-user
      if (payload.type === 'reclamation' && payload.sender_id) {
        try {
          const { data: senderProfile } = await supabase
            .from('utilisateurs')
            .select('id, role')
            .eq('id', payload.sender_id)
            .single();

          if (senderProfile && senderProfile.role === 'Livreur') {
            // If receiver is explicitly a livreur, skip entirely
            if (payload.receiver_id) {
              const { data: receiverProfile } = await supabase
                .from('utilisateurs')
                .select('id, role')
                .eq('id', payload.receiver_id)
                .single();

              if (receiverProfile && receiverProfile.role === 'Livreur') {
                console.debug('createNotification: skipping reclamation notification targeting livreur', { sender: payload.sender_id, receiver: payload.receiver_id });
                return { data: null, error: null };
              }
            }

            // Fetch all Admin and Gestionnaire users to notify them individually
            const { data: targets, error: targetsError } = await supabase
              .from('utilisateurs')
              .select('id')
              .in('role', ['Admin', 'Gestionnaire']);

            if (targetsError || !targets || targets.length === 0) {
              // No targets found, fall back to single notification creation below
            } else {
              const targetIds = (targets as any[]).map(t => t.id).filter(Boolean);

              const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString();
              const createdRows: any[] = [];

              for (const rid of targetIds) {
                if (!rid || rid === payload.sender_id) continue;

                // Deduplicate per recipient
                try {
                  const { data: existing, error: existingError } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('sender_id', payload.sender_id)
                    .eq('receiver_id', rid)
                    .eq('title', payload.title)
                    .eq('message', payload.message)
                    .gte('created_at', tenSecondsAgo)
                    .limit(1);

                  if (!existingError && existing && existing.length > 0) {
                    createdRows.push(existing[0]);
                    continue;
                  }
                } catch (e) {
                  // ignore dedupe errors and try to insert
                }

                try {
                  const { data: ins, error: insErr } = await supabase
                    .from('notifications')
                    .insert([{ ...payload, receiver_id: rid }], { returning: 'representation' });

                  if (!insErr && ins) {
                    createdRows.push(Array.isArray(ins) ? ins[0] : ins);
                  }
                } catch (e) {
                  // continue on insert errors
                }
              }

              // Also ensure the sending livreur gets their own reclamation notification
              try {
                const senderRid = payload.sender_id;
                if (senderRid) {
                  const { data: existingSender, error: existingSenderError } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('sender_id', payload.sender_id)
                    .eq('receiver_id', senderRid)
                    .eq('title', payload.title)
                    .eq('message', payload.message)
                    .gte('created_at', tenSecondsAgo)
                    .limit(1);

                  if (!existingSenderError && existingSender && existingSender.length === 0) {
                    try {
                      const { data: insSender, error: insSenderErr } = await supabase
                        .from('notifications')
                        .insert([{ ...payload, receiver_id: senderRid, is_read: true }], { returning: 'representation' });

                      if (!insSenderErr && insSender) {
                        createdRows.push(Array.isArray(insSender) ? insSender[0] : insSender);
                      }
                    } catch (e) {
                      // ignore
                    }
                  } else if (existingSender && existingSender.length > 0) {
                    const existingRow = existingSender[0];
                    try {
                      const { data: updatedSender, error: updateSenderError } = await supabase
                        .from('notifications')
                        .update({ is_read: true })
                        .eq('id', existingRow.id)
                        .select()
                        .single();

                      if (!updateSenderError && updatedSender) {
                        createdRows.push(updatedSender);
                      } else {
                        createdRows.push(existingRow);
                      }
                    } catch (e) {
                      createdRows.push(existingRow);
                    }
                  }
                }
              } catch (e) {
                // ignore sender insert errors
              }

              if (createdRows.length > 0) {
                const row = createdRows[0];
                const created = row ? {
                  id: row.id,
                  utilisateur_id: row.receiver_id ?? row.user_id,
                  receiver_id: row.receiver_id ?? row.user_id,
                  titre: row.title,
                  message: row.message,
                  lu: row.is_read,
                  date_creation: row.created_at,
                  type: row.type,
                  sender_id: row.sender_id
                } : null;

                return { data: created, error: null };
              }
            }
          }
        } catch (e) {
          // ignore and proceed with normal single-insert flow below
        }
      }

      // Deduplication: avoid creating duplicate notifications if one with the same
      // sender/receiver/title/message was created in the last 10 seconds
      try {
        const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString();
        const { data: existing, error: existingError } = await supabase
          .from('notifications')
          .select('*')
          .eq('sender_id', payload.sender_id)
          .eq('receiver_id', payload.receiver_id)
          .eq('title', payload.title)
          .eq('message', payload.message)
          .gte('created_at', tenSecondsAgo)
          .limit(1);

        if (!existingError && existing && existing.length > 0) {
          const row = existing[0];
          const created = {
            id: row.id,
            utilisateur_id: row.receiver_id ?? row.user_id,
            receiver_id: row.receiver_id ?? row.user_id,
            titre: row.title,
            message: row.message,
            lu: row.is_read,
            date_creation: row.created_at,
            type: row.type,
            sender_id: row.sender_id
          };
          return { data: created, error: null };
        }
      } catch (e) {
        // ignore dedupe errors and continue to insert
      }

      // Use PostgREST returning=representation to get created row without adding a `columns` query
      const { data, error } = await supabase
        .from('notifications')
        .insert([payload], { returning: 'representation' });

      if (error) {
        console.error('createNotification insert error:', error);
        return { data: null, error };
      }

      // Transform and return the created notification
      const row = Array.isArray(data) ? data[0] : data;
      const created = row ? {
        id: row.id,
        utilisateur_id: row.receiver_id ?? row.user_id,
        receiver_id: row.receiver_id ?? row.user_id,
        titre: row.title,
        message: row.message,
        lu: row.is_read,
        date_creation: row.created_at,
        type: row.type,
        sender_id: row.sender_id
      } : null;

      return { data: created, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  markNotificationAsRead: async (notificationId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .single();

      const transformedData = data ? {
        id: data.id,
        utilisateur_id: data.receiver_id ?? data.user_id,
        receiver_id: data.receiver_id ?? data.user_id,
        titre: data.title,
        message: data.message,
        lu: data.is_read,
        date_creation: data.created_at,
        type: data.type,
        sender_id: data.sender_id,
        sender_name: data.sender_name
      } : null;

      return { data: transformedData, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  markAllNotificationsAsRead: async (userId: string) => {
    try {
      let result = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (result.error && String(result.error.message).includes('receiver_id')) {
        result = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false);
      }

      return { data: result.data, error: result.error };
    } catch (error) {
      return { data: null, error };
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Mark notification as hidden (do not show in header dropdown)
  markNotificationHidden: async (notificationId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_hidden: true })
        .eq('id', notificationId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get all users
  getAllUsers: async () => {
    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('id, nom, prenom, role, statut')
        .limit(10);

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get admin and gestionnaire users for notifications
  getAdminAndGestionnaireUsers: async () => {
    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('id, nom, prenom, role, statut')
        .in('role', ['Admin', 'Gestionnaire'])
        .eq('statut', 'Actif');

      // If no active admin users found, try without the statut filter
      if (!error && (!data || data.length === 0)) {
        const { data: dataNoStatus, error: errorNoStatus } = await supabase
          .from('utilisateurs')
          .select('id, nom, prenom, role, statut')
          .in('role', ['Admin', 'Gestionnaire']);

        // Remove duplicates based on user ID
        const uniqueUsers = dataNoStatus ? dataNoStatus.filter((user, index, self) =>
          index === self.findIndex(u => u.id === user.id)
        ) : [];

        return { data: uniqueUsers, error: errorNoStatus };
      }

      // Remove duplicates based on user ID
      const uniqueUsers = data ? data.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      ) : [];

      return { data: uniqueUsers, error };
    } catch (error) {
      console.error('Error fetching admin/gestionnaire users:', error);
      return { data: null, error };
    }
  },

  // Check bons table structure
  checkBonsTable: async () => {
    const { data, error } = await supabase
      .from('bons')
      .select('*')
      .limit(1);

    return { data, error };
  },

  // Bons API
  getBons: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'distribution' | 'paiement' | 'retour';
    sourceType?: 'admin' | 'livreur';
    userId?: string;
    assignedTo?: string;
    statut?: string;
    entrepriseId?: string;
    sortBy?: 'recent' | 'oldest';
  }) => {
    const {
      page = 1,
      limit = 10,
      search = '',
      type,
      sourceType,
      userId,
      assignedTo,
      statut,
      entrepriseId,
      sortBy = 'recent'
    } = params || {};

    let query = supabase
      .from('bons')
      .select(`
        *,
        user:user_id(
          id,
          nom,
          prenom,
          zone,
          ville,
          telephone,
          role
        ),
        assigned_user:utilisateurs!fk_bons_assigned_to (
          id,
          nom,
          prenom,
          telephone,
          role,
          vehicule,
          zone,
          ville
        ),
        entreprise:entreprise_id(
          id,
          nom,
          adresse,
          contact,
          email,
          telephone
        ),
        bon_colis:bon_colis(
          colis:colis(
            prix,
            frais
          )
        )
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`id.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    // Only filter by type if the column exists (after migration)
    if (type) {
      try {
        query = query.eq('type', type);
      } catch (error) {
        console.log('Type column might not exist yet, skipping type filter');
      }
    }

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    if (userId) {
      try {
        // Try user_id first (after migration), fallback to livreur_id (before migration)
        query = query.eq('user_id', userId);
      } catch (error) {
        try {
          query = query.eq('livreur_id', userId);
        } catch (error2) {
          console.log('Neither user_id nor livreur_id column found');
        }
      }
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (statut) {
      query = query.eq('statut', statut);
    }

    if (entrepriseId) {
      query = query.eq('entreprise_id', entrepriseId);
    }

    // Apply sorting
    const sortOrder = sortBy === 'recent' ? { ascending: false } : { ascending: true };
    query = query.order('date_creation', sortOrder);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    const totalPages = count ? Math.ceil(count / limit) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
      error,
      count,
      totalPages,
      hasNextPage,
      hasPrevPage
    };
  },

  getBonById: async (id: string) => {
    try {
      // Get the bon without relationships (due to ambiguous user_id foreign keys)
      const { data: bonData, error: bonError } = await supabase
        .from('bons')
        .select('*')
        .eq('id', id)
        .single();

      if (bonError || !bonData) {
        console.error('Error fetching bon:', bonError);
        return { data: null, error: bonError };
      }

      // Fetch user data separately
      if (bonData.user_id) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('utilisateurs')
            .select('id, nom, prenom, telephone, role, vehicule, zone, ville')
            .eq('id', bonData.user_id)
            .single();

          if (userData && !userError) {
            bonData.user = userData;
          }
        } catch (userErr) {
          console.warn('Could not fetch user data:', userErr);
        }
      }

      // Fetch client data separately if needed
      if (bonData.client_id) {
        try {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('id, nom, email, telephone')
            .match({ id: bonData.client_id })
            .single();

          if (clientData && !clientError) {
            bonData.client = clientData;
          }
        } catch (clientErr) {
          console.warn('Could not fetch client data:', clientErr);
        }
      }

      // Fetch entreprise data separately if needed
      if (bonData.entreprise_id) {
        try {
          const { data: entrepriseData, error: entrepriseError } = await supabase
            .from('entreprises')
            .select('id, nom, adresse, contact, email, telephone')
            .eq('id', bonData.entreprise_id)
            .single();

          if (entrepriseData && !entrepriseError) {
            bonData.entreprise = entrepriseData;
          }
        } catch (entrepriseErr) {
          console.warn('Could not fetch entreprise data:', entrepriseErr);
        }
      }

      return { data: bonData, error: null };
    } catch (error) {
      console.error('Error in getBonById:', error);
      return { data: null, error };
    }
  },

  getBonHistory: async (bonId: string) => {
    try {
      const { data, error } = await supabase
        .from('bons_historique')
        .select('*, user:utilisateurs(id, nom, prenom, role)')
        .eq('bon_id', bonId)
        .order('date', { ascending: true });

      return { data, error };
    } catch (error) {
      console.error('Error fetching bon history:', error);
      return { data: null, error };
    }
  },

  getFactureHistory: async (factureId: string) => {
    try {
      const { data, error } = await supabase
        .from('facture_historique')
        .select('*, user:utilisateurs(id, nom, prenom, role)')
        .eq('facture_id', factureId)
        .order('date', { ascending: true });

      return { data, error };
    } catch (error) {
      console.error('Error fetching facture history:', error);
      return { data: null, error };
    }
  },

  createBonHistory: async (historyData: {
    bon_id: string;
    type: 'distribution' | 'paiement' | 'retour';
    utilisateur?: string;
    statut: string;
    notes?: string;
    date?: string;
  }) => {
    const { data, error } = await supabase
      .from('bons_historique')
      .insert([historyData])
      .select()
      .single();

    return { data, error };
  },

  generateBonId: async (
    sourceType?: 'admin' | 'livreur',
    entrepriseId?: string,
    bonType?: 'distribution' | 'paiement' | 'retour'
  ) => {
    try {
      const currentYear = new Date().getFullYear();

      if (sourceType === 'admin' && entrepriseId) {
        // For admin bons: Type prefix + first letters of first two entreprise name words + year + sequential number
        const { data: entreprise, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('nom')
          .eq('id', entrepriseId)
          .single();

        if (entrepriseError || !entreprise) {
          console.error('Error fetching entreprise for bon ID generation:', entrepriseError);
          throw new Error('Entreprise not found');
        }

        // Get type prefix
        const typePrefix = bonType === 'distribution' ? 'BD-' :
                          bonType === 'paiement' ? 'BP-' :
                          bonType === 'retour' ? 'BR-' : 'B-';

        // Extract first letters of first two words from entreprise name
        const words = entreprise.nom.trim().split(/\s+/);
        const entrepriseAbbrev = words.slice(0, 2)
          .map(word => word.charAt(0).toUpperCase())
          .join('');

        const prefix = `${typePrefix}${entrepriseAbbrev}${currentYear}`;

        // Get existing bons with this prefix
        const { data: existingBons, error: bonsError } = await supabase
          .from('bons')
          .select('id')
          .like('id', `${prefix}%`);

        if (bonsError) {
          console.error('Error fetching existing bons:', bonsError);
          throw bonsError;
        }

        // Calculate next sequence number
        const nextSequence = (existingBons || [])
          .map((bon: any) => {
            const suffix = bon.id?.toString().replace(prefix, '');
            const parsed = parseInt(suffix, 10);
            return Number.isFinite(parsed) ? parsed : 0;
          })
          .reduce((max, num) => Math.max(max, num), 0) + 1;

        return `${prefix}${nextSequence}`;
      } else {
        // For livreur bons:
        // - retour => BR-YYYY-N
        // - paiement => BP-YYYY-N
        // - others => BD-YYYY-N
        const prefix = bonType === 'retour'
          ? `BR-${currentYear}-`
          : bonType === 'paiement'
            ? `BP-${currentYear}-`
            : `BD-${currentYear}-`;
        const { data, error } = await supabase
          .from('bons')
          .select('id')
          .like('id', `${prefix}%`);

        if (error) {
          console.error('Error generating bon ID:', error);
          throw error;
        }

        const nextSequence = (data || [])
          .map((item: any) => {
            const suffix = item.id?.toString().replace(prefix, '');
            const parsed = parseInt(suffix, 10);
            return Number.isFinite(parsed) ? parsed : 0;
          })
          .reduce((max, num) => Math.max(max, num), 0) + 1;

        return `${prefix}${nextSequence}`;
      }
    } catch (error) {
      console.error('generateBonId error:', error);
      throw error;
    }
  },

  createBon: async (bonData: {
    id?: string;
    user_id: string;
    type: 'distribution' | 'paiement' | 'retour';
    statut: string;
    date_creation?: string;
    nb_colis?: number;
    client_id?: string;
    montant?: number;
    date_echeance?: string;
    colis_id?: string;
    motif?: string;
    notes?: string;
    source_type?: 'admin' | 'livreur';
    entreprise_id?: string;
  }) => {
    const bonDataToInsert = {
      ...bonData,
      id: bonData.id || await api.generateBonId(bonData.source_type, bonData.entreprise_id, bonData.type),
    };

    const { data, error } = await supabase
      .from('bons')
      .insert([bonDataToInsert])
      .select('*')
      .single();

    if (data && !error) {
      const historyPayload = {
        bon_id: data.id,
        type: bonData.type,
        utilisateur: bonData.user_id,
        statut: bonData.statut,
        notes: bonData.notes || `Bon ${bonData.type} créé`,
        date: bonData.date_creation || new Date().toISOString()
      };

      const { error: historyError } = await supabase
        .from('bons_historique')
        .insert([historyPayload]);

      if (historyError) {
        console.error('Error creating bon history entry:', historyError);
      }
    }

    return { data, error };
  },

  createBonWithColis: async (bonData: {
    id?: string;
    user_id: string;
    type: 'distribution' | 'paiement' | 'retour';
    statut: string;
    date_creation?: string;
    nb_colis?: number;
    client_id?: string;
    montant?: number;
    date_echeance?: string;
    motif?: string;
    notes?: string;
    source_type?: 'admin' | 'livreur';
    entreprise_id?: string;
    assigned_to?: string;
  }, colisIds: string[]) => {
    try {
      // Prevent creating a bon with colis that are already linked to another bon
      if (colisIds && colisIds.length > 0) {
        const { data: existingLinks, error: existingLinksError } = await supabase
          .from('bon_colis')
          .select('colis_id, bon_id')
          .in('colis_id', colisIds);

        if (existingLinksError) {
          console.error('Error checking existing bon_colis links:', existingLinksError);
          // proceed cautiously; allow creation to fail later if necessary
        } else if (existingLinks && existingLinks.length > 0) {
          // If source_type is provided, only consider conflicts where the existing bon has the same source_type
          const bonIds = Array.from(new Set(existingLinks.map((l: any) => l.bon_id).filter(Boolean)));

          if (bonIds.length > 0) {
            const { data: bonsData, error: bonsError } = await supabase
              .from('bons')
              .select('id, source_type')
              .in('id', bonIds as string[]);

            if (bonsError) {
              console.error('Error fetching bons for conflict check:', bonsError);
            } else {
              // Determine which bon_ids are from the same source_type as the bon being created
              let relevantBonIds: string[] = [];
              if (bonData.source_type) {
                relevantBonIds = (bonsData || []).filter((b: any) => b.source_type === bonData.source_type).map((b: any) => b.id);
              } else {
                // If no source_type provided, treat any existing link as relevant (conservative)
                relevantBonIds = bonIds as string[];
              }

              const relevantLinks = existingLinks.filter((l: any) => relevantBonIds.includes(l.bon_id));

              if (relevantLinks && relevantLinks.length > 0) {
                const conflictMap: Record<string, string[]> = {};
                for (const rec of relevantLinks) {
                  if (!rec || !rec.colis_id) continue;
                  conflictMap[rec.colis_id] = conflictMap[rec.colis_id] || [];
                  if (rec.bon_id) conflictMap[rec.colis_id].push(rec.bon_id);
                }

                const conflicts = Object.keys(conflictMap);
                if (conflicts.length > 0) {
                  const detail = conflicts.map(id => `${id} (bons: ${conflictMap[id].join(',')})`).join('; ');
                  return { data: null, error: new Error(`Certains colis sont déjà liés à d'autres bons: ${detail}`) };
                }
              }
            }
          }
        }
      }
      // Create the bon
      const bonDataToInsert = {
        ...bonData,
        id: bonData.id || await api.generateBonId(bonData.source_type, bonData.entreprise_id, bonData.type),
      };

      const { data: bon, error: bonError } = await supabase
        .from('bons')
        .insert([bonDataToInsert])
        .select('*')
        .single();

      if (bonError) {
        return { data: null, error: bonError };
      }

      if (!bon) {
        return { data: null, error: new Error('Failed to create bon') };
      }

      const historyPayload = {
        bon_id: bon.id,
        type: bonData.type,
        utilisateur: bonData.user_id,
        statut: bonData.statut,
        notes: bonData.notes || `Bon ${bonData.type} créé avec ${colisIds.length} colis`,
        date: bonData.date_creation || new Date().toISOString()
      };

      const { error: historyError } = await supabase
        .from('bons_historique')
        .insert([historyPayload]);

      if (historyError) {
        console.error('Error creating bons_historique entry:', historyError);
      }

      // Link colis to bon
      if (colisIds && colisIds.length > 0) {
        const bonColisRecords = colisIds.map(colisId => ({
          bon_id: bon.id,
          colis_id: colisId,
          date_assigned: new Date().toISOString(),
        }));

        const { error: bonColisError } = await supabase
          .from('bon_colis')
          .insert(bonColisRecords);

        if (bonColisError) {
          console.error('Error linking colis to bon:', bonColisError);
          console.warn('Le bon a été créé mais les colis n\'ont pas été liés. Vérifiez les permissions RLS.');
          // Still return the bon even if linking fails
        }

        if (colisIds && colisIds.length > 0 && bonData.source_type === 'livreur') {
          const livreurId = bonData.assigned_to || bonData.user_id;
          const { error: colisUpdateError } = await supabase
            .from('colis')
            .update({
              livreur_id: livreurId,
              statut: 'Mise en distribution',
              date_mise_a_jour: new Date().toISOString(),
            })
            .in('id', colisIds);

          if (colisUpdateError) {
            console.error('Error updating colis livreur_id:', colisUpdateError);
          }

          const historiqueRecords = colisIds.map((colisId) => ({
            colis_id: colisId,
            date: new Date().toISOString(),
            statut: 'Mise en distribution',
            utilisateur: bonData.user_id,
            informations: `Assigné via bon ${bon.id}`,
          }));

          const { error: historiqueError } = await supabase
            .from('historique_colis')
            .insert(historiqueRecords);

          if (historiqueError) {
            console.error('Error creating historique_colis entries:', historiqueError);
          }
        }
      }

      return { data: bon, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  getDeduitRetourBons: async () => {
    try {
      const { data, error } = await supabase
        .from('bons')
        .select('*')
        .eq('type', 'retour')
        .eq('source_type', 'livreur')
        .or('statut.ilike.%Déduit%,statut.ilike.%deduit%,statut.ilike.%DEDUIT%')
        .order('date_creation', { ascending: false });

      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  createAdminRetourBonFromSelectedRetourBons: async (adminUserId: string, selectedBonIds?: string[]) => {
    try {
      let validSelectedBons: any[] = [];

      if (selectedBonIds && selectedBonIds.length > 0) {
        // Use provided selected bons
        const { data: selectedBons, error: selectedBonsError } = await supabase
          .from('bons')
          .select('*')
          .in('id', selectedBonIds);

        if (selectedBonsError) {
          return { data: null, error: selectedBonsError };
        }

        validSelectedBons = (selectedBons || []).filter((bon: any) =>
          bon.type === 'retour' &&
          bon.source_type === 'livreur' &&
          isDeduitStatut(bon.statut)
        );

        if (validSelectedBons.length === 0) {
          return { data: null, error: new Error('Sélectionnez uniquement des bons de retour livreur déduits.') };
        }
      } else {
        // Fetch all eligible retour bons automatically
        const { data: allEligibleBons, error: eligibleError } = await supabase
          .from('bons')
          .select('*')
          .eq('type', 'retour')
          .eq('source_type', 'livreur')
          .eq('statut', 'Déduit');

        if (eligibleError) {
          return { data: null, error: eligibleError };
        }

        validSelectedBons = allEligibleBons || [];

        if (validSelectedBons.length === 0) {
          return { data: [], error: null };
        }
      }

      const bonIds = validSelectedBons.map(bon => bon.id);

      const { data: bonColisData, error: bonColisError } = await supabase
        .from('bon_colis')
        .select('colis_id, bon_id')
        .in('bon_id', bonIds);

      const bonColisMap = (bonColisData || []).reduce((map: Record<string, Set<string>>, record: any) => {
        if (!record?.bon_id || !record?.colis_id) {
          return map;
        }
        map[record.bon_id] = map[record.bon_id] || new Set();
        map[record.bon_id].add(record.colis_id);
        return map;
      }, {} as Record<string, Set<string>>);

      const groupedBons = validSelectedBons.reduce((groups: Record<string, any[]>, bon: any) => {
        const entrepriseId = bon.entreprise_id || 'unknown';
        groups[entrepriseId] = groups[entrepriseId] || [];
        groups[entrepriseId].push(bon);
        return groups;
      }, {} as Record<string, any[]>);

      const createdBons: any[] = [];
      const historyRecords: any[] = [];

      for (const entrepriseId of Object.keys(groupedBons)) {
        const groupBons = groupedBons[entrepriseId];
        const groupBonIds = groupBons.map((bon) => bon.id);

        const colisIds = Array.from(
          new Set(
            groupBonIds.flatMap((bonId) => Array.from(bonColisMap[bonId] || []))
          )
        );

        if (colisIds.length === 0) {
          continue;
        }

        const primaryBon = groupBons[0];
        const notes = `Bon de retour admin créer à partir de ${groupBonIds.length} bon(s) de retour livreur`;

        const { data: createdBon, error: createError } = await api.createBonWithColis({
          user_id: adminUserId,
          type: 'retour',
          statut: 'En cours',
          source_type: 'admin',
          assigned_to: adminUserId,
          nb_colis: colisIds.length,
          notes,
          entreprise_id: entrepriseId !== 'unknown' ? entrepriseId : undefined,
          date_creation: new Date().toISOString(),
        }, colisIds);

        if (createError || !createdBon) {
          console.error('Error creating admin retour bon:', createError);
          continue;
        }

        createdBons.push(createdBon);

        historyRecords.push(...groupBonIds.map((bonId) => ({
          bon_id: bonId,
          type: 'retour',
          utilisateur: adminUserId,
          statut: 'Déduit',
          notes: `Bon de retour admin ${createdBon.id} creé à partir de ce bon`,
          date: new Date().toISOString(),
        })));
      }

      if (historyRecords.length > 0) {
        const { error: historiqueError } = await supabase
          .from('bons_historique')
          .insert(historyRecords);

        if (historiqueError) {
          console.error('Error creating historique entries for selected retour bons:', historiqueError);
        }
      }

      return { data: createdBons, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  generateRetourBonsFromDistributionBons: async (adminUserId: string) => {
    try {
      // Get all admin distribution bons
      const { data: distributionBons, error: distributionError } = await supabase
        .from('bons')
        .select('*')
        .eq('type', 'distribution')
        .eq('source_type', 'admin')
        .order('date_creation', { ascending: false });

      if (distributionError) {
        return { data: null, error: distributionError };
      }

      if (!distributionBons || distributionBons.length === 0) {
        return { data: [], error: null };
      }

      const createdRetourBons: any[] = [];

      // Group distribution bons by entreprise
      const groupedByEntreprise = distributionBons.reduce((groups: Record<string, any[]>, bon: any) => {
        const entrepriseId = bon.entreprise_id || 'unknown';
        groups[entrepriseId] = groups[entrepriseId] || [];
        groups[entrepriseId].push(bon);
        return groups;
      }, {} as Record<string, any[]>);

      for (const entrepriseId of Object.keys(groupedByEntreprise)) {
        const entrepriseDistributionBons = groupedByEntreprise[entrepriseId];
        const distributionBonIds = entrepriseDistributionBons.map(bon => bon.id);

        // Get all colis from these distribution bons
        const { data: bonColisData, error: bonColisError } = await supabase
          .from('bon_colis')
          .select('colis_id')
          .in('bon_id', distributionBonIds);

        if (bonColisError || !bonColisData || bonColisData.length === 0) {
          continue;
        }

        const colisIds = Array.from(new Set(bonColisData.map(record => record.colis_id).filter(Boolean)));
        if (colisIds.length === 0) {
          continue;
        }

        // Get colis data and filter by "Retourné" status
        const { data: colisData, error: colisError } = await supabase
          .from('colis')
          .select('id, statut, livreur_id, prix')
          .in('id', colisIds);

        if (colisError || !colisData) {
          continue;
        }

        // Filter colis with "Retourné" status
        const returnedColis = colisData.filter((colis: any) => isReturnedStatut(colis.statut));
        if (returnedColis.length === 0) {
          continue;
        }

        const returnedColisIds = returnedColis.map(colis => colis.id);

        // Only keep colis that are linked to a livreur retour bon already marked as Déduit
        const { data: returnBonColisData, error: returnBonColisError } = await supabase
          .from('bon_colis')
          .select('colis_id, bon_id')
          .in('colis_id', returnedColisIds);

        if (returnBonColisError || !returnBonColisData || returnBonColisData.length === 0) {
          continue;
        }

        const returnBonIds = Array.from(new Set(returnBonColisData.map(record => record.bon_id).filter(Boolean)));
        if (returnBonIds.length === 0) {
          continue;
        }

        const { data: returnBons, error: returnBonsError } = await supabase
          .from('bons')
          .select('id, type, source_type, statut')
          .in('id', returnBonIds);

        if (returnBonsError || !returnBons) {
          continue;
        }

        const deduitRetourBonIds = new Set(
          returnBons
            .filter((bon: any) => bon.type === 'retour' && bon.source_type === 'livreur' && isDeduitStatut(bon.statut))
            .map((bon: any) => bon.id)
        );

        const validReturnedColisIds = Array.from(new Set(
          returnBonColisData
            .filter((record: any) => deduitRetourBonIds.has(record.bon_id))
            .map((record: any) => record.colis_id)
        ));

        if (validReturnedColisIds.length === 0) {
          continue;
        }

        const validReturnedColis = returnedColis.filter((colis: any) => validReturnedColisIds.includes(colis.id));
        if (validReturnedColis.length === 0) {
          continue;
        }

        const returnedAmount = validReturnedColis.reduce((sum: number, colis: any) => sum + Number(colis.prix || 0), 0);

        const notes = `Bon de retour généré depuis ${distributionBonIds.length} bon(s) de distribution pour entreprise ${entrepriseId}`;

        // Create the retour bon assigned to the admin generator
        const { data: createdBon, error: createError } = await api.createBonWithColis({
          user_id: adminUserId,
          type: 'retour',
          statut: 'En cours',
          source_type: 'admin',
          assigned_to: adminUserId,
          nb_colis: validReturnedColisIds.length,
          montant: returnedAmount,
          notes,
          entreprise_id: entrepriseId !== 'unknown' ? entrepriseId : undefined,
          date_creation: new Date().toISOString(),
        }, validReturnedColisIds);

        if (createError || !createdBon) {
          console.error('Error creating retour bon from distribution:', createError);
          continue;
        }

        createdRetourBons.push(createdBon);

        // Add history entries for the distribution bons
        const historyRecords = distributionBonIds.map(bonId => ({
          bon_id: bonId,
          type: 'distribution',
          utilisateur: adminUserId,
          statut: 'Retourné',
          notes: `Bon de retour ${createdBon.id} généré depuis cette distribution`,
          date: new Date().toISOString(),
        }));

        const { error: historiqueError } = await supabase
          .from('bons_historique')
          .insert(historyRecords);

        if (historiqueError) {
          console.error('Error creating historique entries for distribution bons:', historiqueError);
        }
      }

      return { data: createdRetourBons, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  autoCompleteDistributionBons: async (currentUserId?: string, options?: { onlyIncomplete?: boolean, force?: boolean }) => {
    // By default only process bons that are not already completed to limit work
    const { onlyIncomplete = true, force = false } = options || {};
    try {
      let query = supabase
        .from('bons')
        .select('id, statut')
        .eq('type', 'distribution');

      if (onlyIncomplete && !force) {
        // Exclude already completed bons (case-insensitive match on 'compl')
        query = query.not('statut', 'ilike', '%compl%');
      }

      const { data: distributionBons, error: distributionError } = await query;

      if (distributionError || !distributionBons) {
        return { data: [], error: distributionError };
      }

      const completedBonIds: string[] = [];

      for (const distributionBon of distributionBons) {
        if (!distributionBon?.id) continue;
        const currentStatut = normalizeStatut(distributionBon.statut);
        if (currentStatut === 'complete' || currentStatut === 'complété') {
          continue;
        }

        const { data: bonColisData, error: bonColisError } = await supabase
          .from('bon_colis')
          .select('colis_id')
          .eq('bon_id', distributionBon.id);

        if (bonColisError || !bonColisData || bonColisData.length === 0) {
          continue;
        }

        const colisIds = Array.from(new Set(bonColisData.map((item: any) => item.colis_id).filter(Boolean)));
        if (colisIds.length === 0) {
          continue;
        }

        const { data: colisData, error: colisError } = await supabase
          .from('colis')
          .select('id, statut')
          .in('id', colisIds);

        if (colisError || !colisData || colisData.length === 0) {
          continue;
        }

        const hasInvalidStatus = colisData.some(
          (colis: any) => !isDeliveredStatut(colis.statut) && !isReturnedStatut(colis.statut)
        );
        if (hasInvalidStatus) {
          continue;
        }

        const deliveredColisIds = colisData
          .filter((colis: any) => isDeliveredStatut(colis.statut))
          .map((colis: any) => colis.id);
        const returnedColisIds = colisData
          .filter((colis: any) => isReturnedStatut(colis.statut))
          .map((colis: any) => colis.id);

        let isCompleted = false;

        // Case 1: All colis are returned (no delivered colis)
        if (deliveredColisIds.length === 0 && returnedColisIds.length > 0) {
          const { data: returnLinks, error: returnLinksError } = await supabase
            .from('bon_colis')
            .select('bon_id, colis_id')
            .in('colis_id', returnedColisIds);

          if (!returnLinksError && returnLinks) {
            const returnBonIds = Array.from(new Set(returnLinks.map((record: any) => record.bon_id).filter(Boolean)));
            if (returnBonIds.length > 0) {
              const { data: returnBons, error: returnBonsError } = await supabase
                .from('bons')
                .select('id, statut')
                .in('id', returnBonIds)
                .eq('type', 'retour');

              if (!returnBonsError && returnBons) {
                const deduitReturnBonIds = new Set(
                  returnBons
                    .filter((bon: any) => isDeduitStatut(bon.statut))
                    .map((bon: any) => bon.id)
                );

                const allReturnedAreDeduit = returnedColisIds.every((colisId: string) =>
                  returnLinks.some(
                    (record: any) => record.colis_id === colisId && deduitReturnBonIds.has(record.bon_id)
                  )
                );

                if (allReturnedAreDeduit) {
                  isCompleted = true;
                }
              }
            }
          }
        }
        // Case 2: Mix of delivered and returned colis
        else if (deliveredColisIds.length > 0 && returnedColisIds.length > 0) {
          // Check returned colis
          const { data: returnLinks, error: returnLinksError } = await supabase
            .from('bon_colis')
            .select('bon_id, colis_id')
            .in('colis_id', returnedColisIds);

          if (returnLinksError || !returnLinks) {
            continue;
          }

          const returnBonIds = Array.from(new Set(returnLinks.map((record: any) => record.bon_id).filter(Boolean)));
          if (returnBonIds.length === 0) {
            continue;
          }

          const { data: returnBons, error: returnBonsError } = await supabase
            .from('bons')
            .select('id, statut')
            .in('id', returnBonIds)
            .eq('type', 'retour');

          if (returnBonsError || !returnBons) {
            continue;
          }

          const deduitReturnBonIds = new Set(
            returnBons
              .filter((bon: any) => isDeduitStatut(bon.statut))
              .map((bon: any) => bon.id)
          );

          const returnedWithoutDeduit = returnedColisIds.filter((colisId: string) =>
            !returnLinks.some(
              (record: any) => record.colis_id === colisId && deduitReturnBonIds.has(record.bon_id)
            )
          );

          if (returnedWithoutDeduit.length > 0) {
            continue;
          }

          // Check delivered colis
          const { data: deliveryLinks, error: deliveryLinksError } = await supabase
            .from('bon_colis')
            .select('bon_id, colis_id')
            .in('colis_id', deliveredColisIds);

          if (deliveryLinksError || !deliveryLinks) {
            continue;
          }

          const paymentBonIds = Array.from(new Set(deliveryLinks.map((record: any) => record.bon_id).filter(Boolean)));
          if (paymentBonIds.length === 0) {
            continue;
          }

          const { data: paymentBons, error: paymentBonsError } = await supabase
            .from('bons')
            .select('id, statut')
            .in('id', paymentBonIds)
            .eq('type', 'paiement');

          if (paymentBonsError || !paymentBons) {
            continue;
          }

          const paidPaymentBonIds = new Set(
            paymentBons
              .filter((bon: any) => {
                const statut = normalizeStatut(bon.statut);
                return statut === 'paye' || statut === 'payé' || statut === 'complete' || statut === 'complété';
              })
              .map((bon: any) => bon.id)
          );

          const deliveredWithoutPaid = deliveredColisIds.filter((colisId: string) =>
            !deliveryLinks.some(
              (record: any) => record.colis_id === colisId && paidPaymentBonIds.has(record.bon_id)
            )
          );

          if (deliveredWithoutPaid.length > 0) {
            continue;
          }

          isCompleted = true;
        }
        // Case 3: All colis are delivered (no returned colis)
        else if (deliveredColisIds.length > 0 && returnedColisIds.length === 0) {
          const { data: deliveryLinks, error: deliveryLinksError } = await supabase
            .from('bon_colis')
            .select('bon_id, colis_id')
            .in('colis_id', deliveredColisIds);

          if (!deliveryLinksError && deliveryLinks) {
            const paymentBonIds = Array.from(new Set(deliveryLinks.map((record: any) => record.bon_id).filter(Boolean)));
            if (paymentBonIds.length > 0) {
              const { data: paymentBons, error: paymentBonsError } = await supabase
                .from('bons')
                .select('id, statut')
                .in('id', paymentBonIds)
                .eq('type', 'paiement');

              if (!paymentBonsError && paymentBons) {
                const paidPaymentBonIds = new Set(
                  paymentBons
                    .filter((bon: any) => {
                      const statut = normalizeStatut(bon.statut);
                      return statut === 'paye' || statut === 'payé' || statut === 'complete' || statut === 'complété';
                    })
                    .map((bon: any) => bon.id)
                );

                const allDeliveredArePaid = deliveredColisIds.every((colisId: string) =>
                  deliveryLinks.some(
                    (record: any) => record.colis_id === colisId && paidPaymentBonIds.has(record.bon_id)
                  )
                );

                if (allDeliveredArePaid) {
                  isCompleted = true;
                }
              }
            }
          }
        }

        if (!isCompleted) {
          continue;
        }

        const { error: updateError } = await supabase
          .from('bons')
          .update({ statut: 'Complété' })
          .eq('id', distributionBon.id);

        if (updateError) {
          console.error('Error updating distribution bon statut to Complété:', updateError);
          continue;
        }

        await supabase.from('bons_historique').insert([{
          bon_id: distributionBon.id,
          type: 'distribution',
          utilisateur: currentUserId || 'system',
          statut: 'Complété',
          notes: 'Statut mis à jour automatiquement par le système',
          date: new Date().toISOString(),
        }] as any[]);

        completedBonIds.push(distributionBon.id);
      }

      return { data: completedBonIds, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
  
  updateBon: async (id: string, updates: {
    statut?: string;
    nb_colis?: number;
    montant?: number;
    date_echeance?: string;
    motif?: string;
    notes?: string;
  }) => {
    const sanitizedUpdates = Object.entries(updates).reduce((acc: Record<string, any>, [key, value]) => {
      if (value === undefined) return acc;
      if (typeof value === 'number' && !Number.isFinite(value)) return acc;
      acc[key] = value;
      return acc;
    }, {});

    const { data, error } = await supabase
      .from('bons')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select('*')
      .single();

    return { data, error };
  },

  deleteBon: async (id: string) => {
    const { data, error } = await supabase
      .from('bons')
      .delete()
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Get bon statistics for bon source_type values
  getBonStats: async (sourceType: 'admin' | 'livreur' = 'admin') => {
    try {
      const { data: bons, error } = await supabase
        .from('bons')
        .select('type, statut')
        .eq('source_type', sourceType);

      if (error) {
        return { data: null, error };
      }

      // Count bons by type and status
      const distributionStats = {
        total: 0,
        enCours: 0,
        complete: 0,
        annule: 0
      };

      const paiementStats = {
        total: 0,
        enCours: 0,
        complete: 0,
        annule: 0
      };

      const retourStats = {
        total: 0,
        enCours: 0,
        complete: 0,
        annule: 0
      };

      const normalizeStatut = (value: string) =>
        value
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '');

      bons?.forEach(bon => {
        const statut = normalizeStatut(bon.statut || '');

        if (bon.type === 'distribution') {
          distributionStats.total++;
          if (statut === 'en cours') distributionStats.enCours++;
          else if (statut === 'complete') distributionStats.complete++;
          else if (statut === 'annule') distributionStats.annule++;
        } else if (bon.type === 'paiement') {
          paiementStats.total++;
          if (statut === 'en cours') paiementStats.enCours++;
          else if (statut === 'paye' || statut === 'payee') paiementStats.complete++;
          else if (statut === 'annule') paiementStats.annule++;
        } else if (bon.type === 'retour') {
          retourStats.total++;
          if (statut === 'en cours') retourStats.enCours++;
          else if (statut === 'deduit') retourStats.complete++;
          else if (statut === 'annule') retourStats.annule++;
        }
      });

      return {
        data: {
          distribution: distributionStats,
          paiement: paiementStats,
          retour: retourStats
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

// Get bon statistics for a specific user (livreur)
  getBonStatsByUser: async (userId: string) => {
    try {
      const { data: bons, error } = await supabase
        .from('bons')
        .select('type, statut')
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`);

      if (error) {
        return { data: null, error };
      }

      // Count bons by type and status
      const distributionStats = {
        total: 0,
        enCours: 0,
        complete: 0,
        annule: 0
      };

      const paiementStats = {
        total: 0,
        enCours: 0,
        complete: 0,
        annule: 0
      };

      const retourStats = {
        total: 0,
        enCours: 0,
        complete: 0,
        annule: 0
      };

      bons?.forEach(bon => {
        const statut = (bon.statut || '').toLowerCase().trim();

        if (bon.type === 'distribution') {
          distributionStats.total++;
          if (statut === 'en cours') distributionStats.enCours++;
          else if (statut === 'complété') distributionStats.complete++;
          else if (['annulé', 'annule'].includes(statut)) distributionStats.annule++;
        } else if (bon.type === 'paiement') {
          paiementStats.total++;
          if (statut === 'en cours') paiementStats.enCours++;
          else if (statut === 'payé') paiementStats.complete++;
          else if (['annulé', 'annule'].includes(statut)) paiementStats.annule++;
        } else if (bon.type === 'retour') {
          retourStats.total++;
          if (statut === 'en cours') retourStats.enCours++;
          else if (statut === 'déduit') retourStats.complete++;
          else if (['annulé', 'annule'].includes(statut)) retourStats.annule++;
        }
      });

      return {
        data: {
          distribution: distributionStats,
          paiement: paiementStats,
          retour: retourStats
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update facture
  updateFacture: async (factureId: string, updates: Partial<Facture>) => {
    const { data, error } = await supabase
      .from('factures')
      .update(updates)
      .eq('id', factureId)
      .select()
      .single();
    return { data, error };
  },

  // Get unpaid paiement bons for admin validation screen
  getUnpaidPaiementBons: async () => {
    try {
      const { data: bons, error } = await supabase
        .from('bons')
        .select('*')
        .eq('type', 'paiement')
        .or('statut.eq.en cours,statut.eq.En cours,statut.eq.pending,statut.eq.en_attente,statut.eq.En attente')
        .order('date_creation', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      const list = bons || [];
      if (list.length === 0) {
        return { data: [], error: null };
      }

      // Enrich with assigned user (livreur) data used by DailyPaiementValidation UI
      const userIds = [...new Set(list.map((b: any) => b.assigned_to || b.user_id).filter(Boolean))] as string[];

      let usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('utilisateurs')
          .select('id, nom, prenom, telephone, role')
          .in('id', userIds);

        usersMap = (usersData || []).reduce((acc: Record<string, any>, u: any) => {
          acc[u.id] = u;
          return acc;
        }, {});
      }

      const enriched = list.map((bon: any) => ({
        ...bon,
        assigned_user: usersMap[bon.assigned_to || bon.user_id] || null,
      }));

      return { data: enriched, error: null };
    } catch (error) {
      console.error('Error fetching unpaid paiement bons:', error);
      return { data: null, error };
    }
  },

  // Get paiement + retour bons tied to livreurs (for payment check dashboards)
  getPaiementCheckBons: async (livreurId?: string) => {
    try {
      let query = supabase
        .from('bons')
        .select(`
          *,
          assigned_user:utilisateurs!fk_bons_assigned_to(
            id,
            nom,
            prenom,
            telephone,
            role,
            ville,
            zone
          ),
          entreprise:entreprise_id(
            id,
            nom,
            adresse,
            contact,
            email,
            telephone
          ),
          bon_colis:bon_colis(
            colis:colis(
              prix,
              frais
            )
          )
        `)
        .in('type', ['distribution', 'paiement', 'retour'])
        .order('date_creation', { ascending: false });

      if (livreurId) {
        query = query.or(`assigned_to.eq.${livreurId},user_id.eq.${livreurId}`);
      }

      const { data: bons, error } = await query;
      if (error) {
        return { data: null, error };
      }

      const list = bons || [];
      if (list.length === 0) {
        return { data: [], error: null };
      }

      // Map assigned_user from the relation if not present
      const enriched = list.map((bon: any) => {
        if (bon.assigned_user) {
          return bon;
        }
        return bon;
      });

      return { data: enriched, error: null };
    } catch (error) {
      console.error('Error fetching paiement check bons:', error);
      return { data: null, error };
    }
  },

  // Validate a paiement bon (mark as paid) and append history
  validatePaiementBon: async (bonId: string, validatedByUserId: string, notes?: string) => {
    try {
      const { data: updatedBon, error: updateError } = await supabase
        .from('bons')
        .update({
          statut: 'complété',
        })
        .eq('id', bonId)
        .eq('type', 'paiement')
        .select('*')
        .single();

      if (updateError) {
        return { data: null, error: updateError };
      }

      const historyPayload = {
        bon_id: bonId,
        type: 'paiement' as const,
        utilisateur: validatedByUserId,
        statut: 'complété',
        notes: notes || 'Bon de paiement validé',
        date: new Date().toISOString(),
      };

      const { error: historyError } = await supabase
        .from('bons_historique')
        .insert([historyPayload]);

      if (historyError) {
        console.error('Error creating paiement validation history:', historyError);
      }

      return { data: updatedBon, error: null };
    } catch (error) {
      console.error('Error validating paiement bon:', error);
      return { data: null, error };
    }
  },

  // Generate daily paiement bon for a specific livreur (manual trigger)
  generateDailyPaiementBonForLivreur: async (livreurId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_daily_paiement_bon_for_livreur', {
        p_livreur_id: livreurId
      });

      if (error) {
        console.error('Error generating daily paiement bon:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception generating daily paiement bon:', error);
      return { data: null, error };
    }
  },

  generateManualPaiementBonForLivreur: async (livreurId: string, adminUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_manual_paiement_bon_for_livreur', {
        p_livreur_id: livreurId,
        p_admin_user_id: adminUserId
      });

      if (error) {
        console.error('Error generating manual daily paiement bon:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception generating manual daily paiement bon:', error);
      return { data: null, error };
    }
  },

  getLivreursWithPendingPaiementColis: async () => {
    try {
      const { data, error } = await supabase.rpc('get_livreurs_with_pending_paiement_colis');

      if (error) {
        console.error('Error fetching eligible livreurs:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception fetching eligible livreurs:', error);
      return { data: null, error };
    }
  },

  // Generate daily paiement bons for all livreurs (scheduled job)
  generateDailyPaiementBons: async () => {
    try {
      const { data, error } = await supabase.rpc('generate_daily_paiement_bons');

      if (error) {
        console.error('Error generating daily paiement bons:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception generating daily paiement bons:', error);
      return { data: null, error };
    }
  },

  getEntreprisesWithPendingPaiementColis: async () => {
    try {
      const { data, error } = await supabase.rpc('get_entreprises_with_pending_paiement_colis');

      if (error) {
        console.error('Error fetching eligible entreprises:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception fetching eligible entreprises:', error);
      return { data: null, error };
    }
  },

  generateManualPaiementBonForEntreprise: async (entrepriseId: string, adminUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_manual_paiement_bon_for_entreprise', {
        p_entreprise_id: entrepriseId,
        p_admin_user_id: adminUserId
      });

      if (error) {
        console.error('Error generating manual paiement bon for entreprise:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception generating manual paiement bon for entreprise:', error);
      return { data: null, error };
    }
  },

  getEntreprisesWithPendingRetourColis: async () => {
    try {
      const { data, error } = await supabase.rpc('get_entreprises_with_pending_retour_colis');

      if (error) {
        console.error('Error fetching eligible entreprises for retour:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception fetching eligible entreprises for retour:', error);
      return { data: null, error };
    }
  },

  generateManualRetourBonForEntreprise: async (entrepriseId: string, adminUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_manual_retour_bon_for_entreprise', {
        p_entreprise_id: entrepriseId,
        p_admin_user_id: adminUserId
      });

      if (error) {
        console.error('Error generating manual retour bon for entreprise:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception generating manual retour bon for entreprise:', error);
      return { data: null, error };
    }
  }
};
