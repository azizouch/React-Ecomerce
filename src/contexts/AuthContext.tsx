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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth events and log them for debugging unexpected sign-outs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug('🔐 Auth event:', event, { hasSession: !!session });
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string, retries = 1): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }
      
      // If profile doesn't exist, create one
      if (!data) {
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
            throw insertError;
          }
          
          setProfile(newProfile);
        }
      } else {
        setProfile(data);
      }
    } catch (error: any) {
      // If the request was unauthorized, try once to recover (token refresh race)
      const isUnauthorized =
        error && (error.status === 401 || /unauthorized/i.test(String(error.message || '')));

      if (isUnauthorized && retries > 0) {
        console.warn('AuthContext: unauthorized loading profile — retrying after refresh attempt');
        try {
          // Ask supabase for the current session (this may trigger internal refresh)
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData && sessionData.session) {
            // small delay to let any background refresh complete
            await new Promise((res) => setTimeout(res, 500));
            return loadProfile(userId, retries - 1);
          }
        } catch (e) {
          // fallthrough to clearing state below
        }
      }

      // Silently fail - profile loading errors shouldn't break the app
    } finally {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Directly load profile after successful auth
        await loadProfile(data.user.id);
      }
    } catch (error: any) {
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
