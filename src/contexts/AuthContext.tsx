import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider: Initializing - Getting session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 AuthProvider: Initial session:', session?.user?.email || 'No session');
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('🔐 AuthProvider: Loading profile for user:', session.user.id);
        loadProfile(session.user.id);
      } else {
        console.log('🔐 AuthProvider: No initial session, setting loading to false');
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 AuthProvider: Auth state changed - Event:', _event, 'User:', session?.user?.email || 'No user');
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          console.log('🔐 AuthProvider: Auth state change - Loading profile for:', session.user.id);
          await loadProfile(session.user.id);
        } else {
          console.log('🔐 AuthProvider: Auth state change - Clearing profile and user');
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      console.log('👤 loadProfile: Starting for userId:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ loadProfile: Database error:', error);
        throw error;
      }
      
      // If profile doesn't exist, create one
      if (!data) {
        console.warn('⚠️ loadProfile: Profile not found, creating new profile for user:', userId);
        
        // Get user info from auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          const newProfile: Profile = {
            id: userId,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            first_name: null,
            last_name: null,
            phone: null,
            address: null,
            city: null,
            role: 'customer', // Default to customer
            created_at: new Date().toISOString(),
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile);

          if (insertError) {
            console.error('❌ loadProfile: Failed to create profile:', insertError);
            throw insertError;
          }
          
          console.log('✅ loadProfile: New profile created with role: customer');
          setProfile(newProfile);
        }
      } else {
        console.log('✅ loadProfile: Profile data found:', data?.email, 'Role:', data?.role);
        setProfile(data);
      }
    } catch (error) {
      console.error('❌ loadProfile: Error loading profile:', error);
    } finally {
      console.log('✅ loadProfile: Setting loading to false');
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: 'customer',
        });

      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 signIn: Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ signIn: Authentication error:', error.message);
        throw error;
      }

      console.log('✅ signIn: Authentication successful for:', data.user?.email);

      if (data.user) {
        console.log('📥 signIn: Loading profile for user:', data.user.id);
        // Directly load profile after successful auth
        await loadProfile(data.user.id);
        console.log('✅ signIn: Profile loaded, returning');
      }
    } catch (error: any) {
      console.error('❌ signIn: Failed -', error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If session is missing, just clear local state
        if (error.message?.includes('Auth session missing') || error.message?.includes('session_not_found')) {
          setUser(null);
          setProfile(null);
          return;
        }
        throw error;
      }
    } catch (error: any) {
      // If it's a session missing error, just clear local state
      if (error.message && (error.message.includes('Auth session missing') || error.message.includes('session_not_found'))) {
        setUser(null);
        setProfile(null);
        return;
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
