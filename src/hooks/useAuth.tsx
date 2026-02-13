import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { localAuthApi } from '@/services/localAuthApi';

// Set to true to use local Express backend, false for Supabase
const USE_LOCAL_AUTH = true;

interface LocalUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | LocalUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isLocalAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Local Auth Provider ───
const LocalAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localAuthApi.getStoredUser();
    if (stored) {
      setUser({ id: String(stored.id), email: stored.email });
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await localAuthApi.register(email, password);
    if (error) return { error: new Error(error) };

    const stored = localAuthApi.getStoredUser();
    if (stored) setUser({ id: String(stored.id), email: stored.email });
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await localAuthApi.login(email, password);
    if (error) return { error: new Error(error) };

    const stored = localAuthApi.getStoredUser();
    if (stored) setUser({ id: String(stored.id), email: stored.email });
    return { error: null };
  };

  const signOut = async () => {
    localAuthApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session: null, loading, signUp, signIn, signOut, isLocalAuth: true }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Supabase Auth Provider ───
const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, isLocalAuth: false }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Exported Provider (switches based on flag) ───
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  if (USE_LOCAL_AUTH) {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
