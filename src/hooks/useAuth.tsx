// Auth without Supabase — stores user in localStorage
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface LocalUser {
  id: string;
  email: string;
  full_name: string;
}

interface AuthContextValue {
  user: LocalUser | null;
  profile: { tier: "free" | "pro"; credits: number } | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AUTH_KEY = "writeright.user";
const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(loadUser());
    setLoading(false);
  }, []);

  const signUpWithEmail = async (email: string, _password: string, fullName: string) => {
    const u: LocalUser = { id: `user-${Date.now()}`, email, full_name: fullName };
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
  };

  const signInWithEmail = async (email: string, _password: string) => {
    // For local auth, sign in = sign up with same email
    const existing = loadUser();
    if (existing && existing.email === email) {
      setUser(existing);
    } else {
      const u: LocalUser = { id: `user-${Date.now()}`, email, full_name: email.split("@")[0] };
      localStorage.setItem(AUTH_KEY, JSON.stringify(u));
      setUser(u);
    }
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  const refreshProfile = async () => {};

  return (
    <AuthContext.Provider value={{
      user,
      profile: user ? { tier: "free", credits: 0 } : null,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
