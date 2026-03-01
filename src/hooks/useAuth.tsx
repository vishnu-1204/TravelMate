import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const resolveBackendUrl = () => {
  const configured = (import.meta.env.VITE_AUTH_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');

  const { hostname, origin } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  return isLocal ? 'http://localhost:3000' : origin;
};

const BACKEND_URL = resolveBackendUrl();

interface User {
  id: string;
  email: string;
  emailVerified?: boolean;
  user_metadata?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = (await response.json().catch(() => null)) as { message?: string; token?: string; user?: User } | null;
      if (!response.ok) {
        throw new Error(data?.message || 'Registration failed');
      }

      // Backend sends token on registration too sometimes, but let's follow the standard
      // flow where they might need to verify email first if that's enabled.
      // Based on auth.ts, it returns a token immediately too.
      if (data?.token && data?.user) {
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
      }

      return {
        error: null,
        needsEmailVerification: !data?.user?.emailVerified,
      };
    } catch (error) {
      return {
        error: error as Error,
        needsEmailVerification: false,
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => null)) as { message?: string; token?: string; user?: User } | null;
      if (!response.ok) {
        throw new Error(data?.message || 'Login failed');
      }

      if (!data?.token || !data?.user) {
        throw new Error('Invalid login response from server');
      }
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
