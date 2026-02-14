import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile, adminCatalog } from '../lib/supabase';
import { toast } from '../hooks/use-toast';
import { startRealtime, stopRealtime } from '../lib/realtime';

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
        // start realtime subscriptions for this user
        startRealtime(session.user.id, {
          onConversationChange: (payload) => {
            window.dispatchEvent(new CustomEvent('realtime:conversation', { detail: payload }));
          },
          onNewMessage: (payload) => {
            window.dispatchEvent(new CustomEvent('realtime:message', { detail: payload }));
          }
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
          // ensure realtime running for newly signed in user
          startRealtime(session.user.id, {
            onConversationChange: (payload) => {
              window.dispatchEvent(new CustomEvent('realtime:conversation', { detail: payload }));
            },
            onNewMessage: (payload) => {
              window.dispatchEvent(new CustomEvent('realtime:message', { detail: payload }));
            }
          });
        } else {
          setProfile(null);
          setLoading(false);
          stopRealtime();
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      // notify user at login if there are unread conversations
      try {
        const { count } = await adminCatalog.getUnreadConversationsCount();
        if (count && count > 0) {
          const tRef = toast({ title: `You have ${count} unread messages`, description: 'Open chats to view them' });
          if (tRef) {
            tRef.update({ action: (
              <button onClick={() => { try { tRef.dismiss(); } catch {} window.location.href = '/admin/chats'; }} className="text-sm text-blue-600">Open</button>
            ) } as any);
          }
        }
      } catch (e) {
        // ignore notification errors
      }
    } catch (error) {
      console.error('Error loading profile:', error);
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
          is_admin: false,
          role: 'customer',
        });

      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Wait for the auth state change event to fire and profile to load
    // The onAuthStateChange event should trigger loadProfile
    await new Promise(resolve => setTimeout(resolve, 500));
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

  // cleanup realtime on unmount
  useEffect(() => {
    return () => stopRealtime();
  }, []);

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
