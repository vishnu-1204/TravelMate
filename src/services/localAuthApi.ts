const API_BASE = "http://localhost:3000/api/auth";

interface AuthResponse {
  message: string;
  user: { id: number; email: string };
  token: string;
}

interface ProfileResponse {
  user: { id: number; email: string; created_at: string };
}

const getToken = (): string | null => localStorage.getItem("auth_token");

const setToken = (token: string) => localStorage.setItem("auth_token", token);

const removeToken = () => localStorage.removeItem("auth_token");

const getStoredUser = (): { id: number; email: string } | null => {
  const user = localStorage.getItem("auth_user");
  return user ? JSON.parse(user) : null;
};

const setStoredUser = (user: { id: number; email: string }) =>
  localStorage.setItem("auth_user", JSON.stringify(user));

const removeStoredUser = () => localStorage.removeItem("auth_user");

export const localAuthApi = {
  async register(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || "Registration failed" };
      }

      setToken(data.token);
      setStoredUser(data.user);
      return { error: null };
    } catch {
      return { error: "Cannot connect to auth server. Is it running on localhost:3000?" };
    }
  },

  async login(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || "Login failed" };
      }

      setToken(data.token);
      setStoredUser(data.user);
      return { error: null };
    } catch {
      return { error: "Cannot connect to auth server. Is it running on localhost:3000?" };
    }
  },

  async getProfile(): Promise<ProfileResponse | null> {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  logout() {
    removeToken();
    removeStoredUser();
  },

  getToken,
  getStoredUser,
  isAuthenticated: () => !!getToken(),
};
