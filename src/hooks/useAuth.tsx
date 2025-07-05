import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is properly configured
    if (!supabase.auth) {
      console.warn('Supabase auth not properly configured');
      setLoading(false);
      return;
    }

    // Handle OAuth callback with access token in URL fragment
    const handleAuthCallback = async () => {
      const hash = window.location.hash;
      console.log('Checking for auth callback, hash:', hash);
      
      if (hash && hash.includes('access_token')) {
        console.log('Found access token in URL, processing...');
        try {
          // Parse the access token from URL fragment
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          console.log('Tokens found:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
          
          if (accessToken && refreshToken) {
            console.log('Setting session with tokens...');
            // Set the session with the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Error setting session:', error);
            } else {
              console.log('Session set successfully, clearing URL...');
              // Clear the URL fragment
              window.history.replaceState({}, document.title, window.location.pathname);
              console.log('URL cleared');
            }
          }
        } catch (error) {
          console.error('Error handling auth callback:', error);
        }
      }
    };

    // Handle auth callback first
    handleAuthCallback();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, { user: session?.user?.email });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // If we have a session and there's a hash with tokens, clear it
        if (session && window.location.hash.includes('access_token')) {
          console.log('Clearing URL hash after successful auth...');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    );

    // Check for existing session and handle OAuth callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session check result:', { hasSession: !!session, user: session?.user?.email });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL || `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL || `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isLoading: loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};