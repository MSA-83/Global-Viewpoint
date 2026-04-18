import { createContext, useContext, useState, useEffect, useCallback, FC, ReactNode } from "react";
import { login as apiLogin, logout as apiLogout, getMe } from "@/lib/api";

export type User = {
  id: number;
  username: string;
  displayName: string;
  email: string;
  role: "super_admin" | "admin" | "analyst" | "operator" | "viewer" | "executive";
  clearanceLevel: string;
};

type AuthCtx = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restore = useCallback(async () => {
    const token = localStorage.getItem("sentinel_token");
    if (!token) { setIsLoading(false); return; }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      localStorage.removeItem("sentinel_token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { restore(); }, [restore]);

  const login = async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    localStorage.setItem("sentinel_token", res.token);
    setUser(res.user);
  };

  const logout = () => {
    const token = localStorage.getItem("sentinel_token");
    if (token) apiLogout().catch(() => {});
    localStorage.removeItem("sentinel_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
